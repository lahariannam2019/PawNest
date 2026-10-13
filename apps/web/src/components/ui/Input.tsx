import * as React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { AlertCircle } from 'lucide-react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, helperText, id, ...props }, ref) => {
    const inputId = id || React.useId();

    return (
      <div className="w-full space-y-1.5 text-left">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-charcoal-700)]"
          >
            {label}
          </label>
        )}
        <div className="relative">
          <input
            ref={ref}
            id={inputId}
            className={twMerge(
              clsx(
                'w-full h-[52px] px-4 rounded-[var(--radius-md)] bg-[var(--color-ivory-50)] border border-[var(--color-ivory-300)] text-[var(--color-charcoal-900)] placeholder:text-[var(--color-charcoal-500)] text-sm transition-all focus:outline-none focus:border-[var(--color-sage-600)] focus:ring-2 focus:ring-[var(--color-sage-200)] disabled:opacity-50 disabled:bg-[var(--color-ivory-200)]',
                error && 'border-[var(--color-danger)] focus:border-[var(--color-danger)] focus:ring-[var(--color-danger)]/20',
                className
              )
            )}
            {...props}
          />
        </div>
        {error && (
          <p className="flex items-center gap-1.5 text-xs text-[var(--color-danger)] font-medium">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{error}</span>
          </p>
        )}
        {helperText && !error && (
          <p className="text-xs text-[var(--color-charcoal-500)]">{helperText}</p>
        )}
      </div>
    );
  }
);
Input.displayName = 'Input';
