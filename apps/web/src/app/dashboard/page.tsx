'use client';

import * as React from 'react';
import Link from 'next/link';
import { useAuth } from '../../lib/auth/AuthContext';
import { apiFetch } from '../../lib/api/client';
import { PetSummary } from '@pawnest/shared';
import { PetCard } from '../../components/pets/PetCard';
import { VaccineReminderBanner } from '../../components/pets/VaccineReminderBanner';
import { Button } from '../../components/ui/Button';
import {
  Plus,
  Scissors,
  Home as HomeIcon,
  Stethoscope,
  ShoppingBag,
  ArrowRight,
  Loader2,
} from 'lucide-react';

export default function DashboardOverviewPage() {
  const { user } = useAuth();
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

  const firstName = user?.name ? user.name.split(' ')[0] : 'there';

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header Greeting */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-[var(--color-sage-700)]">
            Pet Parent Portal
          </span>
          <h1 className="text-3xl sm:text-4xl font-serif text-[var(--color-charcoal-900)] mt-1 tracking-tight">
            Welcome back, {firstName}.
          </h1>
          <p className="text-sm text-[var(--color-charcoal-600)] mt-1">
            Manage your pet profiles, care appointments, and vaccination reminders.
          </p>
        </div>

        <Link href="/dashboard/pets/new">
          <Button variant="primary" size="sm" className="gap-1.5 shrink-0">
            <Plus className="w-4 h-4" />
            <span>Add a Pet</span>
          </Button>
        </Link>
      </div>

      {/* Global Vaccine Reminder Alert */}
      <VaccineReminderBanner pets={pets} />

      {/* Quick Care Actions */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Link
          href="/grooming"
          className="p-4 rounded-[var(--radius-xl)] bg-[var(--color-ivory-50)] border border-[var(--color-ivory-300)] shadow-sm hover:shadow-md hover:border-[var(--color-sage-300)] hover:-translate-y-0.5 transition-all flex flex-col justify-between space-y-3 group"
        >
          <div className="w-9 h-9 rounded-full bg-[var(--color-sage-100)] text-[var(--color-sage-700)] flex items-center justify-center">
            <Scissors className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-serif text-sm font-semibold text-[var(--color-charcoal-900)] group-hover:text-[var(--color-sage-700)] transition-colors">
              Book Grooming
            </h4>
            <p className="text-[11px] text-[var(--color-charcoal-500)] mt-0.5">
              Spa & coat styling
            </p>
          </div>
        </Link>

        <Link
          href="/boarding"
          className="p-4 rounded-[var(--radius-xl)] bg-[var(--color-ivory-50)] border border-[var(--color-ivory-300)] shadow-sm hover:shadow-md hover:border-[var(--color-peach-300)] hover:-translate-y-0.5 transition-all flex flex-col justify-between space-y-3 group"
        >
          <div className="w-9 h-9 rounded-full bg-[var(--color-peach-100)] text-[var(--color-peach-700)] flex items-center justify-center">
            <HomeIcon className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-serif text-sm font-semibold text-[var(--color-charcoal-900)] group-hover:text-[var(--color-peach-700)] transition-colors">
              Book Boarding
            </h4>
            <p className="text-[11px] text-[var(--color-charcoal-500)] mt-0.5">
              Overnight suites
            </p>
          </div>
        </Link>

        <Link
          href="/vet"
          className="p-4 rounded-[var(--radius-xl)] bg-[var(--color-ivory-50)] border border-[var(--color-ivory-300)] shadow-sm hover:shadow-md hover:border-[var(--color-sage-300)] hover:-translate-y-0.5 transition-all flex flex-col justify-between space-y-3 group"
        >
          <div className="w-9 h-9 rounded-full bg-[var(--color-sage-100)] text-[var(--color-sage-700)] flex items-center justify-center">
            <Stethoscope className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-serif text-sm font-semibold text-[var(--color-charcoal-900)] group-hover:text-[var(--color-sage-700)] transition-colors">
              Schedule Vet Visit
            </h4>
            <p className="text-[11px] text-[var(--color-charcoal-500)] mt-0.5">
              Clinics & wellness
            </p>
          </div>
        </Link>

        <Link
          href="/supplies"
          className="p-4 rounded-[var(--radius-xl)] bg-[var(--color-ivory-50)] border border-[var(--color-ivory-300)] shadow-sm hover:shadow-md hover:border-[var(--color-peach-300)] hover:-translate-y-0.5 transition-all flex flex-col justify-between space-y-3 group"
        >
          <div className="w-9 h-9 rounded-full bg-[var(--color-peach-100)] text-[var(--color-peach-700)] flex items-center justify-center">
            <ShoppingBag className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-serif text-sm font-semibold text-[var(--color-charcoal-900)] group-hover:text-[var(--color-peach-700)] transition-colors">
              Curated Supplies
            </h4>
            <p className="text-[11px] text-[var(--color-charcoal-500)] mt-0.5">
              Organic food & gear
            </p>
          </div>
        </Link>
      </div>

      {/* Pets Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-xl font-semibold text-[var(--color-charcoal-900)]">
            Your Companions ({pets.length})
          </h2>
          {pets.length > 0 && (
            <Link
              href="/dashboard/pets"
              className="text-xs font-semibold text-[var(--color-sage-700)] hover:underline inline-flex items-center gap-1"
            >
              <span>Manage All Pets</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>

        {isLoading ? (
          <div className="p-12 flex items-center justify-center text-[var(--color-charcoal-500)]">
            <Loader2 className="w-6 h-6 animate-spin text-[var(--color-sage-700)]" />
          </div>
        ) : pets.length === 0 ? (
          <div className="p-8 sm:p-12 text-center rounded-[var(--radius-2xl)] bg-[var(--color-ivory-50)] border border-dashed border-[var(--color-ivory-300)] space-y-4">
            <div className="w-12 h-12 rounded-full bg-[var(--color-sage-100)] text-[var(--color-sage-700)] flex items-center justify-center mx-auto text-xl">
              🐾
            </div>
            <div className="space-y-1">
              <h3 className="font-serif text-lg font-semibold text-[var(--color-charcoal-900)]">
                No pet profiles created yet
              </h3>
              <p className="text-xs text-[var(--color-charcoal-600)] max-w-md mx-auto leading-relaxed">
                Add your dog or cat profile once. Every future grooming, boarding stay, and vet visit will automatically know their breed, size, and health needs.
              </p>
            </div>
            <Link href="/dashboard/pets/new">
              <Button variant="primary" size="md">
                Create First Pet Profile
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
    </div>
  );
}
