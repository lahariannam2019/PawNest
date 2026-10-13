'use client';

import * as React from 'react';
import Image, { ImageProps } from 'next/image';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface ArchImageProps extends Omit<ImageProps, 'src'> {
  src: string;
  alt: string;
  aspect?: 'portrait' | 'square' | 'hero' | 'wide';
  showShadow?: boolean;
}

export function ArchImage({
  src,
  alt,
  aspect = 'portrait',
  showShadow = true,
  className,
  priority = false,
  ...props
}: ArchImageProps) {
  const [error, setError] = React.useState(false);

  const aspectClass =
    aspect === 'portrait'
      ? 'aspect-[4/5]'
      : aspect === 'hero'
        ? 'aspect-[3/4] sm:aspect-[4/5]'
        : aspect === 'square'
          ? 'aspect-square'
          : 'aspect-[16/9]';

  return (
    <div
      className={twMerge(
        clsx(
          'relative overflow-hidden rounded-[var(--radius-arch)] bg-[var(--color-ivory-200)] transition-all duration-500',
          aspectClass,
          showShadow && 'shadow-[var(--shadow-3)]',
          className
        )
      )}
    >
      {error ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-[var(--color-ivory-200)] to-[var(--color-peach-100)] p-6 text-center">
          <svg
            className="w-12 h-12 text-[var(--color-sage-500)] opacity-70 mb-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.5"
              d="M12 21a9 9 0 100-18 9 9 0 000 18zm0 0v-4m-3-4a3 3 0 116 0 3 3 0 01-6 0z"
            />
          </svg>
          <span className="text-xs font-serif text-[var(--color-charcoal-600)]">PawNest</span>
        </div>
      ) : (
        <Image
          src={src}
          alt={alt}
          fill
          priority={priority}
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 40vw"
          className="object-cover transition-transform duration-700 ease-out hover:scale-105"
          onError={() => setError(true)}
          {...props}
        />
      )}
    </div>
  );
}
