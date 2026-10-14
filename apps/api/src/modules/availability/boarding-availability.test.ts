import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '../../lib/prisma.js';
import { BoardingAvailabilityService, getStayNightDates, formatDateInTimezone } from './boarding-availability.service.js';
import { ProviderType, BookingKind, BookingStatus, Species } from '@prisma/client';

describe('BoardingAvailabilityService Unit Tests', () => {
  const service = new BoardingAvailabilityService();
  let providerId: string;
  let unitId: string;
  let testUserId: string;
  let testPetId: string;

  beforeAll(async () => {
    // Create test user and pet
    const user = await prisma.user.create({
      data: {
        email: `boarding-avail-test-${Date.now()}@pawnest.example`,
        passwordHash: 'dummyhash',
        name: 'Avail Tester',
      },
    });
    testUserId = user.id;

    const pet = await prisma.pet.create({
      data: {
        userId: user.id,
        name: 'Avail Dog',
        species: Species.DOG,
      },
    });
    testPetId = pet.id;

    // Create test provider with 1 unit having capacity 2
    const provider = await prisma.provider.create({
      data: {
        slug: `test-boarding-lodge-${Date.now()}`,
        type: ProviderType.BOARDING,
        name: 'Test Boarding Lodge',
        description: 'Test lodge for availability tests',
        addressLine: '123 Forest Path',
        city: 'Bedford',
        country: 'US',
        lat: 41.2,
        lng: -73.6,
        timezone: 'America/New_York',
        speciesAccepted: [Species.DOG],
        amenities: ['Private Suites'],
        imageKeys: ['hero-dog.jpg'],
        units: {
          create: [
            {
              name: 'Cabin Suite A',
              capacity: 2, // 2 available spots per night
              maxPets: 2,
              nightlyCents: 5000,
              currency: 'USD',
              amenities: ['Heated Floor'],
            },
          ],
        },
      },
      include: { units: true },
    });
    providerId = provider.id;
    unitId = provider.units[0].id;
  });

  afterAll(async () => {
    await prisma.booking.deleteMany({ where: { providerId } });
    await prisma.boardingUnit.deleteMany({ where: { providerId } });
    await prisma.provider.deleteMany({ where: { id: providerId } });
    await prisma.pet.deleteMany({ where: { id: testPetId } });
    await prisma.user.deleteMany({ where: { id: testUserId } });
  });

  it('correctly splits stay nights for multi-night date ranges', () => {
    const nights = getStayNightDates('2026-11-01', '2026-11-04');
    expect(nights).toEqual(['2026-11-01', '2026-11-02', '2026-11-03']);
    expect(nights.length).toBe(3);
  });

  it('formats dates consistently in provider timezone', () => {
    const utcDate = new Date('2026-11-01T02:00:00Z');
    const formatted = formatDateInTimezone(utcDate, 'America/New_York');
    // At 02:00 UTC, in New York (EDT/EST is -4 or -5 hours), it is still Oct 31
    expect(formatted).toBe('2026-10-31');
  });

  it('rejects same-day check-in per lead time business rule', async () => {
    const now = new Date('2026-11-01T14:00:00Z');
    await expect(
      service.computeAvailability({
        providerId,
        checkInDateStr: '2026-11-01', // same day
        checkOutDateStr: '2026-11-03',
        currentTime: now,
      })
    ).rejects.toThrow('Boarding check-in must be booked at least one day in advance');
  });

  it('computes 100% capacity when no existing bookings exist', async () => {
    const now = new Date('2026-11-01T12:00:00Z');
    const avail = await service.computeAvailability({
      providerId,
      checkInDateStr: '2026-11-10',
      checkOutDateStr: '2026-11-13', // 3 nights: Nov 10, 11, 12
      currentTime: now,
    });

    expect(avail).toHaveLength(1);
    const suite = avail[0];
    expect(suite.available).toBe(true);
    expect(suite.nights).toBe(3);
    expect(suite.minRemaining).toBe(2);
    expect(suite.remainingPerNight['2026-11-10']).toBe(2);
    expect(suite.remainingPerNight['2026-11-11']).toBe(2);
    expect(suite.remainingPerNight['2026-11-12']).toBe(2);
    expect(suite.totalPriceCents).toBe(3 * 5000); // 15000 cents
  });

  it('handles overlapping bookings and check-in/check-out boundaries correctly', async () => {
    // Create an existing booking from 2026-11-10 to 2026-11-12 (occupies nights of Nov 10 and Nov 11)
    const booking1 = await prisma.booking.create({
      data: {
        reference: `PN-BND-TEST-${Date.now()}-1`,
        userId: testUserId,
        petId: testPetId,
        providerId,
        boardingUnitId: unitId,
        kind: BookingKind.BOARDING,
        status: BookingStatus.CONFIRMED,
        startsAt: new Date('2026-11-10T14:00:00Z'),
        endsAt: new Date('2026-11-12T11:00:00Z'),
        priceCents: 10000,
        currency: 'USD',
        priceBreakdown: { nights: 2, nightlyCents: 5000, baseCents: 10000, addOnsCents: 0, totalCents: 10000 },
        isDemo: true,
      },
    });

    const now = new Date('2026-11-01T12:00:00Z');
    const avail = await service.computeAvailability({
      providerId,
      checkInDateStr: '2026-11-10',
      checkOutDateStr: '2026-11-13',
      currentTime: now,
    });

    const suite = avail[0];
    // Night Nov 10: 1 remaining (2 - 1)
    expect(suite.remainingPerNight['2026-11-10']).toBe(1);
    // Night Nov 11: 1 remaining (2 - 1)
    expect(suite.remainingPerNight['2026-11-11']).toBe(1);
    // Night Nov 12: 2 remaining! Because booking1 checked out on Nov 12 morning!
    expect(suite.remainingPerNight['2026-11-12']).toBe(2);
    expect(suite.minRemaining).toBe(1);
    expect(suite.available).toBe(true);

    // Clean up booking1
    await prisma.booking.delete({ where: { id: booking1.id } });
  });

  it('marks unit as unavailable when capacity is saturated on any night of the stay', async () => {
    // Fill both capacity spots on night Nov 15
    const b1 = await prisma.booking.create({
      data: {
        reference: `PN-BND-TEST-${Date.now()}-A`,
        userId: testUserId,
        petId: testPetId,
        providerId,
        boardingUnitId: unitId,
        kind: BookingKind.BOARDING,
        status: BookingStatus.CONFIRMED,
        startsAt: new Date('2026-11-15T14:00:00Z'),
        endsAt: new Date('2026-11-17T11:00:00Z'),
        priceCents: 10000,
        currency: 'USD',
        priceBreakdown: { nights: 2, nightlyCents: 5000, baseCents: 10000, addOnsCents: 0, totalCents: 10000 },
        isDemo: true,
      },
    });

    const b2 = await prisma.booking.create({
      data: {
        reference: `PN-BND-TEST-${Date.now()}-B`,
        userId: testUserId,
        petId: testPetId,
        providerId,
        boardingUnitId: unitId,
        kind: BookingKind.BOARDING,
        status: BookingStatus.CONFIRMED,
        startsAt: new Date('2026-11-15T14:00:00Z'),
        endsAt: new Date('2026-11-16T11:00:00Z'),
        priceCents: 5000,
        currency: 'USD',
        priceBreakdown: { nights: 1, nightlyCents: 5000, baseCents: 5000, addOnsCents: 0, totalCents: 5000 },
        isDemo: true,
      },
    });

    const now = new Date('2026-11-01T12:00:00Z');
    // Check stay across Nov 14 - Nov 17 (3 nights: Nov 14, 15, 16)
    const avail = await service.computeAvailability({
      providerId,
      checkInDateStr: '2026-11-14',
      checkOutDateStr: '2026-11-17',
      currentTime: now,
    });

    const suite = avail[0];
    expect(suite.remainingPerNight['2026-11-14']).toBe(2);
    expect(suite.remainingPerNight['2026-11-15']).toBe(0); // Saturated!
    expect(suite.remainingPerNight['2026-11-16']).toBe(1); // Only b1 on Nov 16
    expect(suite.minRemaining).toBe(0);
    expect(suite.available).toBe(false); // Because minRemaining = 0 < 1

    // Clean up
    await prisma.booking.deleteMany({ where: { id: { in: [b1.id, b2.id] } } });
  });
});
