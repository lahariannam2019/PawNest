'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Container } from '@/components/layout/Container';
import { Button } from '@/components/ui/Button';
import { FavouriteButton } from '@/components/ui/FavouriteButton';
import { apiFetch } from '@/lib/api/client';
import { useAuth } from '@/lib/auth/AuthContext';
import { ProviderSummary, ServiceSummary, ReviewSummary, EMERGENCY_DISCLAIMER_TEXT } from '@pawnest/shared';
import {
  Star,
  MapPin,
  Clock,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Phone,
  Globe,
  Stethoscope,
  AlertTriangle,
  HeartPulse,
  Calendar,
  ChevronRight,
  Loader2,
  Syringe,
  Activity,
  PhoneCall,
} from 'lucide-react';

interface VetDetailPageProps {
  params: Promise<{ slug: string }>;
}

export default function VetDetailPage({ params }: VetDetailPageProps) {
  const { slug } = use(params);
  const { user } = useAuth();
  const [provider, setProvider] = useState<ProviderSummary | null>(null);
  const [services, setServices] = useState<ServiceSummary[]>([]);
  const [reviews, setReviews] = useState<ReviewSummary[]>([]);
  const [hours, setHours] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    setLoading(true);

    apiFetch<{
      provider: ProviderSummary;
      services: ServiceSummary[];
      reviews: ReviewSummary[];
      hours: any[];
    }>(`/providers/${slug}`)
      .then((data) => {
        if (mounted) {
          setProvider(data.provider);
          setServices(data.services || []);
          setReviews(data.reviews || []);
          setHours(data.hours || []);
        }
      })
      .catch((err) => {
        console.error('Failed to load clinic details:', err);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-ivory-100">
        <Header />
        <div className="flex-1 flex flex-col items-center justify-center py-32 text-charcoal-500">
          <Loader2 className="w-8 h-8 animate-spin text-sage-600 mb-3" />
          <p className="text-sm font-medium">Loading clinic services and appointment availability...</p>
        </div>
        <Footer />
      </div>
    );
  }

  if (!provider) {
    return (
      <div className="min-h-screen flex flex-col bg-ivory-100">
        <Header />
        <Container className="py-24 text-center">
          <h1 className="text-3xl font-serif font-bold text-charcoal-900 mb-4">Veterinary Clinic Not Found</h1>
          <p className="text-sm text-charcoal-600 mb-8">
            The clinic you are looking for does not exist or is currently unavailable.
          </p>
          <Link href="/vet">
            <Button variant="primary">Return to Veterinary Directory</Button>
          </Link>
        </Container>
        <Footer />
      </div>
    );
  }

  const primaryServices = services.filter((s) => !s.isAddOn);
  const addOnServices = services.filter((s) => s.isAddOn);

  const weekdayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  return (
    <div className="min-h-screen flex flex-col bg-ivory-100">
      <Header />

      <main className="flex-1 py-8 md:py-12">
        <Container>
          {/* Breadcrumbs */}
          <nav className="flex items-center gap-2 text-xs text-charcoal-500 mb-6">
            <Link href="/" className="hover:text-charcoal-900 transition-colors">
              Home
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-charcoal-400" />
            <Link href="/vet" className="hover:text-charcoal-900 transition-colors">
              Veterinary Clinics
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-charcoal-400" />
            <span className="font-medium text-charcoal-800">{provider.name}</span>
          </nav>

          {/* Persistent Medical Emergency Warning Banner */}
          <div className="mb-8 p-4 md:p-5 rounded-2xl bg-amber-50/90 border border-amber-200/80 shadow-xs">
            <div className="flex items-start gap-3.5">
              <div className="p-2 rounded-xl bg-amber-100/80 text-amber-800 shrink-0 mt-0.5">
                <AlertTriangle className="w-5 h-5 text-amber-700" />
              </div>
              <div className="space-y-1 text-xs md:text-sm text-amber-950 leading-relaxed">
                <span className="font-bold uppercase tracking-tight text-amber-900 text-xs">
                  Important Non-Emergency Disclaimer:
                </span>
                <p className="text-amber-900/90">
                  {EMERGENCY_DISCLAIMER_TEXT} For acute emergencies, poisonings, or severe trauma, please call 911 or proceed immediately to the nearest 24/7 veterinary ER facility.
                </p>
                <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] font-medium text-amber-950">
                  <span className="inline-flex items-center gap-1.5 text-amber-900">
                    <PhoneCall className="w-3.5 h-3.5 text-amber-700" /> ASPCA Animal Poison Control: (888) 426-4435
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Hero Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
            <div className="lg:col-span-2 space-y-4">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-sage-100 text-sage-800 border border-sage-200">
                  <Stethoscope className="w-3.5 h-3.5 text-sage-600" /> Accredited Veterinary Clinic
                </span>
                {provider.isDemo && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-peach-100 text-peach-700 border border-peach-200">
                    <Sparkles className="w-3 h-3 text-peach-500" /> Demo Dataset
                  </span>
                )}
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white border border-ivory-300 text-xs font-semibold text-charcoal-900">
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  <span>{provider.ratingAvg.toFixed(2)}</span>
                  <span className="text-charcoal-400 font-normal">({provider.ratingCount} verified visits)</span>
                </div>
                <FavouriteButton kind="PROVIDER" id={provider.id} size="sm" />
              </div>

              <h1 className="text-3xl md:text-5xl font-serif font-bold text-charcoal-900 leading-tight">
                {provider.name}
              </h1>

              {provider.tagline && (
                <p className="text-base text-sage-700 font-serif italic">
                  &ldquo;{provider.tagline}&rdquo;
                </p>
              )}

              <p className="text-sm md:text-base text-charcoal-600 leading-relaxed font-sans pt-1">
                {provider.description}
              </p>

              {/* Location & Contact Bar */}
              <div className="flex flex-wrap items-center gap-6 pt-3 text-xs md:text-sm text-charcoal-600 border-t border-ivory-300">
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-sage-600 shrink-0" />
                  <span>{provider.addressLine}, {provider.city}, {provider.region}</span>
                </div>
                {provider.phone && (
                  <div className="flex items-center gap-1.5">
                    <Phone className="w-4 h-4 text-sage-600 shrink-0" />
                    <a href={`tel:${provider.phone}`} className="hover:text-sage-700 hover:underline">
                      {provider.phone}
                    </a>
                  </div>
                )}
                {provider.websiteUrl && (
                  <div className="flex items-center gap-1.5">
                    <Globe className="w-4 h-4 text-sage-600 shrink-0" />
                    <a href={provider.websiteUrl} target="_blank" rel="noopener noreferrer" className="hover:text-sage-700 hover:underline">
                      Visit Website
                    </a>
                  </div>
                )}
              </div>

              {/* Amenities */}
              {provider.amenities && provider.amenities.length > 0 && (
                <div className="pt-2">
                  <p className="text-xs font-bold uppercase tracking-wider text-charcoal-400 mb-2">
                    Clinic Capabilities & Amenities
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {provider.amenities.map((amenity, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-white border border-ivory-300 text-charcoal-700"
                      >
                        <ShieldCheck className="w-3.5 h-3.5 text-sage-600 shrink-0" />
                        {amenity}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Quick Action / Direct Booking Card */}
            <div className="rounded-2xl bg-white border border-ivory-300 shadow-sm p-6 space-y-5 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-ivory-200">
                  <span className="text-xs font-bold uppercase tracking-wider text-charcoal-500">
                    Examinations & Booster Visits
                  </span>
                  <span className="text-xs text-sage-700 font-semibold bg-sage-50 px-2.5 py-0.5 rounded-full border border-sage-200">
                    Open for Appointments
                  </span>
                </div>

                <div className="space-y-2">
                  <p className="text-xs text-charcoal-500">Starting from</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-serif font-bold text-charcoal-900">
                      ${provider.priceFromCents ? (provider.priceFromCents / 100).toFixed(0) : '85'}
                    </span>
                    <span className="text-xs text-charcoal-500">/ clinical consultation</span>
                  </div>
                </div>

                <div className="space-y-2 text-xs text-charcoal-600 pt-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-sage-600 shrink-0" />
                    <span>Instant confirmation with verified doctor schedule</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-sage-600 shrink-0" />
                    <span>Free cancellation up to {provider.cancellationHours || 24} hours prior</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-sage-600 shrink-0" />
                    <span>Automatic pre-visit health and allergy synchronization</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-ivory-200">
                <Link
                  href={
                    user
                      ? `/book/vet/${provider.slug}`
                      : `/auth/sign-in?next=${encodeURIComponent(`/book/vet/${provider.slug}`)}`
                  }
                  className="block w-full"
                >
                  <Button variant="primary" className="w-full py-3 justify-center text-sm font-semibold">
                    Schedule Veterinary Visit
                  </Button>
                </Link>
                <p className="text-center text-[11px] text-charcoal-400 mt-2">
                  Select your pet and preferred doctor slot next
                </p>
              </div>
            </div>
          </div>

          {/* Services Menu Section */}
          <div className="space-y-8 mb-16">
            <div className="border-b border-ivory-300 pb-4">
              <h2 className="text-2xl md:text-3xl font-serif font-bold text-charcoal-900">
                Veterinary Examination & Care Menu
              </h2>
              <p className="text-xs md:text-sm text-charcoal-600 mt-1">
                Choose a visit type to view detailed doctor consultation procedures and book online.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {primaryServices.map((service) => (
                <div
                  key={service.id}
                  className="rounded-2xl bg-white border border-ivory-300/80 p-6 shadow-xs hover:border-sage-300 hover:shadow-sm transition-all flex flex-col justify-between"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="font-serif font-bold text-lg text-charcoal-900">
                          {service.name}
                        </h3>
                        <div className="flex items-center gap-3 text-xs text-charcoal-500 mt-1">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-sage-600" /> {service.durationMin} minutes
                          </span>
                          <span>•</span>
                          <span>{service.species.join(' & ')}</span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-serif font-bold text-xl text-charcoal-900">
                          ${(service.basePriceCents / 100).toFixed(0)}
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-charcoal-600 leading-relaxed pt-1">
                      {service.description}
                    </p>
                  </div>

                  <div className="pt-4 mt-4 border-t border-ivory-200 flex items-center justify-between">
                    <span className="text-[11px] text-charcoal-400">
                      Doctor exam & vitals check included
                    </span>
                    <Link
                      href={
                        user
                          ? `/book/vet/${provider.slug}?serviceId=${service.id}`
                          : `/auth/sign-in?next=${encodeURIComponent(`/book/vet/${provider.slug}?serviceId=${service.id}`)}`
                      }
                    >
                      <Button variant="secondary" size="sm" className="font-medium text-xs">
                        Book This Visit
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>

            {/* Add-On Clinical Diagnostics */}
            {addOnServices.length > 0 && (
              <div className="pt-6">
                <div className="mb-4">
                  <h3 className="text-xl font-serif font-bold text-charcoal-900">
                    Diagnostic Add-Ons & Laboratory Tests
                  </h3>
                  <p className="text-xs text-charcoal-600 mt-0.5">
                    These tests can be added to your wellness appointment during booking.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {addOnServices.map((addon) => (
                    <div
                      key={addon.id}
                      className="p-4 rounded-xl bg-white border border-ivory-300 shadow-2xs flex flex-col justify-between"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-semibold text-charcoal-900">{addon.name}</h4>
                          <span className="text-sm font-bold text-charcoal-900">
                            +${(addon.basePriceCents / 100).toFixed(0)}
                          </span>
                        </div>
                        <p className="text-xs text-charcoal-500 leading-relaxed">
                          {addon.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Operating Schedule & Verified Reviews Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pt-8 border-t border-ivory-300">
            {/* Hours */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-sage-600" />
                <h3 className="text-xl font-serif font-bold text-charcoal-900">Doctor Clinic Hours</h3>
              </div>
              <div className="rounded-2xl bg-white border border-ivory-300 p-5 space-y-2 text-xs">
                {hours.map((h, i) => (
                  <div key={i} className="flex items-center justify-between py-1 border-b border-ivory-200 last:border-0">
                    <span className="font-medium text-charcoal-700">{weekdayNames[h.weekday]}</span>
                    <span className="text-charcoal-600">{h.opensAt} – {h.closesAt}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Verified Reviews */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
                  <h3 className="text-xl font-serif font-bold text-charcoal-900">Patient Experiences</h3>
                </div>
                <span className="text-xs text-charcoal-500 font-medium">
                  {reviews.length} verified reviews
                </span>
              </div>

              {reviews.length === 0 ? (
                <div className="rounded-2xl bg-white border border-ivory-300 p-8 text-center text-xs text-charcoal-500">
                  No patient reviews recorded yet for this clinic.
                </div>
              ) : (
                <div className="space-y-4">
                  {reviews.map((rev) => (
                    <div key={rev.id} className="p-5 rounded-2xl bg-white border border-ivory-300 shadow-2xs space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-sage-100 text-sage-800 font-bold text-xs flex items-center justify-center">
                            {rev.userName[0]}
                          </div>
                          <div>
                            <span className="text-xs font-bold text-charcoal-900 block">{rev.userName}</span>
                            {rev.isSample ? (
                              <span className="text-[10px] font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                                Sample Review
                              </span>
                            ) : (
                              <span className="text-[10px] font-semibold text-sage-800 bg-sage-50 px-2 py-0.5 rounded-full border border-sage-200">
                                Verified Patient
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          {[...Array(rev.rating)].map((_, i) => (
                            <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                          ))}
                        </div>
                      </div>

                      {rev.title && (
                        <h4 className="text-sm font-semibold text-charcoal-900 font-serif">
                          &ldquo;{rev.title}&rdquo;
                        </h4>
                      )}

                      <p className="text-xs text-charcoal-600 leading-relaxed">
                        {rev.body}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Container>
      </main>

      <Footer />
    </div>
  );
}
