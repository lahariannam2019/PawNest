'use client';

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

const buttonVariants = cva(
  'inline-flex items-center justify-center font-medium transition-all duration-200 select-none disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-sage-600)] focus-visible:ring-offset-2',
  {
    variants: {
      variant: {
        primary:
          'bg-[var(--color-sage-700)] text-[var(--color-ivory-50)] hover:bg-[var(--color-sage-800)] hover:-translate-y-0.5 active:scale-98 shadow-[var(--shadow-1)] hover:shadow-[var(--shadow-2)]',
        secondary:
          'bg-transparent border border-[var(--color-charcoal-900)] text-[var(--color-charcoal-900)] hover:bg-[var(--color-ivory-200)] active:scale-98',
        ghost:
          'bg-transparent text-[var(--color-charcoal-700)] hover:text-[var(--color-charcoal-900)] hover:bg-[var(--color-ivory-200)]',
        link:
          'bg-transparent text-[var(--color-sage-700)] hover:text-[var(--color-sage-800)] underline-offset-4 hover:underline p-0 h-auto',
        peach:
          'bg-[var(--color-peach-100)] text-[var(--color-peach-700)] hover:bg-[var(--color-peach-200)] active:scale-98',
      },
      size: {
        sm: 'h-9 px-3.5 text-xs rounded-[var(--radius-sm)]',
        md: 'h-12 px-6 text-sm rounded-[var(--radius-md)]',
        lg: 'h-14 px-8 text-base rounded-[var(--radius-md)]',
        icon: 'h-11 w-11 rounded-[var(--radius-md)] p-0',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, isLoading, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={twMerge(clsx(buttonVariants({ variant, size, className })))}
        {...props}
      >
        {isLoading ? (
          <span className="flex items-center gap-2">
            <svg
              className="animate-spin h-4 w-4 text-current"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            <span>Loading...</span>
          </span>
        ) : (
          children
        )}
      </button>
    );
  }
);
Button.displayName = 'Button';
