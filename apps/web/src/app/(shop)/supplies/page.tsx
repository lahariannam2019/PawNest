'use client';

import * as React from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Search, Filter, SlidersHorizontal, Sparkles, X, Check } from 'lucide-react';
import { Header } from '../../../components/layout/Header';
import { Footer } from '../../../components/layout/Footer';
import { Container } from '../../../components/layout/Container';
import { ProductCard } from '../../../components/supplies/ProductCard';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { apiFetch } from '../../../lib/api/client';
import {
  CategorySummary,
  ProductListItemSummary,
  ProductSortOption,
  Species,
} from '@pawnest/shared';

import { getCachedCatalogue, setCachedCatalogue } from '../../../lib/api/catalogueCache';
import { useDebounce } from '../../../lib/hooks/useDebounce';
import { Loader2 } from 'lucide-react';

function SuppliesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [categories, setCategories] = React.useState<CategorySummary[]>([]);
  const [products, setProducts] = React.useState<ProductListItemSummary[]>([]);
  const [initialLoading, setInitialLoading] = React.useState(true);
  const [isFiltering, setIsFiltering] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Filter state
  const activeCategory = searchParams.get('category') || '';
  const activeSpecies = searchParams.get('species') || '';
  const activeSort = searchParams.get('sort') || ProductSortOption.NEWEST;
  const inStockOnly = searchParams.get('inStock') === 'true';
  const searchQuery = searchParams.get('q') || '';

  const [searchInput, setSearchInput] = React.useState(searchQuery);
  const debouncedSearch = useDebounce(searchInput, 300);

  // Sync search input when URL changes
  React.useEffect(() => {
    setSearchInput(searchQuery);
  }, [searchQuery]);

  // Live debounced search sync to URL
  React.useEffect(() => {
    if (debouncedSearch !== searchQuery) {
      const current = new URLSearchParams(searchParams.toString());
      if (debouncedSearch.trim()) {
        current.set('q', debouncedSearch.trim());
      } else {
        current.delete('q');
      }
      router.push(`/supplies?${current.toString()}`);
    }
  }, [debouncedSearch, searchQuery, searchParams, router]);

  // Fetch categories once with cache
  React.useEffect(() => {
    async function fetchCategories() {
      const cached = getCachedCatalogue<{ categories: CategorySummary[] }>('categories:all', 5 * 60 * 1000);
      if (cached) {
        setCategories(cached.categories);
        return;
      }
      try {
        const res = await apiFetch<{ categories: CategorySummary[] }>('/categories');
        setCachedCatalogue('categories:all', res);
        setCategories(res.categories);
      } catch (err) {
        console.error('Failed to load categories:', err);
      }
    }
    fetchCategories();
  }, []);

  // Fetch products when filters change with AbortController and memory cache
  React.useEffect(() => {
    const controller = new AbortController();

    const params = new URLSearchParams();
    if (activeCategory) params.set('category', activeCategory);
    if (activeSpecies) params.set('species', activeSpecies);
    if (activeSort) params.set('sort', activeSort);
    if (inStockOnly) params.set('inStock', 'true');
    if (searchQuery) params.set('q', searchQuery);

    const cacheKey = `products:${params.toString()}`;

    // Instant render from cache (0ms)
    const cached = getCachedCatalogue<{ products: ProductListItemSummary[] }>(cacheKey);
    if (cached) {
      setProducts(cached.products);
      setInitialLoading(false);
      setIsFiltering(false);
    } else {
      setIsFiltering(true);
    }

    apiFetch<{ products: ProductListItemSummary[] }>(`/products?${params.toString()}`, {
      signal: controller.signal,
    })
      .then((res) => {
        setCachedCatalogue(cacheKey, res);
        setProducts(res.products);
      })
      .catch((err: any) => {
        if (err.name === 'AbortError') return;
        console.error('Failed to load products:', err);
        setError(err.message || 'Could not load products');
      })
      .finally(() => {
        setInitialLoading(false);
        setIsFiltering(false);
      });

    return () => {
      controller.abort();
    };
  }, [activeCategory, activeSpecies, activeSort, inStockOnly, searchQuery]);

  const updateFilters = (newParams: Record<string, string | null>) => {
    const current = new URLSearchParams(searchParams.toString());
    Object.entries(newParams).forEach(([key, val]) => {
      if (val === null || val === '') {
        current.delete(key);
      } else {
        current.set(key, val);
      }
    });
    router.push(`/supplies?${current.toString()}`);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateFilters({ q: searchInput.trim() || null });
  };

  const clearAllFilters = () => {
    setSearchInput('');
    router.push('/supplies');
  };

  const hasActiveFilters = Boolean(
    activeCategory || activeSpecies || inStockOnly || searchQuery || (activeSort && activeSort !== ProductSortOption.NEWEST)
  );

  return (
    <div className="min-h-screen flex flex-col bg-[var(--color-ivory-100)]">
      <Header />

      <main className="flex-1 py-8 md:py-14">
        <Container>
          {/* Editorial Hero */}
          <div className="max-w-3xl mb-10 space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-widest text-[var(--color-sage-700)]">
                The PawNest Market
              </span>
              <Badge variant="demo">Demo Catalogue</Badge>
            </div>
            <h1 className="text-4xl md:text-5xl font-serif text-[var(--color-charcoal-900)] tracking-tight">
              Curated Supplies & Essentials
            </h1>
            <p className="text-base text-[var(--color-charcoal-600)] leading-relaxed">
              Wholesome slow-baked recipes, orthopedic memory foam beds, vegetable-tanned leathers, and gentle botanicals — crafted with calm integrity for modern urban companions.
            </p>
          </div>

          {/* Category Chips Bar */}
          <div className="mb-8 overflow-x-auto pb-2 scrollbar-none">
            <div className="flex items-center gap-2">
              <button
                onClick={() => updateFilters({ category: null })}
                className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-200 border ${
                  activeCategory === ''
                    ? 'bg-[var(--color-sage-700)] text-[var(--color-ivory-50)] border-[var(--color-sage-700)] shadow-sm'
                    : 'bg-[var(--color-ivory-50)] text-[var(--color-charcoal-700)] border-[var(--color-ivory-300)] hover:border-[var(--color-sage-300)]'
                }`}
              >
                All Categories
              </button>

              {categories.map((cat) => {
                const isActive = activeCategory === cat.slug;
                return (
                  <button
                    key={cat.id}
                    onClick={() => updateFilters({ category: isActive ? null : cat.slug })}
                    className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-200 border flex items-center gap-1.5 ${
                      isActive
                        ? 'bg-[var(--color-sage-700)] text-[var(--color-ivory-50)] border-[var(--color-sage-700)] shadow-sm'
                        : 'bg-[var(--color-ivory-50)] text-[var(--color-charcoal-700)] border-[var(--color-ivory-300)] hover:border-[var(--color-sage-300)]'
                    }`}
                  >
                    {cat.name}
                    {cat.productCount != null && (
                      <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                        isActive ? 'bg-[var(--color-sage-800)] text-[var(--color-ivory-50)]' : 'bg-[var(--color-ivory-200)] text-[var(--color-charcoal-500)]'
                      }`}>
                        {cat.productCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Search & Filter Toolbar */}
          <div className="p-4 rounded-[var(--radius-xl)] bg-[var(--color-ivory-50)] border border-[var(--color-ivory-300)] shadow-[var(--shadow-1)] mb-8 flex flex-col md:flex-row gap-4 items-center justify-between">
            {/* Search Input */}
            <form onSubmit={handleSearchSubmit} className="relative w-full md:w-80">
              <input
                type="text"
                suppressHydrationWarning
                placeholder="Search food, chews, beds, toys..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full pl-9 pr-8 py-2 text-xs rounded-full border border-[var(--color-ivory-300)] bg-[var(--color-ivory-100)] text-[var(--color-charcoal-900)] placeholder-[var(--color-charcoal-400)] focus:outline-none focus:ring-2 focus:ring-[var(--color-sage-500)] focus:bg-[var(--color-ivory-50)]"
              />
              <Search className="w-4 h-4 text-[var(--color-charcoal-400)] absolute left-3 top-1/2 -translate-y-1/2" />
              {(isFiltering || searchInput !== searchQuery) && (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-sage-600 absolute right-3 top-1/2 -translate-y-1/2" />
              )}
            </form>

            {/* Controls */}
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-between md:justify-end">
              {/* Species filter */}
              <div className="inline-flex rounded-full p-0.5 border border-[var(--color-ivory-300)] bg-[var(--color-ivory-100)]">
                <button
                  onClick={() => updateFilters({ species: null })}
                  className={`px-3 py-1 text-xs font-semibold rounded-full transition-colors ${
                    activeSpecies === '' ? 'bg-[var(--color-ivory-50)] text-[var(--color-charcoal-900)] shadow-sm' : 'text-[var(--color-charcoal-600)]'
                  }`}
                >
                  All Pets
                </button>
                <button
                  onClick={() => updateFilters({ species: 'DOG' })}
                  className={`px-3 py-1 text-xs font-semibold rounded-full transition-colors ${
                    activeSpecies === 'DOG' ? 'bg-[var(--color-ivory-50)] text-[var(--color-charcoal-900)] shadow-sm' : 'text-[var(--color-charcoal-600)]'
                  }`}
                >
                  Dogs
                </button>
                <button
                  onClick={() => updateFilters({ species: 'CAT' })}
                  className={`px-3 py-1 text-xs font-semibold rounded-full transition-colors ${
                    activeSpecies === 'CAT' ? 'bg-[var(--color-ivory-50)] text-[var(--color-charcoal-900)] shadow-sm' : 'text-[var(--color-charcoal-600)]'
                  }`}
                >
                  Cats
                </button>
              </div>

              {/* In-Stock Toggle */}
              <button
                onClick={() => updateFilters({ inStock: inStockOnly ? null : 'true' })}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                  inStockOnly
                    ? 'bg-[var(--color-sage-100)] text-[var(--color-sage-800)] border-[var(--color-sage-300)]'
                    : 'bg-[var(--color-ivory-50)] text-[var(--color-charcoal-600)] border-[var(--color-ivory-300)]'
                }`}
              >
                <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${inStockOnly ? 'bg-[var(--color-sage-700)] border-[var(--color-sage-700)] text-white' : 'border-gray-400'}`}>
                  {inStockOnly && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                </div>
                In Stock Only
              </button>

              {/* Sort Selector */}
              <div className="flex items-center gap-1.5 text-xs text-[var(--color-charcoal-600)]">
                <span className="hidden sm:inline">Sort:</span>
                <select
                  value={activeSort}
                  onChange={(e) => updateFilters({ sort: e.target.value })}
                  className="bg-[var(--color-ivory-100)] border border-[var(--color-ivory-300)] rounded-full px-3 py-1.5 text-xs font-medium text-[var(--color-charcoal-800)] focus:outline-none focus:ring-1 focus:ring-[var(--color-sage-500)]"
                >
                  <option value={ProductSortOption.NEWEST}>Newest Arrivals</option>
                  <option value={ProductSortOption.PRICE_ASC}>Price: Low to High</option>
                  <option value={ProductSortOption.PRICE_DESC}>Price: High to Low</option>
                  <option value={ProductSortOption.RATING}>Customer Rating</option>
                </select>
              </div>
            </div>
          </div>

          {/* Active Filter Chips */}
          {hasActiveFilters && (
            <div className="flex items-center gap-2 flex-wrap mb-6 text-xs">
              <span className="text-[var(--color-charcoal-500)] font-medium">Active filters:</span>
              {activeCategory && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[var(--color-sage-100)] text-[var(--color-sage-800)] border border-[var(--color-sage-300)]">
                  Category: {activeCategory}
                  <button onClick={() => updateFilters({ category: null })}><X className="w-3 h-3" /></button>
                </span>
              )}
              {activeSpecies && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[var(--color-sage-100)] text-[var(--color-sage-800)] border border-[var(--color-sage-300)]">
                  Species: {activeSpecies}
                  <button onClick={() => updateFilters({ species: null })}><X className="w-3 h-3" /></button>
                </span>
              )}
              {inStockOnly && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[var(--color-sage-100)] text-[var(--color-sage-800)] border border-[var(--color-sage-300)]">
                  In Stock Only
                  <button onClick={() => updateFilters({ inStock: null })}><X className="w-3 h-3" /></button>
                </span>
              )}
              {searchQuery && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[var(--color-sage-100)] text-[var(--color-sage-800)] border border-[var(--color-sage-300)]">
                  Search: &quot;{searchQuery}&quot;
                  <button onClick={() => updateFilters({ q: null })}><X className="w-3 h-3" /></button>
                </span>
              )}
              <button
                onClick={clearAllFilters}
                className="text-[var(--color-charcoal-600)] hover:text-[var(--color-sage-700)] underline ml-1"
              >
                Clear all
              </button>
            </div>
          )}

          {/* Product Grid */}
          {initialLoading && products.length === 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-[var(--radius-lg)] bg-[var(--color-ivory-50)] border border-[var(--color-ivory-300)] h-80 animate-pulse p-4 space-y-4"
                >
                  <div className="aspect-square bg-[var(--color-ivory-200)] rounded-[var(--radius-md)]" />
                  <div className="h-4 bg-[var(--color-ivory-200)] rounded w-3/4" />
                  <div className="h-3 bg-[var(--color-ivory-200)] rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="rounded-[var(--radius-xl)] bg-[var(--color-ivory-50)] border border-[var(--color-ivory-300)] p-12 text-center space-y-4 shadow-sm max-w-lg mx-auto">
              <div className="w-16 h-16 rounded-full bg-[var(--color-ivory-200)] flex items-center justify-center mx-auto text-[var(--color-charcoal-400)]">
                <Search className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="font-serif text-xl font-medium text-[var(--color-charcoal-900)]">
                  No products matched your criteria
                </h3>
                <p className="text-xs text-[var(--color-charcoal-600)]">
                  Try broadening your search terms or clearing some of the active filters.
                </p>
              </div>
              <Button variant="secondary" onClick={clearAllFilters} className="mt-2 text-xs">
                Reset All Filters
              </Button>
            </div>
          ) : (
            <div
              className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 transition-opacity duration-200 ${
                isFiltering ? 'opacity-70 pointer-events-none' : 'opacity-100'
              }`}
            >
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </Container>
      </main>

      <Footer />
    </div>
  );
}

export default function SuppliesPage() {
  return (
    <React.Suspense fallback={<div className="min-h-screen bg-[var(--color-ivory-100)]" />}>
      <SuppliesContent />
    </React.Suspense>
  );
}

