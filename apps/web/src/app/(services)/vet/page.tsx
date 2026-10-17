'use client';

import React, { useState, useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Container } from '@/components/layout/Container';
import { ProviderCard } from '@/components/providers/ProviderCard';
import { ProviderFilters } from '@/components/providers/ProviderFilters';
import { apiFetch } from '@/lib/api/client';
import { ProviderSummary, Species, EMERGENCY_DISCLAIMER_TEXT } from '@pawnest/shared';
import { Sparkles, AlertTriangle, Stethoscope, ShieldCheck, HeartPulse, Loader2, PhoneCall } from 'lucide-react';
import { Button } from '@/components/ui/Button';

import { getCachedCatalogue, setCachedCatalogue } from '@/lib/api/catalogueCache';

export default function VetPage() {
  const [query, setQuery] = useState('');
  const [species, setSpecies] = useState<Species | undefined>();
  const [city, setCity] = useState<string | undefined>();
  const [minRating, setMinRating] = useState<number | undefined>();
  const [providers, setProviders] = useState<ProviderSummary[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [isFiltering, setIsFiltering] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    const params = new URLSearchParams({
      type: 'VET_CLINIC',
      ...(query.trim() ? { q: query.trim() } : {}),
      ...(species ? { species } : {}),
      ...(city ? { city } : {}),
      ...(minRating ? { minRating: String(minRating) } : {}),
    });
    const cacheKey = `providers:${params.toString()}`;

    // 1. Instant display from client memory cache (0ms)
    const cached = getCachedCatalogue<{ items: ProviderSummary[] }>(cacheKey);
    if (cached) {
      setProviders(cached.items || []);
      setInitialLoading(false);
      setIsFiltering(false);
    } else {
      setIsFiltering(true);
    }

    // 2. Fetch with AbortController to cancel stale queries
    apiFetch<{ items: ProviderSummary[] }>(`/providers?${params.toString()}`, {
      signal: controller.signal,
    })
      .then((data) => {
        setCachedCatalogue(cacheKey, data);
        setProviders(data.items || []);
      })
      .catch((err) => {
        if (err.name === 'AbortError') return;
        console.error('Failed to load veterinary clinics:', err);
      })
      .finally(() => {
        setInitialLoading(false);
        setIsFiltering(false);
      });

    return () => {
      controller.abort();
    };
  }, [query, species, city, minRating]);

  function handleReset() {
    setQuery('');
    setSpecies(undefined);
    setCity(undefined);
    setMinRating(undefined);
  }

  return (
    <div className="min-h-screen flex flex-col bg-ivory-100">
      <Header />

      <main className="flex-1 py-10 md:py-16">
        <Container>
          {/* Persistent Emergency Care Banner */}
          <div className="mb-8 p-4 md:p-5 rounded-2xl bg-amber-50/90 border border-amber-200/80 shadow-xs">
            <div className="flex items-start gap-3.5">
              <div className="p-2 rounded-xl bg-amber-100/80 text-amber-800 shrink-0 mt-0.5">
                <AlertTriangle className="w-5 h-5 text-amber-700" />
              </div>
              <div className="space-y-1.5 flex-1 text-xs md:text-sm text-amber-950 leading-relaxed">
                <div className="flex items-center gap-2">
                  <span className="font-bold tracking-tight text-amber-900 uppercase text-xs">
                    Urgent Medical Notice
                  </span>
                  <span className="px-2 py-0.2 rounded-full bg-amber-200/60 text-amber-900 text-[10px] font-semibold">
                    Non-Emergency Care Only
                  </span>
                </div>
                <p className="text-amber-900/90">
                  {EMERGENCY_DISCLAIMER_TEXT} If your companion exhibits acute respiratory distress, severe bleeding, sudden collapse, poison ingestion, or bloat, immediately proceed to the nearest 24/7 veterinary emergency hospital.
                </p>
                <div className="flex flex-wrap items-center gap-4 pt-1 text-[11px] font-medium text-amber-950">
                  <span className="inline-flex items-center gap-1.5 text-amber-900">
                    <PhoneCall className="w-3.5 h-3.5 text-amber-700" /> NYC Animal Poison Control: (888) 426-4435
                  </span>
                  <span className="text-amber-800/60">•</span>
                  <span>BluePearl 24/7 Emergency: (212) 767-0099</span>
                </div>
              </div>
            </div>
          </div>

          {/* Header Banner */}
          <div className="max-w-3xl mb-8 space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-widest text-sage-700 flex items-center gap-1.5">
                <Stethoscope className="w-3.5 h-3.5" /> Clinical Excellence & Diagnostics
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-peach-100 text-peach-700 border border-peach-200">
                <Sparkles className="w-3 h-3 text-peach-500" /> Certified Clinics
              </span>
            </div>

            <h1 className="text-4xl md:text-5xl font-serif text-charcoal-900 leading-tight">
              Veterinary Care, Preventive Wellness & Diagnostics
            </h1>

            <p className="text-base text-charcoal-600 leading-relaxed font-sans">
              Connect with accredited veterinary doctors specializing in fear-free examinations, core immunity boosters,
              preventive dentistry, and low-stress diagnostics for dogs and cats.
            </p>
          </div>

          {/* Search & Filters Bar */}
          <div className="mb-10">
            <ProviderFilters
              query={query}
              selectedSpecies={species}
              selectedCity={city}
              minRating={minRating}
              onQueryChange={setQuery}
              onSpeciesChange={setSpecies}
              onCityChange={setCity}
              onMinRatingChange={setMinRating}
              onReset={handleReset}
              isSearching={isFiltering}
            />
          </div>

          {/* Results Area */}
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-ivory-300 pb-3">
              <p className="text-sm text-charcoal-600 flex items-center gap-2">
                <span>
                  Showing{' '}
                  <span className="font-semibold text-charcoal-900">{providers.length}</span>{' '}
                  veterinary clinics
                </span>
                {isFiltering && (
                  <span className="inline-flex items-center gap-1 text-[11px] text-sage-700">
                    <Loader2 className="w-3 h-3 animate-spin" /> updating...
                  </span>
                )}
              </p>
            </div>

            {initialLoading && providers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-charcoal-500">
                <Loader2 className="w-8 h-8 animate-spin text-sage-600 mb-3" />
                <p className="text-sm font-medium">Loading accredited veterinary clinics...</p>
              </div>
            ) : providers.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-ivory-300 bg-white/60 p-12 text-center max-w-md mx-auto">
                <Stethoscope className="w-12 h-12 text-sage-400 mx-auto mb-3" />
                <h3 className="text-lg font-serif font-bold text-charcoal-900">No Veterinary Clinics Found</h3>
                <p className="text-xs text-charcoal-600 mt-1 mb-5">
                  We could not find any clinics matching your selected filters. Try broadening your location or species criteria.
                </p>
                <Button variant="secondary" size="sm" onClick={handleReset}>
                  Reset All Filters
                </Button>
              </div>
            ) : (
              <div
                className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 transition-opacity duration-200 ${
                  isFiltering ? 'opacity-70 pointer-events-none' : 'opacity-100'
                }`}
              >
                {providers.map((provider) => (
                  <ProviderCard key={provider.id} provider={provider} />
                ))}
              </div>
            )}
          </div>

          {/* Clinical Standards Information Section */}
          <div className="mt-20 pt-12 border-t border-ivory-300">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="p-6 rounded-2xl bg-white border border-ivory-300 shadow-xs space-y-2">
                <div className="w-10 h-10 rounded-xl bg-sage-50 text-sage-700 flex items-center justify-center mb-3">
                  <ShieldCheck className="w-5 h-5 text-sage-600" />
                </div>
                <h3 className="font-serif font-bold text-charcoal-900 text-lg">Fear-Free Handling</h3>
                <p className="text-xs text-charcoal-600 leading-relaxed">
                  Certified quiet exam spaces, feline-only rooms, gentle handling protocols, and positive-reinforcement treats reduce veterinary stress.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-white border border-ivory-300 shadow-xs space-y-2">
                <div className="w-10 h-10 rounded-xl bg-sage-50 text-sage-700 flex items-center justify-center mb-3">
                  <HeartPulse className="w-5 h-5 text-sage-600" />
                </div>
                <h3 className="font-serif font-bold text-charcoal-900 text-lg">In-House Diagnostics</h3>
                <p className="text-xs text-charcoal-600 leading-relaxed">
                  Same-day blood chemistry, digital dental radiography, fecal flotation, and microscopy allow fast, precise clinical evaluations.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-white border border-ivory-300 shadow-xs space-y-2">
                <div className="w-10 h-10 rounded-xl bg-sage-50 text-sage-700 flex items-center justify-center mb-3">
                  <Stethoscope className="w-5 h-5 text-sage-600" />
                </div>
                <h3 className="font-serif font-bold text-charcoal-900 text-lg">Complete Medical History</h3>
                <p className="text-xs text-charcoal-600 leading-relaxed">
                  Appointments automatically sync with your pet profile, vaccination schedule, and previous wellness visit records on PawNest.
                </p>
              </div>
            </div>
          </div>
        </Container>
      </main>

      <Footer />
    </div>
  );
}
