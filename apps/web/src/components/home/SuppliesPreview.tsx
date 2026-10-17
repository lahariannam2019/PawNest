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

  const categories = ['All', 'Organic Food', 'Walk & Leashes', 'Beds & Linens', 'Grooming Care'];

  const products = [
    {
      id: 'p-1',
      slug: 'nordic-pasture-raised-salmon-kibble',
      name: 'Nordic Pasture-Raised Salmon & Sweet Potato Kibble',
      brand: 'Nordic Hound',
      category: 'Organic Food',
      priceCents: 3400,
      compareAtCents: 3800,
      rating: 4.9,
      reviews: 38,
      image: '/images/products/nordic-pasture-raised-salmon-kibble.jpg',
    },
    {
      id: 'p-2',
      slug: 'atelier-hands-free-climbing-rope-leash',
      name: 'Nordic Multi-Way Hands-Free Climbing Rope Leash',
      brand: 'Nordic Hound',
      category: 'Walk & Leashes',
      priceCents: 5800,
      compareAtCents: 6500,
      rating: 4.91,
      reviews: 44,
      image: '/images/products/atelier-hands-free-climbing-rope-leash.jpg',
    },
    {
      id: 'p-3',
      slug: 'cloud-haven-orthopedic-memory-foam-lounge-bed',
      name: 'Cloud Haven Ergonomic Memory Foam Lounge Bed',
      brand: 'LuxePup Studio',
      category: 'Beds & Linens',
      priceCents: 9500,
      compareAtCents: 11000,
      rating: 4.96,
      reviews: 47,
      image: '/images/products/cloud-haven-orthopedic-memory-foam-lounge-bed.jpg',
    },
    {
      id: 'p-4',
      slug: 'botanical-chamomile-calming-shampoo',
      name: 'Organic Chamomile & Colloidal Oatmeal Hypoallergenic Shampoo',
      brand: 'Botanical Bark & Whisker',
      category: 'Grooming Care',
      priceCents: 2200,
      compareAtCents: 2600,
      rating: 4.96,
      reviews: 58,
      image: '/images/products/botanical-chamomile-calming-shampoo.jpg',
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
            <Link
              key={prod.id}
              href={`/supplies/p/${prod.slug}`}
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

              {/* Info & Action */}
              <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-[var(--color-charcoal-500)] uppercase tracking-wider block">
                    {prod.brand}
                  </span>
                  <h3 className="font-serif text-sm font-semibold text-[var(--color-charcoal-900)] line-clamp-2 group-hover:text-[var(--color-sage-700)] transition-colors">
                    {prod.name}
                  </h3>
                  <Rating value={prod.rating} count={prod.reviews} />
                </div>

                <div className="pt-3 border-t border-[var(--color-ivory-300)] flex items-center justify-between">
                  <Price cents={prod.priceCents} compareAtCents={prod.compareAtCents} />
                  <span className="text-xs font-semibold text-[var(--color-sage-700)] group-hover:underline flex items-center gap-1">
                    <span>View item</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </Container>
    </section>
  );
}
