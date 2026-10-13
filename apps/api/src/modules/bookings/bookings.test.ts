import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../../app.js';
import { prisma } from '../../lib/prisma.js';
import { FastifyInstance } from 'fastify';
import { ProviderType, BookingKind, Species, BookingStatus, SizeTier } from '@prisma/client';

describe('PawNest Providers & Bookings End-to-End (Phase 4)', () => {
  let app: FastifyInstance;
  let userAToken: string;
  let userBToken: string;
  let userAId: string;
  let userBId: string;
  let petAId: string;
  let providerId: string;
  let providerSlug: string;
  let serviceId: string;
  let addOnId: string;

  beforeAll(async () => {
    app = buildApp({ logger: false });
    await app.ready();

    const emailA = `book-user-a-${Date.now()}@pawnest.example`;
    const emailB = `book-user-b-${Date.now()}@pawnest.example`;
    const password = 'Password123!';

    // Register & Login User A
    const regResA = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        email: emailA,
        password,
        name: 'Maya Booker',
      },
    });
    userAId = regResA.json().user.id;

    const loginResA = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: emailA, password },
    });
    userAToken = loginResA.cookies.find((c) => c.name === 'pn_at')!.value;

    // Register & Login User B
    const regResB = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        email: emailB,
        password,
        name: 'Daniel Other',
      },
    });
    userBId = regResB.json().user.id;

    const loginResB = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: emailB, password },
    });
    userBToken = loginResB.cookies.find((c) => c.name === 'pn_at')!.value;

    // Create Pet for User A (Large dog: 30kg -> sizeTier: L)
    const petRes = await app.inject({
      method: 'POST',
      url: '/api/v1/pets',
      headers: { cookie: `pn_at=${userAToken}` },
      payload: {
        name: 'Barnaby Test',
        species: Species.DOG,
        weightKg: 30,
        breed: 'Golden Retriever',
      },
    });
    petAId = petRes.json().pet.id;

    // Create Test Provider with 1 station on Monday (weekday 1) for strict concurrency test
    providerSlug = `salon-phase4-${Date.now()}`;
    const provider = await prisma.provider.create({
      data: {
        slug: providerSlug,
        name: 'Phase 4 Test Groomery',
        type: ProviderType.GROOMER,
        description: 'Testing bookings pipeline and concurrency',
        addressLine: '500 Test Avenue',
        city: 'Brooklyn',
        country: 'US',
        lat: 40.71,
        lng: -73.96,
        timezone: 'UTC',
        speciesAccepted: [Species.DOG],
        hours: {
          create: [
            {
              weekday: 1, // Monday
              opensAt: '09:00',
              closesAt: '17:00',
              stations: 1, // Exactly 1 station
            },
          ],
        },
        services: {
          create: [
            {
              name: 'Signature Groom',
              kind: BookingKind.GROOMING,
              durationMin: 60,
              bufferMin: 0,
              basePriceCents: 8000,
              sizePricing: { XS: 0, S: 500, M: 1000, L: 2000, XL: 3000 },
              species: [Species.DOG],
              isAddOn: false,
            },
            {
              name: 'Oatmeal Bath Add-on',
              kind: BookingKind.GROOMING,
              durationMin: 15,
              bufferMin: 0,
              basePriceCents: 1500,
              species: [Species.DOG],
              isAddOn: true,
            },
          ],
        },
      },
      include: { services: true },
    });

    providerId = provider.id;
    const mainService = provider.services.find((s) => !s.isAddOn)!;
    const addOnService = provider.services.find((s) => s.isAddOn)!;
    serviceId = mainService.id;
    addOnId = addOnService.id;
  });

  afterAll(async () => {
    const userIds = [userAId, userBId].filter(Boolean);
    if (userIds.length > 0) {
      await prisma.idempotencyRecord.deleteMany({ where: { userId: { in: userIds } } });
      await prisma.booking.deleteMany({ where: { userId: { in: userIds } } });
    }
    if (providerId) {
      await prisma.booking.deleteMany({ where: { providerId } });
      await prisma.service.deleteMany({ where: { providerId } });
      await prisma.providerHours.deleteMany({ where: { providerId } });
      await prisma.provider.deleteMany({ where: { id: providerId } });
    }
    if (userIds.length > 0) {
      await prisma.pet.deleteMany({ where: { userId: { in: userIds } } });
      await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    }
    await app.close();
  });

  it('GET /providers filters by type, species, and query', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/providers?type=GROOMER&q=Phase%204&species=DOG`,
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.items).toBeInstanceOf(Array);
    expect(body.items.length).toBeGreaterThanOrEqual(1);
    expect(body.items[0].slug).toBe(providerSlug);
    expect(body.items[0].isDemo).toBe(true);
    expect(body.items[0].priceFromCents).toBe(8000);
  });

  it('GET /providers/:slug returns details, hours, and services', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/providers/${providerSlug}`,
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.provider.slug).toBe(providerSlug);
    expect(body.services.length).toBe(2);
    expect(body.hours.length).toBe(1);
    expect(body.hours[0].stations).toBe(1);
  });

  it('POST /bookings/quote calculates correct base, size adjustment, and add-ons', async () => {
    const nextMonday = '2026-10-26T10:00:00.000Z';
    const nextMondayEnd = '2026-10-26T11:00:00.000Z';

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/bookings/quote',
      headers: { cookie: `pn_at=${userAToken}` },
      payload: {
        petId: petAId,
        providerId,
        kind: 'GROOMING',
        serviceId,
        startsAt: nextMonday,
        endsAt: nextMondayEnd,
        addOnIds: [addOnId],
      },
    });

    expect(res.statusCode).toBe(200);
    const quote = res.json();
    // Base = 8000, Size L adjustment = 2000, Oatmeal Add-on = 1500 -> Total = 11500 cents ($115.00)
    expect(quote.priceCents).toBe(11500);
    expect(quote.priceBreakdown.baseCents).toBe(8000);
    expect(quote.priceBreakdown.sizeAdjustmentCents).toBe(2000);
    expect(quote.priceBreakdown.addOnsCents).toBe(1500);
    expect(quote.priceBreakdown.totalCents).toBe(11500);
    expect(quote.cancellationHours).toBe(24);
  });

  it('POST /bookings requires Idempotency-Key and creates booking', async () => {
    const slotStart = '2026-10-26T09:00:00.000Z';
    const slotEnd = '2026-10-26T10:00:00.000Z';
    const idempotencyKey = `idemp-${Date.now()}`;

    // 1. First attempt with Idempotency-Key
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/bookings',
      headers: {
        cookie: `pn_at=${userAToken}`,
        'idempotency-key': idempotencyKey,
      },
      payload: {
        petId: petAId,
        providerId,
        kind: 'GROOMING',
        serviceId,
        startsAt: slotStart,
        endsAt: slotEnd,
        addOnIds: [addOnId],
        notes: 'Please be gentle with paws',
      },
    });

    expect(res.statusCode).toBe(201);
    const booking = res.json();
    expect(booking.reference).toMatch(/^PN-GRM-/);
    expect(booking.priceCents).toBe(11500);
    expect(booking.isDemo).toBe(true);

    // 2. Replaying with identical Idempotency-Key must return identical response without duplicate row
    const replayRes = await app.inject({
      method: 'POST',
      url: '/api/v1/bookings',
      headers: {
        cookie: `pn_at=${userAToken}`,
        'idempotency-key': idempotencyKey,
      },
      payload: {
        petId: petAId,
        providerId,
        kind: 'GROOMING',
        serviceId,
        startsAt: slotStart,
        endsAt: slotEnd,
        addOnIds: [addOnId],
      },
    });

    expect(replayRes.statusCode).toBe(201);
    expect(replayRes.json().id).toBe(booking.id);
    expect(replayRes.json().reference).toBe(booking.reference);

    // Verify only 1 booking exists in DB for this reference
    const count = await prisma.booking.count({ where: { reference: booking.reference } });
    expect(count).toBe(1);
  });

  it('GET /bookings lists own bookings', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/bookings',
      headers: { cookie: `pn_at=${userAToken}` },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.items.length).toBeGreaterThanOrEqual(1);
    expect(body.items[0].userId).toBe(userAId);
  });

  it('Enforces cross-user authorization isolation (returns 404 for User B)', async () => {
    // Fetch User A's booking
    const listRes = await app.inject({
      method: 'GET',
      url: '/api/v1/bookings',
      headers: { cookie: `pn_at=${userAToken}` },
    });
    const bookingAId = listRes.json().items[0].id;

    // User B tries to view User A's booking
    const viewRes = await app.inject({
      method: 'GET',
      url: `/api/v1/bookings/${bookingAId}`,
      headers: { cookie: `pn_at=${userBToken}` },
    });
    expect(viewRes.statusCode).toBe(404);

    // User B tries to cancel User A's booking
    const cancelRes = await app.inject({
      method: 'POST',
      url: `/api/v1/bookings/${bookingAId}/cancel`,
      headers: { cookie: `pn_at=${userBToken}` },
      payload: { reason: 'Unauthorized cancel' },
    });
    expect(cancelRes.statusCode).toBe(404);

    // User B tries to reschedule User A's booking
    const reschedRes = await app.inject({
      method: 'POST',
      url: `/api/v1/bookings/${bookingAId}/reschedule`,
      headers: { cookie: `pn_at=${userBToken}` },
      payload: {
        startsAt: '2026-10-26T14:00:00.000Z',
        endsAt: '2026-10-26T15:00:00.000Z',
      },
    });
    expect(reschedRes.statusCode).toBe(404);
  });

  it('POST /bookings/:id/reschedule moves booking to an available slot', async () => {
    const listRes = await app.inject({
      method: 'GET',
      url: '/api/v1/bookings',
      headers: { cookie: `pn_at=${userAToken}` },
    });
    const bookingAId = listRes.json().items[0].id;

    const newStart = '2026-10-26T11:00:00.000Z';
    const newEnd = '2026-10-26T12:00:00.000Z';

    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/bookings/${bookingAId}/reschedule`,
      headers: { cookie: `pn_at=${userAToken}` },
      payload: {
        startsAt: newStart,
        endsAt: newEnd,
      },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.startsAt).toBe(newStart);
  });

  it('POST /bookings/:id/cancel cancels booking with policy note', async () => {
    const listRes = await app.inject({
      method: 'GET',
      url: '/api/v1/bookings',
      headers: { cookie: `pn_at=${userAToken}` },
    });
    const bookingAId = listRes.json().items[0].id;

    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/bookings/${bookingAId}/cancel`,
      headers: { cookie: `pn_at=${userAToken}` },
      payload: { reason: 'Need to travel' },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.status).toBe('CANCELLED');
  });

  it('CONCURRENCY TEST: Exactly 1 out of 50 parallel booking attempts succeeds on a 1-station slot', async () => {
    // Target a specific 1-hour slot with station capacity = 1
    const contestedStart = '2026-10-26T15:00:00.000Z';
    const contestedEnd = '2026-10-26T16:00:00.000Z';

    const PARALLEL_COUNT = 50;
    const promises: Array<Promise<any>> = [];

    // Dispatch 50 parallel requests simultaneously
    for (let i = 0; i < PARALLEL_COUNT; i++) {
      const p = app.inject({
        method: 'POST',
        url: '/api/v1/bookings',
        headers: {
          cookie: `pn_at=${userAToken}`,
          'idempotency-key': `contest-test-${Date.now()}-${i}-${Math.random()}`,
        },
        payload: {
          petId: petAId,
          providerId,
          kind: 'GROOMING',
          serviceId,
          startsAt: contestedStart,
          endsAt: contestedEnd,
        },
      });
      promises.push(p);
    }

    const results = await Promise.all(promises);

    const successful = results.filter((r) => r.statusCode === 201);
    const conflicted = results.filter((r) => r.statusCode === 409);

    // Assert: Exactly ONE booking succeeded
    expect(successful.length).toBe(1);

    // Assert: Exactly 49 bookings were rejected with 409 Conflict
    expect(conflicted.length).toBe(PARALLEL_COUNT - 1);

    // Assert: The 49 failed requests had code SLOT_TAKEN
    for (const conf of conflicted) {
      expect(conf.json().code).toBe('SLOT_TAKEN');
    }

    // Verify in database: Exactly 1 booking was persisted for this slot
    const dbCount = await prisma.booking.count({
      where: {
        providerId,
        startsAt: new Date(contestedStart),
        endsAt: new Date(contestedEnd),
        status: { not: BookingStatus.CANCELLED },
      },
    });

    expect(dbCount).toBe(1);
  });
});
