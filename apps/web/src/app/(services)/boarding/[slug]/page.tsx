'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Container } from '@/components/layout/Container';
import { Button } from '@/components/ui/Button';
import { apiFetch } from '@/lib/api/client';
import { ProviderSummary, BoardingUnitSummary, ReviewSummary } from '@pawnest/shared';
import {
  Star,
  MapPin,
  Clock,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Phone,
  Globe,
  Home,
  Sun,
  Moon,
  Heart,
  ChevronRight,
  Loader2,
} from 'lucide-react';

interface BoardingDetailPageProps {
  params: Promise<{ slug: string }>;
}

export default function BoardingDetailPage({ params }: BoardingDetailPageProps) {
  const { slug } = use(params);
  const [provider, setProvider] = useState<ProviderSummary | null>(null);
  const [units, setUnits] = useState<BoardingUnitSummary[]>([]);
  const [reviews, setReviews] = useState<ReviewSummary[]>([]);
  const [hours, setHours] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    setLoading(true);

    apiFetch<{
      provider: ProviderSummary;
      units: BoardingUnitSummary[];
      reviews: ReviewSummary[];
      hours: any[];
    }>(`/providers/${slug}`)
      .then((data) => {
        if (mounted) {
          setProvider(data.provider);
          setUnits(data.units || []);
          setReviews(data.reviews || []);
          setHours(data.hours || []);
        }
      })
      .catch((err) => {
        console.error('Failed to load boarding details:', err);
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
          <p className="text-sm font-medium">Loading suite availability...</p>
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
          <h1 className="text-3xl font-serif font-bold text-charcoal-900 mb-4">Boarding Facility Not Found</h1>
          <p className="text-sm text-charcoal-600 mb-8">
            The boarding retreat you are looking for does not exist or has been relocated.
          </p>
          <Link href="/boarding">
            <Button variant="primary">Return to Boarding Directory</Button>
          </Link>
        </Container>
        <Footer />
      </div>
    );
  }

  const primaryImage =
    provider.imageKeys && provider.imageKeys.length > 0
      ? provider.imageKeys[0]
      : '/images/hero-dog.jpg';

  const routineItems = [
    { time: '08:00', title: 'Morning Nature Promenade', desc: 'Fresh morning scents, gentle lawn strolls, and individual bathroom relief.' },
    { time: '09:00', title: 'Gourmet Breakfast Service', desc: 'Custom meal preparation, fresh filtered water, and verified medication administration.' },
    { time: '11:00', title: 'Agility Lawn & Social Play', desc: 'Supervised group play divided strictly by size, temperament, and playstyle.' },
    { time: '14:00', title: 'Sensory Slumber & Aromatherapy', desc: 'Dimmed ambient lighting, lavender mist, and classical soundscapes for restorative naps.' },
    { time: '17:30', title: 'Evening Yard Outing & Dinner', desc: 'Second round of lawn games followed by evening nutrition and digestion pause.' },
    { time: '20:00', title: 'Bedtime Cuddle & Nightcap', desc: 'One-on-one bedtime affection, paw balm application, and final tuck-in before overnight rest.' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-ivory-100">
      <Header />

      <main className="flex-1 pb-24">
        {/* Breadcrumb Bar */}
        <div className="border-b border-ivory-300/80 bg-white/60 py-3">
          <Container>
            <div className="flex items-center gap-2 text-xs text-charcoal-500">
              <Link href="/" className="hover:text-charcoal-900 transition-colors">Home</Link>
              <span>/</span>
              <Link href="/boarding" className="hover:text-charcoal-900 transition-colors">Boarding</Link>
              <span>/</span>
              <span className="text-charcoal-900 font-medium truncate">{provider.name}</span>
            </div>
          </Container>
        </div>

        {/* Gallery / Hero */}
        <section className="relative w-full aspect-[21/9] min-h-[300px] max-h-[500px] bg-charcoal-900 overflow-hidden">
          <Image
            src={primaryImage}
            alt={provider.name}
            fill
            priority
            sizes="100vw"
            className="object-cover opacity-85"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-charcoal-900/80 via-charcoal-900/30 to-transparent" />

          <div className="absolute bottom-0 inset-x-0 p-6 md:p-10 text-white">
            <Container>
              <div className="max-w-3xl space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-white/20 backdrop-blur-md text-white border border-white/20">
                    Overnight Lodging
                  </span>
                  {provider.isDemo && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-peach-100 text-peach-800">
                      <Sparkles className="w-3 h-3 text-peach-600" /> Demo Partner
                    </span>
                  )}
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white text-charcoal-900 text-xs font-bold">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    <span>{provider.ratingAvg.toFixed(2)}</span>
                    <span className="text-charcoal-500 font-normal">({provider.ratingCount} reviews)</span>
                  </div>
                </div>

                <h1 className="text-3xl md:text-5xl font-serif font-bold text-white leading-tight">
                  {provider.name}
                </h1>

                {provider.tagline && (
                  <p className="text-base md:text-lg text-white/90 italic font-serif">
                    &ldquo;{provider.tagline}&rdquo;
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-4 text-xs md:text-sm text-white/80 pt-1">
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-sage-300" />
                    {provider.addressLine}, {provider.city}
                  </span>
                  {provider.phone && (
                    <span className="flex items-center gap-1.5">
                      <Phone className="w-4 h-4 text-sage-300" />
                      {provider.phone}
                    </span>
                  )}
                </div>
              </div>
            </Container>
          </div>
        </section>

        {/* Content Layout */}
        <Container className="py-10 md:py-14">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            {/* Main Content (Left 2 cols) */}
            <div className="lg:col-span-2 space-y-12">
              {/* About Atelier */}
              <section className="space-y-4 bg-white p-6 md:p-8 rounded-3xl border border-ivory-300 shadow-xs">
                <h2 className="text-2xl font-serif font-bold text-charcoal-900">About the Retreat</h2>
                <p className="text-sm md:text-base text-charcoal-700 leading-relaxed">
                  {provider.description}
                </p>

                {/* Key Amenities */}
                <div className="pt-4 border-t border-ivory-200">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-charcoal-500 mb-3">
                    Featured Facility Amenities
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {provider.amenities.map((amenity) => (
                      <div
                        key={amenity}
                        className="flex items-center gap-2 p-2.5 rounded-xl bg-ivory-50 border border-ivory-200 text-xs text-charcoal-800"
                      >
                        <CheckCircle2 className="w-4 h-4 text-sage-600 shrink-0" />
                        <span>{amenity}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              {/* Suites Showcase */}
              <section className="space-y-6">
                <div>
                  <h2 className="text-2xl font-serif font-bold text-charcoal-900">Available Suites & Rooms</h2>
                  <p className="text-xs md:text-sm text-charcoal-600 mt-1">
                    Select a dedicated room tier tailored to your companion’s size, resting style, and privacy needs.
                  </p>
                </div>

                <div className="space-y-4">
                  {units.map((unit) => (
                    <div
                      key={unit.id}
                      className="p-6 bg-white rounded-3xl border border-ivory-300 shadow-xs hover:border-sage-400 transition-all flex flex-col md:flex-row md:items-center justify-between gap-6"
                    >
                      <div className="space-y-2 max-w-xl">
                        <div className="flex items-center gap-2">
                          <h3 className="text-xl font-serif font-bold text-charcoal-900">
                            {unit.name}
                          </h3>
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-sage-100 text-sage-800">
                            Capacity: {unit.capacity} suites
                          </span>
                        </div>

                        <p className="text-xs md:text-sm text-charcoal-600 leading-relaxed">
                          {unit.description}
                        </p>

                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {unit.amenities.map((am) => (
                            <span
                              key={am}
                              className="px-2 py-0.5 rounded-md bg-ivory-100 text-[11px] font-medium text-charcoal-700 border border-ivory-200"
                            >
                              {am}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="flex md:flex-col items-center md:items-end justify-between gap-3 shrink-0 pt-4 md:pt-0 border-t md:border-t-0 border-ivory-200">
                        <div className="text-left md:text-right">
                          <div className="font-serif text-2xl font-bold text-charcoal-900">
                            ${(unit.nightlyCents / 100).toFixed(0)}
                          </div>
                          <div className="text-[11px] text-charcoal-500 font-medium">per night</div>
                        </div>

                        <Link href={`/book/boarding/${provider.slug}?unitId=${unit.id}`}>
                          <Button variant="primary" size="sm" className="whitespace-nowrap">
                            Book This Suite
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Daily Stay Routine Timeline */}
              <section className="space-y-6 bg-white p-6 md:p-8 rounded-3xl border border-ivory-300 shadow-xs">
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-sage-700 mb-1 flex items-center gap-1.5">
                    <Sun className="w-3.5 h-3.5" /> Daily Rhythm
                  </div>
                  <h2 className="text-2xl font-serif font-bold text-charcoal-900">A Day in the Life</h2>
                  <p className="text-xs text-charcoal-600 mt-1">
                    Structured routines designed by veterinary behaviourists to prevent homesickness and foster acoustic tranquility.
                  </p>
                </div>

                <div className="space-y-4 relative before:absolute before:inset-0 before:left-3.5 before:w-0.5 before:bg-ivory-300">
                  {routineItems.map((item, idx) => (
                    <div key={idx} className="relative flex items-start gap-4 pl-8">
                      <div className="absolute left-2 top-1.5 w-3 h-3 rounded-full bg-sage-600 ring-4 ring-white" />
                      <div>
                        <span className="text-xs font-bold text-sage-800 mr-2">{item.time}</span>
                        <span className="text-sm font-serif font-bold text-charcoal-900">{item.title}</span>
                        <p className="text-xs text-charcoal-600 mt-0.5">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Guest Reviews */}
              <section className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-serif font-bold text-charcoal-900">Parent Testimonials</h2>
                  <div className="flex items-center gap-1 text-xs text-charcoal-600">
                    <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                    <strong>{provider.ratingAvg.toFixed(2)}</strong> out of 5 ({provider.ratingCount} reviews)
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {reviews.map((rev) => (
                    <div
                      key={rev.id}
                      className="p-5 rounded-2xl bg-white border border-ivory-300 shadow-2xs space-y-2.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-serif font-bold text-sm text-charcoal-900">{rev.userName}</span>
                        <div className="flex items-center gap-0.5">
                          {Array.from({ length: rev.rating }).map((_, i) => (
                            <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                          ))}
                        </div>
                      </div>

                      {rev.title && (
                        <h4 className="font-serif font-semibold text-xs text-charcoal-800">
                          &ldquo;{rev.title}&rdquo;
                        </h4>
                      )}

                      <p className="text-xs text-charcoal-600 leading-relaxed">{rev.body}</p>

                      {rev.isSample && (
                        <div className="pt-2">
                          <span className="text-[10px] text-peach-700 bg-peach-50 px-2 py-0.5 rounded-full border border-peach-200">
                            Verified Guest Stay (Sample)
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            </div>

            {/* Sidebar (Right 1 col) */}
            <div className="space-y-6">
              {/* Quick Book Card */}
              <div className="sticky top-24 bg-white p-6 rounded-3xl border border-ivory-300 shadow-md space-y-6">
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-sage-700">Reserve a Stay</div>
                  <div className="font-serif text-2xl font-bold text-charcoal-900 mt-1">
                    From ${(provider.priceFromCents ? provider.priceFromCents / 100 : 75).toFixed(0)}
                    <span className="text-sm font-sans font-normal text-charcoal-500"> / night</span>
                  </div>
                </div>

                {/* Health & Safety Checklist */}
                <div className="p-4 rounded-2xl bg-sage-50/70 border border-sage-200/60 space-y-2 text-xs text-charcoal-700">
                  <div className="flex items-center gap-1.5 font-bold text-sage-900">
                    <ShieldCheck className="w-4 h-4 text-sage-700" />
                    Vaccination Policy
                  </div>
                  <p className="leading-relaxed text-[11px]">
                    All canine guests require <strong>Rabies, DHPP, and Bordetella</strong> verified through check-out date.
                  </p>
                </div>

                {/* Cancellation policy */}
                <div className="text-xs text-charcoal-600 space-y-1">
                  <div className="flex items-center gap-1.5 font-medium text-charcoal-900">
                    <Clock className="w-3.5 h-3.5 text-sage-600" />
                    Cancellation Window
                  </div>
                  <p className="text-[11px] text-charcoal-500">
                    Free cancellation up to {provider.cancellationHours || 24} hours prior to scheduled check-in.
                  </p>
                </div>

                <Link href={`/book/boarding/${provider.slug}`} className="block">
                  <Button variant="primary" className="w-full justify-center text-sm py-3 font-semibold">
                    Start Reservation
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </Container>
      </main>

      <Footer />
    </div>
  );
}
