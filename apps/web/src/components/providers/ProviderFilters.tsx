'use client';

import React, { useState, useEffect } from 'react';
import { Search, Filter, X, Loader2 } from 'lucide-react';
import { Species } from '@pawnest/shared';
import { useDebounce } from '@/lib/hooks/useDebounce';

interface ProviderFiltersProps {
  query: string;
  onQueryChange: (q: string) => void;
  selectedSpecies?: Species;
  onSpeciesChange: (sp?: Species) => void;
  selectedCity?: string;
  onCityChange: (city?: string) => void;
  minRating?: number;
  onMinRatingChange: (r?: number) => void;
  onReset: () => void;
  isSearching?: boolean;
}

export function ProviderFilters({
  query,
  onQueryChange,
  selectedSpecies,
  onSpeciesChange,
  selectedCity,
  onCityChange,
  minRating,
  onMinRatingChange,
  onReset,
  isSearching = false,
}: ProviderFiltersProps) {
  const [localQuery, setLocalQuery] = useState(query);
  const debouncedQuery = useDebounce(localQuery, 300);

  // Sync if query changed externally (e.g. reset)
  useEffect(() => {
    setLocalQuery(query);
  }, [query]);

  // Propagate debounced query up to parent
  useEffect(() => {
    if (debouncedQuery !== query) {
      onQueryChange(debouncedQuery);
    }
  }, [debouncedQuery, query, onQueryChange]);

  const hasActiveFilters = Boolean(localQuery || selectedSpecies || selectedCity || minRating);
  const isTypingOrSearching = isSearching || localQuery !== query;

  const handleClear = () => {
    setLocalQuery('');
    onQueryChange('');
  };

  return (
    <div className="bg-white rounded-2xl p-4 sm:p-5 border border-ivory-300/80 shadow-xs space-y-4">
      {/* Top Search & Reset Row */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-charcoal-400" />
          <input
            type="text"
            suppressHydrationWarning
            placeholder="Search by salon name, styling service, or neighborhood..."
            value={localQuery}
            onChange={(e) => setLocalQuery(e.target.value)}
            className="w-full pl-10 pr-9 py-2 text-sm bg-ivory-50 border border-ivory-300 rounded-xl text-charcoal-900 placeholder:text-charcoal-400 focus:outline-none focus:ring-2 focus:ring-sage-500/30 focus:border-sage-600 transition-all"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
            {isTypingOrSearching && (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-sage-600" aria-label="Searching..." />
            )}
            {localQuery && (
              <button
                type="button"
                onClick={handleClear}
                className="text-charcoal-400 hover:text-charcoal-700"
                aria-label="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {hasActiveFilters && (
          <button
            onClick={onReset}
            className="self-start sm:self-auto px-3 py-2 text-xs font-semibold text-charcoal-600 hover:text-sage-700 transition-colors flex items-center gap-1.5"
          >
            <X className="w-3.5 h-3.5" />
            Clear filters
          </button>
        )}
      </div>

      {/* Filter Chips Bar */}
      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-ivory-200">
        <span className="text-xs font-medium text-charcoal-500 flex items-center gap-1 mr-1">
          <Filter className="w-3.5 h-3.5" /> Filter by:
        </span>

        {/* Species selector */}
        <div className="flex items-center rounded-xl bg-ivory-100 p-0.5 border border-ivory-200">
          <button
            onClick={() => onSpeciesChange(undefined)}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
              !selectedSpecies
                ? 'bg-white text-charcoal-900 shadow-2xs font-semibold'
                : 'text-charcoal-600 hover:text-charcoal-900'
            }`}
          >
            All Pets
          </button>
          <button
            onClick={() => onSpeciesChange(Species.DOG)}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
              selectedSpecies === Species.DOG
                ? 'bg-white text-charcoal-900 shadow-2xs font-semibold'
                : 'text-charcoal-600 hover:text-charcoal-900'
            }`}
          >
            Dogs
          </button>
          <button
            onClick={() => onSpeciesChange(Species.CAT)}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
              selectedSpecies === Species.CAT
                ? 'bg-white text-charcoal-900 shadow-2xs font-semibold'
                : 'text-charcoal-600 hover:text-charcoal-900'
            }`}
          >
            Cats
          </button>
        </div>

        {/* Neighborhood / City selector */}
        <div className="flex items-center rounded-xl bg-ivory-100 p-0.5 border border-ivory-200">
          {['All Boroughs', 'Brooklyn', 'New York'].map((c) => {
            const isAll = c === 'All Boroughs';
            const isActive = isAll ? !selectedCity : selectedCity === c;
            return (
              <button
                key={c}
                onClick={() => onCityChange(isAll ? undefined : c)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-white text-charcoal-900 shadow-2xs font-semibold'
                    : 'text-charcoal-600 hover:text-charcoal-900'
                }`}
              >
                {c}
              </button>
            );
          })}
        </div>

        {/* Minimum Rating */}
        <div className="flex items-center rounded-xl bg-ivory-100 p-0.5 border border-ivory-200">
          <button
            onClick={() => onMinRatingChange(undefined)}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
              !minRating
                ? 'bg-white text-charcoal-900 shadow-2xs font-semibold'
                : 'text-charcoal-600 hover:text-charcoal-900'
            }`}
          >
            Any Rating
          </button>
          <button
            onClick={() => onMinRatingChange(4.8)}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
              minRating === 4.8
                ? 'bg-white text-charcoal-900 shadow-2xs font-semibold'
                : 'text-charcoal-600 hover:text-charcoal-900'
            }`}
          >
            ★ 4.8+ Top Rated
          </button>
        </div>
      </div>
    </div>
  );
}
