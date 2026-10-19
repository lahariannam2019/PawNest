import { describe, it, expect } from 'vitest';
import { BookingKind, BookingStatus, Species, EMERGENCY_DISCLAIMER_TEXT } from '@pawnest/shared';

describe('Veterinary Visits & Appointments Logic', () => {
  const sampleBookings = [
    {
      id: 'b-1',
      reference: 'PN-VET-1001',
      petName: 'Barnaby',
      petSpecies: Species.DOG,
      providerName: 'Hudson River Veterinary Hospital',
      kind: BookingKind.VET,
      status: BookingStatus.CONFIRMED as BookingStatus,
      startsAt: '2026-11-20T14:00:00.000Z',
      endsAt: '2026-11-20T14:45:00.000Z',
      visitType: 'Annual Wellness Exam & Vaccinations',
      reason: 'Routine health check-up and booster',
    },
    {
      id: 'b-2',
      reference: 'PN-GRM-2002',
      petName: 'Barnaby',
      petSpecies: Species.DOG,
      providerName: 'The Velvet Hound',
      kind: BookingKind.GROOMING,
      status: BookingStatus.CONFIRMED,
      startsAt: '2026-11-22T10:00:00.000Z',
      endsAt: '2026-11-22T11:30:00.000Z',
    },
    {
      id: 'b-3',
      reference: 'PN-VET-0999',
      petName: 'Clementine',
      petSpecies: Species.CAT,
      providerName: 'Brooklyn Heights Animal Medical Centre',
      kind: BookingKind.VET,
      status: BookingStatus.COMPLETED as BookingStatus,
      startsAt: '2026-09-10T11:00:00.000Z',
      endsAt: '2026-09-10T11:30:00.000Z',
      visitType: 'Dental Hygiene Check',
      reason: 'Gingivitis follow-up',
    },
  ];

  it('filters only VET appointments from general booking collections', () => {
    const vetVisits = sampleBookings.filter((b) => b.kind === BookingKind.VET);
    expect(vetVisits).toHaveLength(2);
    expect(vetVisits.every((b) => b.kind === BookingKind.VET)).toBe(true);
  });

  it('correctly partitions upcoming and past veterinary appointments', () => {
    const referenceDate = new Date('2026-10-15T00:00:00.000Z');
    const vetVisits = sampleBookings.filter((b) => b.kind === BookingKind.VET);

    const upcoming = vetVisits.filter(
      (b) => new Date(b.startsAt) >= referenceDate && b.status !== BookingStatus.CANCELLED
    );
    const past = vetVisits.filter(
      (b) => new Date(b.startsAt) < referenceDate || b.status === BookingStatus.CANCELLED || b.status === BookingStatus.COMPLETED
    );

    expect(upcoming).toHaveLength(1);
    expect(upcoming[0].reference).toBe('PN-VET-1001');

    expect(past).toHaveLength(1);
    expect(past[0].reference).toBe('PN-VET-0999');
  });

  it('includes clinical emergency disclaimer for user safety', () => {
    expect(EMERGENCY_DISCLAIMER_TEXT).toBeDefined();
    expect(EMERGENCY_DISCLAIMER_TEXT).toContain('emergency');
    expect(EMERGENCY_DISCLAIMER_TEXT).toContain('PawNest visits are for scheduled, non-emergency care');
  });
});
