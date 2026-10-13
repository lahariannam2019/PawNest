'use client';

import * as React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { PetSummary, Species } from '@pawnest/shared';
import { VaccineStatusBadge } from './VaccineStatusBadge';
import { ArrowRight, Sparkles } from 'lucide-react';

interface PetCardProps {
  pet: PetSummary;
  className?: string;
}

export function PetCard({ pet, className = '' }: PetCardProps) {
  // Format age from birthDate or approxAgeMonths
  const formatAge = () => {
    if (pet.birthDate) {
      const birth = new Date(pet.birthDate);
      const now = new Date();
      const diffMonths =
        (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());
      if (diffMonths < 12) {
        return `${Math.max(1, diffMonths)} mos`;
      }
      const years = Math.floor(diffMonths / 12);
      const remainingMonths = diffMonths % 12;
      return remainingMonths > 0 ? `${years}y ${remainingMonths}m` : `${years} yrs`;
    }
    if (pet.approxAgeMonths) {
      if (pet.approxAgeMonths < 12) return `${pet.approxAgeMonths} mos`;
      const years = Math.floor(pet.approxAgeMonths / 12);
      return `${years} yrs`;
    }
    return null;
  };

  const ageText = formatAge();

  return (
    <div
      className={`group bg-[var(--color-ivory-50)] border border-[var(--color-ivory-300)] rounded-[var(--radius-xl)] p-5 shadow-[var(--shadow-1)] hover:shadow-[var(--shadow-2)] hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between ${className}`}
    >
      <div>
        {/* Top: Avatar & Meta */}
        <div className="flex items-start gap-4 mb-4">
          {/* Signature Arch Avatar */}
          <div className="relative w-20 h-24 rounded-[var(--radius-arch)] bg-[var(--color-ivory-200)] border border-[var(--color-ivory-300)] overflow-hidden shrink-0 shadow-sm">
            {pet.avatarUrl ? (
              <Image
                src={pet.avatarUrl}
                alt={pet.name}
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-105"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-[var(--color-sage-100)] to-[var(--color-peach-100)] text-[var(--color-sage-800)]">
                <span className="font-serif text-2xl font-bold">
                  {pet.name.charAt(0).toUpperCase()}
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-wider mt-0.5">
                  {pet.species.toLowerCase()}
                </span>
              </div>
            )}
          </div>

          {/* Core Info */}
          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[var(--color-ivory-200)] text-[var(--color-charcoal-700)]">
                {pet.species === Species.DOG ? 'Dog' : pet.species === Species.CAT ? 'Cat' : 'Other'}
              </span>
              {pet.neutered && (
                <span className="text-[10px] text-[var(--color-charcoal-500)] flex items-center gap-0.5">
                  <Sparkles className="w-2.5 h-2.5 text-[var(--color-sage-600)]" />
                  <span>Neutered</span>
                </span>
              )}
            </div>

            <h3 className="font-serif text-xl font-semibold text-[var(--color-charcoal-900)] truncate group-hover:text-[var(--color-sage-700)] transition-colors">
              {pet.name}
            </h3>

            <p className="text-xs text-[var(--color-charcoal-600)] truncate">
              {pet.breed || 'Companion breed'}
            </p>

            {/* Quick Metrics */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--color-charcoal-500)] pt-1">
              {ageText && <span>{ageText}</span>}
              {pet.weightKg && (
                <>
                  <span>•</span>
                  <span>{pet.weightKg} kg</span>
                </>
              )}
              {pet.sizeTier && (
                <>
                  <span>•</span>
                  <span className="font-semibold text-[var(--color-charcoal-700)]">
                    Size {pet.sizeTier}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Health Tags or Allergies */}
        {pet.allergies && pet.allergies.length > 0 && (
          <div className="mb-4 flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] font-bold text-red-700 uppercase tracking-wider">
              Allergies:
            </span>
            {pet.allergies.slice(0, 2).map((a, i) => (
              <span
                key={i}
                className="text-[11px] px-2 py-0.5 rounded-md bg-red-50 text-red-700 border border-red-100"
              >
                {a}
              </span>
            ))}
            {pet.allergies.length > 2 && (
              <span className="text-[10px] text-[var(--color-charcoal-500)]">
                +{pet.allergies.length - 2} more
              </span>
            )}
          </div>
        )}
      </div>

      {/* Footer: Vaccination Chip & View Link */}
      <div className="pt-3 border-t border-[var(--color-ivory-300)] flex items-center justify-between">
        <VaccineStatusBadge status={pet.vaccinationStatus} />

        <Link
          href={`/dashboard/pets/${pet.id}`}
          className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--color-sage-700)] group-hover:text-[var(--color-sage-800)] group-hover:underline"
        >
          <span>View Profile</span>
          <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
    </div>
  );
}
