'use client';

import React, { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api/client';
import { AvailabilitySlot } from '@pawnest/shared';
import { Calendar, Clock, AlertCircle, Loader2 } from 'lucide-react';

interface SlotPickerProps {
  providerSlug: string;
  serviceId?: string;
  petId?: string;
  selectedSlot?: AvailabilitySlot;
  onSelectSlot: (slot: AvailabilitySlot) => void;
}

export function SlotPicker({
  providerSlug,
  serviceId,
  petId,
  selectedSlot,
  onSelectSlot,
}: SlotPickerProps) {
  // Generate next 10 days starting tomorrow
  const days = React.useMemo(() => {
    const list: Array<{ label: string; dateStr: string; dayName: string; dayNum: number }> = [];
    const now = new Date();
    for (let i = 1; i <= 10; i++) {
      const d = new Date(now.getTime() + i * 24 * 60 * 60 * 1000);
      const dateStr = d.toISOString().split('T')[0];
      const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
      const dayNum = d.getDate();
      const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      list.push({ label, dateStr, dayName, dayNum });
    }
    return list;
  }, []);

  const [selectedDate, setSelectedDate] = useState<string>(days[0].dateStr);
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!serviceId || !selectedDate) return;

    let mounted = true;
    setLoading(true);
    setError(null);

    const query = new URLSearchParams({
      serviceId,
      date: selectedDate,
      ...(petId ? { petId } : {}),
    });

    apiFetch<{ slots: AvailabilitySlot[] }>(`/providers/${providerSlug}/availability?${query.toString()}`)
      .then((data) => {
        if (mounted) {
          setSlots(data.slots || []);
        }
      })
      .catch((err) => {
        if (mounted) {
          setError(err.message || 'Failed to load availability slots');
          setSlots([]);
        }
      })
      .finally(() => {
        if (mounted) {
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [providerSlug, serviceId, selectedDate, petId]);

  function formatTime(isoString: string): string {
    const d = new Date(isoString);
    return d.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: 'UTC', // standardized slot time display
    });
  }

  return (
    <div className="space-y-5">
      {/* Date Horizontal Picker Strip */}
      <div>
        <label className="block text-xs font-semibold text-charcoal-700 uppercase tracking-wider mb-2">
          Select Appointment Date
        </label>
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
          {days.map((item) => {
            const isSelected = item.dateStr === selectedDate;
            return (
              <button
                key={item.dateStr}
                type="button"
                onClick={() => setSelectedDate(item.dateStr)}
                className={`flex flex-col items-center justify-center min-w-[70px] py-3 px-2 rounded-2xl border transition-all text-center ${
                  isSelected
                    ? 'bg-sage-700 border-sage-700 text-white shadow-xs'
                    : 'bg-white border-ivory-300 text-charcoal-700 hover:border-sage-400 hover:bg-ivory-50'
                }`}
              >
                <span className={`text-[11px] font-medium ${isSelected ? 'text-sage-200' : 'text-charcoal-500'}`}>
                  {item.dayName}
                </span>
                <span className="text-base font-bold mt-0.5">{item.dayNum}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Available Slots Section */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-xs font-semibold text-charcoal-700 uppercase tracking-wider">
            Available Time Slots
          </label>
          <span className="text-xs text-charcoal-500">
            {slots.length} {slots.length === 1 ? 'opening' : 'openings'} on {selectedDate}
          </span>
        </div>

        {loading ? (
          <div className="py-10 flex flex-col items-center justify-center text-charcoal-500">
            <Loader2 className="w-6 h-6 animate-spin text-sage-600 mb-2" />
            <p className="text-xs">Checking real-time calendar...</p>
          </div>
        ) : error ? (
          <div className="p-4 rounded-xl bg-peach-50 border border-peach-200 text-peach-800 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-peach-600" />
            <span>{error}</span>
          </div>
        ) : slots.length === 0 ? (
          <div className="py-8 px-4 rounded-2xl bg-ivory-100 border border-ivory-200 text-center">
            <Clock className="w-6 h-6 text-charcoal-400 mx-auto mb-2" />
            <p className="text-sm font-serif font-medium text-charcoal-800">No openings on this date</p>
            <p className="text-xs text-charcoal-500 mt-1">
              Please try selecting a different date from the calendar above.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
            {slots.map((slot) => {
              const isSelected = selectedSlot?.startsAt === slot.startsAt;
              return (
                <button
                  key={slot.startsAt}
                  type="button"
                  onClick={() => onSelectSlot(slot)}
                  className={`p-3 rounded-xl border text-left transition-all relative ${
                    isSelected
                      ? 'bg-sage-50 border-sage-600 ring-2 ring-sage-600/30 shadow-xs'
                      : 'bg-white border-ivory-300 hover:border-sage-400 hover:bg-ivory-50'
                  }`}
                >
                  <div className="text-sm font-semibold text-charcoal-900">
                    {formatTime(slot.startsAt)}
                  </div>
                  <div className="text-[11px] text-charcoal-500 mt-0.5">
                    {slot.remaining === 1 ? (
                      <span className="text-amber-700 font-medium">1 spot left</span>
                    ) : (
                      <span>{slot.remaining} spots left</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
