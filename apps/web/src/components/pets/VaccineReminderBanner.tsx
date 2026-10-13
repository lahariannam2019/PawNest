'use client';

import * as React from 'react';
import Link from 'next/link';
import { PetSummary, VaccinationStatus } from '@pawnest/shared';
import { ShieldAlert, AlertCircle, ArrowRight } from 'lucide-react';

interface VaccineReminderBannerProps {
  pets: PetSummary[];
  className?: string;
}

export function VaccineReminderBanner({ pets, className = '' }: VaccineReminderBannerProps) {
  // Find pets that need attention
  const expiredPets = pets.filter((p) => p.vaccinationStatus === VaccinationStatus.EXPIRED);
  const dueSoonPets = pets.filter((p) => p.vaccinationStatus === VaccinationStatus.DUE_SOON);

  if (expiredPets.length === 0 && dueSoonPets.length === 0) {
    return null;
  }

  const isExpired = expiredPets.length > 0;
  const targetPet = isExpired ? expiredPets[0] : dueSoonPets[0];
  const petName = targetPet.name;

  return (
    <div
      className={`rounded-[var(--radius-xl)] p-4 sm:p-5 border transition-all ${
        isExpired
          ? 'bg-rose-50/90 border-rose-200 text-rose-950'
          : 'bg-[var(--color-peach-50)] border-[var(--color-peach-200)] text-[var(--color-charcoal-900)]'
      } ${className}`}
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div
            className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
              isExpired
                ? 'bg-rose-100 text-rose-700'
                : 'bg-[var(--color-peach-100)] text-[var(--color-peach-700)]'
            }`}
          >
            {isExpired ? (
              <AlertCircle className="w-5 h-5" />
            ) : (
              <ShieldAlert className="w-5 h-5" />
            )}
          </div>
          <div>
            <h4 className="text-sm font-semibold tracking-tight">
              {isExpired
                ? `Vaccination records expired for ${petName}`
                : `Upcoming vaccination renewal due for ${petName}`}
            </h4>
            <p className="text-xs text-[var(--color-charcoal-600)] mt-0.5 leading-relaxed">
              {isExpired
                ? 'Boarding and select grooming services require active core vaccinations. Please update your records.'
                : 'Core vaccines are due for booster within the next 30 days to ensure uninterrupted care.'}
            </p>
          </div>
        </div>

        <Link
          href={`/dashboard/pets/${targetPet.id}?tab=vaccines`}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-[var(--color-ivory-50)] border border-[var(--color-ivory-300)] text-[var(--color-charcoal-800)] hover:bg-[var(--color-ivory-200)] transition-colors shadow-sm shrink-0"
        >
          <span>Update Records</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}
