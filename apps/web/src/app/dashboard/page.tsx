'use client';

import * as React from 'react';
import Link from 'next/link';
import { useAuth } from '../../lib/auth/AuthContext';
import { apiFetch } from '../../lib/api/client';
import {
  DashboardSummary,
  TimelineEvent,
  BookingStatus,
  OrderStatus,
  EligibleBookingForReview,
} from '@pawnest/shared';
import { PetCard } from '../../components/pets/PetCard';
import { VaccineReminderBanner } from '../../components/pets/VaccineReminderBanner';
import { ReviewModal } from '../../components/reviews/ReviewModal';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import {
  Plus,
  Scissors,
  Home as HomeIcon,
  Stethoscope,
  ShoppingBag,
  ArrowRight,
  Loader2,
  Calendar,
  Clock,
  Heart,
  Sparkles,
  ExternalLink,
  MessageSquareHeart,
} from 'lucide-react';

export default function DashboardOverviewPage() {
  const { user } = useAuth();
  const [summary, setSummary] = React.useState<DashboardSummary | null>(null);
  const [reviewableBookings, setReviewableBookings] = React.useState<EligibleBookingForReview[]>([]);
  const [selectedReviewBooking, setSelectedReviewBooking] = React.useState<EligibleBookingForReview | null>(null);
  const [timelineFilter, setTimelineFilter] = React.useState<'ALL' | 'UPCOMING' | 'ORDERS'>('ALL');
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const fetchDashboardData = React.useCallback(async () => {
    if (!user) return;
    try {
      setIsLoading(true);
      setError(null);

      const [summaryRes, reviewableRes] = await Promise.all([
        apiFetch<{ summary: DashboardSummary }>('/dashboard/summary'),
        apiFetch<{ items: EligibleBookingForReview[] }>('/me/reviewable').catch(() => ({ items: [] })),
      ]);

      setSummary(summaryRes.summary);
      setReviewableBookings(reviewableRes.items.filter((b) => !b.hasReview));
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard overview');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  React.useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user, fetchDashboardData]);

  const firstName = user?.name ? user.name.split(' ')[0] : 'there';

  if (isLoading && !summary) {
    return (
      <div className="p-16 flex flex-col items-center justify-center gap-3 text-[var(--color-charcoal-500)]">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--color-sage-700)]" />
        <span className="text-xs font-serif">Preparing your companion overview...</span>
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div className="p-8 rounded-[var(--radius-xl)] bg-rose-50 border border-rose-200 text-center space-y-3">
        <p className="text-xs text-rose-800">{error || 'Unable to retrieve dashboard'}</p>
        <Button variant="secondary" size="sm" onClick={fetchDashboardData}>
          Try Again
        </Button>
      </div>
    );
  }

  const filteredTimeline = summary.timeline.filter((event) => {
    if (timelineFilter === 'UPCOMING') return event.isUpcoming;
    if (timelineFilter === 'ORDERS') return event.type === 'ORDER';
    return true;
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header Greeting */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-[var(--color-sage-700)]">
            Pet Parent Workspace
          </span>
          <h1 className="text-3xl sm:text-4xl font-serif text-[var(--color-charcoal-900)] mt-1 tracking-tight">
            Welcome back, {firstName}.
          </h1>
          <p className="text-sm text-[var(--color-charcoal-600)] mt-1">
            All your companion profiles, upcoming appointments, and supply orders in one calm space.
          </p>
        </div>

        <Link href="/dashboard/pets/new">
          <Button variant="primary" size="sm" className="gap-1.5 shrink-0">
            <Plus className="w-4 h-4" />
            <span>Add a Companion</span>
          </Button>
        </Link>
      </div>

      {/* Top Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Link
          href="/dashboard/pets"
          className="p-4 rounded-[var(--radius-xl)] bg-[var(--color-ivory-50)] border border-[var(--color-ivory-300)] shadow-sm hover:border-[var(--color-sage-400)] hover:shadow-md transition-all group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-xs font-medium text-[var(--color-charcoal-500)]">
            <span>Companions</span>
            <span className="text-lg">🐾</span>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-serif font-bold text-[var(--color-charcoal-900)]">
              {summary.counts.petsCount}
            </span>
            <p className="text-[11px] text-[var(--color-sage-700)] font-semibold mt-0.5 group-hover:underline flex items-center gap-1">
              <span>View profiles</span>
              <ArrowRight className="w-3 h-3" />
            </p>
          </div>
        </Link>

        <Link
          href="/dashboard/bookings"
          className="p-4 rounded-[var(--radius-xl)] bg-[var(--color-ivory-50)] border border-[var(--color-ivory-300)] shadow-sm hover:border-[var(--color-sage-400)] hover:shadow-md transition-all group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-xs font-medium text-[var(--color-charcoal-500)]">
            <span>Active Bookings</span>
            <Calendar className="w-4 h-4 text-[var(--color-sage-700)]" />
          </div>
          <div className="mt-3">
            <span className="text-3xl font-serif font-bold text-[var(--color-charcoal-900)]">
              {summary.counts.activeBookingsCount}
            </span>
            <p className="text-[11px] text-[var(--color-sage-700)] font-semibold mt-0.5 group-hover:underline flex items-center gap-1">
              <span>Manage schedule</span>
              <ArrowRight className="w-3 h-3" />
            </p>
          </div>
        </Link>

        <Link
          href="/dashboard/orders"
          className="p-4 rounded-[var(--radius-xl)] bg-[var(--color-ivory-50)] border border-[var(--color-ivory-300)] shadow-sm hover:border-[var(--color-peach-400)] hover:shadow-md transition-all group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-xs font-medium text-[var(--color-charcoal-500)]">
            <span>Active Orders</span>
            <ShoppingBag className="w-4 h-4 text-[var(--color-peach-700)]" />
          </div>
          <div className="mt-3">
            <span className="text-3xl font-serif font-bold text-[var(--color-charcoal-900)]">
              {summary.counts.activeOrdersCount}
            </span>
            <p className="text-[11px] text-[var(--color-peach-700)] font-semibold mt-0.5 group-hover:underline flex items-center gap-1">
              <span>View orders</span>
              <ArrowRight className="w-3 h-3" />
            </p>
          </div>
        </Link>

        <Link
          href="/dashboard/favourites"
          className="p-4 rounded-[var(--radius-xl)] bg-[var(--color-ivory-50)] border border-[var(--color-ivory-300)] shadow-sm hover:border-rose-300 hover:shadow-md transition-all group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-xs font-medium text-[var(--color-charcoal-500)]">
            <span>Saved & Favourites</span>
            <Heart className="w-4 h-4 text-rose-500 fill-rose-100" />
          </div>
          <div className="mt-3">
            <span className="text-3xl font-serif font-bold text-[var(--color-charcoal-900)]">
              {summary.counts.favouritesCount}
            </span>
            <p className="text-[11px] text-rose-600 font-semibold mt-0.5 group-hover:underline flex items-center gap-1">
              <span>View collection</span>
              <ArrowRight className="w-3 h-3" />
            </p>
          </div>
        </Link>
      </div>

      {/* Global Vaccine Reminder Alert */}
      <VaccineReminderBanner pets={summary.pets} />

      {/* Review Prompt Banner (if user has an unreviewed completed booking) */}
      {reviewableBookings.length > 0 && (
        <div className="p-4 sm:p-5 rounded-[var(--radius-xl)] bg-amber-50/80 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm animate-in fade-in">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 mt-0.5">
              <MessageSquareHeart className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-serif text-sm font-semibold text-amber-900">
                How was {reviewableBookings[0].petName}&apos;s visit with {reviewableBookings[0].providerName}?
              </h4>
              <p className="text-xs text-amber-800/80 mt-0.5">
                Your appointment has concluded. Share a reflection with the community.
              </p>
            </div>
          </div>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => setSelectedReviewBooking(reviewableBookings[0])}
            className="shrink-0 bg-white hover:bg-amber-100 text-amber-900 border-amber-300 text-xs gap-1.5"
          >
            <span>Leave Reflection</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      )}

      {/* Quick Care Actions */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Link
          href="/grooming"
          className="p-4 rounded-[var(--radius-xl)] bg-[var(--color-ivory-50)] border border-[var(--color-ivory-300)] shadow-sm hover:shadow-md hover:border-[var(--color-sage-300)] hover:-translate-y-0.5 transition-all flex flex-col justify-between space-y-3 group"
        >
          <div className="w-9 h-9 rounded-full bg-[var(--color-sage-100)] text-[var(--color-sage-700)] flex items-center justify-center">
            <Scissors className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-serif text-sm font-semibold text-[var(--color-charcoal-900)] group-hover:text-[var(--color-sage-700)] transition-colors">
              Book Grooming
            </h4>
            <p className="text-[11px] text-[var(--color-charcoal-500)] mt-0.5">
              Atelier baths & coat styling
            </p>
          </div>
        </Link>

        <Link
          href="/boarding"
          className="p-4 rounded-[var(--radius-xl)] bg-[var(--color-ivory-50)] border border-[var(--color-ivory-300)] shadow-sm hover:shadow-md hover:border-[var(--color-peach-300)] hover:-translate-y-0.5 transition-all flex flex-col justify-between space-y-3 group"
        >
          <div className="w-9 h-9 rounded-full bg-[var(--color-peach-100)] text-[var(--color-peach-700)] flex items-center justify-center">
            <HomeIcon className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-serif text-sm font-semibold text-[var(--color-charcoal-900)] group-hover:text-[var(--color-peach-700)] transition-colors">
              Book Boarding
            </h4>
            <p className="text-[11px] text-[var(--color-charcoal-500)] mt-0.5">
              Luxury multi-night retreats
            </p>
          </div>
        </Link>

        <Link
          href="/vet"
          className="p-4 rounded-[var(--radius-xl)] bg-[var(--color-ivory-50)] border border-[var(--color-ivory-300)] shadow-sm hover:shadow-md hover:border-[var(--color-sage-300)] hover:-translate-y-0.5 transition-all flex flex-col justify-between space-y-3 group"
        >
          <div className="w-9 h-9 rounded-full bg-[var(--color-sage-100)] text-[var(--color-sage-700)] flex items-center justify-center">
            <Stethoscope className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-serif text-sm font-semibold text-[var(--color-charcoal-900)] group-hover:text-[var(--color-sage-700)] transition-colors">
              Schedule Vet Visit
            </h4>
            <p className="text-[11px] text-[var(--color-charcoal-500)] mt-0.5">
              Fear-free clinics & wellness
            </p>
          </div>
        </Link>

        <Link
          href="/supplies"
          className="p-4 rounded-[var(--radius-xl)] bg-[var(--color-ivory-50)] border border-[var(--color-ivory-300)] shadow-sm hover:shadow-md hover:border-[var(--color-peach-300)] hover:-translate-y-0.5 transition-all flex flex-col justify-between space-y-3 group"
        >
          <div className="w-9 h-9 rounded-full bg-[var(--color-peach-100)] text-[var(--color-peach-700)] flex items-center justify-center">
            <ShoppingBag className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-serif text-sm font-semibold text-[var(--color-charcoal-900)] group-hover:text-[var(--color-peach-700)] transition-colors">
              Curated Supplies
            </h4>
            <p className="text-[11px] text-[var(--color-charcoal-500)] mt-0.5">
              Artisanal food & essentials
            </p>
          </div>
        </Link>
      </div>

      {/* Unified Timeline & Activity Feed */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="font-serif text-xl font-semibold text-[var(--color-charcoal-900)]">
              Unified Care & Order Timeline
            </h2>
            <p className="text-xs text-[var(--color-charcoal-500)] mt-0.5">
              Chronological log of upcoming appointments, boarding retreats, and supply shipments.
            </p>
          </div>

          <div className="flex items-center p-1 rounded-full bg-[var(--color-ivory-200)] border border-[var(--color-ivory-300)] self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setTimelineFilter('ALL')}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                timelineFilter === 'ALL'
                  ? 'bg-[var(--color-sage-700)] text-[var(--color-ivory-50)] shadow-sm'
                  : 'text-[var(--color-charcoal-600)] hover:text-[var(--color-charcoal-900)]'
              }`}
            >
              All Events ({summary.timeline.length})
            </button>
            <button
              type="button"
              onClick={() => setTimelineFilter('UPCOMING')}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                timelineFilter === 'UPCOMING'
                  ? 'bg-[var(--color-sage-700)] text-[var(--color-ivory-50)] shadow-sm'
                  : 'text-[var(--color-charcoal-600)] hover:text-[var(--color-charcoal-900)]'
              }`}
            >
              Upcoming ({summary.timeline.filter((e) => e.isUpcoming).length})
            </button>
            <button
              type="button"
              onClick={() => setTimelineFilter('ORDERS')}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                timelineFilter === 'ORDERS'
                  ? 'bg-[var(--color-sage-700)] text-[var(--color-ivory-50)] shadow-sm'
                  : 'text-[var(--color-charcoal-600)] hover:text-[var(--color-charcoal-900)]'
              }`}
            >
              Orders ({summary.timeline.filter((e) => e.type === 'ORDER').length})
            </button>
          </div>
        </div>

        {filteredTimeline.length === 0 ? (
          <div className="p-10 rounded-[var(--radius-xl)] bg-[var(--color-ivory-50)] border border-dashed border-[var(--color-ivory-300)] text-center space-y-2">
            <p className="font-serif text-sm font-medium text-[var(--color-charcoal-800)]">
              No events found in this view
            </p>
            <p className="text-xs text-[var(--color-charcoal-500)] max-w-sm mx-auto">
              Your booked appointments and supply deliveries will appear chronologically here.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredTimeline.map((item) => {
              const dateObj = new Date(item.date);
              const formattedDate = dateObj.toLocaleDateString(undefined, {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
              });
              const formattedTime = dateObj.toLocaleTimeString(undefined, {
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <div
                  key={item.id}
                  className="p-4 sm:p-5 rounded-[var(--radius-xl)] bg-[var(--color-ivory-50)] border border-[var(--color-ivory-300)] shadow-sm hover:border-[var(--color-sage-300)] hover:shadow-md transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-[var(--color-ivory-200)] flex items-center justify-center shrink-0 text-[var(--color-charcoal-700)] mt-0.5">
                      {item.type === 'GROOMING' && <Scissors className="w-4 h-4 text-[var(--color-sage-700)]" />}
                      {item.type === 'BOARDING' && <HomeIcon className="w-4 h-4 text-[var(--color-peach-700)]" />}
                      {item.type === 'VET' && <Stethoscope className="w-4 h-4 text-emerald-700" />}
                      {item.type === 'ORDER' && <ShoppingBag className="w-4 h-4 text-sky-700" />}
                    </div>

                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-charcoal-500)]">
                          {item.type}
                        </span>
                        <Badge variant={item.badgeVariant as any}>{item.statusLabel}</Badge>
                        {item.reference && (
                          <span className="font-mono text-[10px] text-[var(--color-charcoal-400)]">
                            {item.reference}
                          </span>
                        )}
                      </div>

                      <h4 className="font-serif text-base font-semibold text-[var(--color-charcoal-900)] leading-tight">
                        {item.title}
                      </h4>
                      <p className="text-xs text-[var(--color-charcoal-600)] truncate">
                        {item.subtitle}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 pt-2 sm:pt-0 border-t sm:border-0 border-[var(--color-ivory-200)]">
                    <div className="text-left sm:text-right">
                      <p className="text-xs font-semibold text-[var(--color-charcoal-900)]">
                        {formattedDate}
                      </p>
                      <p className="text-[11px] text-[var(--color-charcoal-500)] flex items-center sm:justify-end gap-1">
                        <Clock className="w-3 h-3" />
                        <span>{formattedTime}</span>
                      </p>
                    </div>

                    <Link href={item.linkUrl}>
                      <Button variant="secondary" size="sm" className="text-xs gap-1">
                        <span>Details</span>
                        <ArrowRight className="w-3 h-3" />
                      </Button>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Companions Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-xl font-semibold text-[var(--color-charcoal-900)]">
            Your Companions ({summary.pets.length})
          </h2>
          {summary.pets.length > 0 && (
            <Link
              href="/dashboard/pets"
              className="text-xs font-semibold text-[var(--color-sage-700)] hover:underline inline-flex items-center gap-1"
            >
              <span>Manage All Pets</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>

        {summary.pets.length === 0 ? (
          <div className="p-8 sm:p-12 text-center rounded-[var(--radius-2xl)] bg-[var(--color-ivory-50)] border border-dashed border-[var(--color-ivory-300)] space-y-4">
            <div className="w-12 h-12 rounded-full bg-[var(--color-sage-100)] text-[var(--color-sage-700)] flex items-center justify-center mx-auto text-xl">
              🐾
            </div>
            <div className="space-y-1">
              <h3 className="font-serif text-lg font-semibold text-[var(--color-charcoal-900)]">
                No companion profiles created yet
              </h3>
              <p className="text-xs text-[var(--color-charcoal-600)] max-w-md mx-auto leading-relaxed">
                Add your dog or cat profile once. Every future grooming appointment, boarding retreat, and vet consultation will know their breed, weight, and vaccination history.
              </p>
            </div>
            <Link href="/dashboard/pets/new">
              <Button variant="primary" size="md">
                Create First Pet Profile
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from(new Map(summary.pets.map((p) => [p.id, p])).values()).map((pet) => (
              <PetCard key={pet.id} pet={pet} />
            ))}
          </div>
        )}
      </div>

      {/* Review Modal Dialog */}
      {selectedReviewBooking && (
        <ReviewModal
          isOpen={true}
          onClose={() => setSelectedReviewBooking(null)}
          bookingId={selectedReviewBooking.id}
          providerSlug={selectedReviewBooking.providerSlug}
          providerName={selectedReviewBooking.providerName}
          onSuccess={() => {
            fetchDashboardData();
          }}
        />
      )}
    </div>
  );
}
