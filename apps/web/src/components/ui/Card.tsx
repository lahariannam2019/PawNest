import * as React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hoverLift?: boolean;
}

export function Card({ className, hoverLift = false, children, ...props }: CardProps) {
  return (
    <div
      className={twMerge(
        clsx(
          'bg-[var(--color-ivory-50)] border border-[var(--color-ivory-300)] rounded-[var(--radius-lg)] shadow-[var(--shadow-1)] overflow-hidden transition-all duration-300',
          hoverLift && 'hover:-translate-y-1 hover:shadow-[var(--shadow-3)]',
          className
        )
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={twMerge(clsx('p-6 pb-3 space-y-1.5', className))} {...props}>
      {children}
    </div>
  );
}

export function CardContent({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={twMerge(clsx('p-6 pt-0', className))} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={twMerge(clsx('p-6 pt-0 flex items-center', className))} {...props}>
      {children}
    </div>
  );
}
