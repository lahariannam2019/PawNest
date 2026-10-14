'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { apiFetch } from '@/lib/api/client';
import { BookingSummary, BookingStatus, AvailabilitySlot } from '@pawnest/shared';
import { Button } from '@/components/ui/Button';
import { SlotPicker } from '@/components/booking/SlotPicker';
import {
  Calendar,
  Clock,
  MapPin,
  Phone,
  ShieldCheck,
  AlertTriangle,
  Sparkles,
  ChevronLeft,
  Loader2,
  CheckCircle2,
  XCircle,
  Scissors,
} from 'lucide-react';

export default function BookingDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  const bookingId = params?.id as string;
  const justConfirmed = searchParams?.get('confirmed') === 'true';

  const [booking, setBooking] = useState<BookingSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Cancel Modal State
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [cancelResult, setCancelResult] = useState<{ feeApplies: boolean; feeNote: string | null } | null>(null);

  // Reschedule Modal State
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [newSlot, setNewSlot] = useState<AvailabilitySlot | null>(null);
  const [rescheduling, setRescheduling] = useState(false);
  const [rescheduleError, setRescheduleError] = useState<string | null>(null);

  useEffect(() => {
    if (!bookingId) return;
    let mounted = true;

    apiFetch<BookingSummary>(`/bookings/${bookingId}`)
      .then((data) => {
        if (mounted) setBooking(data);
      })
      .catch((err) => {
        if (mounted) setError(err.message || 'Failed to load booking');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [bookingId]);

  async function handleCancelBooking() {
    if (!booking) return;
    setCancelling(true);

    try {
      const res = await apiFetch<{
        success: boolean;
        status: BookingStatus;
        feeApplies: boolean;
        feeNote: string | null;
      }>(`/bookings/${booking.id}/cancel`, {
        method: 'POST',
        body: JSON.stringify({ reason: cancelReason.trim() || undefined }),
      });

      setCancelResult({ feeApplies: res.feeApplies, feeNote: res.feeNote });
      setBooking((prev) => (prev ? { ...prev, status: 'CANCELLED', cancelReason } : prev));
      setShowCancelModal(false);
    } catch (err: any) {
      alert(err.message || 'Failed to cancel appointment');
    } finally {
      setCancelling(false);
    }
  }

  async function handleRescheduleBooking() {
    if (!booking || !newSlot) return;
    setRescheduling(true);
    setRescheduleError(null);

    try {
      const res = await apiFetch<{
        success: boolean;
        startsAt: string;
        endsAt: string;
        status: BookingStatus;
      }>(`/bookings/${booking.id}/reschedule`, {
        method: 'POST',
        body: JSON.stringify({
          startsAt: newSlot.startsAt,
          endsAt: newSlot.endsAt,
        }),
      });

      setBooking((prev) =>
        prev
          ? {
              ...prev,
              startsAt: res.startsAt,
              endsAt: res.endsAt,
              status: res.status,
            }
          : prev
      );
      setShowRescheduleModal(false);
      setNewSlot(null);
    } catch (err: any) {
      setRescheduleError(err.message || 'Failed to reschedule appointment');
    } finally {
      setRescheduling(false);
    }
  }

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-charcoal-500">
        <Loader2 className="w-8 h-8 animate-spin text-sage-600 mb-2" />
        <p className="text-xs font-serif">Loading booking details...</p>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="py-16 text-center space-y-4">
        <h2 className="text-2xl font-serif font-bold text-charcoal-900">Booking Not Found</h2>
        <p className="text-xs text-charcoal-600">{error || 'This booking does not exist or belongs to another user.'}</p>
        <Link href="/dashboard/bookings">
          <Button variant="primary">Return to Bookings</Button>
        </Link>
      </div>
    );
  }

  const hoursUntilStart = (new Date(booking.startsAt).getTime() - Date.now()) / (3600 * 1000);
  const feeAppliesIfCancelled = hoursUntilStart < booking.cancellationHours;

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Back button */}
      <Link
        href="/dashboard/bookings"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-charcoal-600 hover:text-sage-700 transition-colors"
      >
        <ChevronLeft className="w-4 h-4" /> Back to All Bookings
      </Link>

      {/* Confirmation Welcome Banner */}
      {justConfirmed && (
        <div className="p-4 rounded-2xl bg-sage-100 border border-sage-300 flex items-start gap-3 text-sage-900 animate-in fade-in duration-300">
          <CheckCircle2 className="w-5 h-5 text-sage-700 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-serif font-bold text-sm">Appointment Confirmed!</h3>
            <p className="text-xs text-sage-800 mt-0.5">
              Your styling slot has been secured. We have notified {booking.providerName} and updated {booking.petName}&apos;s care calendar.
            </p>
          </div>
        </div>
      )}

      {/* Header Info Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-ivory-300 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-ivory-200 pb-6">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs font-bold text-charcoal-600">
                {booking.reference}
              </span>
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                  booking.status === 'CONFIRMED'
                    ? 'bg-sage-100 text-sage-800'
                    : booking.status === 'CANCELLED'
                    ? 'bg-peach-100 text-peach-800'
                    : 'bg-ivory-200 text-charcoal-700'
                }`}
              >
                {booking.status}
              </span>
              {booking.isDemo && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-peach-50 text-peach-700 border border-peach-200">
                  <Sparkles className="w-2.5 h-2.5 text-peach-500" /> Demo Atelier
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-charcoal-900">
              {booking.kind === 'BOARDING'
                ? `${booking.boardingUnitName || 'Boarding Suite'} for ${booking.petName}`
                : booking.kind === 'VET'
                ? `${booking.serviceName || booking.visitType || 'Veterinary Consultation'} for ${booking.petName}`
                : `${booking.serviceName || 'Grooming Treatment'} for ${booking.petName}`}
            </h1>
          </div>

          {/* Action buttons if not cancelled */}
          {booking.status !== 'CANCELLED' && (
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowRescheduleModal(true)}
              >
                Reschedule
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => setShowCancelModal(true)}
              >
                Cancel {booking.kind === 'BOARDING' ? 'Reservation' : 'Appointment'}
              </Button>
            </div>
          )}
        </div>

        {/* Boarding Stay Timeline (if kind === BOARDING) */}
        {booking.kind === 'BOARDING' && (
          <div className="p-5 rounded-2xl bg-sage-50 border border-sage-200 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-sage-900 uppercase tracking-wider">
                Stay Timeline & Suite Details
              </span>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-sage-200/80 text-sage-800">
                {booking.priceBreakdown.nights || 1} Night Stay
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="p-4 rounded-xl bg-white border border-sage-200">
                <span className="text-[11px] font-semibold text-charcoal-500 uppercase tracking-wider block mb-1">
                  Check-In
                </span>
                <p className="font-serif font-bold text-base text-charcoal-900">
                  {new Date(booking.startsAt).toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </p>
                <p className="text-xs text-charcoal-600 mt-0.5">From 2:00 PM onwards</p>
              </div>

              <div className="p-4 rounded-xl bg-white border border-sage-200">
                <span className="text-[11px] font-semibold text-charcoal-500 uppercase tracking-wider block mb-1">
                  Check-Out
                </span>
                <p className="font-serif font-bold text-base text-charcoal-900">
                  {new Date(booking.endsAt).toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </p>
                <p className="text-xs text-charcoal-600 mt-0.5">By 11:00 AM</p>
              </div>
            </div>
          </div>
        )}

        {/* Veterinary Medical Details Card (if kind === VET) */}
        {booking.kind === 'VET' && (
          <div className="p-5 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-200/60 pb-3">
              <span className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-amber-700" /> Veterinary Clinical Intake & Triage
              </span>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-200/80 text-amber-900">
                  {booking.visitType || 'WELLNESS'}
                </span>
                {booking.emergencyAcknowledged && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-sage-100 text-sage-800 border border-sage-200">
                    Non-Emergency Care Confirmed
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-[11px] font-semibold text-amber-900 uppercase tracking-wider block mb-1">
                  Reported Symptoms & Observations
                </span>
                {booking.symptoms && booking.symptoms.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {booking.symptoms.map((s, i) => (
                      <span key={i} className="px-2 py-0.5 rounded bg-white border border-amber-200 text-amber-950 font-medium">
                        {s}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-amber-900/80">No acute symptoms reported (routine preventive visit).</p>
                )}
              </div>

              <div>
                <span className="text-[11px] font-semibold text-amber-900 uppercase tracking-wider block mb-1">
                  Owner Consultation Notes
                </span>
                <p className="text-amber-950 italic bg-white/80 p-2.5 rounded-xl border border-amber-200/80">
                  &ldquo;{booking.reason || 'General wellness examination'}&rdquo;
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 2-Column Particulars Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Left Column: Date, Time & Provider */}
          <div className="space-y-5">
            {booking.kind !== 'BOARDING' && (
              <div>
                <span className="text-[11px] font-semibold text-charcoal-500 uppercase tracking-wider block mb-1">
                  Appointment Date & Time
                </span>
                <div className="flex items-center gap-2 text-sm font-bold text-charcoal-900">
                  <Clock className="w-4 h-4 text-sage-600" />
                  <span>
                    {new Date(booking.startsAt).toLocaleDateString('en-US', {
                      weekday: 'long',
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    })}{' '}
                    at{' '}
                    {new Date(booking.startsAt).toLocaleTimeString('en-US', {
                      hour: 'numeric',
                      minute: '2-digit',
                      hour12: true,
                      timeZone: 'UTC',
                    })}
                  </span>
                </div>
              </div>
            )}

            <div>
              <span className="text-[11px] font-semibold text-charcoal-500 uppercase tracking-wider block mb-1">
                {booking.kind === 'BOARDING'
                  ? 'Retreat Location & Contact'
                  : booking.kind === 'VET'
                  ? 'Clinic Location & Contact'
                  : 'Atelier Location & Contact'}
              </span>
              <h3 className="font-serif font-bold text-base text-charcoal-900">
                {booking.providerName}
              </h3>
              <p className="text-xs text-charcoal-600 flex items-center gap-1.5 mt-1">
                <MapPin className="w-3.5 h-3.5 text-charcoal-400 shrink-0" />
                {booking.providerAddress}
              </p>
              {booking.providerPhone && (
                <p className="text-xs text-charcoal-600 flex items-center gap-1.5 mt-1">
                  <Phone className="w-3.5 h-3.5 text-charcoal-400 shrink-0" />
                  {booking.providerPhone}
                </p>
              )}
            </div>

            <div>
              <span className="text-[11px] font-semibold text-charcoal-500 uppercase tracking-wider block mb-1">
                Companion
              </span>
              <p className="text-xs font-bold text-charcoal-900">
                {booking.petName} ({booking.petSpecies === 'DOG' ? 'Dog' : 'Cat'}, {booking.petSizeTier || 'Standard'})
              </p>
              {booking.notes && (
                <p className="text-xs text-charcoal-600 italic mt-1 bg-ivory-100 p-2.5 rounded-xl border border-ivory-200">
                  &ldquo;{booking.notes}&rdquo;
                </p>
              )}
            </div>

            {/* Boarding Care Instructions */}
            {booking.kind === 'BOARDING' && booking.careInstructions && (
              <div className="p-4 rounded-xl bg-ivory-100/70 border border-ivory-200 space-y-2 text-xs">
                <span className="text-[11px] font-semibold text-charcoal-700 uppercase tracking-wider block">
                  Care Routine Instructions
                </span>
                {booking.careInstructions.feeding && (
                  <p className="text-charcoal-700">
                    <strong className="text-charcoal-900">Feeding:</strong> {booking.careInstructions.feeding}
                  </p>
                )}
                {booking.careInstructions.medications && (
                  <p className="text-charcoal-700">
                    <strong className="text-charcoal-900">Medications:</strong> {booking.careInstructions.medications}
                  </p>
                )}
                {booking.careInstructions.behaviour && (
                  <p className="text-charcoal-700">
                    <strong className="text-charcoal-900">Behaviour:</strong> {booking.careInstructions.behaviour}
                  </p>
                )}
                {booking.careInstructions.emergencyContact && (
                  <p className="text-charcoal-700">
                    <strong className="text-charcoal-900">Emergency Contact:</strong> {booking.careInstructions.emergencyContact}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Right Column: Price Breakdown & Policy */}
          <div className="space-y-4 bg-ivory-50 p-5 rounded-2xl border border-ivory-200">
            <h3 className="font-serif text-sm font-bold text-charcoal-900 border-b border-ivory-200 pb-2">
              Payment & Price Breakdown
            </h3>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-charcoal-600">
                <span>
                  {booking.kind === 'BOARDING'
                    ? `Suite (${booking.priceBreakdown.nights || 1} nights @ $${(
                        (booking.priceBreakdown.nightlyCents || booking.priceBreakdown.baseCents) / 100
                      ).toFixed(2)}/nt)`
                    : 'Base Service'}
                </span>
                <span>${(booking.priceBreakdown.baseCents / 100).toFixed(2)}</span>
              </div>

              {booking.priceBreakdown.sizeAdjustmentCents && booking.priceBreakdown.sizeAdjustmentCents > 0 ? (
                <div className="flex justify-between text-charcoal-600">
                  <span>Size Tier Surcharge</span>
                  <span>+${(booking.priceBreakdown.sizeAdjustmentCents / 100).toFixed(2)}</span>
                </div>
              ) : null}

              {booking.priceBreakdown.addOns && booking.priceBreakdown.addOns.length > 0 && (
                <div className="space-y-1 pt-1 border-t border-ivory-200">
                  {booking.priceBreakdown.addOns.map((addon) => (
                    <div key={addon.id} className="flex justify-between text-charcoal-600">
                      <span>{addon.name}</span>
                      <span>+${(addon.priceCents / 100).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="pt-2 border-t border-ivory-300 flex justify-between items-baseline font-bold text-charcoal-900 text-sm">
                <span>Total Amount</span>
                <span className="text-base font-serif font-bold">
                  ${(booking.priceCents / 100).toFixed(2)}
                </span>
              </div>
            </div>

            <div className="pt-3 border-t border-ivory-200 text-xs text-charcoal-600 flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-sage-600 shrink-0 mt-0.5" />
              <p>
                <strong>Cancellation Policy:</strong> Free cancellation up to {booking.cancellationHours} hours before check-in.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CANCEL MODAL */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal-900/60 backdrop-blur-2xs p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full border border-ivory-300 shadow-xl space-y-4">
            <h3 className="font-serif text-xl font-bold text-charcoal-900">
              Cancel Appointment?
            </h3>

            {feeAppliesIfCancelled ? (
              <div className="p-3.5 rounded-xl bg-peach-50 border border-peach-200 text-xs text-peach-900 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-peach-600 shrink-0 mt-0.5" />
                <p>
                  This appointment is within {booking.cancellationHours} hours of its scheduled start. A late cancellation policy may apply.
                </p>
              </div>
            ) : (
              <p className="text-xs text-charcoal-600">
                You are cancelling well in advance of the {booking.cancellationHours}h window. No fees apply.
              </p>
            )}

            <div>
              <label className="block text-xs font-semibold text-charcoal-700 uppercase tracking-wider mb-1">
                Reason for cancellation (optional)
              </label>
              <textarea
                rows={2}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="e.g. Schedule conflict..."
                className="w-full p-2.5 text-xs bg-ivory-50 border border-ivory-300 rounded-xl text-charcoal-900 focus:outline-none focus:ring-2 focus:ring-sage-500/30"
              />
            </div>

            <div className="pt-3 border-t border-ivory-200 flex justify-end gap-2">
              <Button
                variant="ghost"
                disabled={cancelling}
                onClick={() => setShowCancelModal(false)}
              >
                Keep Appointment
              </Button>
              <Button
                variant="danger"
                disabled={cancelling}
                onClick={handleCancelBooking}
              >
                {cancelling ? 'Cancelling...' : 'Confirm Cancellation'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* RESCHEDULE MODAL */}
      {showRescheduleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal-900/60 backdrop-blur-2xs p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-2xl w-full border border-ivory-300 shadow-xl space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-ivory-200 pb-3">
              <h3 className="font-serif text-xl font-bold text-charcoal-900">
                Reschedule Appointment
              </h3>
              <button
                onClick={() => setShowRescheduleModal(false)}
                className="text-xs text-charcoal-500 hover:text-charcoal-900"
              >
                Close
              </button>
            </div>

            {booking.kind === 'BOARDING' ? (
              <div className="space-y-4">
                <p className="text-xs text-charcoal-700">
                  Because multi-day boarding reservations involve suite allocation and continuous night availability, date modifications must be handled with our concierge team or by cancelling within your free cancellation window and selecting new stay dates.
                </p>

                <div className="p-4 rounded-2xl bg-ivory-100 border border-ivory-200 space-y-2 text-xs">
                  <p className="font-semibold text-charcoal-900">
                    Concierge & Facility Contact:
                  </p>
                  <p className="text-charcoal-700">
                    <strong>{booking.providerName}</strong>
                  </p>
                  <p className="text-charcoal-600">
                    {booking.providerPhone ? `Phone: ${booking.providerPhone}` : 'Concierge line: 1-800-PAW-NEST'}
                  </p>
                  <p className="text-charcoal-600">
                    Address: {booking.providerAddress}
                  </p>
                </div>

                <div className="pt-4 border-t border-ivory-200 flex justify-end gap-2">
                  <Button
                    variant="ghost"
                    onClick={() => setShowRescheduleModal(false)}
                  >
                    Close
                  </Button>
                  <Link href={`/boarding/${booking.providerSlug}`}>
                    <Button variant="primary">
                      View Retreat Details
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              <>
                <p className="text-xs text-charcoal-600">
                  Select a new date and available slot for {booking.serviceName} at {booking.providerName}.
                </p>

                <SlotPicker
                  providerSlug={booking.providerSlug}
                  serviceId={booking.serviceId || undefined}
                  petId={booking.petId}
                  selectedSlot={newSlot || undefined}
                  onSelectSlot={(slot) => setNewSlot(slot)}
                />

                {rescheduleError && (
                  <div className="p-3 rounded-xl bg-peach-50 border border-peach-200 text-xs text-peach-900">
                    {rescheduleError}
                  </div>
                )}

                <div className="pt-4 border-t border-ivory-200 flex justify-end gap-2">
                  <Button
                    variant="ghost"
                    disabled={rescheduling}
                    onClick={() => setShowRescheduleModal(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    disabled={!newSlot || rescheduling}
                    onClick={handleRescheduleBooking}
                  >
                    {rescheduling ? 'Moving Appointment...' : 'Confirm New Time'}
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
