'use client';

import * as React from 'react';
import Link from 'next/link';
import { apiFetch } from '../../../lib/api/client';
import { PetSummary } from '@pawnest/shared';
import { PetCard } from '../../../components/pets/PetCard';
import { VaccineReminderBanner } from '../../../components/pets/VaccineReminderBanner';
import { Button } from '../../../components/ui/Button';
import { Plus, Loader2 } from 'lucide-react';

export default function PetsListPage() {
  const [pets, setPets] = React.useState<PetSummary[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  const fetchPets = React.useCallback(async () => {
    try {
      const res = await apiFetch<{ items: PetSummary[] }>('/pets');
      setPets(res.items);
    } catch {
      setPets([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchPets();
  }, [fetchPets]);

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-[var(--color-sage-700)]">
            Single Profile for Every Booking
          </span>
          <h1 className="text-3xl sm:text-4xl font-serif text-[var(--color-charcoal-900)] mt-1 tracking-tight">
            Your Pets
          </h1>
          <p className="text-sm text-[var(--color-charcoal-600)] mt-1">
            Keep health notes, breed size metrics, and vaccination records up to date.
          </p>
        </div>

        <Link href="/dashboard/pets/new">
          <Button variant="primary" size="sm" className="gap-1.5 shrink-0">
            <Plus className="w-4 h-4" />
            <span>Add New Pet</span>
          </Button>
        </Link>
      </div>

      {/* Reminder Banner */}
      <VaccineReminderBanner pets={pets} />

      {/* Content */}
      {isLoading ? (
        <div className="p-16 flex items-center justify-center text-[var(--color-charcoal-500)]">
          <Loader2 className="w-6 h-6 animate-spin text-[var(--color-sage-700)]" />
        </div>
      ) : pets.length === 0 ? (
        <div className="p-10 sm:p-16 text-center rounded-[var(--radius-2xl)] bg-[var(--color-ivory-50)] border border-dashed border-[var(--color-ivory-300)] space-y-4">
          <div className="w-12 h-12 rounded-full bg-[var(--color-sage-100)] text-[var(--color-sage-700)] flex items-center justify-center mx-auto text-xl">
            🐕
          </div>
          <div className="space-y-1">
            <h3 className="font-serif text-xl font-semibold text-[var(--color-charcoal-900)]">
              No pets registered yet
            </h3>
            <p className="text-xs text-[var(--color-charcoal-600)] max-w-md mx-auto leading-relaxed">
              PawNest lets you manage dog and cat profiles in one place. Add your first companion to unlock quick slot booking and vaccination compliance checks.
            </p>
          </div>
          <Link href="/dashboard/pets/new">
            <Button variant="primary" size="md">
              Add Your Pet
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {pets.map((pet) => (
            <PetCard key={pet.id} pet={pet} />
          ))}
        </div>
      )}
    </div>
  );
}
