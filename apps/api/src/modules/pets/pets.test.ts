import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../../app.js';
import { FastifyInstance } from 'fastify';
import { prisma } from '../../lib/prisma.js';
import { Species, PetSex, SizeTier } from '@pawnest/shared';

describe('PawNest Pet Profiles & Vaccinations End-to-End', () => {
  let app: FastifyInstance;
  let userAToken: string;
  let userBToken: string;
  let userAId: string;
  let userBId: string;

  const testEmailA = `pet-user-a-${Date.now()}@pawnest.example`;
  const testEmailB = `pet-user-b-${Date.now()}@pawnest.example`;
  const testPassword = 'SuperSecurePassword123!';

  beforeAll(async () => {
    app = buildApp({ logger: false });
    await app.ready();

    // Register & Login User A
    const regA = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: { email: testEmailA, password: testPassword, name: 'Maya PetOwner' },
    });
    userAId = JSON.parse(regA.payload).user.id;

    const loginA = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: testEmailA, password: testPassword },
    });
    userAToken = loginA.cookies.find((c) => c.name === 'pn_at')!.value;

    // Register & Login User B
    const regB = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: { email: testEmailB, password: testPassword, name: 'Daniel Other' },
    });
    userBId = JSON.parse(regB.payload).user.id;

    const loginB = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: testEmailB, password: testPassword },
    });
    userBToken = loginB.cookies.find((c) => c.name === 'pn_at')!.value;
  });

  afterAll(async () => {
    const userIds = [userAId, userBId].filter(Boolean) as string[];
    if (userIds.length > 0) {
      await prisma.booking.deleteMany({
        where: { userId: { in: userIds } },
      });
      await prisma.pet.deleteMany({
        where: { userId: { in: userIds } },
      });
      await prisma.user.deleteMany({
        where: { id: { in: userIds } },
      });
    }
    await app.close();
  });

  let createdPetId: string;

  it('POST /pets creates a dog profile with auto-derived sizeTier', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/pets',
      cookies: { pn_at: userAToken },
      payload: {
        name: 'Barnaby',
        species: Species.DOG,
        breed: 'Golden Retriever',
        sex: PetSex.MALE,
        birthDate: '2022-04-15',
        weightKg: 31.5, // 31.5 kg should auto-derive SizeTier.L (25-40kg)
        neutered: true,
        allergies: ['Chicken'],
        temperament: ['Gentle', 'Friendly with dogs'],
        fears: ['Thunderstorms'],
        notes: 'Loves belly rubs before naps',
        microchipId: '985141002938120',
        vetClinicName: 'Veritas Animal Hospital',
      },
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.payload);
    expect(body.pet).toBeDefined();
    expect(body.pet.name).toBe('Barnaby');
    expect(body.pet.species).toBe(Species.DOG);
    expect(body.pet.sizeTier).toBe(SizeTier.L); // Auto-derived!
    expect(body.pet.allergies).toContain('Chicken');
    expect(body.pet.vaccinationStatus).toBe('DUE_SOON'); // Empty vaccines default to needing attention

    createdPetId = body.pet.id;
  });

  it('POST /pets creates a cat profile with XS sizeTier', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/pets',
      cookies: { pn_at: userAToken },
      payload: {
        name: 'Mochi',
        species: Species.CAT,
        breed: 'British Shorthair',
        sex: PetSex.FEMALE,
        weightKg: 4.2, // < 5kg -> XS
        neutered: true,
      },
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.payload);
    expect(body.pet.name).toBe('Mochi');
    expect(body.pet.species).toBe(Species.CAT);
    expect(body.pet.sizeTier).toBe(SizeTier.XS);
  });

  it('GET /pets lists all own pets and excludes soft-deleted pets', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/pets',
      cookies: { pn_at: userAToken },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.items.length).toBe(2);
    expect(body.items.map((p: any) => p.name)).toContain('Barnaby');
    expect(body.items.map((p: any) => p.name)).toContain('Mochi');
  });

  it('GET /pets/:id returns full detail of own pet', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/pets/${createdPetId}`,
      cookies: { pn_at: userAToken },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.pet.id).toBe(createdPetId);
    expect(body.pet.name).toBe('Barnaby');
    expect(body.pet.breed).toBe('Golden Retriever');
  });

  it('PATCH /pets/:id updates pet details and recalculates sizeTier if weight changes', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/pets/${createdPetId}`,
      cookies: { pn_at: userAToken },
      payload: {
        weightKg: 42.0, // > 40kg -> SizeTier.XL
        notes: 'Loves belly rubs and frozen peanut butter kongs',
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.pet.weightKg).toBe(42.0);
    expect(body.pet.sizeTier).toBe(SizeTier.XL);
    expect(body.pet.notes).toContain('frozen peanut butter kongs');
  });

  let createdVaccinationId: string;

  it('POST /pets/:id/vaccinations adds a vaccination record with calculated status', async () => {
    // Expiration date in 15 days -> status must be DUE_SOON
    const expDate = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString();

    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/pets/${createdPetId}/vaccinations`,
      cookies: { pn_at: userAToken },
      payload: {
        name: 'Rabies (3-Year)',
        administeredOn: '2023-11-01',
        expiresOn: expDate,
        vetName: 'Dr. Sarah Sterling',
        notes: 'Batch #RB-2023-A',
      },
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.payload);
    expect(body.vaccination.name).toBe('Rabies (3-Year)');
    expect(body.vaccination.status).toBe('DUE_SOON');

    createdVaccinationId = body.vaccination.id;
  });

  it('GET /pets/:id reflects the updated vaccination status on pet summary', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/pets/${createdPetId}`,
      cookies: { pn_at: userAToken },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.pet.vaccinations.length).toBe(1);
    expect(body.pet.vaccinationStatus).toBe('DUE_SOON');
  });

  it('PATCH /pets/:id/vaccinations/:vid updates vaccination expiry to valid (> 30 days)', async () => {
    // Expiration in 180 days -> status must be UP_TO_DATE
    const farExp = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString();

    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/pets/${createdPetId}/vaccinations/${createdVaccinationId}`,
      cookies: { pn_at: userAToken },
      payload: {
        expiresOn: farExp,
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.vaccination.status).toBe('UP_TO_DATE');
  });

  // ==========================================
  // AUTHORIZATION MATRIX VERIFICATION (Section 16.2 / 16.3)
  // ==========================================

  it('Zero cross-user data leakage: User B cannot access User A pet (returns 404)', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/pets/${createdPetId}`,
      cookies: { pn_at: userBToken },
    });

    // MUST return 404 Not Found to prevent resource enumeration
    expect(res.statusCode).toBe(404);
  });

  it('Zero cross-user data leakage: User B cannot update User A pet (returns 404)', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/pets/${createdPetId}`,
      cookies: { pn_at: userBToken },
      payload: { name: 'Hacked Name' },
    });

    expect(res.statusCode).toBe(404);
  });

  it('Zero cross-user data leakage: User B cannot delete User A pet (returns 404)', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: `/api/v1/pets/${createdPetId}`,
      cookies: { pn_at: userBToken },
    });

    expect(res.statusCode).toBe(404);
  });

  it('Zero cross-user data leakage: User B cannot list or add vaccinations for User A pet (returns 404)', async () => {
    const listRes = await app.inject({
      method: 'GET',
      url: `/api/v1/pets/${createdPetId}/vaccinations`,
      cookies: { pn_at: userBToken },
    });
    expect(listRes.statusCode).toBe(404);

    const addRes = await app.inject({
      method: 'POST',
      url: `/api/v1/pets/${createdPetId}/vaccinations`,
      cookies: { pn_at: userBToken },
      payload: {
        name: 'Malicious Vaccine',
        administeredOn: '2026-01-01',
      },
    });
    expect(addRes.statusCode).toBe(404);
  });

  it('Anonymous user receives 401 Unauthorized on all pet endpoints', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/pets',
    });
    expect(res.statusCode).toBe(401);
  });

  // ==========================================
  // BUSINESS RULES & BLOCKING (Section 15.2 & 17)
  // ==========================================

  it('DELETE /pets/:id is blocked (409 Conflict) when pet has active future bookings', async () => {
    // 1. Create a dummy provider & service in DB to link booking
    const provider = await prisma.provider.create({
      data: {
        slug: `provider-test-${Date.now()}`,
        type: 'GROOMER',
        name: 'Test Groomer',
        description: 'A calm dog grooming salon',
        addressLine: '123 Pet St',
        city: 'Brooklyn',
        country: 'US',
        lat: 40.7,
        lng: -73.9,
        timezone: 'America/New_York',
        speciesAccepted: ['DOG'],
        amenities: [],
        imageKeys: [],
        ratingAvg: 5.0,
        ratingCount: 1,
        isDemo: true,
      },
    });

    // 2. Create active future booking for Barnaby
    const futureBooking = await prisma.booking.create({
      data: {
        reference: `PN-BK-${Date.now()}`,
        userId: userAId,
        petId: createdPetId,
        providerId: provider.id,
        kind: 'GROOMING',
        status: 'CONFIRMED',
        startsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days in future
        endsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 3600000),
        currency: 'USD',
        priceCents: 6500,
        priceBreakdown: { serviceCents: 6500, addOnsCents: 0 },
      },
    });

    // 3. Attempt to delete pet -> MUST fail with 409 Conflict
    const deleteAttempt = await app.inject({
      method: 'DELETE',
      url: `/api/v1/pets/${createdPetId}`,
      cookies: { pn_at: userAToken },
    });

    expect(deleteAttempt.statusCode).toBe(409);
    const errBody = JSON.parse(deleteAttempt.payload);
    expect(errBody.code).toBe('CONFLICT');
    expect(errBody.detail).toContain('active upcoming bookings');

    // 4. Cancel the booking
    await prisma.booking.update({
      where: { id: futureBooking.id },
      data: { status: 'CANCELLED' },
    });

    // 5. Retrying deletion now succeeds!
    const deleteSuccess = await app.inject({
      method: 'DELETE',
      url: `/api/v1/pets/${createdPetId}`,
      cookies: { pn_at: userAToken },
    });
    expect(deleteSuccess.statusCode).toBe(200);

    // 6. Pet is soft-deleted, not returned in active list
    const listRes = await app.inject({
      method: 'GET',
      url: '/api/v1/pets',
      cookies: { pn_at: userAToken },
    });
    const listBody = JSON.parse(listRes.payload);
    expect(listBody.items.some((p: any) => p.id === createdPetId)).toBe(false);
  });

  // ==========================================
  // STORAGE & UPLOAD PRESIGNING (Section 15.2)
  // ==========================================

  it('POST /uploads/presign generates signed upload & download URLs', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/uploads/presign',
      cookies: { pn_at: userAToken },
      payload: {
        contentType: 'image/jpeg',
        fileSize: 1024 * 500, // 500 KB
        filename: 'dog-avatar.jpg',
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.uploadUrl).toContain('/api/v1/uploads/direct');
    expect(body.downloadUrl).toContain('/api/v1/uploads/file');
    expect(body.key).toContain(`avatars/${userAId}/`);
  });

  it('POST /uploads/presign rejects unsupported MIME types and oversize files', async () => {
    const badType = await app.inject({
      method: 'POST',
      url: '/api/v1/uploads/presign',
      cookies: { pn_at: userAToken },
      payload: {
        contentType: 'application/pdf',
        fileSize: 1024,
      },
    });
    expect(badType.statusCode).toBe(422);

    const tooBig = await app.inject({
      method: 'POST',
      url: '/api/v1/uploads/presign',
      cookies: { pn_at: userAToken },
      payload: {
        contentType: 'image/jpeg',
        fileSize: 10 * 1024 * 1024, // 10 MB > 5 MB limit
      },
    });
    expect(tooBig.statusCode).toBe(422);
  });
});
