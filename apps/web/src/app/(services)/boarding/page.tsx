'use client';

import React, { useState, useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Container } from '@/components/layout/Container';
import { ProviderCard } from '@/components/providers/ProviderCard';
import { ProviderFilters } from '@/components/providers/ProviderFilters';
import { DateRangePicker } from '@/components/booking/DateRangePicker';
import { apiFetch } from '@/lib/api/client';
import { ProviderSummary, Species } from '@pawnest/shared';
import { Sparkles, Calendar, Loader2, Home, Info, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function BoardingPage() {
  const [query, setQuery] = useState('');
  const [species, setSpecies] = useState<Species | undefined>();
  const [city, setCity] = useState<string | undefined>();
  const [minRating, setMinRating] = useState<number | undefined>();
  const [providers, setProviders] = useState<ProviderSummary[]>([]);
  const [loading, setLoading] = useState(true);

  // Date range picker state for search bar
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [nights, setNights] = useState(0);

  useEffect(() => {
    let mounted = true;
    setLoading(true);

    const params = new URLSearchParams({
      type: 'BOARDING',
      ...(query.trim() ? { q: query.trim() } : {}),
      ...(species ? { species } : {}),
      ...(city ? { city } : {}),
      ...(minRating ? { minRating: String(minRating) } : {}),
    });

    apiFetch<{ items: ProviderSummary[] }>(`/providers?${params.toString()}`)
      .then((data) => {
        if (mounted) {
          setProviders(data.items || []);
        }
      })
      .catch((err) => {
        console.error('Failed to load boarding providers:', err);
        if (mounted) {
          setProviders([]);
        }
      })
      .finally(() => {
        if (mounted) {
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [query, species, city, minRating]);

  function handleReset() {
    setQuery('');
    setSpecies(undefined);
    setCity(undefined);
    setMinRating(undefined);
    setCheckIn('');
    setCheckOut('');
    setNights(0);
  }

  return (
    <div className="min-h-screen flex flex-col bg-ivory-100">
      <Header />

      <main className="flex-1 py-10 md:py-16">
        <Container>
          {/* Header Banner */}
          <div className="max-w-3xl mb-8 space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-widest text-sage-700 flex items-center gap-1.5">
                <Home className="w-3.5 h-3.5" /> Overnight Suites & Retreats
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-peach-100 text-peach-700 border border-peach-200">
                <Sparkles className="w-3 h-3 text-peach-500" /> Demo Dataset
              </span>
            </div>

            <h1 className="text-4xl md:text-5xl font-serif text-charcoal-900 leading-tight">
              Quiet Overnight Lodging & Country Sanctuaries
            </h1>

            <p className="text-base text-charcoal-600 leading-relaxed font-sans">
              Discover serene, soundproof private suites, supervised outdoor play lawns, and 24/7 attentive caregivers
              designed to keep your companion rested, happy, and calm while you travel.
            </p>
          </div>

          {/* Quick Date Range Bar */}
          <div className="mb-8 p-4 bg-white rounded-2xl border border-ivory-300 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-sage-50 text-sage-700 border border-sage-200">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-charcoal-500">
                    Your Trip Dates
                  </div>
                  <div className="font-serif text-sm md:text-base font-bold text-charcoal-900">
                    {checkIn && checkOut
                      ? `${checkIn} to ${checkOut} (${nights} ${nights === 1 ? 'night' : 'nights'})`
                      : 'Choose check-in & check-out dates to check live suite availability'}
                  </div>
                </div>
              </div>

              <Button
                variant={showDatePicker ? 'secondary' : 'primary'}
                size="sm"
                onClick={() => setShowDatePicker(!showDatePicker)}
              >
                {showDatePicker ? 'Close Calendar' : checkIn ? 'Change Dates' : 'Select Dates'}
              </Button>
            </div>

            {/* Collapsible DateRangePicker */}
            {showDatePicker && (
              <div className="mt-4 pt-4 border-t border-ivory-200">
                <DateRangePicker
                  checkIn={checkIn}
                  checkOut={checkOut}
                  onChange={({ checkIn: start, checkOut: end, nights: n }) => {
                    setCheckIn(start);
                    setCheckOut(end);
                    setNights(n);
                  }}
                />
              </div>
            )}
          </div>

          {/* Safety & Vaccine Policy Reminder */}
          <div className="mb-8 p-4 rounded-2xl bg-white border border-sage-200 flex items-start gap-3.5 shadow-2xs">
            <ShieldCheck className="w-5 h-5 text-sage-700 shrink-0 mt-0.5" />
            <div className="text-xs text-charcoal-700 space-y-1">
              <p className="font-semibold text-charcoal-900">PawNest Boarding Health & Safety Standard</p>
              <p>
                To safeguard all guests, overnight boarding partners require verified <strong>Rabies, DHPP, and Bordetella</strong> records
                valid through check-out. You can review and update your pet’s records anytime in your{' '}
                <a href="/dashboard/pets" className="underline font-medium text-sage-800 hover:text-sage-900">
                  Pet Dashboard
                </a>.
              </p>
            </div>
          </div>

          {/* Main Layout: Filters Sidebar + Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Sidebar */}
            <aside className="lg:col-span-1">
              <div className="sticky top-24">
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
                />
              </div>
            </aside>

            {/* Providers Grid */}
            <div className="lg:col-span-3">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-24 text-charcoal-500">
                  <Loader2 className="w-8 h-8 animate-spin text-sage-600 mb-3" />
                  <p className="text-sm font-medium">Locating luxury boarding facilities...</p>
                </div>
              ) : providers.length === 0 ? (
                <div className="text-center py-16 px-4 bg-white rounded-3xl border border-ivory-300">
                  <Home className="w-10 h-10 text-charcoal-400 mx-auto mb-3" />
                  <h3 className="font-serif text-xl font-bold text-charcoal-900 mb-1">
                    No boarding facilities match your search
                  </h3>
                  <p className="text-sm text-charcoal-600 max-w-md mx-auto mb-6">
                    Try loosening your filters, removing species requirements, or exploring other neighbourhoods.
                  </p>
                  <Button variant="secondary" onClick={handleReset}>
                    Reset all filters
                  </Button>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex items-center justify-between text-xs text-charcoal-500">
                    <span>
                      Showing <strong>{providers.length}</strong> boarding {providers.length === 1 ? 'retreat' : 'retreats'}
                    </span>
                    <span>All partners verified & insured</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {providers.map((provider) => (
                      <ProviderCard key={provider.id} provider={provider} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </Container>
      </main>

      <Footer />
    </div>
  );
}
