'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api/client';
import { BookingSummary, BookingStatus } from '@pawnest/shared';
import { Button } from '@/components/ui/Button';
import {
  Calendar,
  Clock,
  MapPin,
  Sparkles,
  ArrowRight,
  Loader2,
  Scissors,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

export default function DashboardBookingsPage() {
  const [bookings, setBookings] = useState<BookingSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterTab, setFilterTab] = useState<'UPCOMING' | 'PAST'>('UPCOMING');

  useEffect(() => {
    let mounted = true;
    apiFetch<{ items: BookingSummary[] }>('/bookings')
      .then((res) => {
        if (mounted) {
          setBookings(res.items || []);
        }
      })
      .catch((err) => {
        console.error('Failed to load bookings:', err);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const now = new Date();
  const upcomingList = bookings.filter(
    (b) => new Date(b.startsAt) >= now && b.status !== BookingStatus.CANCELLED
  );
  const pastList = bookings.filter(
    (b) => new Date(b.startsAt) < now || b.status === BookingStatus.CANCELLED
  );

  const activeList = filterTab === 'UPCOMING' ? upcomingList : pastList;

  function renderStatusBadge(status: BookingStatus) {
    switch (status) {
      case 'CONFIRMED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sage-100 text-sage-800">
            <CheckCircle2 className="w-3 h-3 text-sage-600" /> Confirmed
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-ivory-200 text-charcoal-700">
            Completed
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-peach-100 text-peach-800">
            <XCircle className="w-3 h-3 text-peach-600" /> Cancelled
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
            Pending
          </span>
        );
    }
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-charcoal-900">
            Care Bookings & Appointments
          </h1>
          <p className="text-xs text-charcoal-500 mt-1">
            Manage your companion&apos;s upcoming salon visits, boarding stays, and vet visits.
          </p>
        </div>

        <Link href="/grooming">
          <Button variant="primary" size="sm">
            <Scissors className="w-3.5 h-3.5 mr-1.5" /> Book New Care
          </Button>
        </Link>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-ivory-300 pb-2">
        <button
          onClick={() => setFilterTab('UPCOMING')}
          className={`px-4 py-2 rounded-xl text-xs font-medium transition-all ${
            filterTab === 'UPCOMING'
              ? 'bg-sage-700 text-white font-semibold shadow-xs'
              : 'text-charcoal-600 hover:text-charcoal-900 hover:bg-ivory-200/50'
          }`}
        >
          Upcoming ({upcomingList.length})
        </button>
        <button
          onClick={() => setFilterTab('PAST')}
          className={`px-4 py-2 rounded-xl text-xs font-medium transition-all ${
            filterTab === 'PAST'
              ? 'bg-sage-700 text-white font-semibold shadow-xs'
              : 'text-charcoal-600 hover:text-charcoal-900 hover:bg-ivory-200/50'
          }`}
        >
          Past & Cancelled ({pastList.length})
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-charcoal-500">
          <Loader2 className="w-8 h-8 animate-spin text-sage-600 mb-2" />
          <p className="text-xs font-serif">Loading your bookings...</p>
        </div>
      ) : activeList.length === 0 ? (
        <div className="py-16 px-4 rounded-3xl bg-white border border-ivory-300 text-center max-w-md mx-auto">
          <Calendar className="w-8 h-8 text-charcoal-400 mx-auto mb-3" />
          <h3 className="font-serif text-lg font-bold text-charcoal-900">
            {filterTab === 'UPCOMING' ? 'No upcoming bookings' : 'No past bookings found'}
          </h3>
          <p className="text-xs text-charcoal-600 mt-1 mb-5">
            {filterTab === 'UPCOMING'
              ? 'Explore our curated grooming ateliers and reserve a stress-free appointment.'
              : 'Completed and cancelled appointments will appear here.'}
          </p>
          {filterTab === 'UPCOMING' && (
            <Link href="/grooming">
              <Button variant="primary" size="sm">
                Explore Grooming Salons
              </Button>
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {activeList.map((b) => (
            <div
              key={b.id}
              className="p-5 rounded-2xl bg-white border border-ivory-300 hover:border-sage-400 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-2xs"
            >
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold font-mono text-charcoal-500">
                    {b.reference}
                  </span>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    b.kind === 'BOARDING' ? 'bg-sage-100 text-sage-800' : 'bg-ivory-200 text-charcoal-700'
                  }`}>
                    {b.kind === 'BOARDING' ? 'Boarding Stay' : 'Grooming'}
                  </span>
                  {renderStatusBadge(b.status)}
                  {b.isDemo && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-peach-50 text-peach-700 border border-peach-200">
                      <Sparkles className="w-2.5 h-2.5 text-peach-500" /> Demo
                    </span>
                  )}
                </div>

                <h3 className="font-serif text-lg font-bold text-charcoal-900">
                  {b.kind === 'BOARDING'
                    ? `${b.boardingUnitName || 'Boarding Suite'} for ${b.petName}`
                    : `${b.serviceName || 'Grooming Treatment'} for ${b.petName}`}
                </h3>

                <div className="flex flex-wrap items-center gap-3 text-xs text-charcoal-600">
                  <span className="font-semibold text-charcoal-800">{b.providerName}</span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-sage-600" />
                    {b.kind === 'BOARDING' ? (
                      <span>
                        {b.priceBreakdown.nights ? `${b.priceBreakdown.nights} nights: ` : ''}
                        {new Date(b.startsAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })}{' '}
                        –{' '}
                        {new Date(b.endsAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                    ) : (
                      <span>
                        {new Date(b.startsAt).toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                        })}{' '}
                        at{' '}
                        {new Date(b.startsAt).toLocaleTimeString('en-US', {
                          hour: 'numeric',
                          minute: '2-digit',
                          hour12: true,
                          timeZone: 'UTC',
                        })}
                      </span>
                    )}
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-charcoal-400" />
                    {b.providerAddress}
                  </span>
                </div>
              </div>

              <div className="sm:text-right shrink-0 w-full sm:w-auto flex sm:flex-col items-center sm:items-end justify-between gap-2 border-t sm:border-t-0 pt-3 sm:pt-0 border-ivory-200">
                <div className="text-lg font-bold font-serif text-charcoal-900">
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
