import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium tracking-wide transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-[var(--color-ivory-200)] text-[var(--color-charcoal-700)]',
        sage: 'bg-[var(--color-sage-100)] text-[var(--color-sage-800)]',
        peach: 'bg-[var(--color-peach-100)] text-[var(--color-peach-700)]',
        demo: 'bg-[var(--color-peach-50)] text-[var(--color-peach-700)] border border-dashed border-[var(--color-peach-500)] font-semibold',
        outline: 'border border-[var(--color-ivory-300)] text-[var(--color-charcoal-700)]',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={twMerge(clsx(badgeVariants({ variant, className })))} {...props} />;
}
