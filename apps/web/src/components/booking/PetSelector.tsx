'use client';

import React from 'react';
import Link from 'next/link';
import { PetSummary, Species } from '@pawnest/shared';
import { VaccineStatusBadge } from '@/components/pets/VaccineStatusBadge';
import { Plus, Check, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface PetSelectorProps {
  pets: PetSummary[];
  selectedPetId?: string;
  onSelectPet: (pet: PetSummary) => void;
  acceptedSpecies?: Species[];
}

export function PetSelector({
  pets,
  selectedPetId,
  onSelectPet,
  acceptedSpecies,
}: PetSelectorProps) {
  if (pets.length === 0) {
    return (
      <div className="p-8 text-center rounded-2xl bg-white border border-ivory-300">
        <p className="font-serif text-base font-medium text-charcoal-800">
          You haven&apos;t added any pets yet
        </p>
        <p className="text-xs text-charcoal-500 mt-1 mb-4">
          Create a pet profile to personalize grooming treatments and speed up future bookings.
        </p>
        <Link href="/dashboard/pets/new">
          <Button variant="primary" size="sm">
            <Plus className="w-4 h-4 mr-1.5" />
            Add Pet Profile
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {pets.map((pet) => {
          const isSelected = pet.id === selectedPetId;
          const isSpeciesSupported =
            !acceptedSpecies || acceptedSpecies.includes(pet.species);

          return (
            <button
              key={pet.id}
              type="button"
              disabled={!isSpeciesSupported}
              onClick={() => onSelectPet(pet)}
              className={`p-4 rounded-2xl border text-left transition-all flex items-start justify-between relative ${
                !isSpeciesSupported
                  ? 'opacity-50 cursor-not-allowed bg-ivory-100 border-ivory-300'
                  : isSelected
                  ? 'bg-sage-50/70 border-sage-600 ring-2 ring-sage-600/30 shadow-xs'
                  : 'bg-white border-ivory-300 hover:border-sage-400 hover:bg-ivory-50/50'
              }`}
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-serif font-bold text-base text-charcoal-900">
                    {pet.name}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-ivory-200 text-charcoal-700">
                    {pet.species === 'DOG' ? 'Dog' : 'Cat'}
                  </span>
                  {pet.sizeTier && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-sage-100 text-sage-800">
                      {pet.sizeTier}
                    </span>
                  )}
                </div>

                <p className="text-xs text-charcoal-600 mt-1">
                  {pet.breed || 'Companion'} {pet.weightKg ? `· ${pet.weightKg} kg` : ''}
                </p>

                <div className="mt-2.5">
                  <VaccineStatusBadge status={pet.vaccinationStatus} />
                </div>

                {!isSpeciesSupported && (
                  <p className="text-[11px] text-amber-700 mt-2 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> Provider does not groom {pet.species.toLowerCase()}s
                  </p>
                )}
              </div>

              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center border transition-all ${
                  isSelected
                    ? 'bg-sage-700 border-sage-700 text-white'
                    : 'border-ivory-400 text-transparent'
                }`}
              >
                <Check className="w-3.5 h-3.5 stroke-[3]" />
              </div>
            </button>
          );
        })}
      </div>

      <div className="pt-2">
        <Link
          href="/dashboard/pets/new"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-sage-700 hover:text-sage-800"
        >
          <Plus className="w-3.5 h-3.5" />
          Add another pet
        </Link>
      </div>
    </div>
  );
}
