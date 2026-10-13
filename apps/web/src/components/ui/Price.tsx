import * as React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface PriceProps {
  cents: number;
  currency?: string;
  className?: string;
  prefix?: string;
  compareAtCents?: number | null;
}

export function Price({
  cents,
  currency = 'USD',
  className,
  prefix,
  compareAtCents,
}: PriceProps) {
  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);

  const compareFormatted =
    compareAtCents && compareAtCents > cents
      ? new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency,
          minimumFractionDigits: compareAtCents % 100 === 0 ? 0 : 2,
          maximumFractionDigits: 2,
        }).format(compareAtCents / 100)
      : null;

  return (
    <span className={twMerge(clsx('inline-flex items-baseline gap-1.5 tabular-nums', className))}>
      {prefix && <span className="text-xs text-[var(--color-charcoal-500)] font-normal">{prefix}</span>}
      <span className="font-semibold text-[var(--color-charcoal-900)]">{formatted}</span>
      {compareFormatted && (
        <span className="text-xs line-through text-[var(--color-charcoal-500)] font-normal">
          {compareFormatted}
        </span>
      )}
    </span>
  );
}
