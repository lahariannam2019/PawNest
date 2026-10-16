'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ProviderSummary } from '@pawnest/shared';
import { Star, MapPin, Sparkles, Clock, ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { FavouriteButton } from '@/components/ui/FavouriteButton';
import { resolveImageSrc } from '@/lib/images';

interface ProviderCardProps {
  provider: ProviderSummary;
}

export function ProviderCard({ provider }: ProviderCardProps) {
  const fallback =
    provider.type === 'BOARDING'
      ? '/images/svc-board-01.jpg'
      : provider.type === 'VET_CLINIC'
      ? '/images/svc-vet-01.jpg'
      : '/images/svc-groom-01.jpg';

  const imageSrc = resolveImageSrc(provider.imageKeys?.[0], fallback);

  const priceFromFormatted = provider.priceFromCents
    ? `$${(provider.priceFromCents / 100).toFixed(0)}`
    : null;

  const basePath =
    provider.type === 'BOARDING'
      ? 'boarding'
      : provider.type === 'VET_CLINIC'
      ? 'vet'
      : 'grooming';
  const priceUnit = provider.type === 'BOARDING' ? ' / night' : '';
  const exploreLabel =
    provider.type === 'BOARDING'
      ? 'Explore Suites'
      : provider.type === 'VET_CLINIC'
      ? 'View Clinic'
      : 'Explore Services';

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-2xl bg-white border border-ivory-300/80 shadow-sm transition-all duration-300 hover:shadow-md hover:border-sage-300">
      {/* Top Media Arch Container */}
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-ivory-100">
        <Image
          src={imageSrc}
          alt={provider.name}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-charcoal-900/60 via-transparent to-transparent opacity-60" />

        {/* Demo Badge */}
        {provider.isDemo && (
          <div className="absolute top-3 left-3">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-peach-100 text-peach-700 border border-peach-200 shadow-xs">
              <Sparkles className="w-3 h-3 text-peach-500" /> Demo Atelier
            </span>
          </div>
        )}

        {/* Favourite Button */}
        <div className="absolute top-3 right-3 z-10">
          <FavouriteButton kind="PROVIDER" id={provider.id} size="sm" />
        </div>

        {/* Rating Pill */}
        <div className="absolute bottom-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/95 backdrop-blur-xs text-charcoal-900 text-xs font-medium shadow-xs">
          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
          <span className="font-semibold">{provider.ratingAvg.toFixed(2)}</span>
          <span className="text-charcoal-500 font-normal">({provider.ratingCount})</span>
        </div>

        {/* Price from pill */}
        {priceFromFormatted && (
          <div className="absolute bottom-3 right-3 px-2.5 py-1 rounded-full bg-charcoal-900/80 backdrop-blur-xs text-white text-xs font-medium">
            From {priceFromFormatted}{priceUnit}
          </div>
        )}
      </div>

      {/* Card Content */}
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-center gap-1.5 text-xs text-charcoal-500 mb-1.5">
          <MapPin className="w-3.5 h-3.5 text-sage-600 shrink-0" />
          <span>
            {provider.addressLine}, {provider.city}
          </span>
        </div>

        <h3 className="font-serif text-lg font-bold text-charcoal-900 group-hover:text-sage-700 transition-colors line-clamp-1">
          {provider.name}
        </h3>

        {provider.tagline && (
          <p className="mt-1 text-xs text-charcoal-600 line-clamp-1 italic font-serif">
            &ldquo;{provider.tagline}&rdquo;
          </p>
        )}

        <p className="mt-2 text-xs text-charcoal-600 line-clamp-2 leading-relaxed">
          {provider.description}
        </p>

        {/* Species & Amenities */}
        <div className="mt-3 flex flex-wrap gap-1.5">
          {provider.speciesAccepted.map((sp) => (
            <span
              key={sp}
              className="inline-block px-2 py-0.5 text-[11px] font-medium rounded-md bg-ivory-200 text-charcoal-700"
            >
              {sp === 'DOG' ? 'Dogs' : sp === 'CAT' ? 'Cats' : sp}
            </span>
          ))}
          {provider.amenities.slice(0, 2).map((amenity) => (
            <span
              key={amenity}
              className="inline-block px-2 py-0.5 text-[11px] font-medium rounded-md bg-sage-50 text-sage-700 border border-sage-200/50"
            >
              {amenity}
            </span>
          ))}
        </div>

        {/* Action Bottom */}
        <div className="mt-auto pt-4 flex items-center justify-between border-t border-ivory-200">
          <Link
            href={`/${basePath}/${provider.slug}`}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-sage-700 hover:text-sage-800 transition-colors group-hover:translate-x-0.5 duration-200"
          >
            {exploreLabel}
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>

          <Link href={`/book/${basePath}/${provider.slug}`}>
            <Button size="sm" variant="primary" className="text-xs px-3.5 py-1.5">
              Book
            </Button>
          </Link>
        </div>
      </div>
    </article>
  );
}
