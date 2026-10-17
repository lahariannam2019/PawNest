import { FastifyPluginAsync } from 'fastify';
import { prisma } from '../../lib/prisma.js';
import { scopedRepo } from '../../lib/scopedRepo.js';
import { NotFoundError, ConflictError } from '../../lib/errors.js';
import { storageAdapter } from '../../integrations/storage/storage.js';
import {
  CreatePetSchema,
  UpdatePetSchema,
  CreateVaccinationSchema,
  UpdateVaccinationSchema,
  deriveSizeTier,
  getVaccineStatus,
  VaccinationStatus,
  ErrorCode,
} from '@pawnest/shared';

// Helper to format pet DTO with signed avatar URL and computed vaccine status
export async function formatPetDto(pet: any) {
  let avatarUrl: string | null = null;
  if (pet.avatarKey) {
    avatarUrl = await storageAdapter.getSignedDownloadUrl(pet.avatarKey);
  }

  const vaccinations = (pet.vaccinations || []).map((v: any) => ({
    id: v.id,
    petId: v.petId,
    name: v.name,
    administeredOn: v.administeredOn.toISOString(),
    expiresOn: v.expiresOn ? v.expiresOn.toISOString() : null,
    vetName: v.vetName,
    notes: v.notes,
    status: getVaccineStatus(v.expiresOn),
  }));

  // Overall vaccination status for the pet
  let overallVaccineStatus: typeof VaccinationStatus[keyof typeof VaccinationStatus] =
    VaccinationStatus.UP_TO_DATE;

  if (vaccinations.length === 0) {
    overallVaccineStatus = VaccinationStatus.DUE_SOON;
  } else {
    const hasExpired = vaccinations.some((v: any) => v.status === VaccinationStatus.EXPIRED);
    const hasDueSoon = vaccinations.some((v: any) => v.status === VaccinationStatus.DUE_SOON);
    if (hasExpired) {
      overallVaccineStatus = VaccinationStatus.EXPIRED;
    } else if (hasDueSoon) {
      overallVaccineStatus = VaccinationStatus.DUE_SOON;
    }
  }

  return {
    id: pet.id,
    userId: pet.userId,
    name: pet.name,
    species: pet.species,
    breed: pet.breed,
    sex: pet.sex,
    birthDate: pet.birthDate ? pet.birthDate.toISOString() : null,
    approxAgeMonths: pet.approxAgeMonths,
    weightKg: pet.weightKg ? Number(pet.weightKg) : null,
    sizeTier: pet.sizeTier,
    neutered: pet.neutered,
    microchipId: pet.microchipId,
    allergies: pet.allergies,
    conditions: pet.conditions,
    medications: pet.medications,
    temperament: pet.temperament,
    fears: pet.fears,
    notes: pet.notes,
    vetClinicName: pet.vetClinicName,
    avatarKey: pet.avatarKey,
    avatarUrl,
    vaccinations,
    vaccinationStatus: overallVaccineStatus,
    createdAt: pet.createdAt.toISOString(),
    updatedAt: pet.updatedAt.toISOString(),
  };
}

