import * as React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={twMerge(
        clsx(
          'animate-pulse rounded-[var(--radius-sm)] bg-[var(--color-ivory-200)]',
          className
        )
      )}
      {...props}
    />
  );
}
