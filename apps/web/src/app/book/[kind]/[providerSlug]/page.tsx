'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Container } from '@/components/layout/Container';
import { Button } from '@/components/ui/Button';
import { PetSelector } from '@/components/booking/PetSelector';
import { SlotPicker } from '@/components/booking/SlotPicker';
import { PriceSummary } from '@/components/booking/PriceSummary';
import { useAuth } from '@/lib/auth/AuthContext';
import { apiFetch } from '@/lib/api/client';
import {
  PetSummary,
  ServiceSummary,
  ProviderSummary,
  AvailabilitySlot,
  BookingPriceBreakdown,
  BookingKind,
} from '@pawnest/shared';
import {
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Check,
  AlertCircle,
  Loader2,
  Calendar,
  Heart,
  Scissors,
} from 'lucide-react';

export default function BookingWizardPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();

  const kind = (params?.kind as string)?.toUpperCase() as BookingKind;
  const providerSlug = params?.providerSlug as string;
  const preselectedServiceId = searchParams?.get('serviceId');

  // Wizard Step: 1 = Pet, 2 = Service, 3 = Slot, 4 = Review
  const [step, setStep] = useState<number>(1);

  // Data
  const [provider, setProvider] = useState<ProviderSummary | null>(null);
  const [services, setServices] = useState<ServiceSummary[]>([]);
  const [pets, setPets] = useState<PetSummary[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(true);

  // Selections
  const [selectedPet, setSelectedPet] = useState<PetSummary | null>(null);
  const [selectedService, setSelectedService] = useState<ServiceSummary | null>(null);
  const [selectedAddOnIds, setSelectedAddOnIds] = useState<string[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<AvailabilitySlot | null>(null);
  const [notes, setNotes] = useState<string>('');

  // Quote
  const [quote, setQuote] = useState<{
    priceCents: number;
    currency: string;
    priceBreakdown: BookingPriceBreakdown;
    cancellationHours: number;
  } | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);

  // Submitting
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Auth redirect
  useEffect(() => {
    if (!authLoading && !user) {
      router.push(`/auth/sign-in?next=/book/${kind.toLowerCase()}/${providerSlug}`);
    }
  }, [user, authLoading, router, kind, providerSlug]);

  // Load Provider, Services, and User's Pets
  useEffect(() => {
    if (!user) return;
    let mounted = true;

    Promise.all([
      apiFetch<{ provider: ProviderSummary; services: ServiceSummary[] }>(`/providers/${providerSlug}`),
      apiFetch<{ items: PetSummary[] }>('/pets'),
    ])
      .then(([provData, petData]) => {
        if (!mounted) return;
        setProvider(provData.provider);
        setServices(provData.services);
        setPets(petData.items || []);

        // Auto-select first pet if available
        if (petData.items && petData.items.length > 0) {
          setSelectedPet(petData.items[0]);
        }

        // Auto-select service if passed via URL param
        if (preselectedServiceId) {
          const match = provData.services.find((s) => s.id === preselectedServiceId);
          if (match) setSelectedService(match);
        }
      })
      .catch((err) => {
        console.error('Failed to initialize booking wizard:', err);
      })
      .finally(() => {
        if (mounted) setLoadingInitial(false);
      });

    return () => {
      mounted = false;
    };
  }, [user, providerSlug, preselectedServiceId]);

  // Fetch Quote when Pet, Service, or Addons change
  useEffect(() => {
    if (!selectedPet || !provider || !selectedService || !selectedSlot) return;

    let mounted = true;
    setQuoteLoading(true);

    apiFetch<{
      priceCents: number;
      currency: string;
      priceBreakdown: BookingPriceBreakdown;
      cancellationHours: number;
    }>('/bookings/quote', {
      method: 'POST',
      body: JSON.stringify({
        petId: selectedPet.id,
        providerId: provider.id,
        kind: kind || 'GROOMING',
        serviceId: selectedService.id,
        startsAt: selectedSlot.startsAt,
        endsAt: selectedSlot.endsAt,
        addOnIds: selectedAddOnIds,
      }),
    })
      .then((res) => {
        if (mounted) setQuote(res);
      })
      .catch((err) => {
        console.error('Failed to calculate quote:', err);
      })
      .finally(() => {
        if (mounted) setQuoteLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [selectedPet, provider, selectedService, selectedAddOnIds, selectedSlot, kind]);

  function handleToggleAddon(id: string) {
    setSelectedAddOnIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  }

  async function handleConfirmBooking() {
    if (!selectedPet || !provider || !selectedService || !selectedSlot) return;

    setSubmitting(true);
    setSubmitError(null);

    // Generate client-side UUID for idempotency
    const idempotencyKey = `bk-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    try {
      const res = await apiFetch<{ id: string; reference: string }>('/bookings', {
        method: 'POST',
        headers: {
          'Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify({
          petId: selectedPet.id,
          providerId: provider.id,
          kind: kind || 'GROOMING',
          serviceId: selectedService.id,
          startsAt: selectedSlot.startsAt,
          endsAt: selectedSlot.endsAt,
          addOnIds: selectedAddOnIds,
          notes: notes.trim() || undefined,
        }),
      });

      // Redirect to confirmed booking detail
      router.push(`/dashboard/bookings/${res.id}?confirmed=true`);
    } catch (err: any) {
      setSubmitError(err.message || 'Failed to complete booking. Please try again.');
      setSubmitting(false);
    }
  }

  if (authLoading || loadingInitial) {
    return (
      <div className="min-h-screen flex flex-col bg-ivory-100">
        <Header />
        <div className="flex-1 flex flex-col items-center justify-center py-20 text-charcoal-500">
          <Loader2 className="w-8 h-8 animate-spin text-sage-600 mb-3" />
          <p className="text-sm font-serif">Preparing booking suite...</p>
        </div>
        <Footer />
      </div>
    );
  }

  if (!provider) {
    return (
      <div className="min-h-screen flex flex-col bg-ivory-100">
        <Header />
        <Container className="flex-1 py-16 text-center">
          <h2 className="text-2xl font-serif text-charcoal-900 font-bold mb-2">Provider Not Found</h2>
          <Link href="/grooming">
            <Button variant="primary">Return to Directory</Button>
          </Link>
        </Container>
        <Footer />
      </div>
    );
  }

  const primaryServices = services.filter((s) => !s.isAddOn);
  const addOnServices = services.filter((s) => s.isAddOn);

  return (
    <div className="min-h-screen flex flex-col bg-ivory-100">
      <Header />

      <main className="flex-1 py-10 md:py-16">
        <Container className="max-w-4xl">
          {/* Header Bar */}
          <div className="mb-8">
            <Link
              href={`/grooming/${provider.slug}`}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-charcoal-600 hover:text-sage-700 transition-colors mb-3"
            >
              <ChevronLeft className="w-4 h-4" /> Back to {provider.name}
            </Link>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h1 className="text-3xl font-serif font-bold text-charcoal-900">
                  Book with {provider.name}
                </h1>
                <p className="text-xs text-charcoal-500 mt-1">
                  {provider.addressLine}, {provider.city} · Fully interactive reservation
                </p>
              </div>

              <span className="inline-flex items-center gap-1 self-start sm:self-auto px-3 py-1 rounded-full text-xs font-semibold bg-peach-100 text-peach-700 border border-peach-200">
                <Sparkles className="w-3.5 h-3.5 text-peach-500" /> Demo Booking
              </span>
            </div>
          </div>

          {/* Stepper Header */}
          <div className="mb-10 bg-white rounded-2xl p-4 border border-ivory-300 shadow-2xs">
            <div className="grid grid-cols-4 gap-2 text-center text-xs">
              {[
                { s: 1, label: '1. Pet Profile' },
                { s: 2, label: '2. Treatment' },
                { s: 3, label: '3. Date & Time' },
                { s: 4, label: '4. Confirmation' },
              ].map((item) => (
                <div
                  key={item.s}
                  className={`py-2 px-1 rounded-xl font-medium transition-all ${
                    step === item.s
                      ? 'bg-sage-700 text-white font-semibold shadow-xs'
                      : step > item.s
                      ? 'bg-sage-50 text-sage-800'
                      : 'text-charcoal-400'
                  }`}
                >
                  {item.label}
                </div>
              ))}
            </div>
          </div>

          {/* Main Wizard Step Content */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-ivory-300 shadow-sm space-y-6">
            {/* STEP 1: Select Pet */}
            {step === 1 && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-xl font-serif font-bold text-charcoal-900">
                    Who are we styling today?
                  </h2>
                  <p className="text-xs text-charcoal-600 mt-1">
                    Select your companion to customize treatment duration and coat sizing.
                  </p>
                </div>

                <PetSelector
                  pets={pets}
                  selectedPetId={selectedPet?.id}
                  onSelectPet={(pet) => setSelectedPet(pet)}
                  acceptedSpecies={provider.speciesAccepted}
                />

                <div className="pt-6 border-t border-ivory-200 flex justify-end">
                  <Button
                    variant="primary"
                    disabled={!selectedPet}
                    onClick={() => setStep(2)}
                  >
                    Continue to Treatment Menu
                    <ChevronRight className="w-4 h-4 ml-1.5" />
                  </Button>
                </div>
              </div>
            )}

            {/* STEP 2: Select Service & Add-ons */}
            {step === 2 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-serif font-bold text-charcoal-900">
                    Select Grooming Service
                  </h2>
                  <p className="text-xs text-charcoal-600 mt-1">
                    Choose a primary styling package for {selectedPet?.name}.
                  </p>
                </div>

                <div className="space-y-3">
                  {primaryServices.map((svc) => {
                    const isSelected = selectedService?.id === svc.id;
                    return (
                      <div
                        key={svc.id}
                        onClick={() => setSelectedService(svc)}
                        className={`p-5 rounded-2xl border cursor-pointer transition-all flex items-start justify-between gap-4 ${
                          isSelected
                            ? 'bg-sage-50/70 border-sage-600 ring-2 ring-sage-600/30 shadow-xs'
                            : 'bg-white border-ivory-300 hover:border-sage-400'
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-serif font-bold text-base text-charcoal-900">
                              {svc.name}
                            </h3>
                            <span className="text-[11px] px-2 py-0.5 rounded-md bg-ivory-200 text-charcoal-700">
                              {svc.durationMin} mins
                            </span>
                          </div>
                          {svc.description && (
                            <p className="text-xs text-charcoal-600 leading-relaxed">
                              {svc.description}
                            </p>
                          )}
                        </div>

                        <div className="text-right shrink-0">
                          <div className="text-lg font-bold font-serif text-charcoal-900">
                            ${(svc.basePriceCents / 100).toFixed(0)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Add-ons Section */}
                {addOnServices.length > 0 && (
                  <div className="pt-6 border-t border-ivory-200 space-y-3">
                    <h3 className="font-serif text-base font-bold text-charcoal-900">
                      Optional Botanical Add-ons
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {addOnServices.map((addon) => {
                        const isChecked = selectedAddOnIds.includes(addon.id);
                        return (
                          <label
                            key={addon.id}
                            className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex items-start justify-between gap-2 ${
                              isChecked
                                ? 'bg-sage-50 border-sage-500'
                                : 'bg-ivory-50/50 border-ivory-200 hover:border-sage-300'
                            }`}
                          >
                            <div className="flex items-start gap-2.5">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => handleToggleAddon(addon.id)}
                                className="mt-1 w-4 h-4 rounded text-sage-600 focus:ring-sage-500"
                              />
                              <div>
                                <span className="font-serif text-xs font-bold text-charcoal-900 block">
                                  {addon.name}
                                </span>
                                {addon.description && (
                                  <span className="text-[11px] text-charcoal-500 line-clamp-1">
                                    {addon.description}
                                  </span>
                                )}
                              </div>
                            </div>
                            <span className="text-xs font-bold text-sage-800 shrink-0">
                              +${(addon.basePriceCents / 100).toFixed(0)}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="pt-6 border-t border-ivory-200 flex justify-between">
                  <Button variant="ghost" onClick={() => setStep(1)}>
                    <ChevronLeft className="w-4 h-4 mr-1.5" /> Back
                  </Button>
                  <Button
                    variant="primary"
                    disabled={!selectedService}
                    onClick={() => setStep(3)}
                  >
                    Select Appointment Slot
                    <ChevronRight className="w-4 h-4 ml-1.5" />
                  </Button>
                </div>
              </div>
            )}

            {/* STEP 3: Select Date & Time Slot */}
            {step === 3 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-serif font-bold text-charcoal-900">
                    Choose Date & Available Slot
                  </h2>
                  <p className="text-xs text-charcoal-600 mt-1">
                    Slots are computed live based on {provider.name}&apos;s real-time salon schedule.
                  </p>
                </div>

                <SlotPicker
                  providerSlug={provider.slug}
                  serviceId={selectedService?.id}
                  petId={selectedPet?.id}
                  selectedSlot={selectedSlot || undefined}
                  onSelectSlot={(slot) => setSelectedSlot(slot)}
                />

                <div className="pt-6 border-t border-ivory-200 flex justify-between">
                  <Button variant="ghost" onClick={() => setStep(2)}>
                    <ChevronLeft className="w-4 h-4 mr-1.5" /> Back
                  </Button>
                  <Button
                    variant="primary"
                    disabled={!selectedSlot}
                    onClick={() => setStep(4)}
                  >
                    Review & Confirmation
                    <ChevronRight className="w-4 h-4 ml-1.5" />
                  </Button>
                </div>
              </div>
            )}

            {/* STEP 4: Review Quote & Confirmation */}
            {step === 4 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-serif font-bold text-charcoal-900">
                    Review and Confirm Appointment
                  </h2>
                  <p className="text-xs text-charcoal-600 mt-1">
                    Please verify your pet, treatment details, and appointment timing.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Left Column: Booking Particulars */}
                  <div className="space-y-4">
                    <div className="p-4 rounded-2xl bg-ivory-50 border border-ivory-200 space-y-3">
                      <div>
                        <span className="text-[11px] font-semibold text-charcoal-500 uppercase tracking-wider">
                          Companion:
                        </span>
                        <p className="text-sm font-bold font-serif text-charcoal-900">
                          {selectedPet?.name} ({selectedPet?.species === 'DOG' ? 'Dog' : 'Cat'}, {selectedPet?.sizeTier || 'Standard'})
                        </p>
                      </div>

                      <div>
                        <span className="text-[11px] font-semibold text-charcoal-500 uppercase tracking-wider">
                          Treatment:
                        </span>
                        <p className="text-sm font-bold font-serif text-charcoal-900">
                          {selectedService?.name}
                        </p>
                      </div>

                      {selectedSlot && (
                        <div>
                          <span className="text-[11px] font-semibold text-charcoal-500 uppercase tracking-wider">
                            Scheduled Time:
                          </span>
                          <p className="text-sm font-bold font-serif text-charcoal-900">
                            {new Date(selectedSlot.startsAt).toLocaleDateString('en-US', {
                              weekday: 'long',
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}{' '}
                            at{' '}
                            {new Date(selectedSlot.startsAt).toLocaleTimeString('en-US', {
                              hour: 'numeric',
                              minute: '2-digit',
                              hour12: true,
                              timeZone: 'UTC',
                            })}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Special Care Notes */}
                    <div>
                      <label className="block text-xs font-semibold text-charcoal-700 uppercase tracking-wider mb-1.5">
                        Special Instructions or Coat Notes (Optional)
                      </label>
                      <textarea
                        rows={3}
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="e.g. Sensitive around ears, please use low heat drying..."
                        className="w-full p-3 text-xs bg-ivory-50 border border-ivory-300 rounded-xl text-charcoal-900 placeholder:text-charcoal-400 focus:outline-none focus:ring-2 focus:ring-sage-500/30"
                      />
                    </div>
                  </div>

                  {/* Right Column: Server Price Breakdown */}
                  <div>
                    {quoteLoading ? (
                      <div className="p-8 text-center bg-ivory-50 rounded-2xl border border-ivory-200">
                        <Loader2 className="w-6 h-6 animate-spin text-sage-600 mx-auto mb-2" />
                        <p className="text-xs text-charcoal-600">Calculating server quote...</p>
                      </div>
                    ) : (
                      <PriceSummary
                        quote={quote || undefined}
                        petName={selectedPet?.name}
                        serviceName={selectedService?.name}
                      />
                    )}
                  </div>
                </div>

                {submitError && (
                  <div className="p-4 rounded-xl bg-peach-50 border border-peach-200 text-peach-900 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-peach-600 shrink-0" />
                    <span>{submitError}</span>
                  </div>
                )}

                <div className="pt-6 border-t border-ivory-200 flex justify-between items-center">
                  <Button variant="ghost" disabled={submitting} onClick={() => setStep(3)}>
                    <ChevronLeft className="w-4 h-4 mr-1.5" /> Back
                  </Button>

                  <Button
                    variant="primary"
                    size="lg"
                    disabled={submitting}
                    onClick={handleConfirmBooking}
                    className="shadow-xs"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        Confirming Reservation...
                      </>
                    ) : (
                      'Confirm Appointment'
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Container>
      </main>

      <Footer />
    </div>
  );
}
