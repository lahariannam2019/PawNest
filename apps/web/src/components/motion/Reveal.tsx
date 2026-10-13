'use client';

import * as React from 'react';
import { motion } from 'motion/react';
import { useMotionPreference } from '../../lib/motion/useReducedMotion';

export interface RevealProps {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  direction?: 'up' | 'down' | 'left' | 'right' | 'none';
}

export function Reveal({
  children,
  delay = 0,
  className,
  direction = 'up',
}: RevealProps) {
  const { reduceMotion } = useMotionPreference();

  if (reduceMotion) {
    return <div className={className}>{children}</div>;
  }

  const offset = 24;
  const initial = {
    opacity: 0,
    y: direction === 'up' ? offset : direction === 'down' ? -offset : 0,
    x: direction === 'left' ? offset : direction === 'right' ? -offset : 0,
  };

  return (
    <motion.div
      initial={initial}
      whileInView={{ opacity: 1, y: 0, x: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{
        duration: 0.6,
        delay,
        ease: [0.16, 1, 0.3, 1], // ease-out-expo
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
