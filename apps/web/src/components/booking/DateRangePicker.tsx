'use client';

import React, { useState } from 'react';

export interface DateRangePickerProps {
  checkIn: string; // YYYY-MM-DD
  checkOut: string; // YYYY-MM-DD
  onChange: (range: { checkIn: string; checkOut: string; nights: number }) => void;
  className?: string;
  minDateStr?: string; // default: tomorrow
}

function getTomorrowStr(): string {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow.toISOString().split('T')[0];
}

function getThreeDaysLaterStr(dateStr: string): string {
  const d = new Date(`${dateStr}T12:00:00Z`);
  d.setDate(d.getDate() + 3);
  return d.toISOString().split('T')[0];
}

function calculateNights(startStr: string, endStr: string): number {
  if (!startStr || !endStr || endStr <= startStr) return 0;
  const start = new Date(`${startStr}T12:00:00Z`);
  const end = new Date(`${endStr}T12:00:00Z`);
  return Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}

export function DateRangePicker({
  checkIn,
  checkOut,
  onChange,
  className = '',
  minDateStr = getTomorrowStr(),
}: DateRangePickerProps) {
  // Calendar view state: displayed year and month
  const initialDate = checkIn ? new Date(`${checkIn}T12:00:00Z`) : new Date(`${minDateStr}T12:00:00Z`);
  const [viewYear, setViewYear] = useState(initialDate.getUTCFullYear());
  const [viewMonth, setViewMonth] = useState(initialDate.getUTCMonth()); // 0-11
  const [selectingStep, setSelectingStep] = useState<'checkIn' | 'checkOut'>('checkIn');

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  // Build calendar matrix for current month
  const firstDayOfMonth = new Date(Date.UTC(viewYear, viewMonth, 1)).getUTCDay(); // 0=Sun..6=Sat
  const daysInMonth = new Date(Date.UTC(viewYear, viewMonth + 1, 0)).getUTCDate();

  const handleDateClick = (dateStr: string) => {
    if (dateStr < minDateStr) return;

    if (selectingStep === 'checkIn') {
      // Pick checkIn
      const newCheckOut = checkOut && checkOut > dateStr ? checkOut : getThreeDaysLaterStr(dateStr);
      const nights = calculateNights(dateStr, newCheckOut);
      onChange({ checkIn: dateStr, checkOut: newCheckOut, nights });
      setSelectingStep('checkOut');
    } else {
      // Pick checkOut
      if (dateStr <= checkIn) {
        // If user clicked date before or equal to checkIn, reset checkIn
        const newCheckOut = getThreeDaysLaterStr(dateStr);
        const nights = calculateNights(dateStr, newCheckOut);
        onChange({ checkIn: dateStr, checkOut: newCheckOut, nights });
        setSelectingStep('checkOut');
      } else {
        const nights = calculateNights(checkIn, dateStr);
        onChange({ checkIn, checkOut: dateStr, nights });
        setSelectingStep('checkIn');
      }
    }
  };

  const nights = calculateNights(checkIn, checkOut);

  return (
    <div className={`p-4 md:p-6 bg-white rounded-2xl border border-[var(--color-ivory-300)] shadow-sm ${className}`}>
      {/* Header Summary */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 mb-4 border-b border-[var(--color-ivory-200)]">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-sage-700)]">
            Stay Dates
          </span>
          <div className="flex items-center gap-2 mt-1">
            <span className="font-serif text-lg font-bold text-[var(--color-charcoal-900)]">
              {checkIn || 'Select check-in'}
            </span>
            <span className="text-[var(--color-charcoal-400)]">→</span>
            <span className="font-serif text-lg font-bold text-[var(--color-charcoal-900)]">
              {checkOut || 'Select check-out'}
            </span>
          </div>
        </div>
        {nights > 0 && (
          <div className="px-3 py-1 rounded-full bg-[var(--color-sage-100)] text-[var(--color-sage-800)] text-xs font-semibold">
            {nights} {nights === 1 ? 'night' : 'nights'} stay
          </div>
        )}
      </div>

      {/* Month Navigation */}
      <div className="flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={prevMonth}
          className="p-2 rounded-lg text-[var(--color-charcoal-700)] hover:bg-[var(--color-ivory-100)] transition-colors"
          aria-label="Previous Month"
        >
          ←
        </button>
        <span className="font-serif font-bold text-base text-[var(--color-charcoal-900)]">
          {monthNames[viewMonth]} {viewYear}
        </span>
        <button
          type="button"
          onClick={nextMonth}
          className="p-2 rounded-lg text-[var(--color-charcoal-700)] hover:bg-[var(--color-ivory-100)] transition-colors"
          aria-label="Next Month"
        >
          →
        </button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-[var(--color-charcoal-500)] mb-2">
        <span>Su</span>
        <span>Mo</span>
        <span>Tu</span>
        <span>We</span>
        <span>Th</span>
        <span>Fr</span>
        <span>Sa</span>
      </div>

      {/* Calendar days grid */}
      <div className="grid grid-cols-7 gap-1">
        {/* Leading blanks */}
        {Array.from({ length: firstDayOfMonth }).map((_, i) => (
          <div key={`blank-${i}`} className="h-9" />
        ))}

        {/* Days of month */}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const dayNum = i + 1;
          const monthStr = String(viewMonth + 1).padStart(2, '0');
          const dayStr = String(dayNum).padStart(2, '0');
          const dateStr = `${viewYear}-${monthStr}-${dayStr}`;

          const isPast = dateStr < minDateStr;
          const isCheckIn = dateStr === checkIn;
          const isCheckOut = dateStr === checkOut;
          const isInRange = checkIn && checkOut && dateStr > checkIn && dateStr < checkOut;

          let btnClass = 'h-9 w-full rounded-lg text-xs font-medium transition-colors flex items-center justify-center ';

          if (isPast) {
            btnClass += 'text-[var(--color-charcoal-300)] cursor-not-allowed bg-transparent';
          } else if (isCheckIn || isCheckOut) {
            btnClass += 'bg-[var(--color-sage-700)] text-white font-bold shadow-sm';
          } else if (isInRange) {
            btnClass += 'bg-[var(--color-sage-100)] text-[var(--color-sage-900)] hover:bg-[var(--color-sage-200)]';
          } else {
            btnClass += 'text-[var(--color-charcoal-800)] hover:bg-[var(--color-ivory-200)]';
          }

          return (
            <button
              key={dateStr}
              type="button"
              disabled={isPast}
              onClick={() => handleDateClick(dateStr)}
              className={btnClass}
            >
              {dayNum}
            </button>
          );
        })}
      </div>

      {/* Instruction Tip */}
      <div className="mt-4 pt-3 border-t border-[var(--color-ivory-200)] flex items-center justify-between text-xs text-[var(--color-charcoal-500)]">
        <span>
          {selectingStep === 'checkIn'
            ? 'Click calendar to choose check-in date'
            : 'Click calendar to choose check-out date'}
        </span>
        <span className="text-[10px] text-[var(--color-sage-700)] font-medium">Check-in 14:00 · Check-out 11:00</span>
      </div>
    </div>
  );
}
