import * as React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface SectionProps extends React.HTMLAttributes<HTMLElement> {
  padding?: 'default' | 'hero' | 'tight' | 'none';
  bg?: 'ivory' | 'subtle' | 'dark' | 'none';
}

export function Section({
  className,
  padding = 'default',
  bg = 'none',
  children,
  ...props
}: SectionProps) {
  return (
    <section
      className={twMerge(
        clsx(
          padding === 'default' && 'py-14 md:py-20 lg:py-28',
          padding === 'hero' && 'pt-10 pb-16 md:pt-16 md:pb-24 lg:pt-20 lg:pb-32',
          padding === 'tight' && 'py-8 md:py-12',
          bg === 'subtle' && 'bg-[var(--color-ivory-200)]/60',
          bg === 'dark' && 'bg-[var(--color-sage-900)] text-[var(--color-ivory-50)]',
          className
        )
      )}
      {...props}
    >
      {children}
    </section>
  );
}