export const petRoutes: FastifyPluginAsync = async (app) => {
  // All pet routes require authentication
  app.addHook('preHandler', app.authenticate);

  // GET /pets — List own pets
  app.get('/pets', async (request) => {
    const userId = request.user!.userId;
    const repo = scopedRepo(userId);

    const pets = await repo.pets.findMany({
      include: { vaccinations: { orderBy: { administeredOn: 'desc' } } },
      orderBy: { createdAt: 'desc' },
    });

    const items = await Promise.all(pets.map(formatPetDto));
    return { items };
  });

  // POST /pets — Create new pet profile
  app.post(
    '/pets',
    {
      schema: {
        body: CreatePetSchema,
      },
    },
    async (request, reply) => {
      const userId = request.user!.userId;
      const body = request.body as any;

      // Check for active duplicate pet with the same name for this owner
      const existing = await prisma.pet.findFirst({
        where: {
          userId,
          name: { equals: body.name.trim(), mode: 'insensitive' },
          deletedAt: null,
        },
      });
      if (existing) {
        throw new ConflictError(ErrorCode.CONFLICT, `A companion named "${body.name.trim()}" already exists in your profile.`);
      }

      // Auto-derive sizeTier if not specified
      let sizeTier = body.sizeTier;
      if (!sizeTier && body.weightKg != null) {
        sizeTier = deriveSizeTier(Number(body.weightKg));
      }

      const pet = await prisma.pet.create({
        data: {
          name: body.name,
          species: body.species,
          breed: body.breed || null,
          sex: body.sex || 'UNKNOWN',
          birthDate: body.birthDate ? new Date(body.birthDate) : null,
          approxAgeMonths: body.approxAgeMonths || null,
          weightKg: body.weightKg != null ? Number(body.weightKg) : null,
          sizeTier: sizeTier || null,
          neutered: body.neutered !== undefined ? body.neutered : null,
          microchipId: body.microchipId || null,
          allergies: body.allergies || [],
          conditions: body.conditions || [],
          medications: body.medications || [],
          temperament: body.temperament || [],
          fears: body.fears || [],
          notes: body.notes || null,
          vetClinicName: body.vetClinicName || null,
          avatarKey: body.avatarKey || null,
          userId,
        },
        include: { vaccinations: true },
      });

      const formatted = await formatPetDto(pet);
      return reply.status(201).send({ pet: formatted });
    }
  );

  // GET /pets/:id — Detail view (Returns 404 for other users' pets)
  app.get('/pets/:id', async (request) => {
    const { id } = request.params as { id: string };
    const userId = request.user!.userId;
    const repo = scopedRepo(userId);

    const pet = await repo.pets.findById(id, {
      vaccinations: { orderBy: { administeredOn: 'desc' } },
      bookings: {
        orderBy: { startsAt: 'desc' },
        take: 5,
        include: { provider: true, service: true },
      },
    });

    const formatted = await formatPetDto(pet);
    return { pet: formatted, bookings: (pet as any).bookings || [] };
  });

  // PATCH /pets/:id — Update pet
  app.patch(
    '/pets/:id',
    {
      schema: {
        body: UpdatePetSchema,
      },
    },
    async (request) => {
      const { id } = request.params as { id: string };
      const userId = request.user!.userId;
      const repo = scopedRepo(userId);
      const body = request.body as any;

      // Verify pet exists and belongs to user (throws 404 if not owner)
      const existing = await repo.pets.findById(id);

      let sizeTier = body.sizeTier !== undefined ? body.sizeTier : existing.sizeTier;
      if (body.weightKg != null && body.sizeTier === undefined) {
        sizeTier = deriveSizeTier(Number(body.weightKg));
      }

      const updateData: any = { ...body };
      if (body.birthDate !== undefined) {
        updateData.birthDate = body.birthDate ? new Date(body.birthDate) : null;
      }
      if (body.weightKg !== undefined) {
        updateData.weightKg = body.weightKg != null ? Number(body.weightKg) : null;
      }
      if (sizeTier !== undefined) {
        updateData.sizeTier = sizeTier || null;
      }

      const updated = await prisma.pet.update({
        where: { id },
        data: updateData,
        include: { vaccinations: { orderBy: { administeredOn: 'desc' } } },
      });

      const formatted = await formatPetDto(updated);
      return { pet: formatted };
    }
  );

  // DELETE /pets/:id — Soft delete (Blocked with 409 if active future bookings exist)
  app.delete('/pets/:id', async (request) => {
    const { id } = request.params as { id: string };
    const userId = request.user!.userId;
    const repo = scopedRepo(userId);

    // Verify ownership (404 if not owner)
    await repo.pets.findById(id);

    // Check future active bookings (Section 15.2: blocked -> 409)
    const futureActiveBookings = await prisma.booking.count({
      where: {
        petId: id,
        startsAt: { gte: new Date() },
        status: { in: ['PENDING', 'CONFIRMED'] },
      },
    });

    if (futureActiveBookings > 0) {
      throw new ConflictError(
        ErrorCode.CONFLICT,
        'Cannot delete pet with active upcoming bookings. Please reschedule or cancel the bookings first.'
      );
    }

    await repo.pets.softDelete(id);
    return { success: true, message: 'Pet profile safely deleted' };
  });

  // GET /pets/:id/vaccinations
  app.get('/pets/:id/vaccinations', async (request) => {
    const { id } = request.params as { id: string };
    const userId = request.user!.userId;
    const repo = scopedRepo(userId);

    // Verify pet ownership (404 if not owner)
    await repo.pets.findById(id);

    const vaccinations = await prisma.vaccination.findMany({
      where: { petId: id },
      orderBy: { administeredOn: 'desc' },
    });

    const items = vaccinations.map((v) => ({
      id: v.id,
      petId: v.petId,
      name: v.name,
      administeredOn: v.administeredOn.toISOString(),
      expiresOn: v.expiresOn ? v.expiresOn.toISOString() : null,
      vetName: v.vetName,
      notes: v.notes,
      status: getVaccineStatus(v.expiresOn),
    }));

    return { items };
  });

  // POST /pets/:id/vaccinations
  app.post(
    '/pets/:id/vaccinations',
    {
      schema: {
        body: CreateVaccinationSchema,
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const userId = request.user!.userId;
      const repo = scopedRepo(userId);

      // Verify pet ownership (404 if not owner)
      await repo.pets.findById(id);

      const body = request.body as any;
      const vaccination = await prisma.vaccination.create({
        data: {
          petId: id,
          name: body.name,
          administeredOn: new Date(body.administeredOn),
          expiresOn: body.expiresOn ? new Date(body.expiresOn) : null,
          vetName: body.vetName || null,
          notes: body.notes || null,
        },
      });

      return reply.status(201).send({
        vaccination: {
          id: vaccination.id,
          petId: vaccination.petId,
          name: vaccination.name,
          administeredOn: vaccination.administeredOn.toISOString(),
          expiresOn: vaccination.expiresOn ? vaccination.expiresOn.toISOString() : null,
          vetName: vaccination.vetName,
          notes: vaccination.notes,
          status: getVaccineStatus(vaccination.expiresOn),
        },
      });
    }
  );

  // PATCH /pets/:id/vaccinations/:vid
  app.patch(
    '/pets/:id/vaccinations/:vid',
    {
      schema: {
        body: UpdateVaccinationSchema,
      },
    },
    async (request) => {
      const { id, vid } = request.params as { id: string; vid: string };
      const userId = request.user!.userId;
      const repo = scopedRepo(userId);

      // Verify pet ownership
      await repo.pets.findById(id);

      // Verify vaccination exists and belongs to this pet
      const existing = await prisma.vaccination.findFirst({
        where: { id: vid, petId: id },
      });
      if (!existing) throw new NotFoundError('Vaccination record not found');

      const body = request.body as any;
      const updateData: any = {};
      if (body.name !== undefined) updateData.name = body.name;
      if (body.administeredOn !== undefined) updateData.administeredOn = new Date(body.administeredOn);
      if (body.expiresOn !== undefined) {
        updateData.expiresOn = body.expiresOn ? new Date(body.expiresOn) : null;
      }
      if (body.vetName !== undefined) updateData.vetName = body.vetName;
      if (body.notes !== undefined) updateData.notes = body.notes;

      const updated = await prisma.vaccination.update({
        where: { id: vid },
        data: updateData,
      });

      return {
        vaccination: {
          id: updated.id,
          petId: updated.petId,
          name: updated.name,
          administeredOn: updated.administeredOn.toISOString(),
          expiresOn: updated.expiresOn ? updated.expiresOn.toISOString() : null,
          vetName: updated.vetName,
          notes: updated.notes,
          status: getVaccineStatus(updated.expiresOn),
        },
      };
    }
  );

  // DELETE /pets/:id/vaccinations/:vid
  app.delete('/pets/:id/vaccinations/:vid', async (request) => {
    const { id, vid } = request.params as { id: string; vid: string };
    const userId = request.user!.userId;
    const repo = scopedRepo(userId);

    // Verify pet ownership
    await repo.pets.findById(id);

    const existing = await prisma.vaccination.findFirst({
      where: { id: vid, petId: id },
    });
    if (!existing) throw new NotFoundError('Vaccination record not found');

    await prisma.vaccination.delete({ where: { id: vid } });
    return { success: true, message: 'Vaccination record removed' };
  });
};
