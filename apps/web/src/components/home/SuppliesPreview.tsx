'use client';

import * as React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ShoppingBag, ArrowRight } from 'lucide-react';
import { Container } from '../layout/Container';
import { Price } from '../ui/Price';
import { Rating } from '../ui/Rating';
import { Button } from '../ui/Button';

export function SuppliesPreview() {
  const [activeCategory, setActiveCategory] = React.useState('All');
  const [addedItem, setAddedItem] = React.useState<string | null>(null);

  const categories = ['All', 'Organic Food', 'Walk & Leashes', 'Beds & Linens', 'Grooming Care', 'Calm Toys'];

  const products = [
    {
      id: 'p-1',
      slug: 'pasture-raised-salmon-kibble',
      name: 'Wild Salmon & Heirloom Lentils Dry Food',
      brand: 'Bounty & Burrow',
      category: 'Organic Food',
      priceCents: 4200,
      compareAtCents: 4800,
      rating: 4.9,
      reviews: 84,
      image: 'https://images.unsplash.com/photo-1589924691995-400dc9ecc119?auto=format&fit=crop&w=600&q=80',
    },
    {
      id: 'p-2',
      slug: 'artisan-leather-rope-leash',
      name: 'Natural Cotton & Tuscan Leather Lead',
      brand: 'Wild & Hearth',
      category: 'Walk & Leashes',
      priceCents: 3800,
      compareAtCents: null,
      rating: 5.0,
      reviews: 42,
      image: 'https://images.unsplash.com/photo-1601758228041-f3b2795255f1?auto=format&fit=crop&w=600&q=80',
    },
    {
      id: 'p-3',
      slug: 'orthopedic-linen-dog-bed',
      name: 'Memory Foam Slumber Nest in French Flax',
      brand: 'Nest & Nap',
      category: 'Beds & Linens',
      priceCents: 12500,
      compareAtCents: 14000,
      rating: 4.8,
      reviews: 36,
      image: 'https://images.unsplash.com/photo-1541599540903-216a46ca1dc0?auto=format&fit=crop&w=600&q=80',
    },
    {
      id: 'p-4',
      slug: 'oatmeal-botanical-shampoo',
      name: 'Calming Chamomile & Oat Coat Elixir',
      brand: 'Botanica Canis',
      category: 'Grooming Care',
      priceCents: 2400,
      compareAtCents: null,
      rating: 4.9,
      reviews: 57,
      image: 'https://images.unsplash.com/photo-1516734212186-a967f81ad0d7?auto=format&fit=crop&w=600&q=80',
    },
  ];

  const filteredProducts =
    activeCategory === 'All'
      ? products
      : products.filter((p) => p.category === activeCategory);

  const handleQuickAdd = (name: string) => {
    setAddedItem(name);
    setTimeout(() => setAddedItem(null), 2500);
  };

  return (
    <section className="py-20 md:py-28 bg-[var(--color-ivory-50)]/80 border-t border-[var(--color-ivory-300)]">
      <Container>
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
          <div>
            <div className="text-xs font-bold uppercase tracking-widest text-[var(--color-sage-700)] mb-1">
              Curated Essentials
            </div>
            <h2 className="text-3xl md:text-5xl font-serif text-[var(--color-charcoal-900)] tracking-tight">
              Considered supplies for modern living.
            </h2>
          </div>
          <Link
            href="/supplies"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--color-sage-700)] hover:text-[var(--color-sage-800)] hover:underline"
          >
            <span>Explore full catalogue</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Category Filter Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-8 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide transition-all shrink-0 ${
                activeCategory === cat
                  ? 'bg-[var(--color-charcoal-900)] text-[var(--color-ivory-50)]'
                  : 'bg-[var(--color-ivory-200)]/80 text-[var(--color-charcoal-700)] hover:bg-[var(--color-ivory-300)]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Product Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {filteredProducts.map((prod) => (
            <div
              key={prod.id}
              className="group bg-[var(--color-ivory-100)]/60 border border-[var(--color-ivory-300)] rounded-[var(--radius-xl)] overflow-hidden shadow-[var(--shadow-1)] hover:shadow-[var(--shadow-2)] hover:-translate-y-1 transition-all flex flex-col"
            >
              {/* Image Frame */}
              <div className="relative aspect-[4/5] w-full overflow-hidden bg-[var(--color-ivory-200)]">
                <Image
                  src={prod.image}
                  alt={prod.name}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </div>

              {/* Info & Quick Add */}
              <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-[var(--color-charcoal-500)] uppercase tracking-wider block">
                    {prod.brand}
                  </span>
                  <h3 className="font-serif text-sm font-semibold text-[var(--color-charcoal-900)] line-clamp-2">
                    {prod.name}
                  </h3>
                  <Rating value={prod.rating} count={prod.reviews} />
                </div>

                <div className="pt-3 border-t border-[var(--color-ivory-300)] flex items-center justify-between">
                  <Price cents={prod.priceCents} compareAtCents={prod.compareAtCents} />
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => handleQuickAdd(prod.name)}
                    className="h-8 px-3 text-xs gap-1"
                  >
                    <ShoppingBag className="w-3.5 h-3.5" />
                    <span>{addedItem === prod.name ? 'Added!' : 'Add'}</span>
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
