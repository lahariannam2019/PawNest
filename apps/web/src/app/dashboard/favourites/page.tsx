'use client';

import * as React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Heart, Sparkles, MapPin, Star, ArrowRight, Loader2, Scissors, ShoppingBag } from 'lucide-react';
import { apiFetch } from '../../../lib/api/client';
import { FavouriteSummary, FavouriteKind } from '@pawnest/shared';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { FavouriteButton } from '../../../components/ui/FavouriteButton';

export default function FavouritesPage() {
  const [favourites, setFavourites] = React.useState<FavouriteSummary[]>([]);
  const [activeTab, setActiveTab] = React.useState<'ALL' | 'PROVIDER' | 'PRODUCT'>('ALL');
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const fetchFavourites = React.useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await apiFetch<{ favourites: FavouriteSummary[] }>('/me/favourites');
      setFavourites(res.favourites);
    } catch (err: any) {
      setError(err.message || 'Failed to load your saved collection');
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchFavourites();
  }, [fetchFavourites]);

  const handleRemoved = (id: string) => {
    setFavourites((prev) => prev.filter((f) => f.id !== id));
  };

  const providerFavourites = favourites.filter((f) => f.kind === FavouriteKind.PROVIDER && f.provider);
  const productFavourites = favourites.filter((f) => f.kind === FavouriteKind.PRODUCT && f.product);

  const displayedFavourites =
    activeTab === 'ALL'
      ? favourites
      : activeTab === 'PROVIDER'
      ? providerFavourites
      : productFavourites;

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-[var(--color-sage-700)]">
            Personal Collection
          </span>
          <h1 className="text-3xl sm:text-4xl font-serif text-[var(--color-charcoal-900)] mt-1 tracking-tight">
            Saved & Favourites
          </h1>
          <p className="text-sm text-[var(--color-charcoal-600)] mt-1">
            Care retreats, grooming ateliers, and considered provisions you cherish.
          </p>
        </div>

        {/* Tab Switcher */}
        {favourites.length > 0 && (
          <div className="flex items-center p-1 rounded-full bg-[var(--color-ivory-200)] border border-[var(--color-ivory-300)] self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setActiveTab('ALL')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                activeTab === 'ALL'
                  ? 'bg-[var(--color-sage-700)] text-[var(--color-ivory-50)] shadow-sm'
                  : 'text-[var(--color-charcoal-600)] hover:text-[var(--color-charcoal-900)]'
              }`}
            >
              All ({favourites.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('PROVIDER')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                activeTab === 'PROVIDER'
                  ? 'bg-[var(--color-sage-700)] text-[var(--color-ivory-50)] shadow-sm'
                  : 'text-[var(--color-charcoal-600)] hover:text-[var(--color-charcoal-900)]'
              }`}
            >
              Providers ({providerFavourites.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('PRODUCT')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                activeTab === 'PRODUCT'
                  ? 'bg-[var(--color-sage-700)] text-[var(--color-ivory-50)] shadow-sm'
                  : 'text-[var(--color-charcoal-600)] hover:text-[var(--color-charcoal-900)]'
              }`}
            >
              Supplies ({productFavourites.length})
            </button>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="p-16 flex flex-col items-center justify-center gap-3 text-[var(--color-charcoal-500)]">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--color-sage-700)]" />
          <span className="text-xs font-serif">Loading your curated favourites...</span>
        </div>
      ) : error ? (
        <div className="p-8 rounded-[var(--radius-xl)] bg-rose-50 border border-rose-200 text-center space-y-3">
          <p className="text-xs text-rose-800">{error}</p>
          <Button variant="secondary" size="sm" onClick={fetchFavourites}>
            Retry
          </Button>
        </div>
      ) : displayedFavourites.length === 0 ? (
        <div className="p-10 sm:p-16 rounded-[var(--radius-2xl)] bg-[var(--color-ivory-50)] border border-dashed border-[var(--color-ivory-300)] text-center space-y-4 max-w-xl mx-auto">
          <div className="w-14 h-14 rounded-full bg-rose-50 text-rose-500 border border-rose-200 flex items-center justify-center mx-auto text-xl">
            <Heart className="w-6 h-6 fill-rose-100" />
          </div>
          <div className="space-y-1">
            <h3 className="font-serif text-xl font-medium text-[var(--color-charcoal-900)]">
              {activeTab === 'ALL'
                ? 'Your collection is waiting to be filled'
                : activeTab === 'PROVIDER'
                ? 'No care providers saved yet'
                : 'No supplies saved yet'}
            </h3>
            <p className="text-xs text-[var(--color-charcoal-600)] leading-relaxed max-w-md mx-auto">
              Tap the heart icon on any grooming salon, boarding sanctuary, vet clinic, or artisanal supply item to keep track of what your companion loves.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Link href="/grooming">
              <Button variant="secondary" size="sm" className="gap-1.5 text-xs">
                <Scissors className="w-3.5 h-3.5" />
                <span>Explore Salons</span>
              </Button>
            </Link>
            <Link href="/supplies">
              <Button variant="primary" size="sm" className="gap-1.5 text-xs">
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>Browse Supplies</span>
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayedFavourites.map((fav) => {
            if (fav.kind === FavouriteKind.PROVIDER && fav.provider) {
              const p = fav.provider;
              const bookingPath =
                p.type === 'GROOMER'
                  ? `/grooming/${p.slug}`
                  : p.type === 'BOARDING'
                  ? `/boarding/${p.slug}`
                  : `/vet/${p.slug}`;

              return (
                <div
                  key={fav.id}
                  className="rounded-[var(--radius-2xl)] bg-[var(--color-ivory-50)] border border-[var(--color-ivory-300)] overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col justify-between group"
                >
                  <div className="relative aspect-[16/10] bg-[var(--color-ivory-200)] overflow-hidden">
                    <img
                      src={p.imageKeys[0] || 'https://images.unsplash.com/photo-1516734212186-a967f81ad0d7?auto=format&fit=crop&w=800&q=80'}
                      alt={p.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute top-3 right-3 z-10">
                      <FavouriteButton
                        kind={FavouriteKind.PROVIDER}
                        id={p.id}
                        initialFavourited={true}
                        onToggle={(favState) => {
                          if (!favState) handleRemoved(fav.id);
                        }}
                      />
                    </div>
                    {p.isDemo && (
                      <div className="absolute top-3 left-3">
                        <Badge variant="demo">Demo Atelier</Badge>
                      </div>
                    )}
                  </div>

                  <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1.5 text-xs text-amber-700 font-semibold">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                        <span>{p.ratingAvg.toFixed(1)}</span>
                        <span className="text-[var(--color-charcoal-400)] font-normal">
                          ({p.ratingCount} reviews)
                        </span>
                      </div>
                      <h3 className="font-serif text-lg font-medium text-[var(--color-charcoal-900)] leading-tight">
                        {p.name}
                      </h3>
                      <p className="text-xs text-[var(--color-charcoal-500)] flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-[var(--color-charcoal-400)] shrink-0" />
                        <span>{p.addressLine}, {p.city}</span>
                      </p>
                    </div>

                    <div className="pt-2 border-t border-[var(--color-ivory-200)] flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-sage-700)]">
                        {p.type.replace('_', ' ')}
                      </span>
                      <Link href={bookingPath}>
                        <Button variant="secondary" size="sm" className="text-xs gap-1">
                          <span>View Profile</span>
                          <ArrowRight className="w-3 h-3" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              );
            }

            if (fav.kind === FavouriteKind.PRODUCT && fav.product) {
              const prod = fav.product;
              return (
                <div
                  key={fav.id}
                  className="rounded-[var(--radius-2xl)] bg-[var(--color-ivory-50)] border border-[var(--color-ivory-300)] overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col justify-between group"
                >
                  <div className="relative aspect-[16/10] bg-[var(--color-ivory-200)] overflow-hidden">
                    <img
                      src={prod.imageKeys[0] || 'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?auto=format&fit=crop&w=800&q=80'}
                      alt={prod.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute top-3 right-3 z-10">
                      <FavouriteButton
                        kind={FavouriteKind.PRODUCT}
                        id={prod.id}
                        initialFavourited={true}
                        onToggle={(favState) => {
                          if (!favState) handleRemoved(fav.id);
                        }}
                      />
                    </div>
                    {prod.isDemo && (
                      <div className="absolute top-3 left-3">
                        <Badge variant="demo">Artisanal</Badge>
                      </div>
                    )}
                  </div>

                  <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-sage-700)]">
                        {prod.brand}
                      </span>
                      <h3 className="font-serif text-lg font-medium text-[var(--color-charcoal-900)] leading-tight">
                        {prod.name}
                      </h3>
                      <p className="text-xs font-serif font-semibold text-[var(--color-charcoal-900)]">
                        From ${(prod.minPriceCents / 100).toFixed(2)}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-[var(--color-ivory-200)] flex items-center justify-between">
                      <div className="flex items-center gap-1 text-xs text-amber-700 font-semibold">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                        <span>{prod.ratingAvg.toFixed(1)}</span>
                      </div>
                      <Link href={`/supplies/p/${prod.slug}`}>
                        <Button variant="primary" size="sm" className="text-xs gap-1">
                          <span>View Item</span>
                          <ArrowRight className="w-3 h-3" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              );
            }

            return null;
          })}
        </div>
      )}
    </div>
  );
}
