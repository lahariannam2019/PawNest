'use client';

import * as React from 'react';
import { VaccinationStatus } from '@pawnest/shared';
import { ShieldCheck, ShieldAlert, AlertCircle } from 'lucide-react';

interface VaccineStatusBadgeProps {
  status: VaccinationStatus | string;
  className?: string;
  showIcon?: boolean;
}

export function VaccineStatusBadge({
  status,
  className = '',
  showIcon = true,
}: VaccineStatusBadgeProps) {
  if (status === VaccinationStatus.UP_TO_DATE) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[var(--color-sage-100)] text-[var(--color-sage-800)] border border-[var(--color-sage-200)] ${className}`}
      >
        {showIcon && <ShieldCheck className="w-3.5 h-3.5 text-[var(--color-sage-700)]" />}
        <span>Up to Date</span>
      </span>
    );
  }

  if (status === VaccinationStatus.DUE_SOON) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[var(--color-peach-100)] text-[var(--color-peach-700)] border border-[var(--color-peach-200)] ${className}`}
      >
        {showIcon && <ShieldAlert className="w-3.5 h-3.5 text-[var(--color-peach-500)]" />}
        <span>Due within 30d</span>
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200 ${className}`}
    >
      {showIcon && <AlertCircle className="w-3.5 h-3.5 text-red-600" />}
      <span>Vaccines Overdue</span>
    </span>
  );
}
