'use client';

import React from 'react';
import { BookingPriceBreakdown } from '@pawnest/shared';
import { ShieldCheck, Info } from 'lucide-react';

interface PriceSummaryProps {
  quote?: {
    priceCents: number;
    currency: string;
    priceBreakdown: BookingPriceBreakdown;
    cancellationHours: number;
  };
  petName?: string;
  serviceName?: string;
}

export function PriceSummary({ quote, petName, serviceName }: PriceSummaryProps) {
  if (!quote) return null;

  const { priceBreakdown, currency, cancellationHours } = quote;

  function fmt(cents: number): string {
    return `$${(cents / 100).toFixed(2)}`;
  }

  return (
    <div className="bg-white rounded-2xl border border-ivory-300/80 p-5 shadow-xs space-y-4">
      <h3 className="font-serif text-base font-bold text-charcoal-900 border-b border-ivory-200 pb-3">
        Booking Summary & Price
      </h3>

      {serviceName && (
        <div className="flex items-center justify-between text-xs text-charcoal-600">
          <span className="font-medium text-charcoal-900">{serviceName}</span>
          <span>{fmt(priceBreakdown.baseCents)}</span>
        </div>
      )}

      {priceBreakdown.sizeAdjustmentCents > 0 && (
        <div className="flex items-center justify-between text-xs text-charcoal-600">
          <span>Pet Size Tier Adjustment</span>
          <span>+{fmt(priceBreakdown.sizeAdjustmentCents)}</span>
        </div>
      )}

      {priceBreakdown.addOns && priceBreakdown.addOns.length > 0 && (
        <div className="space-y-1.5 pt-1 border-t border-ivory-100">
          <span className="text-[11px] font-semibold text-charcoal-500 uppercase tracking-wider">
            Selected Treatments:
          </span>
          {priceBreakdown.addOns.map((addon) => (
            <div key={addon.id} className="flex items-center justify-between text-xs text-charcoal-600">
              <span>{addon.name}</span>
              <span>+{fmt(addon.priceCents)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Total Row */}
      <div className="pt-3 border-t border-ivory-300 flex items-baseline justify-between">
        <div>
          <span className="text-sm font-bold text-charcoal-900">Total Due</span>
          <p className="text-[11px] text-charcoal-500">Pay at the salon or online</p>
        </div>
        <div className="text-xl font-bold font-serif text-charcoal-900">
          {fmt(quote.priceCents)}
        </div>
      </div>

      {/* Cancellation policy banner */}
      <div className="rounded-xl bg-sage-50/80 border border-sage-200/60 p-3 flex items-start gap-2.5 text-xs text-sage-900">
        <ShieldCheck className="w-4 h-4 text-sage-700 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong className="font-semibold">Flexible Cancellation:</strong> Free cancellation up to{' '}
          {cancellationHours} hours before the appointment.
        </p>
      </div>
    </div>
  );
}
