'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api/client';
import { BookingSummary, BookingStatus } from '@pawnest/shared';
import { Button } from '@/components/ui/Button';
import {
  Stethoscope,
  Calendar,
  Clock,
  MapPin,
  Sparkles,
  ArrowRight,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Phone,
  FileText,
} from 'lucide-react';
import { useAuth } from '@/lib/auth/AuthContext';

export default function DashboardAppointmentsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [appointments, setAppointments] = useState<BookingSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterTab, setFilterTab] = useState<'UPCOMING' | 'PAST'>('UPCOMING');

  useEffect(() => {
    if (!user) {
      if (!authLoading) setLoading(false);
      return;
    }
    let mounted = true;

    // Fetch veterinary bookings
    apiFetch<{ items: BookingSummary[] }>('/bookings?kind=VET')
      .then((res) => {
        if (mounted) {
          // Extra safety: keep only VET bookings even if API returns all
          const vetItems = (res.items || []).filter((b) => b.kind === 'VET');
          setAppointments(vetItems);
        }
      })
      .catch((err) => {
        console.error('Failed to load veterinary appointments:', err);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [user, authLoading]);

  const now = new Date();
  const upcomingList = appointments.filter(
    (b) => new Date(b.startsAt) >= now && b.status !== BookingStatus.CANCELLED
  );
  const pastList = appointments.filter(
    (b) => new Date(b.startsAt) < now || b.status === BookingStatus.CANCELLED || b.status === BookingStatus.COMPLETED
  );

  const activeList = filterTab === 'UPCOMING' ? upcomingList : pastList;

  function renderStatusBadge(status: BookingStatus) {
    switch (status) {
      case 'CONFIRMED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[var(--color-sage-100)] text-[var(--color-sage-800)]">
            <CheckCircle2 className="w-3 h-3 text-[var(--color-sage-600)]" /> Confirmed
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[var(--color-ivory-200)] text-[var(--color-charcoal-700)]">
            Completed
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[var(--color-peach-100)] text-[var(--color-peach-800)]">
            <XCircle className="w-3 h-3 text-[var(--color-peach-600)]" /> Cancelled
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-900 border border-amber-200">
            Pending Confirmation
          </span>
        );
    }
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-[var(--color-charcoal-900)]">
            Veterinary Visits &amp; Consultations
          </h1>
          <p className="text-xs text-[var(--color-charcoal-500)] mt-1">
            Track wellness check-ups, diagnostic appointments, and medical records for your companions.
          </p>
        </div>

        <Link href="/vet">
          <Button variant="primary" size="sm" className="gap-2">
            <Stethoscope className="w-3.5 h-3.5" /> Schedule Vet Visit
          </Button>
        </Link>
      </div>

      {/* Non-emergency Medical Notice */}
      <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200/80 text-xs text-amber-900 flex items-start gap-3">
        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold">Scheduled Clinical Care Only</p>
          <p className="text-amber-800/90 mt-0.5">
            PawNest visits are for scheduled routine exams, vaccinations, and consultations. For life-threatening emergencies (severe trauma, acute respiratory distress, poisoning), please proceed directly to your local 24/7 emergency veterinary hospital.
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-[var(--color-ivory-300)] pb-2">
        <button
          onClick={() => setFilterTab('UPCOMING')}
          className={`px-4 py-2 rounded-xl text-xs font-medium transition-all ${
            filterTab === 'UPCOMING'
              ? 'bg-[var(--color-sage-700)] text-white font-semibold shadow-xs'
              : 'text-[var(--color-charcoal-600)] hover:text-[var(--color-charcoal-900)] hover:bg-[var(--color-ivory-200)]/50'
          }`}
        >
          Upcoming Visits ({upcomingList.length})
        </button>
        <button
          onClick={() => setFilterTab('PAST')}
          className={`px-4 py-2 rounded-xl text-xs font-medium transition-all ${
            filterTab === 'PAST'
              ? 'bg-[var(--color-sage-700)] text-white font-semibold shadow-xs'
              : 'text-[var(--color-charcoal-600)] hover:text-[var(--color-charcoal-900)] hover:bg-[var(--color-ivory-200)]/50'
          }`}
        >
          Past &amp; Completed ({pastList.length})
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-[var(--color-charcoal-500)]">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--color-sage-600)] mb-2" />
          <p className="text-xs font-serif">Loading your veterinary visits...</p>
        </div>
      ) : activeList.length === 0 ? (
        <div className="py-16 px-6 rounded-3xl bg-white border border-[var(--color-ivory-300)] text-center max-w-lg mx-auto shadow-sm">
          <div className="w-12 h-12 rounded-full bg-[var(--color-sage-50)] text-[var(--color-sage-700)] flex items-center justify-center mx-auto mb-3">
            <Stethoscope className="w-6 h-6" />
          </div>
          <h3 className="font-serif text-lg font-bold text-[var(--color-charcoal-900)]">
            {filterTab === 'UPCOMING' ? 'No upcoming veterinary visits' : 'No past veterinary visits found'}
          </h3>
          <p className="text-xs text-[var(--color-charcoal-600)] mt-1.5 mb-6 max-w-sm mx-auto leading-relaxed">
            {filterTab === 'UPCOMING'
              ? 'Keep your pet healthy with preventative check-ups, vaccination updates, and dietary reviews with our veterinary partners.'
              : 'Past consultations and clinical visit summaries will appear here.'}
          </p>
          {filterTab === 'UPCOMING' && (
            <Link href="/vet">
              <Button variant="primary" size="sm" className="gap-1.5">
                <Stethoscope className="w-3.5 h-3.5" />
                Find a Veterinary Clinic
              </Button>
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {activeList.map((b) => (
            <div
              key={b.id}
              className="p-5 rounded-2xl bg-white border border-[var(--color-ivory-300)] hover:border-[var(--color-sage-400)] transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-2xs"
            >
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold font-mono text-[var(--color-charcoal-500)]">
                    {b.reference}
                  </span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-200">
                    Veterinary Consultation
                  </span>
                  {renderStatusBadge(b.status)}
                  {b.isDemo && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-peach-50 text-peach-700 border border-peach-200">
                      <Sparkles className="w-2.5 h-2.5 text-peach-500" /> Demo
                    </span>
                  )}
                </div>

                <h3 className="font-serif text-lg font-bold text-[var(--color-charcoal-900)]">
                  {b.serviceName || b.visitType || 'Veterinary Consultation'} for {b.petName}
                </h3>

                {/* Visit details, reasons & symptoms */}
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  {b.visitType && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[var(--color-sage-50)] text-[var(--color-sage-800)] font-medium border border-[var(--color-sage-200)] text-[11px]">
                      <FileText className="w-3 h-3 text-[var(--color-sage-600)]" />
                      {b.visitType}
                    </span>
                  )}
                  {b.reason && (
                    <span className="text-[var(--color-charcoal-600)] italic">
                      “{b.reason}”
                    </span>
                  )}
                  {b.symptoms && b.symptoms.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1">
                      {b.symptoms.map((symptom, idx) => (
                        <span
                          key={idx}
                          className="px-1.5 py-0.2 rounded text-[10px] bg-amber-50 text-amber-800 border border-amber-200"
                        >
                          {symptom}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Clinic Info, Date & Address */}
                <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--color-charcoal-600)] pt-0.5">
                  <span className="font-semibold text-[var(--color-charcoal-800)]">{b.providerName}</span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-[var(--color-sage-600)]" />
                    <span>
                      {new Date(b.startsAt).toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}{' '}
                      at{' '}
                      {new Date(b.startsAt).toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true,
                        timeZone: 'UTC',
                      })}
                    </span>
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-[var(--color-charcoal-400)]" />
                    {b.providerAddress}
                  </span>
                  {b.providerPhone && (
                    <span className="flex items-center gap-1 text-[var(--color-charcoal-500)]">
                      <Phone className="w-3 h-3" />
                      {b.providerPhone}
                    </span>
                  )}
                </div>
              </div>

              {/* Price & Actions */}
              <div className="sm:text-right shrink-0 w-full sm:w-auto flex sm:flex-col items-center sm:items-end justify-between gap-2 border-t sm:border-t-0 pt-3 sm:pt-0 border-[var(--color-ivory-200)]">
                <div className="text-lg font-bold font-serif text-[var(--color-charcoal-900)]">
                  ${(b.priceCents / 100).toFixed(2)}
                </div>
                <Link href={`/dashboard/bookings/${b.id}`}>
                  <Button size="sm" variant="secondary" className="text-xs">
                    View Details
                    <ArrowRight className="w-3 h-3 ml-1" />
                  </Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
