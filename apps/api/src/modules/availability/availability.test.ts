import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '../../lib/prisma.js';
import { availabilityService, localizedTimeToUtc, getWeekdayInTimezone } from './availability.service.js';
import { ProviderType, BookingKind, Species, BookingStatus } from '@prisma/client';

describe('Availability Engine (Section 14.4)', () => {
  let testProviderId: string;
  let testServiceId: string;
  let testUserId: string;
  let testPetId: string;

  beforeAll(async () => {
    // Create test provider with 2 stations, 09:00 - 12:00 on Tuesdays (weekday 2)
    const provider = await prisma.provider.create({
      data: {
        slug: `test-avail-${Date.now()}`,
        name: 'Avail Test Salon',
        type: ProviderType.GROOMER,
        description: 'Testing availability engine',
        addressLine: '123 Test St',
        city: 'Brooklyn',
        country: 'US',
        lat: 40.7,
        lng: -73.9,
        timezone: 'America/New_York',
        speciesAccepted: [Species.DOG],
        hours: {
          create: [
            {
              weekday: 2, // Tuesday
              opensAt: '09:00',
              closesAt: '12:00',
              stations: 2,
            },
          ],
        },
        services: {
          create: [
            {
              name: 'Quick Bath',
              durationMin: 60,
              bufferMin: 0,
              basePriceCents: 5000,
              kind: BookingKind.GROOMING,
              species: [Species.DOG],
            },
          ],
        },
      },
      include: { services: true },
    });

    testProviderId = provider.id;
    testServiceId = provider.services[0].id;

    const user = await prisma.user.create({
      data: {
        email: `avail-user-${Date.now()}@pawnest.example`,
        passwordHash: 'dummy',
        name: 'Avail User',
      },
    });
    testUserId = user.id;

    const pet = await prisma.pet.create({
      data: {
        userId: user.id,
        name: 'Avail Pup',
        species: Species.DOG,
      },
    });
    testPetId = pet.id;
  });

  afterAll(async () => {
    await prisma.booking.deleteMany({ where: { providerId: testProviderId } });
    await prisma.service.deleteMany({ where: { providerId: testProviderId } });
    await prisma.providerHours.deleteMany({ where: { providerId: testProviderId } });
    await prisma.provider.deleteMany({ where: { id: testProviderId } });
    await prisma.pet.deleteMany({ where: { id: testPetId } });
    await prisma.user.deleteMany({ where: { id: testUserId } });
  });

  it('computes localized time accurately to UTC', () => {
    // 2026-10-20 (EDT is UTC-4): 09:00 EDT should be 13:00 UTC
    const utcDate = localizedTimeToUtc('2026-10-20', '09:00', 'America/New_York');
    expect(utcDate.toISOString()).toBe('2026-10-20T13:00:00.000Z');
  });

  it('correctly detects day of week for a given timezone', () => {
    // 2026-10-20 is a Tuesday (2)
    const weekday = getWeekdayInTimezone('2026-10-20', 'America/New_York');
    expect(weekday).toBe(2);
  });

  it('generates expected slots for open hours with stations capacity', async () => {
    // Tuesday 2026-10-20, mock current time well in the past (e.g. 2026-10-10)
    const slots = await availabilityService.computeSlots({
      providerId: testProviderId,
      serviceId: testServiceId,
      dateStr: '2026-10-20',
      currentTime: new Date('2026-10-10T12:00:00Z'),
      minLeadMinutes: 120,
    });

    // 09:00 - 12:00 with 60-min slots -> 09:00-10:00, 10:00-11:00, 11:00-12:00 (3 slots)
    expect(slots).toHaveLength(3);
    expect(slots[0].remaining).toBe(2);
    expect(slots[1].remaining).toBe(2);
    expect(slots[2].remaining).toBe(2);
  });

  it('subtracts overlapping bookings from remaining capacity', async () => {
    // Book 1 slot at 09:00 EDT (13:00 UTC) on 2026-10-20
    const slot0Start = new Date('2026-10-20T13:00:00.000Z');
    const slot0End = new Date('2026-10-20T14:00:00.000Z');

    const booking = await prisma.booking.create({
      data: {
        reference: `PN-TEST-AV1-${Date.now()}`,
        userId: testUserId,
        petId: testPetId,
        providerId: testProviderId,
        serviceId: testServiceId,
        kind: BookingKind.GROOMING,
        status: BookingStatus.CONFIRMED,
        startsAt: slot0Start,
        endsAt: slot0End,
        priceCents: 5000,
        currency: 'USD',
        priceBreakdown: { totalCents: 5000 },
      },
    });

    const slots = await availabilityService.computeSlots({
      providerId: testProviderId,
      serviceId: testServiceId,
      dateStr: '2026-10-20',
      currentTime: new Date('2026-10-10T12:00:00Z'),
      minLeadMinutes: 120,
    });

    // 09:00 slot should now have remaining = 1 (2 stations - 1 booked)
    expect(slots[0].remaining).toBe(1);
    expect(slots[1].remaining).toBe(2);
    expect(slots[2].remaining).toBe(2);

    // Clean up test booking
    await prisma.booking.delete({ where: { id: booking.id } });
  });

  it('drops slots that violate minimum lead time or are in the past', async () => {
    // Current time is 2026-10-20 at 09:30 EDT (13:30 UTC)
    // 09:00 slot has already passed
    // 10:00 slot starts at 14:00 UTC (only 30 min lead, less than 120 min lead)
    // 11:00 slot starts at 15:00 UTC (90 min lead, less than 120 min lead)
    const slots = await availabilityService.computeSlots({
      providerId: testProviderId,
      serviceId: testServiceId,
      dateStr: '2026-10-20',
      currentTime: new Date('2026-10-20T13:30:00Z'),
      minLeadMinutes: 120,
    });

    expect(slots).toHaveLength(0);
  });
});
