'use client';

import React from 'react';
import { Search, Filter, X } from 'lucide-react';
import { Species } from '@pawnest/shared';

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
}: ProviderFiltersProps) {
  const hasActiveFilters = Boolean(query || selectedSpecies || selectedCity || minRating);

  return (
    <div className="bg-white rounded-2xl p-4 sm:p-5 border border-ivory-300/80 shadow-xs space-y-4">
      {/* Top Search & Reset Row */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-charcoal-400" />
          <input
            type="text"
            placeholder="Search by salon name, styling service, or neighborhood..."
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm bg-ivory-50 border border-ivory-300 rounded-xl text-charcoal-900 placeholder:text-charcoal-400 focus:outline-none focus:ring-2 focus:ring-sage-500/30 focus:border-sage-600 transition-all"
          />
          {query && (
            <button
              onClick={() => onQueryChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-charcoal-400 hover:text-charcoal-700"
            >
              <X className="w-4 h-4" />
            </button>
          )}
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
