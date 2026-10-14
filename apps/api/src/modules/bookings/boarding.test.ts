import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../../app.js';
import { FastifyInstance } from 'fastify';
import { prisma } from '../../lib/prisma.js';
import { ProviderType, BookingKind, BookingStatus, Species } from '@prisma/client';
import crypto from 'node:crypto';

describe('PawNest Boarding & Multi-Day Stays End-to-End (Phase 5)', () => {
  let app: FastifyInstance;
  let userACookie: string;
  let userBCookie: string;
  let userAId: string;
  let userBId: string;

  let eligibleDogId: string;   // All vaccines valid through 2027
  let missingVaccineDogId: string; // Missing Bordetella
  let expiringVaccineDogId: string; // Vaccine expires during the stay

  let testProviderId: string;
  let testProviderSlug: string;
  let testUnitId: string;
  const nightlyCents = 8000;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();

    const timestamp = Date.now();

    const emailA = `boarding-user-a-${timestamp}@pawnest.example`;
    const emailB = `boarding-user-b-${timestamp}@pawnest.example`;
    const password = 'Password123!';

    // 1. Register & Login User A
    const userARes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        email: emailA,
        password,
        name: 'Maya Boarder',
      },
    });
    expect(userARes.statusCode).toBe(201);
    userAId = userARes.json().user.id;

    const loginResA = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: emailA, password },
    });
    const tokenA = loginResA.cookies.find((c) => c.name === 'pn_at')!.value;
    userACookie = `pn_at=${tokenA}`;

    // 2. Register & Login User B
    const userBRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        email: emailB,
        password,
        name: 'Daniel Other',
      },
    });
    expect(userBRes.statusCode).toBe(201);
    userBId = userBRes.json().user.id;

    const loginResB = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: emailB, password },
    });
    const tokenB = loginResB.cookies.find((c) => c.name === 'pn_at')!.value;
    userBCookie = `pn_at=${tokenB}`;

    // 3. Create Pets for User A:
    // Pet 1: Eligible dog (Valid Rabies, DHPP, Bordetella for 1+ year)
    const p1 = await prisma.pet.create({
      data: {
        userId: userAId,
        name: 'Nova',
        species: Species.DOG,
        breed: 'Golden Retriever',
        vaccinations: {
          create: [
            {
              name: 'Rabies (3-Year)',
              administeredOn: new Date('2026-01-01'),
              expiresOn: new Date('2028-01-01'),
            },
            {
              name: 'DHPP Core Booster',
              administeredOn: new Date('2026-01-01'),
              expiresOn: new Date('2028-01-01'),
            },
            {
              name: 'Bordetella',
              administeredOn: new Date('2026-01-01'),
              expiresOn: new Date('2028-01-01'),
            },
          ],
        },
      },
    });
    eligibleDogId = p1.id;

    // Pet 2: Missing vaccine dog (Has Rabies & DHPP, missing Bordetella)
    const p2 = await prisma.pet.create({
      data: {
        userId: userAId,
        name: 'Rusty',
        species: Species.DOG,
        breed: 'Terrier',
        vaccinations: {
          create: [
            {
              name: 'Rabies',
              administeredOn: new Date('2026-01-01'),
              expiresOn: new Date('2028-01-01'),
            },
            {
              name: 'DHPP',
              administeredOn: new Date('2026-01-01'),
              expiresOn: new Date('2028-01-01'),
            },
          ],
        },
      },
    });
    missingVaccineDogId = p2.id;

    // Pet 3: Expiring vaccine dog (Bordetella expires on 2026-11-15)
    const p3 = await prisma.pet.create({
      data: {
        userId: userAId,
        name: 'Archie',
        species: Species.DOG,
        breed: 'Beagle',
        vaccinations: {
          create: [
            {
              name: 'Rabies',
              administeredOn: new Date('2026-01-01'),
              expiresOn: new Date('2028-01-01'),
            },
            {
              name: 'DHPP',
              administeredOn: new Date('2026-01-01'),
              expiresOn: new Date('2028-01-01'),
            },
            {
              name: 'Bordetella',
              administeredOn: new Date('2025-11-15'),
              expiresOn: new Date('2026-11-15'), // Expires Nov 15, 2026
            },
          ],
        },
      },
    });
    expiringVaccineDogId = p3.id;

    // 4. Create Boarding Provider with 1 unit having capacity 1 (for strict concurrency test)
    testProviderSlug = `luxury-paws-inn-${timestamp}`;
    const prov = await prisma.provider.create({
      data: {
        slug: testProviderSlug,
        type: ProviderType.BOARDING,
        name: 'Luxury Paws Inn',
        description: 'Elite country boarding retreat with private pavilions',
        addressLine: '500 Country Lane',
        city: 'Bedford',
        country: 'US',
        lat: 41.2,
        lng: -73.6,
        timezone: 'America/New_York',
        speciesAccepted: [Species.DOG],
        amenities: ['Private Suites', 'Webcam', 'Outdoor Yard'],
        imageKeys: ['hero-dog.jpg'],
        cancellationHours: 24,
        autoConfirm: true,
        units: {
          create: [
            {
              name: 'Royal Garden Suite',
              description: 'Private suite with private grass courtyard',
              capacity: 1, // Only 1 spot per night!
              maxPets: 1,
              nightlyCents,
              currency: 'USD',
              amenities: ['Webcam', 'Orthopaedic Bed'],
            },
          ],
        },
        services: {
          create: [
            {
              name: 'Evening Bedtime Story & Massage',
              description: '20 min relaxation routine',
              durationMin: 20,
              basePriceCents: 2000,
              isAddOn: true,
              kind: BookingKind.BOARDING,
              species: [Species.DOG],
            },
          ],
        },
      },
      include: { units: true },
    });

    testProviderId = prov.id;
    testUnitId = prov.units[0].id;
  });

  afterAll(async () => {
    // Delete reviews before bookings to satisfy foreign key constraints
    await prisma.review.deleteMany({ where: { providerId: testProviderId } });
    await prisma.booking.deleteMany({ where: { providerId: testProviderId } });
    await prisma.service.deleteMany({ where: { providerId: testProviderId } });
    await prisma.boardingUnit.deleteMany({ where: { providerId: testProviderId } });
    await prisma.provider.deleteMany({ where: { id: testProviderId } });

    const petIds = [eligibleDogId, missingVaccineDogId, expiringVaccineDogId].filter(Boolean) as string[];
    if (petIds.length > 0) {
      await prisma.vaccination.deleteMany({ where: { petId: { in: petIds } } });
      await prisma.pet.deleteMany({ where: { id: { in: petIds } } });
    }

    const userIds = [userAId, userBId].filter(Boolean) as string[];
    if (userIds.length > 0) {
      await prisma.idempotencyRecord.deleteMany({ where: { userId: { in: userIds } } });
      await prisma.session.deleteMany({ where: { userId: { in: userIds } } });
      await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    }

    await app.close();
  });

  it('GET /providers includes boarding facilities with nightly price preview', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/providers?type=BOARDING',
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.items.length).toBeGreaterThanOrEqual(1);

    const found = body.items.find((p: any) => p.id === testProviderId);
    expect(found).toBeDefined();
    expect(found.type).toBe('BOARDING');
    expect(found.priceFromCents).toBe(nightlyCents);
  });

  it('GET /providers/:slug returns details including boarding units', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/providers/${testProviderSlug}`,
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.provider.name).toBe('Luxury Paws Inn');
    expect(body.units).toHaveLength(1);
    expect(body.units[0].name).toBe('Royal Garden Suite');
    expect(body.units[0].capacity).toBe(1);
  });

  it('GET /providers/:slug/boarding-availability calculates nightly remaining capacity', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/providers/${testProviderSlug}/boarding-availability?checkIn=2026-11-20&checkOut=2026-11-23`,
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.availability).toHaveLength(1);
    const suite = body.availability[0];
    expect(suite.available).toBe(true);
    expect(suite.nights).toBe(3); // Nov 20, 21, 22
    expect(suite.pricePerNightCents).toBe(nightlyCents);
    expect(suite.totalPriceCents).toBe(3 * nightlyCents);
    expect(suite.remainingPerNight['2026-11-20']).toBe(1);
    expect(suite.remainingPerNight['2026-11-21']).toBe(1);
    expect(suite.remainingPerNight['2026-11-22']).toBe(1);
  });

  it('POST /bookings/quote calculates correct multi-night price and previews vaccine check', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/bookings/quote',
      headers: { cookie: userACookie },
      payload: {
        petId: eligibleDogId,
        providerId: testProviderId,
        boardingUnitId: testUnitId,
        kind: 'BOARDING',
        startsAt: '2026-11-20T14:00:00Z',
        endsAt: '2026-11-24T11:00:00Z', // 4 nights: Nov 20, 21, 22, 23
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.priceBreakdown.nights).toBe(4);
    expect(body.priceBreakdown.nightlyCents).toBe(nightlyCents);
    expect(body.priceCents).toBe(4 * nightlyCents);
    expect(body.vaccineCheck.valid).toBe(true);
  });

  it('POST /bookings rejects booking when pet is missing required boarding vaccines', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/bookings',
      headers: {
        cookie: userACookie,
        'idempotency-key': `idemp-missing-vac-${Date.now()}`,
      },
      payload: {
        petId: missingVaccineDogId, // Rusty is missing Bordetella
        providerId: testProviderId,
        boardingUnitId: testUnitId,
        kind: 'BOARDING',
        startsAt: '2026-11-20T14:00:00Z',
        endsAt: '2026-11-23T11:00:00Z',
      },
    });

    expect(res.statusCode).toBe(422);
    const body = JSON.parse(res.body);
    expect(body.code).toBe('VACCINES_REQUIRED');
    expect(body.detail).toContain('Bordetella vaccination is required');
  });

  it('POST /bookings rejects booking when a core vaccine expires before check-out', async () => {
    // Archie's Bordetella expires on 2026-11-15. Stay is Nov 14 to Nov 18 -> check-out is AFTER expiry
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/bookings',
      headers: {
        cookie: userACookie,
        'idempotency-key': `idemp-expired-vac-${Date.now()}`,
      },
      payload: {
        petId: expiringVaccineDogId,
        providerId: testProviderId,
        boardingUnitId: testUnitId,
        kind: 'BOARDING',
        startsAt: '2026-11-14T14:00:00Z',
        endsAt: '2026-11-18T11:00:00Z',
      },
    });

    expect(res.statusCode).toBe(422);
    const body = JSON.parse(res.body);
    expect(body.code).toBe('VACCINES_REQUIRED');
    expect(body.detail).toContain('before check-out date');
  });

  it('POST /bookings successfully books stay for fully vaccinated pet and supports care instructions', async () => {
    const idempotencyKey = `idemp-success-bnd-${Date.now()}`;
    const payload = {
      petId: eligibleDogId,
      providerId: testProviderId,
      boardingUnitId: testUnitId,
      kind: 'BOARDING',
      startsAt: '2026-11-20T14:00:00Z',
      endsAt: '2026-11-23T11:00:00Z', // 3 nights
      notes: 'Please keep Nova active with morning fetch',
      careInstructions: {
        feeding: '2 cups Acana kibble at 8am and 6pm',
        medications: 'None',
        behaviour: 'Very friendly with golden retrievers',
        emergencyContact: 'Maya: 555-234-5678',
      },
    };

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/bookings',
      headers: {
        cookie: userACookie,
        'idempotency-key': idempotencyKey,
      },
      payload,
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.status).toBe('CONFIRMED');
    expect(body.priceCents).toBe(3 * nightlyCents);
    expect(body.reference).toMatch(/^PN-BND-/);
    expect(body.boardingUnitName).toBe('Royal Garden Suite');
    expect(body.careInstructions.feeding).toContain('2 cups Acana');

    // Test Idempotency Replay
    const replayRes = await app.inject({
      method: 'POST',
      url: '/api/v1/bookings',
      headers: {
        cookie: userACookie,
        'idempotency-key': idempotencyKey,
      },
      payload,
    });
    expect(replayRes.statusCode).toBe(201);
    expect(JSON.parse(replayRes.body).id).toBe(body.id);
  });

  it('enforces cross-user authorization isolation (returns 404 on User B accessing User A booking)', async () => {
    // List User A bookings
    const listRes = await app.inject({
      method: 'GET',
      url: '/api/v1/bookings?kind=BOARDING',
      headers: { cookie: userACookie },
    });
    const booking = JSON.parse(listRes.body).items[0];
    expect(booking).toBeDefined();

    // User B tries to view
    const viewRes = await app.inject({
      method: 'GET',
      url: `/api/v1/bookings/${booking.id}`,
      headers: { cookie: userBCookie },
    });
    expect(viewRes.statusCode).toBe(404);

    // User B tries to cancel
    const cancelRes = await app.inject({
      method: 'POST',
      url: `/api/v1/bookings/${booking.id}/cancel`,
      headers: { cookie: userBCookie },
      payload: { reason: 'Unauthorized cancel attempt' },
    });
    expect(cancelRes.statusCode).toBe(404);
  });

  it('CONCURRENCY TEST: Exactly 1 out of 25 parallel booking attempts succeeds for the final available capacity', async () => {
    // Suite has capacity: 1
    // Target dates: 2026-12-01 to 2026-12-04 (3 nights)
    const PARALLEL_REQUESTS = 25;
    const checkIn = '2026-12-01T14:00:00Z';
    const checkOut = '2026-12-04T11:00:00Z';

    const promises = Array.from({ length: PARALLEL_REQUESTS }, (_, idx) => {
      const idempotencyKey = `concur-bnd-${Date.now()}-${idx}`;
      return app.inject({
        method: 'POST',
        url: '/api/v1/bookings',
        headers: {
          cookie: userACookie,
          'idempotency-key': idempotencyKey,
        },
        payload: {
          petId: eligibleDogId,
          providerId: testProviderId,
          boardingUnitId: testUnitId,
          kind: 'BOARDING',
          startsAt: checkIn,
          endsAt: checkOut,
        },
      });
    });

    const results = await Promise.all(promises);

    const successful = results.filter((r) => r.statusCode === 201);
    const conflicts = results.filter((r) => r.statusCode === 409);

    // Exactly 1 request succeeds because unit capacity is 1
    expect(successful.length).toBe(1);
    // All other 24 requests fail with 409 Conflict (SLOT_TAKEN or OVERLAPPING)
    expect(conflicts.length).toBe(PARALLEL_REQUESTS - 1);

    // Verify in database that exactly 1 booking exists for that date window
    const dbCount = await prisma.booking.count({
      where: {
        providerId: testProviderId,
        boardingUnitId: testUnitId,
        kind: 'BOARDING',
        status: { not: BookingStatus.CANCELLED },
        startsAt: new Date(checkIn),
        endsAt: new Date(checkOut),
      },
    });

    expect(dbCount).toBe(1);
  });
});
