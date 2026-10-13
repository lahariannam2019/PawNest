'use client';

import * as React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, ArrowRight, MapPin } from 'lucide-react';
import { Container } from '../layout/Container';
import { Badge } from '../ui/Badge';
import { Rating } from '../ui/Rating';
import { Price } from '../ui/Price';

export function FeaturedProviders() {
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);

  const providers = [
    {
      slug: 'the-canine-atelier',
      name: 'The Canine Atelier',
      type: 'Grooming Salon',
      area: 'Williamsburg, Brooklyn',
      priceFrom: 5500,
      rating: 4.9,
      reviews: 48,
      image: 'https://images.unsplash.com/photo-1516734212186-a967f81ad0d7?auto=format&fit=crop&w=600&q=80',
    },
    {
      slug: 'clover-meadow-boarding',
      name: 'Clover Meadow Suites',
      type: 'Boarding & Daycare',
      area: 'Greenpoint, Brooklyn',
      priceFrom: 7500,
      rating: 4.8,
      reviews: 34,
      image: 'https://images.unsplash.com/photo-1541599540903-216a46ca1dc0?auto=format&fit=crop&w=600&q=80',
    },
    {
      slug: 'veritas-animal-hospital',
      name: 'Veritas Veterinary Clinic',
      type: 'Clinic & Wellness',
      area: 'Cobble Hill, Brooklyn',
      priceFrom: 8500,
      rating: 5.0,
      reviews: 62,
      image: 'https://images.unsplash.com/photo-1628009368231-7bb7cfcb0def?auto=format&fit=crop&w=600&q=80',
    },
    {
      slug: 'sage-hound-groomers',
      name: 'Sage & Hound Grooming Studio',
      type: 'Grooming Salon',
      area: 'Park Slope, Brooklyn',
      priceFrom: 4800,
      rating: 4.9,
      reviews: 29,
      image: 'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?auto=format&fit=crop&w=600&q=80',
    },
    {
      slug: 'haven-pet-sanctuary',
      name: 'Haven Pet Retreat',
      type: 'Boarding & Lodging',
      area: 'DUMBO, Brooklyn',
      priceFrom: 9000,
      rating: 4.9,
      reviews: 51,
      image: 'https://images.unsplash.com/photo-1544568100-847a948585b9?auto=format&fit=crop&w=600&q=80',
    },
    {
      slug: 'north-brooklyn-vet',
      name: 'North Brooklyn Animal Hospital',
      type: 'Clinic & Wellness',
      area: 'Bushwick, Brooklyn',
      priceFrom: 7000,
      rating: 4.7,
      reviews: 38,
      image: 'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?auto=format&fit=crop&w=600&q=80',
    },
  ];

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollContainerRef.current) return;
    const { scrollLeft, clientWidth } = scrollContainerRef.current;
    const scrollAmount = clientWidth * 0.75;
    scrollContainerRef.current.scrollTo({
      left: direction === 'left' ? scrollLeft - scrollAmount : scrollLeft + scrollAmount,
      behavior: 'smooth',
    });
  };

  return (
    <section className="py-20 md:py-28">
      <Container>
        <div className="flex items-end justify-between mb-10">
          <div>
            <div className="text-xs font-bold uppercase tracking-widest text-[var(--color-sage-700)] mb-1">
              Curated Community
            </div>
            <h2 className="text-3xl md:text-5xl font-serif text-[var(--color-charcoal-900)] tracking-tight">
              Featured Care Partners
            </h2>
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => scroll('left')}
              aria-label="Scroll providers left"
              className="p-2.5 rounded-full border border-[var(--color-ivory-300)] bg-[var(--color-ivory-50)] hover:bg-[var(--color-ivory-200)] text-[var(--color-charcoal-700)] transition-colors shadow-sm"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => scroll('right')}
              aria-label="Scroll providers right"
              className="p-2.5 rounded-full border border-[var(--color-ivory-300)] bg-[var(--color-ivory-50)] hover:bg-[var(--color-ivory-200)] text-[var(--color-charcoal-700)] transition-colors shadow-sm"
            >
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Rail */}
        <div
          ref={scrollContainerRef}
          className="flex gap-6 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-none"
        >
          {providers.map((p) => (
            <Link
              key={p.slug}
              href={`/grooming/${p.slug}`}
              className="group min-w-[280px] sm:min-w-[320px] max-w-[320px] snap-start bg-[var(--color-ivory-50)] border border-[var(--color-ivory-300)] rounded-[var(--radius-xl)] overflow-hidden shadow-[var(--shadow-1)] hover:shadow-[var(--shadow-3)] hover:-translate-y-1 transition-all duration-300 flex flex-col shrink-0"
            >
              {/* Photo Frame */}
              <div className="relative h-48 w-full overflow-hidden bg-[var(--color-ivory-200)]">
                <Image
                  src={p.image}
                  alt={p.name}
                  fill
                  sizes="320px"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute top-3 left-3">
                  <Badge variant="demo">Demo Provider</Badge>
                </div>
              </div>

              {/* Provider Info */}
              <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold text-[var(--color-sage-700)] uppercase tracking-wider block">
                    {p.type}
                  </span>
                  <h3 className="font-serif text-lg font-semibold text-[var(--color-charcoal-900)] group-hover:text-[var(--color-sage-700)] transition-colors">
                    {p.name}
                  </h3>
                  <div className="flex items-center gap-1.5 text-xs text-[var(--color-charcoal-600)]">
                    <MapPin className="w-3.5 h-3.5 text-[var(--color-charcoal-500)]" />
                    <span>{p.area}</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-[var(--color-ivory-300)]/60 flex items-center justify-between">
                  <Rating value={p.rating} count={p.reviews} />
                  <Price cents={p.priceFrom} prefix="from" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </Container>
    </section>
  );
}
