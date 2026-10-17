import { FastifyPluginAsync } from 'fastify';
import { prisma } from '../../lib/prisma.js';
import { Prisma } from '@prisma/client';
import { scopedRepo } from '../../lib/scopedRepo.js';

type BookingListItem = Prisma.BookingGetPayload<{
  include: {
    pet: true;
    provider: true;
    service: true;
    unit: true;
  };
}>;
import {
  NotFoundError,
  ValidationError,
  ConflictError,
  UnauthorizedError,
  VaccinesRequiredError,
} from '../../lib/errors.js';
import {
  QuoteBookingSchema,
  CreateBookingSchema,
  CancelBookingSchema,
  RescheduleBookingSchema,
  BookingStatus,
  BookingKind,
  BookingSummary,
  ErrorCode,
  Species,
  validateBoardingVaccines,
} from '@pawnest/shared';
import { formatDateInTimezone, getStayNightDates } from '../availability/boarding-availability.service.js';
import { scheduleAppointmentReminder } from '../../jobs/reminders.js';
import crypto from 'node:crypto';

export const bookingRoutes: FastifyPluginAsync = async (fastify) => {
  // All booking routes require authentication
  fastify.addHook('preHandler', fastify.authenticate);

  // POST /bookings/quote (Server-side price, policy, & vaccine validation preview)
  fastify.post('/bookings/quote', async (request, reply) => {
    const userId = request.user!.userId;

    const body = QuoteBookingSchema.parse(request.body);
    const { petId, providerId, kind, serviceId, boardingUnitId, startsAt, endsAt, addOnIds } = body;

    const startsAtDate = new Date(startsAt);
    const endsAtDate = new Date(endsAt);

    if (startsAtDate >= endsAtDate) {
      throw new ValidationError('End time must be after start time');
    }

    // 1. Validate pet ownership and include vaccinations
    const pet = await prisma.pet.findFirst({
      where: { id: petId, userId, deletedAt: null },
      include: { vaccinations: true },
    });
    if (!pet) {
      throw new NotFoundError('Pet not found');
    }

    // 2. Validate provider
    const provider = await prisma.provider.findFirst({
      where: { id: providerId, isActive: true },
      include: { units: true },
    });
    if (!provider) {
      throw new NotFoundError('Provider not found or inactive');
    }

    if (!provider.speciesAccepted.includes(pet.species)) {
      throw new ValidationError(`Provider does not accept species: ${pet.species}`);
    }

    const timeZone = provider.timezone || 'America/New_York';

    // -----------------------------------------------------------------
    // BOARDING QUOTE
    // -----------------------------------------------------------------
    if (kind === BookingKind.BOARDING) {
      if (!boardingUnitId) {
        throw new ValidationError('boardingUnitId is required for boarding quotes');
      }

      const unit = provider.units.find((u) => u.id === boardingUnitId);
      if (!unit) {
        throw new NotFoundError('Boarding unit not found for this provider');
      }

      const checkInStr = formatDateInTimezone(startsAtDate, timeZone);
      const checkOutStr = formatDateInTimezone(endsAtDate, timeZone);
      const nights = getStayNightDates(checkInStr, checkOutStr);

      if (nights.length === 0) {
        throw new ValidationError('Stay must be at least 1 night');
      }

      const baseCents = nights.length * unit.nightlyCents;

      // Add-ons
      let addOnsCents = 0;
      const addOnsList: Array<{ id: string; name: string; priceCents: number }> = [];

      if (addOnIds && addOnIds.length > 0) {
        const addOnServices = await prisma.service.findMany({
          where: {
            id: { in: addOnIds },
            providerId,
            isAddOn: true,
            isActive: true,
          },
        });

        for (const addon of addOnServices) {
          addOnsCents += addon.basePriceCents;
          addOnsList.push({
            id: addon.id,
            name: addon.name,
            priceCents: addon.basePriceCents,
          });
        }
      }

      const totalCents = baseCents + addOnsCents;
      const vaccineCheck = validateBoardingVaccines(pet.species, pet.vaccinations, endsAtDate);

      return {
        priceCents: totalCents,
        currency: unit.currency,
        priceBreakdown: {
          nights: nights.length,
          nightlyCents: unit.nightlyCents,
          baseCents,
          addOnsCents,
          totalCents,
          addOns: addOnsList,
        },
        vaccineCheck,
        cancellationHours: provider.cancellationHours,
        autoConfirm: provider.autoConfirm,
      };
    }

    // -----------------------------------------------------------------
    // GROOMING / VET QUOTE
    // -----------------------------------------------------------------
    if (!serviceId) {
      throw new ValidationError(kind === BookingKind.VET ? 'Service ID / visit type is required for veterinary quotes' : 'Service ID is required for grooming quotes');
    }

    const service = await prisma.service.findFirst({
      where: { id: serviceId, providerId, isActive: true },
    });
    if (!service) {
      throw new NotFoundError('Service not found for this provider');
    }

    if (!service.species.includes(pet.species)) {
      throw new ValidationError(`This service is not available for species: ${pet.species}`);
    }

    const baseCents = service.basePriceCents;
    let sizeAdjustmentCents = 0;
    if (pet.sizeTier && service.sizePricing && typeof service.sizePricing === 'object') {
      const pricingMap = service.sizePricing as Record<string, number>;
      sizeAdjustmentCents = pricingMap[pet.sizeTier] || 0;
    }

    let addOnsCents = 0;
    const addOnsList: Array<{ id: string; name: string; priceCents: number }> = [];

    if (addOnIds && addOnIds.length > 0) {
      const addOnServices = await prisma.service.findMany({
        where: {
          id: { in: addOnIds },
          providerId,
          isAddOn: true,
          isActive: true,
        },
      });

      for (const addon of addOnServices) {
        addOnsCents += addon.basePriceCents;
        addOnsList.push({
          id: addon.id,
          name: addon.name,
          priceCents: addon.basePriceCents,
        });
      }
    }

    const totalCents = baseCents + sizeAdjustmentCents + addOnsCents;

    return {
      priceCents: totalCents,
      currency: service.currency,
      priceBreakdown: {
        baseCents,
        sizeAdjustmentCents,
        addOnsCents,
        totalCents,
        addOns: addOnsList,
      },
      cancellationHours: provider.cancellationHours,
      autoConfirm: provider.autoConfirm,
    };
  });

  // POST /bookings (Create booking with Idempotency-Key and concurrent safety)
  fastify.post('/bookings', async (request, reply) => {
    const userId = request.user!.userId;

    const idempotencyKey = request.headers['idempotency-key'] as string | undefined;
    if (!idempotencyKey) {
      throw new ValidationError('Idempotency-Key header is required');
    }

    const body = CreateBookingSchema.parse(request.body);
    const { petId, providerId, kind, serviceId, boardingUnitId, startsAt, endsAt, addOnIds, notes, careInstructions } = body;

    const startsAtDate = new Date(startsAt);
    const endsAtDate = new Date(endsAt);

    if (startsAtDate >= endsAtDate) {
      throw new ValidationError('Booking end time must be after start time');
    }

    // Check existing idempotency record
    const existingIdempotency = await prisma.idempotencyRecord.findUnique({
      where: {
        userId_key: {
          userId,
          key: idempotencyKey,
        },
      },
    });

    if (existingIdempotency) {
      return reply
        .status(existingIdempotency.responseStatus)
        .send(existingIdempotency.responseBody);
    }

    // -----------------------------------------------------------------
    // BOARDING BOOKING TRANSACTION
    // -----------------------------------------------------------------
    if (kind === BookingKind.BOARDING) {
      if (!boardingUnitId) {
        throw new ValidationError('Boarding unit ID is required for boarding booking');
      }

      const createdBooking = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        // Advisory transaction lock on the boarding unit
        const lockKey = `boarding_unit:${boardingUnitId}`;
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))`;

        // 1. Verify Pet ownership and vaccinations
        const pet = await tx.pet.findFirst({
          where: { id: petId, userId, deletedAt: null },
          include: { vaccinations: true },
        });
        if (!pet) {
          throw new NotFoundError('Pet not found');
        }

        // 2. Verify Provider
        const provider = await tx.provider.findFirst({
          where: { id: providerId, isActive: true },
          include: { units: true },
        });
        if (!provider) {
          throw new NotFoundError('Provider not found or inactive');
        }

        if (!provider.speciesAccepted.includes(pet.species)) {
          throw new ValidationError(`Provider does not accept species: ${pet.species}`);
        }

        const timeZone = provider.timezone || 'America/New_York';

        // 3. Verify Boarding Unit
        const unit = provider.units.find((u) => u.id === boardingUnitId);
        if (!unit) {
          throw new NotFoundError('Boarding unit not found for this provider');
        }

        // 4. Server-side Vaccination Enforcement through check-out
        const vaccineCheck = validateBoardingVaccines(pet.species, pet.vaccinations, endsAtDate);
        if (!vaccineCheck.valid) {
          const messages: string[] = [];
          for (const mv of vaccineCheck.missingVaccines) {
            messages.push(`${mv} vaccination is required for boarding`);
          }
          for (const ev of vaccineCheck.expiringVaccines) {
            messages.push(`${ev.name} vaccination expires on ${ev.expiresOn}, which is before check-out date`);
          }
          throw new VaccinesRequiredError(
            `Boarding vaccination policy requirement not met: ${messages.join('; ')}`,
            messages.map((m) => ({ field: 'vaccinations', message: m }))
          );
        }

        // 5. Date boundaries & lead time check
        const checkInDateStr = formatDateInTimezone(startsAtDate, timeZone);
        const checkOutDateStr = formatDateInTimezone(endsAtDate, timeZone);
        const todayInTz = formatDateInTimezone(new Date(), timeZone);

        if (checkInDateStr <= todayInTz) {
          throw new ValidationError('Boarding check-in must be booked at least one day in advance');
        }

        const nights = getStayNightDates(checkInDateStr, checkOutDateStr);
        if (nights.length === 0) {
          throw new ValidationError('Stay must be at least 1 night');
        }

        // 6. Overlapping pet booking check (Section 17: pet cannot hold two overlapping active bookings)
        const petConflict = await tx.booking.findFirst({
          where: {
            petId: pet.id,
            status: { not: BookingStatus.CANCELLED },
            startsAt: { lt: endsAtDate },
            endsAt: { gt: startsAtDate },
          },
        });
        if (petConflict) {
          throw new ConflictError(ErrorCode.CONFLICT, 'This pet already has an active booking during the selected stay dates');
        }

        // 7. Unit Capacity Check across every night of the stay
        const existingBookings = await tx.booking.findMany({
          where: {
            boardingUnitId: unit.id,
            status: { not: BookingStatus.CANCELLED },
            startsAt: { lt: endsAtDate },
            endsAt: { gt: startsAtDate },
          },
          select: { startsAt: true, endsAt: true },
        });

        for (const nightStr of nights) {
          const occupiedCount = existingBookings.filter((b) => {
            const bStart = formatDateInTimezone(b.startsAt, timeZone);
            const bEnd = formatDateInTimezone(b.endsAt, timeZone);
            return bStart <= nightStr && nightStr < bEnd;
          }).length;

          if (occupiedCount >= unit.capacity) {
            throw new ConflictError(ErrorCode.SLOT_TAKEN, `Selected suite is fully booked on night ${nightStr}`);
          }
        }

        // 8. Price calculation
        const baseCents = nights.length * unit.nightlyCents;
        let addOnsCents = 0;
        const addOnsList: Array<{ id: string; name: string; priceCents: number }> = [];

        if (addOnIds && addOnIds.length > 0) {
          const addOnServices = await tx.service.findMany({
            where: {
              id: { in: addOnIds },
              providerId,
              isAddOn: true,
              isActive: true,
            },
          });
          for (const addon of addOnServices) {
            addOnsCents += addon.basePriceCents;
            addOnsList.push({
              id: addon.id,
              name: addon.name,
              priceCents: addon.basePriceCents,
            });
          }
        }

        const totalCents = baseCents + addOnsCents;
        const randomSuffix = crypto.randomBytes(3).toString('hex').toUpperCase();
        const reference = `PN-BND-${randomSuffix}`;

        // 9. Create Boarding Booking
        const booking = await tx.booking.create({
          data: {
            reference,
            userId,
            petId: pet.id,
            providerId: provider.id,
            boardingUnitId: unit.id,
            kind: BookingKind.BOARDING,
            status: provider.autoConfirm ? BookingStatus.CONFIRMED : BookingStatus.PENDING,
            startsAt: startsAtDate,
            endsAt: endsAtDate,
            priceCents: totalCents,
            currency: unit.currency,
            priceBreakdown: {
              nights: nights.length,
              nightlyCents: unit.nightlyCents,
              baseCents,
              addOnsCents,
              totalCents,
              addOns: addOnsList,
            },
            addOnIds: addOnIds || [],
            notes,
            careInstructions: careInstructions || undefined,
            isDemo: provider.isDemo,
            idempotencyKey,
          },
          include: {
            provider: true,
            unit: true,
            pet: true,
          },
        });

        // 10. Record Idempotency
        const responsePayload = {
          id: booking.id,
          reference: booking.reference,
          status: booking.status,
          kind: booking.kind,
          startsAt: booking.startsAt.toISOString(),
          endsAt: booking.endsAt.toISOString(),
          priceCents: booking.priceCents,
          currency: booking.currency,
          priceBreakdown: booking.priceBreakdown,
          petId: booking.pet.id,
          petName: booking.pet.name,
          providerId: booking.provider.id,
          providerName: booking.provider.name,
          boardingUnitName: booking.unit?.name ?? null,
          careInstructions: booking.careInstructions,
          isDemo: booking.isDemo,
        };

        await tx.idempotencyRecord.create({
          data: {
            key: idempotencyKey,
            userId,
            requestHash: crypto.createHash('sha256').update(JSON.stringify(body)).digest('hex'),
            responseStatus: 201,
            responseBody: responsePayload as any,
          },
        });

        return responsePayload;
      });

      return reply.status(201).send(createdBooking);
    }

    // -----------------------------------------------------------------
    // GROOMING / VET BOOKING TRANSACTION
    // -----------------------------------------------------------------
    const createdBooking = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const lockKey = `${providerId}:${startsAtDate.toISOString()}`;
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))`;

      // 1. Verify Pet ownership
      const pet = await tx.pet.findFirst({
        where: { id: petId, userId, deletedAt: null },
      });
      if (!pet) {
        throw new NotFoundError('Pet not found');
      }

      // 2. Verify Provider
      const provider = await tx.provider.findFirst({
        where: { id: providerId, isActive: true },
        include: { hours: true },
      });
      if (!provider) {
        throw new NotFoundError('Provider not found or inactive');
      }

      // 3. Verify Service
      if (!serviceId) {
        throw new ValidationError('Service ID is required for grooming booking');
      }
      const service = await tx.service.findFirst({
        where: { id: serviceId, providerId, isActive: true },
      });
      if (!service) {
        throw new NotFoundError('Service not found for this provider');
      }

      // 4. Verify Species
      if (!service.species.includes(pet.species)) {
        throw new ValidationError(`Service does not accept species: ${pet.species}`);
      }

      if (body.kind === BookingKind.VET) {
        if (!body.emergencyAcknowledged) {
          throw new ValidationError(
            'You must acknowledge the emergency care disclaimer before scheduling a veterinary appointment'
          );
        }
        if (!body.visitType) {
          throw new ValidationError('visitType is required for veterinary appointments');
        }
        if (!body.reason || !body.reason.trim()) {
          throw new ValidationError('Primary reason or symptom description is required for veterinary appointments');
        }
      }

      // 5. Capacity Check for the Slot
      const weekday = startsAtDate.getUTCDay();
      const schedule = provider.hours.find((h) => h.weekday === weekday) || provider.hours[0];
      const stations = schedule?.stations || 1;

      const overlappingCount = await tx.booking.count({
        where: {
          providerId,
          status: { not: BookingStatus.CANCELLED },
          startsAt: { lt: endsAtDate },
          endsAt: { gt: startsAtDate },
        },
      });

      if (overlappingCount >= stations) {
        throw new ConflictError(ErrorCode.SLOT_TAKEN, 'This appointment slot is no longer available');
      }

      // Overlapping pet booking check
      const petConflict = await tx.booking.findFirst({
        where: {
          petId: pet.id,
          status: { not: BookingStatus.CANCELLED },
          startsAt: { lt: endsAtDate },
          endsAt: { gt: startsAtDate },
        },
      });
      if (petConflict) {
        throw new ConflictError(ErrorCode.CONFLICT, 'This pet already has an active booking during the selected time');
      }

      // 6. Calculate Price
      const baseCents = service.basePriceCents;
      let sizeAdjustmentCents = 0;
      if (pet.sizeTier && service.sizePricing && typeof service.sizePricing === 'object') {
        const pricingMap = service.sizePricing as Record<string, number>;
        sizeAdjustmentCents = pricingMap[pet.sizeTier] || 0;
      }

      let addOnsCents = 0;
      const addOnsList: Array<{ id: string; name: string; priceCents: number }> = [];
      if (addOnIds && addOnIds.length > 0) {
        const addOnServices = await tx.service.findMany({
          where: {
            id: { in: addOnIds },
            providerId,
            isAddOn: true,
            isActive: true,
          },
        });
        for (const addon of addOnServices) {
          addOnsCents += addon.basePriceCents;
          addOnsList.push({
            id: addon.id,
            name: addon.name,
            priceCents: addon.basePriceCents,
          });
        }
      }

      const totalCents = baseCents + sizeAdjustmentCents + addOnsCents;
      const randomSuffix = crypto.randomBytes(3).toString('hex').toUpperCase();
      const prefix = body.kind === BookingKind.VET ? 'PN-VET' : 'PN-GRM';
      const reference = `${prefix}-${randomSuffix}`;

      // 7. Create Booking
      const booking = await tx.booking.create({
        data: {
          reference,
          userId,
          petId: pet.id,
          providerId: provider.id,
          serviceId: service.id,
          kind: body.kind,
          status: provider.autoConfirm ? BookingStatus.CONFIRMED : BookingStatus.PENDING,
          startsAt: startsAtDate,
          endsAt: endsAtDate,
          priceCents: totalCents,
          currency: service.currency,
          priceBreakdown: {
            baseCents,
            sizeAdjustmentCents,
            addOnsCents,
            totalCents,
            addOns: addOnsList,
          },
          addOnIds: addOnIds || [],
          notes,
          visitType: body.visitType || null,
          symptoms: body.symptoms || [],
          reason: body.reason || null,
          emergencyAcknowledged: Boolean(body.emergencyAcknowledged),
          isDemo: provider.isDemo,
          idempotencyKey,
        },
        include: {
          provider: true,
          service: true,
          pet: true,
        },
      });

      // 8. Record Idempotency
      const responsePayload = {
        id: booking.id,
        reference: booking.reference,
        status: booking.status,
        kind: booking.kind,
        startsAt: booking.startsAt.toISOString(),
        endsAt: booking.endsAt.toISOString(),
        priceCents: booking.priceCents,
        currency: booking.currency,
        priceBreakdown: booking.priceBreakdown,
        petId: booking.pet.id,
        petName: booking.pet.name,
        providerId: booking.provider.id,
        providerName: booking.provider.name,
        serviceId: booking.serviceId,
        serviceName: booking.service?.name,
        visitType: booking.visitType,
        symptoms: booking.symptoms,
        reason: booking.reason,
        emergencyAcknowledged: booking.emergencyAcknowledged,
        isDemo: booking.isDemo,
      };

      await tx.idempotencyRecord.create({
        data: {
          key: idempotencyKey,
          userId,
          requestHash: crypto.createHash('sha256').update(JSON.stringify(body)).digest('hex'),
          responseStatus: 201,
          responseBody: responsePayload as any,
        },
      });

      return responsePayload;
    });

    // 9. Schedule reminder
    await scheduleAppointmentReminder({
      id: createdBooking.id,
      startsAt: createdBooking.startsAt,
    }).catch((err) => {
      request.log.warn({ err }, 'Failed to schedule appointment reminder');
    });

    return reply.status(201).send(createdBooking);
  });

  // GET /bookings (List own bookings)
  fastify.get('/bookings', async (request, reply) => {
    const userId = request.user!.userId;

    const { status, kind } = request.query as any;
    const where: any = { userId };

    if (status) {
      where.status = status;
    }
    if (kind) {
      where.kind = kind;
    }

    const bookings = await prisma.booking.findMany({
      where,
      orderBy: { startsAt: 'desc' },
      include: {
        provider: true,
        service: true,
        unit: true,
        pet: true,
      },
    });

    const items: BookingSummary[] = bookings.map((b: BookingListItem) => ({
      id: b.id,
      reference: b.reference,
      userId: b.userId,
      petId: b.petId,
      petName: b.pet.name,
      petSpecies: b.pet.species as any,
      petSizeTier: b.pet.sizeTier as any,
      providerId: b.providerId,
      providerName: b.provider.name,
      providerSlug: b.provider.slug,
      providerAddress: `${b.provider.addressLine}, ${b.provider.city}`,
      providerPhone: b.provider.phone,
      serviceId: b.serviceId,
      serviceName: b.service?.name ?? null,
      boardingUnitId: b.boardingUnitId,
      boardingUnitName: b.unit?.name ?? null,
      kind: b.kind as any,
      status: b.status as any,
      startsAt: b.startsAt.toISOString(),
      endsAt: b.endsAt.toISOString(),
      priceCents: b.priceCents,
      currency: b.currency,
      priceBreakdown: b.priceBreakdown as any,
      addOnIds: b.addOnIds,
      notes: b.notes,
      visitType: b.visitType,
      symptoms: b.symptoms,
      reason: b.reason,
      emergencyAcknowledged: b.emergencyAcknowledged,
      careInstructions: b.careInstructions as any,
      isDemo: b.isDemo,
      cancellationHours: b.provider.cancellationHours,
      cancelledAt: b.cancelledAt?.toISOString() ?? null,
      cancelReason: b.cancelReason,
      createdAt: b.createdAt.toISOString(),
    }));

    return { items };
  });

  // GET /bookings/:id (Own booking detail only, 404 on foreign)
  fastify.get<{ Params: { id: string } }>('/bookings/:id', async (request, reply) => {
    const userId = request.user!.userId;
    const { id } = request.params;
    const b = await scopedRepo(userId).bookings.findById(id, {
      provider: true,
      service: true,
      unit: true,
      pet: true,
    } as any);

    const booking = b as any;

    const summary: BookingSummary = {
      id: booking.id,
      reference: booking.reference,
      userId: booking.userId,
      petId: booking.petId,
      petName: booking.pet.name,
      petSpecies: booking.pet.species,
      petSizeTier: booking.pet.sizeTier,
      providerId: booking.providerId,
      providerName: booking.provider.name,
      providerSlug: booking.provider.slug,
      providerAddress: `${booking.provider.addressLine}, ${booking.provider.city}`,
      providerPhone: booking.provider.phone,
      serviceId: booking.serviceId,
      serviceName: booking.service?.name ?? null,
      boardingUnitId: booking.boardingUnitId,
      boardingUnitName: booking.unit?.name ?? null,
      kind: booking.kind,
      status: booking.status,
      startsAt: booking.startsAt.toISOString(),
      endsAt: booking.endsAt.toISOString(),
      priceCents: booking.priceCents,
      currency: booking.currency,
      priceBreakdown: booking.priceBreakdown,
      addOnIds: booking.addOnIds,
      notes: booking.notes,
      visitType: booking.visitType,
      symptoms: booking.symptoms,
      reason: booking.reason,
      emergencyAcknowledged: booking.emergencyAcknowledged,
      careInstructions: booking.careInstructions,
      isDemo: booking.isDemo,
      cancellationHours: booking.provider.cancellationHours,
      cancelledAt: booking.cancelledAt?.toISOString() ?? null,
      cancelReason: booking.cancelReason,
      createdAt: booking.createdAt.toISOString(),
    };

    return summary;
  });

  // POST /bookings/:id/cancel
  fastify.post<{ Params: { id: string } }>('/bookings/:id/cancel', async (request, reply) => {
    const userId = request.user!.userId;
    const { id } = request.params;
    const body = CancelBookingSchema.parse(request.body || {});

    // Scoped check (404 on foreign)
    const existing = await prisma.booking.findFirst({
      where: { id, userId },
      include: { provider: true },
    });

    if (!existing) {
      throw new NotFoundError('Booking not found');
    }

    if (existing.status === BookingStatus.CANCELLED) {
      throw new ValidationError('Booking is already cancelled');
    }

    const hoursUntilStart = (existing.startsAt.getTime() - Date.now()) / (3600 * 1000);
    const feeApplies = hoursUntilStart < existing.provider.cancellationHours;

    const updated = await prisma.booking.update({
      where: { id },
      data: {
        status: BookingStatus.CANCELLED,
        cancelledAt: new Date(),
        cancelReason: body.reason || 'Customer requested cancellation',
      },
    });

    return {
      success: true,
      bookingId: updated.id,
      status: updated.status,
      feeApplies,
      feeNote: feeApplies
        ? `Cancellation occurred within the ${existing.provider.cancellationHours}h window.`
        : null,
    };
  });

  // POST /bookings/:id/reschedule
  fastify.post<{ Params: { id: string } }>('/bookings/:id/reschedule', async (request, reply) => {
    const userId = request.user!.userId;
    const { id } = request.params;
    const body = RescheduleBookingSchema.parse(request.body);

    const startsAtDate = new Date(body.startsAt);
    const endsAtDate = new Date(body.endsAt);

    if (startsAtDate >= endsAtDate) {
      throw new ValidationError('End time must be after start time');
    }

    // Scoped check
    const existing = await prisma.booking.findFirst({
      where: { id, userId },
      include: {
        provider: { include: { hours: true, units: true } },
        pet: { include: { vaccinations: true } },
      },
    });

    if (!existing) {
      throw new NotFoundError('Booking not found');
    }

    if (existing.status === BookingStatus.CANCELLED) {
      throw new ValidationError('Cannot reschedule a cancelled booking');
    }

    const timeZone = existing.provider.timezone || 'America/New_York';

    // -----------------------------------------------------------------
    // BOARDING RESCHEDULE
    // -----------------------------------------------------------------
    if (existing.kind === BookingKind.BOARDING) {
      const unit = existing.provider.units.find((u) => u.id === existing.boardingUnitId);
      if (!unit) {
        throw new NotFoundError('Boarding unit not found');
      }

      // Check lead time
      const checkInStr = formatDateInTimezone(startsAtDate, timeZone);
      const checkOutStr = formatDateInTimezone(endsAtDate, timeZone);
      const todayInTz = formatDateInTimezone(new Date(), timeZone);

      if (checkInStr <= todayInTz) {
        throw new ValidationError('Boarding check-in must be booked at least one day in advance');
      }

      // Vaccine check through new check-out date
      const vaccineCheck = validateBoardingVaccines(existing.pet.species, existing.pet.vaccinations, endsAtDate);
      if (!vaccineCheck.valid) {
        throw new VaccinesRequiredError('Pet vaccinations must be valid through the new check-out date');
      }

      const nights = getStayNightDates(checkInStr, checkOutStr);

      const updated = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        const lockKey = `boarding_unit:${unit.id}`;
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))`;

        // Check unit capacity for every night of new stay excluding this booking
        const existingBookings = await tx.booking.findMany({
          where: {
            id: { not: existing.id },
            boardingUnitId: unit.id,
            status: { not: BookingStatus.CANCELLED },
            startsAt: { lt: endsAtDate },
            endsAt: { gt: startsAtDate },
          },
          select: { startsAt: true, endsAt: true },
        });

        for (const nightStr of nights) {
          const occupiedCount = existingBookings.filter((b) => {
            const bStart = formatDateInTimezone(b.startsAt, timeZone);
            const bEnd = formatDateInTimezone(b.endsAt, timeZone);
            return bStart <= nightStr && nightStr < bEnd;
          }).length;

          if (occupiedCount >= unit.capacity) {
            throw new ConflictError(ErrorCode.SLOT_TAKEN, `Selected suite is fully booked on night ${nightStr}`);
          }
        }

        const baseCents = nights.length * unit.nightlyCents;
        const addOnsCents = (existing.priceBreakdown as any)?.addOnsCents || 0;
        const totalCents = baseCents + addOnsCents;

        return tx.booking.update({
          where: { id: existing.id },
          data: {
            startsAt: startsAtDate,
            endsAt: endsAtDate,
            priceCents: totalCents,
            priceBreakdown: {
              ...(existing.priceBreakdown as any),
              nights: nights.length,
              nightlyCents: unit.nightlyCents,
              baseCents,
              totalCents,
            },
            status: existing.provider.autoConfirm ? BookingStatus.CONFIRMED : BookingStatus.PENDING,
            cancelledAt: null,
            cancelReason: null,
          },
        });
      });

      return {
        success: true,
        bookingId: updated.id,
        reference: updated.reference,
        startsAt: updated.startsAt.toISOString(),
        endsAt: updated.endsAt.toISOString(),
        status: updated.status,
      };
    }

    // -----------------------------------------------------------------
    // GROOMING / VET RESCHEDULE
    // -----------------------------------------------------------------
    const updated = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const lockKey = `${existing.providerId}:${startsAtDate.toISOString()}`;
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))`;

      const weekday = startsAtDate.getUTCDay();
      const schedule = existing.provider.hours.find((h) => h.weekday === weekday) || existing.provider.hours[0];
      const stations = schedule?.stations || 1;

      // Count overlapping bookings excluding current booking
      const overlapping = await tx.booking.count({
        where: {
          id: { not: existing.id },
          providerId: existing.providerId,
          status: { not: BookingStatus.CANCELLED },
          startsAt: { lt: endsAtDate },
          endsAt: { gt: startsAtDate },
        },
      });

      if (overlapping >= stations) {
        throw new ConflictError(ErrorCode.SLOT_TAKEN, 'The requested new slot is not available');
      }

      return tx.booking.update({
        where: { id: existing.id },
        data: {
          startsAt: startsAtDate,
          endsAt: endsAtDate,
          status: existing.provider.autoConfirm ? BookingStatus.CONFIRMED : BookingStatus.PENDING,
          cancelledAt: null,
          cancelReason: null,
        },
      });
    });

    return {
      success: true,
      bookingId: updated.id,
      reference: updated.reference,
      startsAt: updated.startsAt.toISOString(),
      endsAt: updated.endsAt.toISOString(),
      status: updated.status,
    };
  });
};
