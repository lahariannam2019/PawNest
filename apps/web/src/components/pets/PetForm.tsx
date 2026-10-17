'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Species, PetSex, SizeTier, PetSummary } from '@pawnest/shared';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { AvatarUploader } from './AvatarUploader';
import { apiFetch } from '../../lib/api/client';
import { Check, Loader2 } from 'lucide-react';

interface PetFormProps {
  initialPet?: PetSummary;
  onSuccess?: (pet: PetSummary) => void;
  submitLabel?: string;
}

export function PetForm({
  initialPet,
  onSuccess,
  submitLabel = initialPet ? 'Save Changes' : 'Create Pet Profile',
}: PetFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);

  // Form State
  const [name, setName] = React.useState(initialPet?.name || '');
  const [species, setSpecies] = React.useState<Species>(initialPet?.species || Species.DOG);
  const [breed, setBreed] = React.useState(initialPet?.breed || '');
  const [sex, setSex] = React.useState<PetSex>(initialPet?.sex || PetSex.UNKNOWN);
  const [birthDate, setBirthDate] = React.useState(
    initialPet?.birthDate ? initialPet.birthDate.split('T')[0] : ''
  );
  const [approxAgeMonths, setApproxAgeMonths] = React.useState(
    initialPet?.approxAgeMonths?.toString() || ''
  );
  const [weightKg, setWeightKg] = React.useState(initialPet?.weightKg?.toString() || '');
  const [sizeTier, setSizeTier] = React.useState<SizeTier | ''>(initialPet?.sizeTier || '');
  const [neutered, setNeutered] = React.useState<boolean>(initialPet?.neutered ?? true);
  const [microchipId, setMicrochipId] = React.useState(initialPet?.microchipId || '');
  const [vetClinicName, setVetClinicName] = React.useState(initialPet?.vetClinicName || '');
  const [avatarKey, setAvatarKey] = React.useState(initialPet?.avatarKey || '');
  const [notes, setNotes] = React.useState(initialPet?.notes || '');

  // Tag inputs
  const [allergiesText, setAllergiesText] = React.useState(
    initialPet?.allergies ? initialPet.allergies.join(', ') : ''
  );
  const [conditionsText, setConditionsText] = React.useState(
    initialPet?.conditions ? initialPet.conditions.join(', ') : ''
  );
  const [medicationsText, setMedicationsText] = React.useState(
    initialPet?.medications ? initialPet.medications.join(', ') : ''
  );

  // Temperament options
  const defaultTemperamentTags = [
    'Gentle',
    'Calm with dogs',
    'Playful',
    'Loves treats',
    'High energy',
    'Shy with strangers',
    'Independent',
  ];
  const [selectedTemperament, setSelectedTemperament] = React.useState<string[]>(
    initialPet?.temperament || ['Gentle', 'Loves treats']
  );

  const toggleTemperament = (tag: string) => {
    setSelectedTemperament((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  // Fears options
  const defaultFearsTags = ['Thunderstorms', 'Fireworks', 'Water & Baths', 'Vacuum cleaner', 'Car rides'];
  const [selectedFears, setSelectedFears] = React.useState<string[]>(
    initialPet?.fears || []
  );

  const toggleFear = (tag: string) => {
    setSelectedFears((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const parseTags = (text: string): string[] => {
    return text
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);
  };

  const isSubmittingRef = React.useRef(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || isSubmittingRef.current) return;
    setServerError(null);

    if (!name.trim()) {
      setServerError('Pet name is required');
      return;
    }

    isSubmittingRef.current = true;
    setIsSubmitting(true);

    const payload = {
      name: name.trim(),
      species,
      breed: breed.trim() || null,
      sex,
      birthDate: birthDate || null,
      approxAgeMonths: approxAgeMonths ? parseInt(approxAgeMonths, 10) : null,
      weightKg: weightKg ? parseFloat(weightKg) : null,
      sizeTier: sizeTier || null,
      neutered,
      microchipId: microchipId.trim() || null,
      vetClinicName: vetClinicName.trim() || null,
      allergies: parseTags(allergiesText),
      conditions: parseTags(conditionsText),
      medications: parseTags(medicationsText),
      temperament: selectedTemperament,
      fears: selectedFears,
      notes: notes.trim() || null,
      avatarKey: avatarKey || null,
    };

    try {
      if (initialPet) {
        // Edit existing pet
        const res = await apiFetch<{ pet: PetSummary }>(`/pets/${initialPet.id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
        if (onSuccess) onSuccess(res.pet);
        else router.push(`/dashboard/pets/${initialPet.id}`);
      } else {
        // Create new pet
        const res = await apiFetch<{ pet: PetSummary }>('/pets', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        if (onSuccess) onSuccess(res.pet);
        else router.push(`/dashboard/pets/${res.pet.id}`);
      }
    } catch (err: any) {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
      setServerError(err.message || 'Failed to save pet profile. Please check the fields and try again.');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {serverError && (
        <div className="p-4 rounded-[var(--radius-lg)] bg-red-50 border border-red-200 text-red-700 text-sm">
          {serverError}
        </div>
      )}

      {/* 1. Basics & Portrait */}
      <div className="bg-[var(--color-ivory-50)] border border-[var(--color-ivory-300)] rounded-[var(--radius-xl)] p-6 space-y-6">
        <h3 className="font-serif text-lg font-semibold text-[var(--color-charcoal-900)]">
          1. Basic Profile
        </h3>

        {/* Photo Uploader */}
        <AvatarUploader
          currentUrl={initialPet?.avatarUrl}
          onAvatarUploaded={(key) => setAvatarKey(key)}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
          <div>
            <label htmlFor="name" className="block text-xs font-semibold text-[var(--color-charcoal-800)] uppercase tracking-wider mb-2">
              Pet Name *
            </label>
            <Input
              id="name"
              name="name"
              type="text"
              placeholder="e.g. Barnaby"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--color-charcoal-800)] uppercase tracking-wider mb-2">
              Species *
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSpecies(Species.DOG)}
                className={`py-2 px-4 rounded-[var(--radius-md)] text-xs font-semibold border transition-all ${
                  species === Species.DOG
                    ? 'bg-[var(--color-sage-700)] text-[var(--color-ivory-50)] border-[var(--color-sage-700)]'
                    : 'bg-[var(--color-ivory-100)] text-[var(--color-charcoal-700)] border-[var(--color-ivory-300)]'
                }`}
              >
                Dog 🐶
              </button>
              <button
                type="button"
                onClick={() => setSpecies(Species.CAT)}
                className={`py-2 px-4 rounded-[var(--radius-md)] text-xs font-semibold border transition-all ${
                  species === Species.CAT
                    ? 'bg-[var(--color-sage-700)] text-[var(--color-ivory-50)] border-[var(--color-sage-700)]'
                    : 'bg-[var(--color-ivory-100)] text-[var(--color-charcoal-700)] border-[var(--color-ivory-300)]'
                }`}
              >
                Cat 🐱
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="breed" className="block text-xs font-semibold text-[var(--color-charcoal-800)] uppercase tracking-wider mb-2">
              Breed
            </label>
            <Input
              id="breed"
              name="breed"
              type="text"
              placeholder="e.g. Golden Retriever"
              value={breed}
              onChange={(e) => setBreed(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--color-charcoal-800)] uppercase tracking-wider mb-2">
              Sex
            </label>
            <select
              value={sex}
              onChange={(e) => setSex(e.target.value as PetSex)}
              className="w-full h-11 px-3.5 rounded-[var(--radius-md)] border border-[var(--color-ivory-300)] bg-[var(--color-ivory-100)] text-sm text-[var(--color-charcoal-800)] focus:outline-none focus:ring-2 focus:ring-[var(--color-sage-500)]"
            >
              <option value={PetSex.MALE}>Male</option>
              <option value={PetSex.FEMALE}>Female</option>
              <option value={PetSex.UNKNOWN}>Unknown</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--color-charcoal-800)] uppercase tracking-wider mb-2">
              Birth Date
            </label>
            <Input
              type="date"
              value={birthDate}
              onChange={(e) => {
                setBirthDate(e.target.value);
                if (e.target.value) setApproxAgeMonths('');
              }}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--color-charcoal-800)] uppercase tracking-wider mb-2">
              Or Approx Age (Months)
            </label>
            <Input
              type="number"
              placeholder="e.g. 24"
              value={approxAgeMonths}
              onChange={(e) => {
                setApproxAgeMonths(e.target.value);
                if (e.target.value) setBirthDate('');
              }}
              min="0"
              max="360"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--color-charcoal-800)] uppercase tracking-wider mb-2">
              Weight (kg)
            </label>
            <Input
              type="number"
              step="0.1"
              placeholder="e.g. 30.5"
              value={weightKg}
              onChange={(e) => setWeightKg(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-3 pt-6">
            <input
              type="checkbox"
              id="neutered-check"
              checked={neutered}
              onChange={(e) => setNeutered(e.target.checked)}
              className="w-4 h-4 rounded text-[var(--color-sage-700)] focus:ring-[var(--color-sage-500)]"
            />
            <label
              htmlFor="neutered-check"
              className="text-sm font-medium text-[var(--color-charcoal-800)] cursor-pointer"
            >
              Spayed or Neutered
            </label>
          </div>
        </div>
      </div>

      {/* 2. Health & Veterinary */}
      <div className="bg-[var(--color-ivory-50)] border border-[var(--color-ivory-300)] rounded-[var(--radius-xl)] p-6 space-y-5">
        <h3 className="font-serif text-lg font-semibold text-[var(--color-charcoal-900)]">
          2. Health & Clinical Details
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-xs font-semibold text-[var(--color-charcoal-800)] uppercase tracking-wider mb-2">
              Allergies (comma separated)
            </label>
            <Input
              type="text"
              placeholder="e.g. Chicken, Beef, Dairy"
              value={allergiesText}
              onChange={(e) => setAllergiesText(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--color-charcoal-800)] uppercase tracking-wider mb-2">
              Chronic Conditions
            </label>
            <Input
              type="text"
              placeholder="e.g. Hip dysplasia, Sensitive stomach"
              value={conditionsText}
              onChange={(e) => setConditionsText(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--color-charcoal-800)] uppercase tracking-wider mb-2">
              Current Medications
            </label>
            <Input
              type="text"
              placeholder="e.g. Probiotics with dinner"
              value={medicationsText}
              onChange={(e) => setMedicationsText(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--color-charcoal-800)] uppercase tracking-wider mb-2">
              Microchip Number (Optional)
            </label>
            <Input
              type="text"
              placeholder="15-digit microchip ID"
              value={microchipId}
              onChange={(e) => setMicrochipId(e.target.value)}
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-[var(--color-charcoal-800)] uppercase tracking-wider mb-2">
              Primary Veterinary Clinic
            </label>
            <Input
              type="text"
              placeholder="e.g. Veritas Animal Hospital (Williamsburg)"
              value={vetClinicName}
              onChange={(e) => setVetClinicName(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* 3. Temperament & Care Instructions */}
      <div className="bg-[var(--color-ivory-50)] border border-[var(--color-ivory-300)] rounded-[var(--radius-xl)] p-6 space-y-5">
        <h3 className="font-serif text-lg font-semibold text-[var(--color-charcoal-900)]">
          3. Behaviour & Care Notes
        </h3>

        <div>
          <label className="block text-xs font-semibold text-[var(--color-charcoal-800)] uppercase tracking-wider mb-2">
            Temperament Traits
          </label>
          <div className="flex flex-wrap gap-2">
            {defaultTemperamentTags.map((tag) => {
              const selected = selectedTemperament.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTemperament(tag)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    selected
                      ? 'bg-[var(--color-sage-100)] text-[var(--color-sage-800)] border-[var(--color-sage-300)]'
                      : 'bg-[var(--color-ivory-100)] text-[var(--color-charcoal-600)] border-[var(--color-ivory-300)] hover:bg-[var(--color-ivory-200)]'
                  }`}
                >
                  {selected && <Check className="w-3.5 h-3.5 text-[var(--color-sage-700)]" />}
                  <span>{tag}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[var(--color-charcoal-800)] uppercase tracking-wider mb-2">
            Known Fears or Stress Triggers
          </label>
          <div className="flex flex-wrap gap-2">
            {defaultFearsTags.map((tag) => {
              const selected = selectedFears.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleFear(tag)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    selected
                      ? 'bg-rose-100 text-rose-800 border-rose-300'
                      : 'bg-[var(--color-ivory-100)] text-[var(--color-charcoal-600)] border-[var(--color-ivory-300)] hover:bg-[var(--color-ivory-200)]'
                  }`}
                >
                  {selected && <Check className="w-3.5 h-3.5 text-rose-700" />}
                  <span>{tag}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[var(--color-charcoal-800)] uppercase tracking-wider mb-2">
            Special Care Instructions for Groomers & Sitters
          </label>
          <textarea
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Sensitive around paws when drying; loves high-value treats after ear cleanings..."
            className="w-full p-3.5 rounded-[var(--radius-md)] border border-[var(--color-ivory-300)] bg-[var(--color-ivory-100)] text-sm text-[var(--color-charcoal-800)] focus:outline-none focus:ring-2 focus:ring-[var(--color-sage-500)]"
          />
        </div>
      </div>

      {/* Submit Button */}
      <div className="flex items-center justify-end gap-4 pt-4">
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.back()}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant="primary"
          size="lg"
          disabled={isSubmitting}
          className="min-w-[160px]"
        >
          {isSubmitting ? (
            <span className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Saving...</span>
            </span>
          ) : (
            submitLabel
          )}
        </Button>
      </div>
    </form>
  );
}
