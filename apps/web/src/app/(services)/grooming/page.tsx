'use client';

import React, { useState, useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Container } from '@/components/layout/Container';
import { Badge } from '@/components/ui/Badge';
import { ProviderCard } from '@/components/providers/ProviderCard';
import { ProviderFilters } from '@/components/providers/ProviderFilters';
import { apiFetch } from '@/lib/api/client';
import { ProviderSummary, Species } from '@pawnest/shared';
import { Sparkles, Map, Loader2, Scissors, Info } from 'lucide-react';

import { getCachedCatalogue, setCachedCatalogue } from '@/lib/api/catalogueCache';

export default function GroomingPage() {
  const [query, setQuery] = useState('');
  const [species, setSpecies] = useState<Species | undefined>();
  const [city, setCity] = useState<string | undefined>();
  const [minRating, setMinRating] = useState<number | undefined>();
  const [providers, setProviders] = useState<ProviderSummary[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [isFiltering, setIsFiltering] = useState(false);
  const [mapNotice, setMapNotice] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    const params = new URLSearchParams({
      type: 'GROOMER',
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
        console.error('Failed to load groomers:', err);
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
          {/* Header Banner */}
          <div className="max-w-3xl mb-8 space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-widest text-sage-700 flex items-center gap-1.5">
                <Scissors className="w-3.5 h-3.5" /> Grooming Ateliers
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-peach-100 text-peach-700 border border-peach-200">
                <Sparkles className="w-3 h-3 text-peach-500" /> Demo Dataset
              </span>
            </div>

            <h1 className="text-4xl md:text-5xl font-serif text-charcoal-900 leading-tight">
              Handcrafted Grooming & Botanical Spas
            </h1>

            <p className="text-base text-charcoal-600 leading-relaxed font-sans">
              Discover calm, cage-free styling ateliers and certified master groomers tailored to your
              companion’s coat type, temperament, and size tier.
            </p>
          </div>

          {/* Demo Disclaimer notice banner */}
          <div className="mb-6 p-3.5 rounded-2xl bg-white border border-ivory-300/80 flex items-start sm:items-center justify-between gap-3 text-xs text-charcoal-600 shadow-2xs">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-sage-600 shrink-0" />
              <span>
                All 8 grooming ateliers below are fully interactive sample partners seeded for local exploration
                and instant slot booking.
              </span>
            </div>
            <button
              onClick={() => setMapNotice((prev) => !prev)}
              className="shrink-0 font-semibold text-sage-700 hover:text-sage-800 flex items-center gap-1"
            >
              <Map className="w-3.5 h-3.5" />
              Toggle Map View
            </button>
          </div>

          {mapNotice && (
            <div className="mb-6 p-4 rounded-xl bg-ivory-200/70 border border-ivory-300 text-xs text-charcoal-700 flex items-center justify-between animate-in fade-in duration-200">
              <p>
                🗺️ <strong>Interactive Map View:</strong> Map toggle is enabled for local layout verification.
                Geocoded pins correspond to Brooklyn and Manhattan atelier locations.
              </p>
              <button
                onClick={() => setMapNotice(false)}
                className="text-xs font-semibold text-charcoal-500 hover:text-charcoal-900 ml-4"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Filters Bar */}
          <div className="mb-8">
            <ProviderFilters
              query={query}
              onQueryChange={setQuery}
              selectedSpecies={species}
              onSpeciesChange={setSpecies}
              selectedCity={city}
              onCityChange={setCity}
              minRating={minRating}
              onMinRatingChange={setMinRating}
              onReset={handleReset}
              isSearching={isFiltering}
            />
          </div>

          {/* Results Summary */}
          <div className="flex items-center justify-between mb-6">
            <span className="text-xs font-semibold text-charcoal-500 uppercase tracking-wider flex items-center gap-2">
              <span>{`${providers.length} Ateliers available`}</span>
              {isFiltering && (
                <span className="inline-flex items-center gap-1 text-[11px] font-normal text-sage-700 normal-case tracking-normal">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  updating...
                </span>
              )}
            </span>
          </div>

          {/* Provider Grid */}
          {initialLoading && providers.length === 0 ? (
            <div className="py-20 flex flex-col items-center justify-center text-charcoal-500">
              <Loader2 className="w-8 h-8 animate-spin text-sage-600 mb-3" />
              <p className="text-sm font-serif">Curating grooming salons...</p>
            </div>
          ) : providers.length === 0 ? (
            <div className="py-16 px-4 rounded-3xl bg-white border border-ivory-300 text-center max-w-lg mx-auto">
              <Scissors className="w-8 h-8 text-charcoal-400 mx-auto mb-3" />
              <h3 className="font-serif text-lg font-bold text-charcoal-900">No studios match your filter</h3>
              <p className="text-xs text-charcoal-600 mt-1 mb-5">
                Try widening your search radius, selecting all pet species, or clearing your search term.
              </p>
              <button
                onClick={handleReset}
                className="px-4 py-2 rounded-xl bg-sage-700 text-white text-xs font-semibold hover:bg-sage-800 transition-colors"
              >
                Reset All Filters
              </button>
            </div>
          ) : (
            <div
              className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 transition-opacity duration-200 ${
                isFiltering ? 'opacity-70 pointer-events-none' : 'opacity-100'
              }`}
            >
              {providers.map((p) => (
                <ProviderCard key={p.id} provider={p} />
              ))}
            </div>
          )}
        </Container>
      </main>

      <Footer />
    </div>
  );
}
