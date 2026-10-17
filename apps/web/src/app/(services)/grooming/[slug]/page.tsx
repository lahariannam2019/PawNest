'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Container } from '@/components/layout/Container';
import { Button } from '@/components/ui/Button';
import { FavouriteButton } from '@/components/ui/FavouriteButton';
import { resolveImageSrc } from '@/lib/images';
import { apiFetch } from '@/lib/api/client';
import { useAuth } from '@/lib/auth/AuthContext';
import { ProviderSummary, ServiceSummary, ReviewSummary } from '@pawnest/shared';
import {
  Star,
  MapPin,
  Clock,
  Phone,
  Globe,
  Sparkles,
  ShieldCheck,
  Scissors,
  CheckCircle2,
  ChevronRight,
  Loader2,
} from 'lucide-react';

interface ProviderDetailResponse {
  provider: ProviderSummary & {
    cancellationHours: number;
    phone?: string;
    websiteUrl?: string;
  };
  hours: Array<{
    id: string;
    weekday: number;
    opensAt: string;
    closesAt: string;
    stations: number;
  }>;
  services: ServiceSummary[];
  reviews: ReviewSummary[];
}

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function ProviderDetailPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const { user } = useAuth();

  const [data, setData] = useState<ProviderDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    let mounted = true;

    apiFetch<ProviderDetailResponse>(`/providers/${slug}`)
      .then((res) => {
        if (mounted) {
          setData(res);
        }
      })
      .catch((err) => {
        if (mounted) {
          setError(err.message || 'Failed to load atelier');
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
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-ivory-100">
        <Header />
        <div className="flex-1 flex flex-col items-center justify-center py-20 text-charcoal-500">
          <Loader2 className="w-8 h-8 animate-spin text-sage-600 mb-3" />
          <p className="text-sm font-serif">Loading atelier profile...</p>
        </div>
        <Footer />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex flex-col bg-ivory-100">
        <Header />
        <Container className="flex-1 py-16 text-center">
          <h2 className="text-2xl font-serif text-charcoal-900 font-bold mb-2">Atelier Not Found</h2>
          <p className="text-sm text-charcoal-600 mb-6">{error || 'This provider could not be found.'}</p>
          <Link href="/grooming">
            <Button variant="primary">Return to Grooming Directory</Button>
          </Link>
        </Container>
        <Footer />
      </div>
    );
  }

  const { provider, hours, services, reviews } = data;
  const primaryServices = services.filter((s) => !s.isAddOn);
  const addOns = services.filter((s) => s.isAddOn);

  return (
    <div className="min-h-screen flex flex-col bg-ivory-100">
      <Header />

      <main className="flex-1 py-8 md:py-12">
        <Container>
          {/* Breadcrumbs */}
          <nav className="flex items-center gap-1.5 text-xs text-charcoal-500 mb-6">
            <Link href="/" className="hover:text-charcoal-900 transition-colors">
              Home
            </Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <Link href="/grooming" className="hover:text-charcoal-900 transition-colors">
              Grooming
            </Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-charcoal-900 font-medium truncate">{provider.name}</span>
          </nav>

          {/* Header Block */}
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-8 border-b border-ivory-300 pb-8">
            <div className="space-y-3 max-w-2xl">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-peach-100 text-peach-700 border border-peach-200 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-peach-500" /> Demo Atelier
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sage-100 text-sage-800">
                  Cage-Free Certified
                </span>
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-bold text-charcoal-900">
                {provider.name}
              </h1>

              {provider.tagline && (
                <p className="text-base sm:text-lg font-serif italic text-charcoal-700">
                  &ldquo;{provider.tagline}&rdquo;
                </p>
              )}

              <div className="flex flex-wrap items-center gap-4 text-xs text-charcoal-600 pt-1">
                <div className="flex items-center gap-1 font-semibold text-charcoal-900">
                  <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                  <span>{provider.ratingAvg.toFixed(2)}</span>
                  <span className="text-charcoal-500 font-normal">({provider.ratingCount} reviews)</span>
                </div>
                <div className="flex items-center gap-1">
                  <MapPin className="w-4 h-4 text-sage-600" />
                  <span>{provider.addressLine}, {provider.city}</span>
                </div>
                {provider.phone && (
                  <div className="flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-charcoal-400" />
                    <span>{provider.phone}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Link href={`/book/grooming/${provider.slug}`}>
                <Button size="lg" variant="primary" className="shadow-xs">
                  Book an Appointment
                </Button>
              </Link>
              <FavouriteButton kind="PROVIDER" id={provider.id} size="lg" />
            </div>
          </div>

          {/* Photo Gallery Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
            <div className="relative aspect-[16/10] md:col-span-2 rounded-3xl overflow-hidden bg-ivory-200">
              <Image
                src={resolveImageSrc(provider.imageKeys?.[0], '/images/svc-groom-01.jpg')}
                alt={provider.name}
                fill
                priority
                className="object-cover"
              />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-1 gap-4">
              <div className="relative aspect-[16/10] rounded-2xl overflow-hidden bg-ivory-200">
                <Image
                  src={resolveImageSrc(provider.imageKeys?.[1], '/images/how-01.jpg')}
                  alt={`${provider.name} styling suite`}
                  fill
                  className="object-cover"
                />
              </div>
              <div className="relative aspect-[16/10] rounded-2xl overflow-hidden bg-ivory-200">
                <Image
                  src={resolveImageSrc(provider.imageKeys?.[2], '/images/story-01.jpg')}
                  alt={`${provider.name} care detail`}
                  fill
                  className="object-cover"
                />
              </div>
            </div>
          </div>

          {/* Main Content Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            {/* Left 2 Cols: Services & About */}
            <div className="lg:col-span-2 space-y-10">
              {/* About Atelier */}
              <section className="bg-white rounded-3xl p-6 sm:p-8 border border-ivory-300/80 shadow-xs space-y-4">
                <h2 className="font-serif text-2xl font-bold text-charcoal-900">
                  About the Atelier
                </h2>
                <p className="text-sm text-charcoal-700 leading-relaxed">
                  {provider.description}
                </p>

                {/* Amenities */}
                <div className="pt-4 border-t border-ivory-200">
                  <h3 className="text-xs font-semibold text-charcoal-500 uppercase tracking-wider mb-3">
                    Atelier Amenities & Standards
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {provider.amenities.map((amenity) => (
                      <div key={amenity} className="flex items-center gap-2 text-xs text-charcoal-700">
                        <CheckCircle2 className="w-4 h-4 text-sage-600 shrink-0" />
                        <span>{amenity}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              {/* Services & Treatments */}
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-serif text-2xl font-bold text-charcoal-900">
                    Grooming Treatments & Menu
                  </h2>
                  <span className="text-xs text-charcoal-500">
                    {primaryServices.length} Treatments available
                  </span>
                </div>

                <div className="space-y-3">
                  {primaryServices.map((svc) => (
                    <div
                      key={svc.id}
                      className="p-5 sm:p-6 rounded-2xl bg-white border border-ivory-300 hover:border-sage-400 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-2xs"
                    >
                      <div className="space-y-1.5 max-w-xl">
                        <div className="flex items-center gap-2">
                          <h3 className="font-serif text-lg font-bold text-charcoal-900">
                            {svc.name}
                          </h3>
                          <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-ivory-200 text-charcoal-700 flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {svc.durationMin} mins
                          </span>
                        </div>
                        {svc.description && (
                          <p className="text-xs text-charcoal-600 leading-relaxed">
                            {svc.description}
                          </p>
                        )}
                        {svc.sizePricing && (
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            <span className="text-[10px] font-semibold text-charcoal-500 uppercase">
                              Size Surcharges:
                            </span>
                            {Object.entries(svc.sizePricing).map(([tier, fee]) => (
                              <span
                                key={tier}
                                className="text-[11px] px-1.5 py-0.5 rounded bg-sage-50 text-sage-800 border border-sage-200/50"
                              >
                                {tier}: +${(Number(fee) / 100).toFixed(0)}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="sm:text-right shrink-0 w-full sm:w-auto flex sm:flex-col items-center sm:items-end justify-between gap-2 border-t sm:border-t-0 pt-3 sm:pt-0 border-ivory-200">
                        <div className="text-xl font-bold font-serif text-charcoal-900">
                          ${(svc.basePriceCents / 100).toFixed(0)}
                        </div>
                        <Link href={`/book/grooming/${provider.slug}?serviceId=${svc.id}`}>
                          <Button size="sm" variant="primary">
                            Book Treatment
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Add-ons & Botanical Enhancements */}
              {addOns.length > 0 && (
                <section className="space-y-4">
                  <h3 className="font-serif text-xl font-bold text-charcoal-900">
                    Botanical Add-Ons & Spa Enhancements
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {addOns.map((addon) => (
                      <div
                        key={addon.id}
                        className="p-4 rounded-2xl bg-white border border-ivory-300/80 space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <h4 className="font-serif font-bold text-sm text-charcoal-900">
                            {addon.name}
                          </h4>
                          <span className="text-sm font-bold text-sage-800">
                            +${(addon.basePriceCents / 100).toFixed(0)}
                          </span>
                        </div>
                        {addon.description && (
                          <p className="text-xs text-charcoal-600 line-clamp-2">
                            {addon.description}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Sample Reviews */}
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-serif text-2xl font-bold text-charcoal-900">
                    Client Reviews & Experiences
                  </h2>
                  <div className="flex items-center gap-1 text-xs font-semibold text-charcoal-900">
                    <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                    <span>{provider.ratingAvg.toFixed(2)} out of 5</span>
                  </div>
                </div>

                <div className="space-y-3">
                  {reviews.length === 0 ? (
                    <p className="text-xs text-charcoal-500 italic">No reviews yet for this atelier.</p>
                  ) : (
                    reviews.map((r) => (
                      <div
                        key={r.id}
                        className="p-5 rounded-2xl bg-white border border-ivory-300/80 space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-charcoal-900">{r.userName}</span>
                            {r.isSample ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                                Sample Review
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-sage-50 text-sage-800 border border-sage-200">
                                Verified Customer
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-0.5">
                            {Array.from({ length: r.rating }).map((_, i) => (
                              <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                            ))}
                          </div>
                        </div>
                        {r.title && (
                          <h4 className="font-serif font-bold text-sm text-charcoal-900">
                            {r.title}
                          </h4>
                        )}
                        {r.body && (
                          <p className="text-xs text-charcoal-600 leading-relaxed italic font-serif">
                            &ldquo;{r.body}&rdquo;
                          </p>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </section>
            </div>

            {/* Right Column: Operating Hours & Quick Booking Card */}
            <div className="space-y-6">
              {/* Quick Book Sticky Card */}
              <div className="bg-white rounded-3xl p-6 border border-ivory-300 shadow-sm space-y-4 sticky top-6">
                <div className="space-y-1">
                  <span className="text-xs font-semibold text-sage-700 uppercase tracking-wider">
                    Reserve an Appointment
                  </span>
                  <div className="text-2xl font-bold font-serif text-charcoal-900">
                    From ${provider.priceFromCents ? (provider.priceFromCents / 100).toFixed(0) : '35'}
                  </div>
                  <p className="text-xs text-charcoal-500">
                    Pricing tailored to coat length and pet size tier.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-sage-50 border border-sage-200/50 flex items-start gap-2.5 text-xs text-sage-900">
                  <ShieldCheck className="w-4 h-4 text-sage-700 shrink-0 mt-0.5" />
                  <span>
                    Cancel free of charge up to {provider.cancellationHours} hours before your appointment.
                  </span>
                </div>

                <Link
                  href={
                    user
                      ? `/book/grooming/${provider.slug}`
                      : `/auth/sign-in?next=${encodeURIComponent(`/book/grooming/${provider.slug}`)}`
                  }
                  className="block"
                >
                  <Button variant="primary" size="lg" className="w-full justify-center">
                    Select Treatment & Slot
                  </Button>
                </Link>

                {/* Operating Hours Table */}
                <div className="pt-4 border-t border-ivory-200 space-y-2">
                  <h3 className="text-xs font-semibold text-charcoal-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-sage-600" /> Operating Hours
                  </h3>
                  <div className="space-y-1.5 text-xs">
                    {hours.map((h) => (
                      <div key={h.id} className="flex justify-between text-charcoal-600">
                        <span className="font-medium text-charcoal-800">{WEEKDAYS[h.weekday]}</span>
                        <span>{h.opensAt} – {h.closesAt}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Container>
      </main>

      <Footer />
    </div>
  );
}
