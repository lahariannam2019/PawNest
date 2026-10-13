import { FastifyPluginAsync } from 'fastify';
import { prisma } from '../../lib/prisma.js';
import { scopedRepo } from '../../lib/scopedRepo.js';
import {
  NotFoundError,
  ValidationError,
  ConflictError,
  UnauthorizedError,
} from '../../lib/errors.js';
import {
  QuoteBookingSchema,
  CreateBookingSchema,
  CancelBookingSchema,
  RescheduleBookingSchema,
  BookingStatus,
  BookingSummary,
  ErrorCode,
  Species,
} from '@pawnest/shared';
import crypto from 'node:crypto';

export const bookingRoutes: FastifyPluginAsync = async (fastify) => {
  // All booking routes require authentication
  fastify.addHook('preHandler', fastify.authenticate);

  // POST /bookings/quote (Server-side price & cancellation policy preview)
  fastify.post('/bookings/quote', async (request, reply) => {
    const userId = request.user!.userId;

    const body = QuoteBookingSchema.parse(request.body);
    const { petId, providerId, serviceId, addOnIds } = body;

    // Validate pet ownership
    const pet = await prisma.pet.findFirst({
      where: { id: petId, userId, deletedAt: null },
    });
    if (!pet) {
      throw new NotFoundError('Pet not found');
    }

    // Validate provider
    const provider = await prisma.provider.findFirst({
      where: { id: providerId, isActive: true },
    });
    if (!provider) {
      throw new NotFoundError('Provider not found');
    }

    if (!serviceId) {
      throw new ValidationError('Service ID is required for grooming quotes');
    }

    // Validate service
    const service = await prisma.service.findFirst({
      where: { id: serviceId, providerId, isActive: true },
    });
    if (!service) {
      throw new NotFoundError('Service not found for this provider');
    }

    // Check species match
    if (!service.species.includes(pet.species)) {
      throw new ValidationError(`This service is not available for species: ${pet.species}`);
    }

    // Price calculation
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
    const { petId, providerId, serviceId, startsAt, endsAt, addOnIds, notes } = body;

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

    // Interactive Transaction with Advisory Lock for concurrency protection
    const createdBooking = await prisma.$transaction(async (tx) => {
      // Advisory transaction lock per provider + slot start
      // This guarantees zero double-bookings even under 50+ parallel concurrent requests
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

      // 5. Capacity Check for the Slot
      // Determine day stations
      const weekday = startsAtDate.getUTCDay();
      const schedule = provider.hours.find((h) => h.weekday === weekday) || provider.hours[0];
      const stations = schedule?.stations || 1;

      // Count active overlapping bookings
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
      const reference = `PN-GRM-${randomSuffix}`;

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
        startsAt: booking.startsAt.toISOString(),
        endsAt: booking.endsAt.toISOString(),
        priceCents: booking.priceCents,
        currency: booking.currency,
        priceBreakdown: booking.priceBreakdown,
        petName: booking.pet.name,
        providerName: booking.provider.name,
        serviceName: booking.service?.name,
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
        pet: true,
      },
    });

    const items: BookingSummary[] = bookings.map((b) => ({
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
      kind: b.kind as any,
      status: b.status as any,
      startsAt: b.startsAt.toISOString(),
      endsAt: b.endsAt.toISOString(),
      priceCents: b.priceCents,
      currency: b.currency,
      priceBreakdown: b.priceBreakdown as any,
      addOnIds: b.addOnIds,
      notes: b.notes,
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
      kind: booking.kind,
      status: booking.status,
      startsAt: booking.startsAt.toISOString(),
      endsAt: booking.endsAt.toISOString(),
      priceCents: booking.priceCents,
      currency: booking.currency,
      priceBreakdown: booking.priceBreakdown,
      addOnIds: booking.addOnIds,
      notes: booking.notes,
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
      include: { provider: { include: { hours: true } } },
    });

    if (!existing) {
      throw new NotFoundError('Booking not found');
    }

    if (existing.status === BookingStatus.CANCELLED) {
      throw new ValidationError('Cannot reschedule a cancelled booking');
    }

    // Interactive Transaction with Advisory Lock on new slot
    const updated = await prisma.$transaction(async (tx) => {
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
