import * as React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: 'default' | 'narrow' | 'wide';
}

export function Container({
  className,
  size = 'default',
  children,
  ...props
}: ContainerProps) {
  return (
    <div
      className={twMerge(
        clsx(
          'w-full mx-auto px-5 sm:px-8 lg:px-12',
          size === 'default' && 'max-w-[1280px]',
          size === 'narrow' && 'max-w-4xl',
          size === 'wide' && 'max-w-[1440px]',
          className
        )
      )}
      {...props}
    >
      {children}
    </div>
  );
}
