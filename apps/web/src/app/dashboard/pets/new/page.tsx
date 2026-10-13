'use client';

import * as React from 'react';
import Link from 'next/link';
import { PetForm } from '../../../../components/pets/PetForm';
import { ArrowLeft } from 'lucide-react';

export default function NewPetPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-300">
      <Link
        href="/dashboard/pets"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--color-charcoal-600)] hover:text-[var(--color-charcoal-900)] transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Back to Pet Profiles</span>
      </Link>

      <div>
        <span className="text-xs font-bold uppercase tracking-widest text-[var(--color-sage-700)]">
          New Companion
        </span>
        <h1 className="text-3xl font-serif text-[var(--color-charcoal-900)] mt-1 tracking-tight">
          Create Pet Profile
        </h1>
        <p className="text-sm text-[var(--color-charcoal-600)] mt-1">
          Tell us about your dog or cat so our care providers can deliver safe, considered care.
        </p>
      </div>

      <PetForm />
    </div>
  );
}
