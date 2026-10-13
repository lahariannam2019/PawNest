import { describe, it, expect } from 'vitest';
import { deriveSizeTier, getVaccineStatus, VaccinationStatus, SizeTier } from '@pawnest/shared';

describe('Pet Profile & Vaccination Logic (Web)', () => {
  describe('deriveSizeTier', () => {
    it('correctly maps pet weights according to PawNest weight brackets', () => {
      expect(deriveSizeTier(3)).toBe(SizeTier.XS);
      expect(deriveSizeTier(5)).toBe(SizeTier.S);
      expect(deriveSizeTier(9.9)).toBe(SizeTier.S);
      expect(deriveSizeTier(10)).toBe(SizeTier.M);
      expect(deriveSizeTier(24.5)).toBe(SizeTier.M);
      expect(deriveSizeTier(25)).toBe(SizeTier.L);
      expect(deriveSizeTier(39.9)).toBe(SizeTier.L);
      expect(deriveSizeTier(40)).toBe(SizeTier.XL);
      expect(deriveSizeTier(60)).toBe(SizeTier.XL);
    });

    it('returns null when weight is missing', () => {
      expect(deriveSizeTier(null)).toBeNull();
      expect(deriveSizeTier(undefined)).toBeNull();
    });
  });

  describe('getVaccineStatus', () => {
    const referenceDate = new Date('2026-10-15T00:00:00Z');

    it('returns EXPIRED when expiryDate is in the past', () => {
      const past = new Date('2026-10-01T00:00:00Z');
      expect(getVaccineStatus(past, referenceDate)).toBe(VaccinationStatus.EXPIRED);
    });

    it('returns DUE_SOON when expiryDate is within 30 days ahead', () => {
      const dueIn10Days = new Date('2026-10-25T00:00:00Z');
      const dueIn29Days = new Date('2026-11-13T00:00:00Z');
      expect(getVaccineStatus(dueIn10Days, referenceDate)).toBe(VaccinationStatus.DUE_SOON);
      expect(getVaccineStatus(dueIn29Days, referenceDate)).toBe(VaccinationStatus.DUE_SOON);
    });

    it('returns UP_TO_DATE when expiryDate is more than 30 days in the future', () => {
      const farFuture = new Date('2027-04-15T00:00:00Z');
      expect(getVaccineStatus(farFuture, referenceDate)).toBe(VaccinationStatus.UP_TO_DATE);
    });

    it('returns UP_TO_DATE when no expiryDate is provided (lifetime / record only)', () => {
      expect(getVaccineStatus(null, referenceDate)).toBe(VaccinationStatus.UP_TO_DATE);
      expect(getVaccineStatus(undefined, referenceDate)).toBe(VaccinationStatus.UP_TO_DATE);
    });
  });
});
