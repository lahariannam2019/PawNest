import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../../app.js';
import { FastifyInstance } from 'fastify';
import { prisma } from '../../lib/prisma.js';
import { ProviderType, BookingKind, BookingStatus, Species } from '@prisma/client';
import { processAppointmentReminder, stopBoss } from '../../jobs/reminders.js';
import crypto from 'node:crypto';

describe('PawNest Veterinary Appointments & Medical Intake (Phase 6)', () => {
  let app: FastifyInstance;
  let userACookie: string;
  let userBCookie: string;
  let userAId: string;
  let userBId: string;

  let testDogId: string;
  let testCatId: string;
  let foreignDogId: string;

  let testVetProviderId: string;
  let testVetSlug: string;
  let testWellnessServiceId: string;
  let testAddOnId: string;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();

    const timestamp = Date.now();
    const emailA = `vet-user-a-${timestamp}@pawnest.example`;
    const emailB = `vet-user-b-${timestamp}@pawnest.example`;
    const password = 'Password123!';

    // 1. Register & Login User A
    const userARes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        email: emailA,
        password,
        name: 'Elena Rostova',
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
        name: 'Marcus Brody',
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

    // 3. Create Pets for User A
    const dog = await prisma.pet.create({
      data: {
        userId: userAId,
        name: 'Milo',
        species: Species.DOG,
        breed: 'Border Collie',
        birthDate: new Date('2023-05-15'),
        approxAgeMonths: 36,
        allergies: ['Chicken'],
        conditions: ['Seasonal dermatitis'],
      },
    });
    testDogId = dog.id;

    const cat = await prisma.pet.create({
      data: {
        userId: userAId,
        name: 'Cleo',
        species: Species.CAT,
        breed: 'Siamese',
        birthDate: new Date('2024-02-10'),
        approxAgeMonths: 24,
      },
    });
    testCatId = cat.id;

    // Create Pet for User B
    const foreignDog = await prisma.pet.create({
      data: {
        userId: userBId,
        name: 'Buster',
        species: Species.DOG,
        breed: 'Beagle',
      },
    });
    foreignDogId = foreignDog.id;

    // 4. Create Dedicated Vet Provider & Services
    testVetSlug = `test-vet-clinic-${timestamp}`;
    const vetProvider = await prisma.provider.create({
      data: {
        slug: testVetSlug,
        name: 'Tribeca Companion Animal Care',
        type: ProviderType.VET_CLINIC,
        tagline: 'Comprehensive clinical excellence',
        description: 'Modern veterinary clinic offering wellness, internal medicine and diagnostics.',
        addressLine: '120 Hudson St',
        city: 'New York',
        region: 'NY',
        country: 'US',
        lat: 40.7192,
        lng: -74.009,
        timezone: 'America/New_York',
        phone: '+1 (212) 555-0199',
        speciesAccepted: [Species.DOG, Species.CAT],
        cancellationHours: 24,
        autoConfirm: true,
        hours: {
          create: [
            { weekday: 1, opensAt: '08:00', closesAt: '18:00', stations: 2 },
            { weekday: 2, opensAt: '08:00', closesAt: '18:00', stations: 2 },
            { weekday: 3, opensAt: '08:00', closesAt: '18:00', stations: 2 },
            { weekday: 4, opensAt: '08:00', closesAt: '18:00', stations: 2 },
            { weekday: 5, opensAt: '08:00', closesAt: '18:00', stations: 2 },
          ],
        },
      },
    });
    testVetProviderId = vetProvider.id;

    const wellnessService = await prisma.service.create({
      data: {
        providerId: testVetProviderId,
        kind: BookingKind.VET,
        name: 'Comprehensive Wellness Examination',
        description: 'Full nose-to-tail physical evaluation, vitals, dental staging, and lifestyle counsel.',
        durationMin: 30,
        basePriceCents: 9500,
        species: [Species.DOG, Species.CAT],
        isAddOn: false,
      },
    });
    testWellnessServiceId = wellnessService.id;

    const addOnService = await prisma.service.create({
      data: {
        providerId: testVetProviderId,
        kind: BookingKind.VET,
        name: 'In-House Fecal Screen',
        description: 'Microscopic parasite screen.',
        durationMin: 0,
        basePriceCents: 4500,
        species: [Species.DOG, Species.CAT],
        isAddOn: true,
      },
    });
    testAddOnId = addOnService.id;
  });

  afterAll(async () => {
    await stopBoss();
    if (app) {
      await app.close();
    }
    await prisma.$disconnect();
  });

  describe('1. Public Vet Visit Types & Safety Triage Endpoint', () => {
    it('returns standard visit types, species-tailored symptoms, and emergency disclaimer', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/vet/visit-types',
      });

      expect(res.statusCode).toBe(200);
      const data = res.json();

      expect(data.visitTypes).toBeDefined();
      expect(Array.isArray(data.visitTypes)).toBe(true);
      expect(data.visitTypes.length).toBeGreaterThanOrEqual(4);

      const wellnessType = data.visitTypes.find((vt: any) => vt.code === 'WELLNESS');
      expect(wellnessType).toBeDefined();
      expect(wellnessType.name).toBe('Wellness & Preventive Exam');

      expect(data.symptoms).toBeDefined();
      expect(Array.isArray(data.symptoms.DOG)).toBe(true);
      expect(Array.isArray(data.symptoms.CAT)).toBe(true);
      expect(data.symptoms.DOG.length).toBeGreaterThan(0);

      expect(data.disclaimer).toBeDefined();
      expect(data.disclaimer).toContain('PawNest visits are for scheduled, non-emergency care');
    });
  });

  describe('2. Authoritative Server-Side Vet Pricing Quotes', () => {
    it('calculates price quote for base wellness exam and diagnostics add-on', async () => {
      const startsAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      startsAt.setUTCHours(10, 0, 0, 0);
      const endsAt = new Date(startsAt.getTime() + 30 * 60 * 1000);

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/bookings/quote',
        headers: {
          cookie: userACookie,
        },
        payload: {
          kind: 'VET',
          petId: testDogId,
          providerId: testVetProviderId,
          serviceId: testWellnessServiceId,
          addOnIds: [testAddOnId],
          startsAt: startsAt.toISOString(),
          endsAt: endsAt.toISOString(),
        },
      });

      expect(res.statusCode).toBe(200);
      const data = res.json();
      expect(data.priceBreakdown.baseCents).toBe(9500);
      expect(data.priceBreakdown.addOnsCents).toBe(4500);
      expect(data.priceBreakdown.totalCents).toBe(14000);
      expect(data.priceCents).toBe(14000);
      expect(data.currency).toBe('USD');
    });
  });

  describe('3. Medical Safety & Validation Rules', () => {
    it('rejects booking when emergency disclaimer is NOT acknowledged', async () => {
      const idempotencyKey = crypto.randomUUID();
      const startsAt = new Date(Date.now() + 48 * 60 * 60 * 1000);
      startsAt.setUTCHours(14, 0, 0, 0);
      const endsAt = new Date(startsAt.getTime() + 30 * 60 * 1000);

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/bookings',
        headers: {
          cookie: userACookie,
          'Idempotency-Key': idempotencyKey,
        },
        payload: {
          kind: 'VET',
          petId: testDogId,
          providerId: testVetProviderId,
          serviceId: testWellnessServiceId,
          startsAt: startsAt.toISOString(),
          endsAt: endsAt.toISOString(),
          visitType: 'WELLNESS',
          symptoms: ['Mild seasonal itching'],
          reason: 'Routine annual checkup and allergy consult',
          emergencyAcknowledged: false, // Must be true!
        },
      });

      expect(res.statusCode).toBe(422);
      const body = res.json();
      expect(body.detail).toContain('emergency care disclaimer');
    });

    it('rejects booking when client tries to book another user pet', async () => {
      const idempotencyKey = crypto.randomUUID();
      const startsAt = new Date(Date.now() + 48 * 60 * 60 * 1000);
      startsAt.setUTCHours(14, 0, 0, 0);
      const endsAt = new Date(startsAt.getTime() + 30 * 60 * 1000);

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/bookings',
        headers: {
          cookie: userACookie,
          'Idempotency-Key': idempotencyKey,
        },
        payload: {
          kind: 'VET',
          petId: foreignDogId, // User B's pet
          providerId: testVetProviderId,
          serviceId: testWellnessServiceId,
          startsAt: startsAt.toISOString(),
          endsAt: endsAt.toISOString(),
          visitType: 'WELLNESS',
          reason: 'Checkup for friend pet',
          emergencyAcknowledged: true,
        },
      });

      expect(res.statusCode).toBe(404);
    });
  });

  describe('4. Vet Appointment Booking Lifecycle & Reference Prefix', () => {
    let createdBookingId: string;
    const startsAt = new Date(Date.now() + 72 * 60 * 60 * 1000);
    startsAt.setUTCHours(15, 0, 0, 0);
    const endsAt = new Date(startsAt.getTime() + 30 * 60 * 1000);
    const bookingIdempotencyKey = crypto.randomUUID();

    it('creates a confirmed vet appointment with PN-VET- prefix and persists intake details', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/bookings',
        headers: {
          cookie: userACookie,
          'Idempotency-Key': bookingIdempotencyKey,
        },
        payload: {
          kind: 'VET',
          petId: testDogId,
          providerId: testVetProviderId,
          serviceId: testWellnessServiceId,
          addOnIds: [testAddOnId],
          startsAt: startsAt.toISOString(),
          endsAt: endsAt.toISOString(),
          visitType: 'WELLNESS',
          symptoms: ['Mild seasonal itching', 'Ear scratching'],
          reason: 'Comprehensive checkup, skin examination, and preventive parasite screen.',
          emergencyAcknowledged: true,
        },
      });

      expect(res.statusCode).toBe(201);
      const booking = res.json();

      expect(booking.id).toBeDefined();
      createdBookingId = booking.id;
      expect(booking.reference).toMatch(/^PN-VET-[A-Z0-9]+$/);
      expect(booking.kind).toBe('VET');
      expect(booking.status).toBe('CONFIRMED');
      expect(booking.priceCents).toBe(14000);
      expect(booking.visitType).toBe('WELLNESS');
      expect(booking.symptoms).toEqual(['Mild seasonal itching', 'Ear scratching']);
      expect(booking.reason).toContain('skin examination');
      expect(booking.emergencyAcknowledged).toBe(true);
      expect(booking.petId).toBe(testDogId);
      expect(booking.providerId).toBe(testVetProviderId);
    });

    it('returns the existing booking when repeating with identical Idempotency-Key', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/bookings',
        headers: {
          cookie: userACookie,
          'Idempotency-Key': bookingIdempotencyKey,
        },
        payload: {
          kind: 'VET',
          petId: testDogId,
          providerId: testVetProviderId,
          serviceId: testWellnessServiceId,
          startsAt: startsAt.toISOString(),
          endsAt: endsAt.toISOString(),
          visitType: 'WELLNESS',
          reason: 'Comprehensive checkup',
          emergencyAcknowledged: true,
        },
      });

      expect(res.statusCode).toBe(201);
      const booking = res.json();
      expect(booking.id).toBe(createdBookingId);
    });

    it('allows User A to view their appointment details', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/bookings/${createdBookingId}`,
        headers: {
          cookie: userACookie,
        },
      });

      expect(res.statusCode).toBe(200);
      const data = res.json();
      expect(data.id).toBe(createdBookingId);
      expect(data.reference).toMatch(/^PN-VET-/);
      expect(data.visitType).toBe('WELLNESS');
      expect(data.emergencyAcknowledged).toBe(true);
    });

    it('prevents User B from accessing User A vet booking (cross-user isolation)', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/bookings/${createdBookingId}`,
        headers: {
          cookie: userBCookie,
        },
      });

      expect(res.statusCode).toBe(404);
    });
  });

  describe('5. Appointment Reminder Delivery & Exactly-Once Idempotency', () => {
    let reminderBookingId: string;

    beforeAll(async () => {
      // Create a booking scheduled 24h out to test reminder processing
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const booking = await prisma.booking.create({
        data: {
          reference: `PN-VET-REM-${Date.now().toString(36).toUpperCase()}`,
          userId: userAId,
          petId: testCatId,
          providerId: testVetProviderId,
          serviceId: testWellnessServiceId,
          kind: BookingKind.VET,
          status: BookingStatus.CONFIRMED,
          startsAt: futureDate,
          endsAt: new Date(futureDate.getTime() + 30 * 60 * 1000),
          priceCents: 9500,
          currency: 'USD',
          priceBreakdown: {
            baseCents: 9500,
            sizeAdjustmentCents: 0,
            addOnsCents: 0,
            totalCents: 9500,
          },
          visitType: 'WELLNESS',
          symptoms: [],
          reason: 'Cat wellness visit',
          emergencyAcknowledged: true,
        },
      });
      reminderBookingId = booking.id;
    });

    it('processes reminder exactly once and sets reminderSentAt timestamp', async () => {
      // First invocation should succeed
      const firstRun = await processAppointmentReminder(reminderBookingId);
      expect(firstRun).toBe(true);

      // Verify booking updated
      const updatedBooking = await prisma.booking.findUnique({
        where: { id: reminderBookingId },
      });
      expect(updatedBooking?.reminderSentAt).toBeDefined();
      expect(updatedBooking?.reminderSentAt).not.toBeNull();

      // Verify in-app notification created
      const notifications = await prisma.notification.findMany({
        where: {
          userId: userAId,
          type: 'APPOINTMENT_REMINDER',
          linkUrl: `/dashboard/bookings/${reminderBookingId}`,
        },
      });
      expect(notifications.length).toBe(1);
      expect(notifications[0].title).toContain('Cleo');

      // Second invocation should abort cleanly without duplicating notifications
      const secondRun = await processAppointmentReminder(reminderBookingId);
      expect(secondRun).toBe(false);

      const notificationsAfter = await prisma.notification.findMany({
        where: {
          userId: userAId,
          type: 'APPOINTMENT_REMINDER',
          linkUrl: `/dashboard/bookings/${reminderBookingId}`,
        },
      });
      expect(notificationsAfter.length).toBe(1);
    });
  });
});
