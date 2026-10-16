'use client';

import * as React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Star, ShoppingBag, Eye, ArrowRight } from 'lucide-react';
import { ProductListItemSummary } from '@pawnest/shared';
import { Badge } from '../ui/Badge';
import { FavouriteButton } from '../ui/FavouriteButton';

export function ProductCard({ product }: { product: ProductListItemSummary }) {
  const isPriceRange = product.minPriceCents !== product.maxPriceCents;
  const formattedPrice = isPriceRange
    ? `$${(product.minPriceCents / 100).toFixed(2)} – $${(product.maxPriceCents / 100).toFixed(2)}`
    : `$${(product.minPriceCents / 100).toFixed(2)}`;

  return (
    <div className="group rounded-[var(--radius-lg)] bg-[var(--color-ivory-50)] border border-[var(--color-ivory-300)] overflow-hidden shadow-[var(--shadow-1)] hover:shadow-[var(--shadow-2)] hover:border-[var(--color-sage-300)] transition-all duration-300 flex flex-col h-full">
      {/* Arch Image Frame */}
      <Link
        href={`/supplies/p/${product.slug}`}
        className="block relative aspect-square bg-[var(--color-ivory-200)] overflow-hidden border-b border-[var(--color-ivory-300)]"
      >
        {product.imageKeys[0] ? (
          <Image
            src={product.imageKeys[0]}
            alt={product.name}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center font-serif text-sm text-[var(--color-charcoal-400)]">
            PawNest
          </div>
        )}

        {/* Overlay Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10">
          <Badge variant="demo">
            Demo Item
          </Badge>
          {!product.inStock && (
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[var(--color-charcoal-900)] text-[var(--color-ivory-50)] shadow-sm">
              Out of Stock
            </span>
          )}
        </div>

        {/* Favourite Button */}
        <div className="absolute top-3 right-3 z-20">
          <FavouriteButton kind="PRODUCT" id={product.id} size="sm" />
        </div>

        {/* Quick View Pill on Hover */}
        <div className="absolute inset-x-0 bottom-3 flex justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 px-3 z-10 pointer-events-none">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-[var(--color-ivory-50)]/95 text-[var(--color-charcoal-900)] backdrop-blur-sm shadow-[var(--shadow-2)]">
            <Eye className="w-3.5 h-3.5" />
            View Options
          </span>
        </div>
      </Link>

      {/* Content */}
      <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px] text-[var(--color-charcoal-500)] font-medium">
            <span className="uppercase tracking-wider text-[var(--color-sage-700)] font-bold">
              {product.brand}
            </span>
            <span>{product.categoryName}</span>
          </div>

          <Link href={`/supplies/p/${product.slug}`} className="block">
            <h3 className="font-serif text-base font-medium text-[var(--color-charcoal-900)] group-hover:text-[var(--color-sage-700)] transition-colors line-clamp-2">
              {product.name}
            </h3>
          </Link>

          {/* Rating */}
          <div className="flex items-center gap-1.5 text-xs text-[var(--color-charcoal-600)] pt-0.5">
            <div className="flex items-center text-amber-500">
              <Star className="w-3.5 h-3.5 fill-current" />
            </div>
            <span className="font-semibold text-[var(--color-charcoal-800)]">
              {product.ratingAvg.toFixed(1)}
            </span>
            <span className="text-[11px] text-[var(--color-charcoal-400)]">
              ({product.ratingCount})
            </span>
          </div>
        </div>

        {/* Footer: Price & CTA */}
        <div className="pt-2 border-t border-[var(--color-ivory-200)] flex items-center justify-between">
          <div>
            <span className="font-serif text-base font-semibold text-[var(--color-charcoal-900)]">
              {formattedPrice}
            </span>
          </div>

          <Link
            href={`/supplies/p/${product.slug}`}
            className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-full border border-[var(--color-ivory-300)] bg-[var(--color-ivory-100)] text-[var(--color-charcoal-800)] hover:bg-[var(--color-sage-700)] hover:text-[var(--color-ivory-50)] hover:border-[var(--color-sage-700)] transition-colors"
          >
            Options
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}
