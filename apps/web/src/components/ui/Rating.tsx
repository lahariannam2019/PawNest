import * as React from 'react';
import { Star } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface RatingProps {
  value: number;
  count?: number;
  showCount?: boolean;
  className?: string;
  size?: 'sm' | 'md';
}

export function Rating({
  value,
  count,
  showCount = true,
  className,
  size = 'sm',
}: RatingProps) {
  const iconSize = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4';

  return (
    <div className={twMerge(clsx('inline-flex items-center gap-1.5', className))}>
      <div className="flex items-center gap-0.5 text-[var(--color-sage-600)]" aria-label={`Rating ${value.toFixed(1)} out of 5 stars`}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={twMerge(
              clsx(
                iconSize,
                star <= Math.round(value)
                  ? 'fill-[var(--color-sage-600)] text-[var(--color-sage-600)]'
                  : 'fill-transparent text-[var(--color-ivory-300)]'
              )
            )}
          />
        ))}
      </div>
      <span className="font-semibold text-xs text-[var(--color-charcoal-900)] tabular-nums">
        {value.toFixed(1)}
      </span>
      {showCount && count !== undefined && (
        <span className="text-xs text-[var(--color-charcoal-500)] tabular-nums">
          ({count})
        </span>
      )}
    </div>
  );
}
