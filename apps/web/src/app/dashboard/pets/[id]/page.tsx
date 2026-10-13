'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { apiFetch } from '../../../../lib/api/client';
import { PetSummary, Species } from '@pawnest/shared';
import { VaccineStatusBadge } from '../../../../components/pets/VaccineStatusBadge';
import { VaccinationList } from '../../../../components/pets/VaccinationList';
import { PetForm } from '../../../../components/pets/PetForm';
import { Button } from '../../../../components/ui/Button';
import {
  ArrowLeft,
  Edit3,
  Trash2,
  Calendar,
  Sparkles,
  ShieldAlert,
  Loader2,
  X,
  AlertTriangle,
} from 'lucide-react';

export default function PetDetailPage() {
  const params = useParams();
  const router = useRouter();
  const petId = params.id as string;

  const [pet, setPet] = React.useState<PetSummary | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [activeTab, setActiveTab] = React.useState<'overview' | 'vaccines' | 'notes'>('overview');

  // Modals
  const [editModalOpen, setEditModalOpen] = React.useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = React.useState(false);
  const [deleteError, setDeleteError] = React.useState<string | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);

  const fetchPet = React.useCallback(async () => {
    try {
      const res = await apiFetch<{ pet: PetSummary }>(`/pets/${petId}`);
      setPet(res.pet);
    } catch {
      setPet(null);
    } finally {
      setIsLoading(false);
    }
  }, [petId]);

  React.useEffect(() => {
    fetchPet();
  }, [fetchPet]);

  const handleDeletePet = async () => {
    setIsDeleting(true);
    setDeleteError(null);

    try {
      await apiFetch(`/pets/${petId}`, { method: 'DELETE' });
      router.push('/dashboard/pets');
    } catch (err: any) {
      setDeleteError(
        err.detail || err.message || 'Cannot delete pet with upcoming bookings. Please cancel bookings first.'
      );
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-16 flex items-center justify-center text-[var(--color-charcoal-500)]">
        <Loader2 className="w-6 h-6 animate-spin text-[var(--color-sage-700)]" />
      </div>
    );
  }

  if (!pet) {
    return (
      <div className="p-12 text-center rounded-[var(--radius-2xl)] bg-[var(--color-ivory-50)] border border-[var(--color-ivory-300)] space-y-4">
        <h3 className="font-serif text-xl font-semibold text-[var(--color-charcoal-900)]">
          Pet profile not found
        </h3>
        <p className="text-xs text-[var(--color-charcoal-600)]">
          This pet profile may have been removed or belongs to another user.
        </p>
        <Link href="/dashboard/pets">
          <Button variant="secondary" size="sm">
            Back to Pet Profiles
          </Button>
        </Link>
      </div>
    );
  }

  // Calculate age string
  const formatAge = () => {
    if (pet.birthDate) {
      const birth = new Date(pet.birthDate);
      const now = new Date();
      const diffMonths =
        (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());
      if (diffMonths < 12) return `${Math.max(1, diffMonths)} months old`;
      const years = Math.floor(diffMonths / 12);
      const remainingMonths = diffMonths % 12;
      return remainingMonths > 0 ? `${years} years, ${remainingMonths} mos` : `${years} years old`;
    }
    if (pet.approxAgeMonths) {
      if (pet.approxAgeMonths < 12) return `${pet.approxAgeMonths} months old`;
      return `${Math.floor(pet.approxAgeMonths / 12)} years old`;
    }
    return 'Age not recorded';
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Top Breadcrumb */}
      <Link
        href="/dashboard/pets"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--color-charcoal-600)] hover:text-[var(--color-charcoal-900)] transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Back to All Pets</span>
      </Link>

      {/* Hero Pet Card */}
      <div className="bg-[var(--color-ivory-50)] border border-[var(--color-ivory-300)] rounded-[var(--radius-2xl)] p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex items-center gap-5 sm:gap-6">
            {/* Signature Arch Avatar */}
            <div className="relative w-24 sm:w-28 h-32 rounded-[var(--radius-arch)] bg-[var(--color-ivory-200)] border border-[var(--color-ivory-300)] overflow-hidden shrink-0 shadow-[var(--shadow-1)]">
              {pet.avatarUrl ? (
                <Image
                  src={pet.avatarUrl}
                  alt={pet.name}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-[var(--color-sage-100)] to-[var(--color-peach-100)] text-[var(--color-sage-800)]">
                  <span className="font-serif text-3xl font-bold">
                    {pet.name.charAt(0).toUpperCase()}
                  </span>
                  <span className="text-[10px] font-semibold uppercase tracking-wider mt-1">
                    {pet.species.toLowerCase()}
                  </span>
                </div>
              )}
            </div>

            {/* Core Info */}
            <div className="space-y-1.5 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[var(--color-ivory-200)] text-[var(--color-charcoal-700)]">
                  {pet.species === Species.DOG ? 'Dog' : pet.species === Species.CAT ? 'Cat' : 'Other'}
                </span>
                <VaccineStatusBadge status={pet.vaccinationStatus} />
                {pet.neutered && (
                  <span className="text-[11px] text-[var(--color-charcoal-600)] flex items-center gap-1 font-medium">
                    <Sparkles className="w-3 h-3 text-[var(--color-sage-600)]" />
                    <span>Neutered</span>
                  </span>
                )}
              </div>

              <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-[var(--color-charcoal-900)] tracking-tight">
                {pet.name}
              </h1>

              <p className="text-sm text-[var(--color-charcoal-600)]">
                {pet.breed || 'Companion breed'} • {formatAge()}
              </p>

              <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--color-charcoal-500)] pt-1">
                {pet.weightKg && <span>{pet.weightKg} kg</span>}
                {pet.sizeTier && (
                  <>
                    <span>•</span>
                    <span className="font-semibold text-[var(--color-charcoal-800)]">
                      Tier {pet.sizeTier}
                    </span>
                  </>
                )}
                {pet.vetClinicName && (
                  <>
                    <span>•</span>
                    <span className="truncate max-w-[200px]">{pet.vetClinicName}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
            <Button
              onClick={() => setEditModalOpen(true)}
              variant="secondary"
              size="sm"
              className="gap-1.5"
            >
              <Edit3 className="w-4 h-4" />
              <span>Edit Details</span>
            </Button>
            <Button
              onClick={() => setDeleteModalOpen(true)}
              variant="ghost"
              size="sm"
              className="text-red-700 hover:bg-red-50 hover:text-red-800"
              title="Delete pet profile"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Vaccine Attention Alert */}
      {pet.vaccinationStatus !== 'UP_TO_DATE' && (
        <div className="p-4 rounded-[var(--radius-xl)] bg-[var(--color-peach-50)] border border-[var(--color-peach-200)] flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <ShieldAlert className="w-5 h-5 text-[var(--color-peach-600)] shrink-0" />
            <span className="text-xs text-[var(--color-charcoal-800)] font-medium">
              Vaccination attention required: Ensure core boosters are logged prior to upcoming bookings.
            </span>
          </div>
          <button
            onClick={() => setActiveTab('vaccines')}
            className="text-xs font-semibold text-[var(--color-peach-700)] hover:underline shrink-0"
          >
            Review Vaccinations →
          </button>
        </div>
      )}

      {/* Tabs Navigation */}
      <div className="border-b border-[var(--color-ivory-300)] flex items-center gap-8 text-sm">
        <button
          onClick={() => setActiveTab('overview')}
          className={`pb-3 font-semibold transition-colors relative ${
            activeTab === 'overview'
              ? 'text-[var(--color-sage-700)]'
              : 'text-[var(--color-charcoal-600)] hover:text-[var(--color-charcoal-900)]'
          }`}
        >
          <span>Overview & Health</span>
          {activeTab === 'overview' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--color-sage-700)] rounded-full" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('vaccines')}
          className={`pb-3 font-semibold transition-colors relative flex items-center gap-1.5 ${
            activeTab === 'vaccines'
              ? 'text-[var(--color-sage-700)]'
              : 'text-[var(--color-charcoal-600)] hover:text-[var(--color-charcoal-900)]'
          }`}
        >
          <span>Vaccinations</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-[var(--color-ivory-200)] text-[var(--color-charcoal-700)]">
            {pet.vaccinations.length}
          </span>
          {activeTab === 'vaccines' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--color-sage-700)] rounded-full" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('notes')}
          className={`pb-3 font-semibold transition-colors relative ${
            activeTab === 'notes'
              ? 'text-[var(--color-sage-700)]'
              : 'text-[var(--color-charcoal-600)] hover:text-[var(--color-charcoal-900)]'
          }`}
        >
          <span>Care Instructions</span>
          {activeTab === 'notes' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--color-sage-700)] rounded-full" />
          )}
        </button>
      </div>

      {/* Tab Panels */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Clinical & Medical */}
          <div className="bg-[var(--color-ivory-50)] border border-[var(--color-ivory-300)] rounded-[var(--radius-xl)] p-6 space-y-4">
            <h3 className="font-serif text-base font-semibold text-[var(--color-charcoal-900)]">
              Clinical & Health Profile
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <span className="font-bold text-[var(--color-charcoal-500)] uppercase tracking-wider block">
                  Allergies
                </span>
                {pet.allergies && pet.allergies.length > 0 ? (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {pet.allergies.map((a, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 rounded-md bg-red-50 text-red-700 border border-red-100 font-medium"
                      >
                        {a}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-[var(--color-charcoal-600)] mt-0.5">No known allergies</p>
                )}
              </div>

              <div>
                <span className="font-bold text-[var(--color-charcoal-500)] uppercase tracking-wider block">
                  Chronic Conditions
                </span>
                {pet.conditions && pet.conditions.length > 0 ? (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {pet.conditions.map((c, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 rounded-md bg-[var(--color-ivory-200)] text-[var(--color-charcoal-800)]"
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-[var(--color-charcoal-600)] mt-0.5">None recorded</p>
                )}
              </div>

              <div>
                <span className="font-bold text-[var(--color-charcoal-500)] uppercase tracking-wider block">
                  Current Medications
                </span>
                {pet.medications && pet.medications.length > 0 ? (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {pet.medications.map((m, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 rounded-md bg-[var(--color-ivory-200)] text-[var(--color-charcoal-800)]"
                      >
                        {m}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-[var(--color-charcoal-600)] mt-0.5">None recorded</p>
                )}
              </div>

              {pet.microchipId && (
                <div className="pt-2 border-t border-[var(--color-ivory-300)]">
                  <span className="font-bold text-[var(--color-charcoal-500)] uppercase tracking-wider block">
                    Microchip ID
                  </span>
                  <p className="font-mono text-[var(--color-charcoal-900)] mt-0.5">
                    {pet.microchipId}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Temperament & Behaviour */}
          <div className="bg-[var(--color-ivory-50)] border border-[var(--color-ivory-300)] rounded-[var(--radius-xl)] p-6 space-y-4">
            <h3 className="font-serif text-base font-semibold text-[var(--color-charcoal-900)]">
              Temperament & Social Profile
            </h3>

            <div className="space-y-4 text-xs">
              <div>
                <span className="font-bold text-[var(--color-charcoal-500)] uppercase tracking-wider block mb-1.5">
                  Observed Personality Traits
                </span>
                {pet.temperament && pet.temperament.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {pet.temperament.map((t, i) => (
                      <span
                        key={i}
                        className="px-2.5 py-1 rounded-full bg-[var(--color-sage-100)] text-[var(--color-sage-800)] border border-[var(--color-sage-200)] font-medium"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-[var(--color-charcoal-600)]">No traits added yet</p>
                )}
              </div>

              <div>
                <span className="font-bold text-[var(--color-charcoal-500)] uppercase tracking-wider block mb-1.5">
                  Sensitivities & Fears
                </span>
                {pet.fears && pet.fears.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {pet.fears.map((f, i) => (
                      <span
                        key={i}
                        className="px-2.5 py-1 rounded-full bg-rose-50 text-rose-800 border border-rose-200 font-medium"
                      >
                        {f}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-[var(--color-charcoal-600)]">None reported</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'vaccines' && (
        <VaccinationList
          petId={pet.id}
          vaccinations={pet.vaccinations}
          onVaccinationChanged={fetchPet}
        />
      )}

      {activeTab === 'notes' && (
        <div className="bg-[var(--color-ivory-50)] border border-[var(--color-ivory-300)] rounded-[var(--radius-xl)] p-6 space-y-3">
          <h3 className="font-serif text-base font-semibold text-[var(--color-charcoal-900)]">
            Care Notes for Providers
          </h3>
          <p className="text-xs text-[var(--color-charcoal-600)] leading-relaxed">
            These notes are automatically provided to salon groomers, overnight boarding attendants, and clinic veterinary staff when booking.
          </p>

          <div className="mt-4 p-4 rounded-[var(--radius-lg)] bg-[var(--color-ivory-100)] border border-[var(--color-ivory-300)]">
            {pet.notes ? (
              <p className="text-sm text-[var(--color-charcoal-800)] whitespace-pre-wrap leading-relaxed">
                {pet.notes}
              </p>
            ) : (
              <p className="text-xs text-[var(--color-charcoal-500)] italic">
                No special care notes currently saved. Click "Edit Details" to add feeding tips, bedtime preferences, or handling instructions.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Edit Pet Modal */}
      {editModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200">
          <div className="w-full max-w-2xl bg-[var(--color-ivory-50)] border border-[var(--color-ivory-300)] rounded-[var(--radius-2xl)] p-6 my-8 shadow-[var(--shadow-3)] space-y-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--color-ivory-300)]">
              <h2 className="font-serif text-xl font-semibold text-[var(--color-charcoal-900)]">
                Edit {pet.name}'s Profile
              </h2>
              <button
                type="button"
                onClick={() => setEditModalOpen(false)}
                className="p-1 rounded-full text-[var(--color-charcoal-500)] hover:bg-[var(--color-ivory-200)]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <PetForm
              initialPet={pet}
              onSuccess={(updated) => {
                setPet(updated);
                setEditModalOpen(false);
              }}
              submitLabel="Update Profile"
            />
          </div>
        </div>
      )}

      {/* Safe Delete Confirmation Modal */}
      {deleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-[var(--color-ivory-50)] border border-[var(--color-ivory-300)] rounded-[var(--radius-2xl)] p-6 shadow-[var(--shadow-3)] space-y-4 animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-700 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="font-serif text-lg font-semibold text-[var(--color-charcoal-900)]">
                Delete {pet.name}'s Profile?
              </h3>
              <p className="text-xs text-[var(--color-charcoal-600)] leading-relaxed">
                This will safely archive this pet profile. If you have confirmed upcoming bookings for {pet.name}, deletion will be blocked until the bookings are cancelled or completed.
              </p>
            </div>

            {deleteError && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs">
                {deleteError}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--color-ivory-300)]">
              <Button
                variant="ghost"
                onClick={() => {
                  setDeleteModalOpen(false);
                  setDeleteError(null);
                }}
                disabled={isDeleting}
              >
                Keep Pet
              </Button>
              <Button
                variant="danger"
                onClick={handleDeletePet}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <span className="flex items-center gap-1.5">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Deleting...</span>
                  </span>
                ) : (
                  <span>Confirm Delete</span>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
