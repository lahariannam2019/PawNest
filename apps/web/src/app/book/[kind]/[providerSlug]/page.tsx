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
import { DateRangePicker } from '@/components/booking/DateRangePicker';
import { useAuth } from '@/lib/auth/AuthContext';
import { apiFetch } from '@/lib/api/client';
import {
  PetSummary,
  ServiceSummary,
  ProviderSummary,
  BoardingUnitSummary,
  BoardingUnitAvailability,
  AvailabilitySlot,
  BookingPriceBreakdown,
  BookingKind,
  validateBoardingVaccines,
  VaccineCheckResult,
} from '@pawnest/shared';
import {
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Check,
  AlertCircle,
  Loader2,
  Calendar,
  ShieldAlert,
  ShieldCheck,
  Home,
  Clock,
  Heart,
  FileText,
} from 'lucide-react';

export default function BookingWizardPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();

  const kindParam = (params?.kind as string)?.toUpperCase();
  const kind = (kindParam === 'BOARDING' ? 'BOARDING' : 'GROOMING') as BookingKind;
  const isBoarding = kind === 'BOARDING';

  const providerSlug = params?.providerSlug as string;
  const preselectedServiceId = searchParams?.get('serviceId');
  const preselectedUnitId = searchParams?.get('unitId');

  // Wizard Step
  const [step, setStep] = useState<number>(1);

  // Data
  const [provider, setProvider] = useState<ProviderSummary | null>(null);
  const [services, setServices] = useState<ServiceSummary[]>([]);
  const [units, setUnits] = useState<BoardingUnitSummary[]>([]);
  const [pets, setPets] = useState<PetSummary[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(true);

  // Boarding Specific Selections
  const tomorrowStr = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  };
  const threeDaysLaterStr = () => {
    const d = new Date();
    d.setDate(d.getDate() + 4);
    return d.toISOString().split('T')[0];
  };

  const [checkIn, setCheckIn] = useState<string>(tomorrowStr());
  const [checkOut, setCheckOut] = useState<string>(threeDaysLaterStr());
  const [nights, setNights] = useState<number>(3);
  const [selectedUnit, setSelectedUnit] = useState<BoardingUnitSummary | null>(null);
  const [unitAvailabilities, setUnitAvailabilities] = useState<BoardingUnitAvailability[]>([]);
  const [loadingAvail, setLoadingAvail] = useState(false);

  // Grooming Specific Selections
  const [selectedService, setSelectedService] = useState<ServiceSummary | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<AvailabilitySlot | null>(null);

  // Shared Selections
  const [selectedPet, setSelectedPet] = useState<PetSummary | null>(null);
  const [selectedAddOnIds, setSelectedAddOnIds] = useState<string[]>([]);
  const [notes, setNotes] = useState<string>('');

  // Care Instructions (Boarding)
  const [feeding, setFeeding] = useState<string>('Morning and evening dry kibble with fresh water');
  const [medications, setMedications] = useState<string>('None');
  const [behaviour, setBehaviour] = useState<string>('Friendly with dogs, loves outdoor play');
  const [emergencyContact, setEmergencyContact] = useState<string>('');

  // Vaccine Validation (Boarding)
  const [vaccineCheck, setVaccineCheck] = useState<VaccineCheckResult>({
    valid: true,
    missingVaccines: [],
    expiringVaccines: [],
  });

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

  // Load Provider, Units, Services, and User's Pets
  useEffect(() => {
    if (!user) return;
    let mounted = true;

    Promise.all([
      apiFetch<{ provider: ProviderSummary; services: ServiceSummary[]; units?: BoardingUnitSummary[] }>(
        `/providers/${providerSlug}`
      ),
      apiFetch<{ items: PetSummary[] }>('/pets'),
    ])
      .then(([provData, petData]) => {
        if (!mounted) return;
        setProvider(provData.provider);
        setServices(provData.services || []);
        setUnits(provData.units || []);
        setPets(petData.items || []);

        // Default pet
        if (petData.items && petData.items.length > 0) {
          setSelectedPet(petData.items[0]);
        }

        // Auto-select unit if preselected
        if (provData.units && provData.units.length > 0) {
          const matchUnit = provData.units.find((u) => u.id === preselectedUnitId) || provData.units[0];
          setSelectedUnit(matchUnit);
        }

        // Auto-select service if passed
        if (preselectedServiceId && provData.services) {
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
  }, [user, providerSlug, preselectedServiceId, preselectedUnitId]);

  // Fetch Boarding Availability when checkIn/checkOut change
  useEffect(() => {
    if (!isBoarding || !provider || !checkIn || !checkOut) return;
    let mounted = true;
    setLoadingAvail(true);

    apiFetch<{ availability: BoardingUnitAvailability[] }>(
      `/providers/${provider.slug}/boarding-availability?checkIn=${checkIn}&checkOut=${checkOut}`
    )
      .then((data) => {
        if (mounted) {
          setUnitAvailabilities(data.availability || []);
        }
      })
      .catch((err) => {
        console.error('Failed to fetch boarding availability:', err);
      })
      .finally(() => {
        if (mounted) setLoadingAvail(false);
      });

    return () => {
      mounted = false;
    };
  }, [isBoarding, provider, checkIn, checkOut]);

  // Re-run Vaccine Validation when selectedPet or checkOut changes
  useEffect(() => {
    if (!isBoarding || !selectedPet) return;
    const checkOutDate = new Date(`${checkOut}T11:00:00Z`);
    const result = validateBoardingVaccines(
      selectedPet.species,
      selectedPet.vaccinations || [],
      checkOutDate
    );
    setVaccineCheck(result);
  }, [isBoarding, selectedPet, checkOut]);

  // Fetch Server Quote
  useEffect(() => {
    if (!selectedPet || !provider) return;
    if (isBoarding && (!selectedUnit || !checkIn || !checkOut)) return;
    if (!isBoarding && (!selectedService || !selectedSlot)) return;

    let mounted = true;
    setQuoteLoading(true);

    const payload: any = {
      petId: selectedPet.id,
      providerId: provider.id,
      kind,
      addOnIds: selectedAddOnIds,
    };

    if (isBoarding) {
      payload.boardingUnitId = selectedUnit!.id;
      payload.startsAt = new Date(`${checkIn}T14:00:00Z`).toISOString();
      payload.endsAt = new Date(`${checkOut}T11:00:00Z`).toISOString();
    } else {
      payload.serviceId = selectedService!.id;
      payload.startsAt = selectedSlot!.startsAt;
      payload.endsAt = selectedSlot!.endsAt;
    }

    apiFetch<{
      priceCents: number;
      currency: string;
      priceBreakdown: BookingPriceBreakdown;
      cancellationHours: number;
    }>('/bookings/quote', {
      method: 'POST',
      body: JSON.stringify(payload),
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
  }, [
    selectedPet,
    provider,
    isBoarding,
    selectedUnit,
    checkIn,
    checkOut,
    selectedService,
    selectedSlot,
    selectedAddOnIds,
    kind,
  ]);

  function handleToggleAddon(id: string) {
    setSelectedAddOnIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  }

  async function handleConfirmBooking() {
    if (!selectedPet || !provider) return;
    if (isBoarding && (!selectedUnit || !checkIn || !checkOut)) return;
    if (!isBoarding && (!selectedService || !selectedSlot)) return;

    setSubmitting(true);
    setSubmitError(null);

    const idempotencyKey = `bk-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    const bookingPayload: any = {
      petId: selectedPet.id,
      providerId: provider.id,
      kind,
      addOnIds: selectedAddOnIds,
      notes: notes.trim() || undefined,
    };

    if (isBoarding) {
      bookingPayload.boardingUnitId = selectedUnit!.id;
      bookingPayload.startsAt = new Date(`${checkIn}T14:00:00Z`).toISOString();
      bookingPayload.endsAt = new Date(`${checkOut}T11:00:00Z`).toISOString();
      bookingPayload.careInstructions = {
        feeding,
        medications,
        behaviour,
        emergencyContact: emergencyContact || user?.phone || user?.name || 'Owner',
      };
    } else {
      bookingPayload.serviceId = selectedService!.id;
      bookingPayload.startsAt = selectedSlot!.startsAt;
      bookingPayload.endsAt = selectedSlot!.endsAt;
    }

    try {
      const res = await apiFetch<{ id: string; reference: string }>('/bookings', {
        method: 'POST',
        headers: {
          'Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify(bookingPayload),
      });

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
          <p className="text-sm font-serif">Preparing reservation wizard...</p>
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
          <Link href={isBoarding ? '/boarding' : '/grooming'}>
            <Button variant="primary">Return to Directory</Button>
          </Link>
        </Container>
        <Footer />
      </div>
    );
  }

  const addOnServices = services.filter((s) => s.isAddOn);

  return (
    <div className="min-h-screen flex flex-col bg-ivory-100">
      <Header />

      <main className="flex-1 py-10 md:py-16">
        <Container className="max-w-4xl">
          {/* Header Bar */}
          <div className="mb-8">
            <Link
              href={`/${isBoarding ? 'boarding' : 'grooming'}/${provider.slug}`}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-charcoal-600 hover:text-sage-700 transition-colors mb-3"
            >
              <ChevronLeft className="w-4 h-4" /> Back to {provider.name}
            </Link>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h1 className="text-3xl font-serif font-bold text-charcoal-900">
                  {isBoarding ? 'Reserve Stay at' : 'Book with'} {provider.name}
                </h1>
                <p className="text-xs text-charcoal-500 mt-1">
                  {provider.addressLine}, {provider.city} · Interactive reservation
                </p>
              </div>

              <span className="inline-flex items-center gap-1 self-start sm:self-auto px-3 py-1 rounded-full text-xs font-semibold bg-peach-100 text-peach-700 border border-peach-200">
                <Sparkles className="w-3.5 h-3.5 text-peach-500" /> Demo Reservation
              </span>
            </div>
          </div>

          {/* Stepper Header */}
          <div className="mb-10 bg-white rounded-2xl p-4 border border-ivory-300 shadow-2xs">
            <div className="grid grid-cols-4 gap-2 text-center text-xs">
              {(isBoarding
                ? [
                    { s: 1, label: '1. Dates & Suite' },
                    { s: 2, label: '2. Pet & Vaccines' },
                    { s: 3, label: '3. Care Routine' },
                    { s: 4, label: '4. Summary' },
                  ]
                : [
                    { s: 1, label: '1. Pet Profile' },
                    { s: 2, label: '2. Treatment' },
                    { s: 3, label: '3. Date & Time' },
                    { s: 4, label: '4. Summary' },
                  ]
              ).map((item) => (
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
            {/* ============================================================== */}
            {/* BOARDING: STEP 1 (Dates & Suite Selection)                      */}
            {/* ============================================================== */}
            {isBoarding && step === 1 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-serif font-bold text-charcoal-900">
                    Select Stay Dates & Suite Tier
                  </h2>
                  <p className="text-xs text-charcoal-600 mt-1">
                    Check-in begins at 14:00. Check-out is 11:00 on your departure morning.
                  </p>
                </div>

                {/* Calendar Range Picker */}
                <DateRangePicker
                  checkIn={checkIn}
                  checkOut={checkOut}
                  onChange={({ checkIn: start, checkOut: end, nights: n }) => {
                    setCheckIn(start);
                    setCheckOut(end);
                    setNights(n);
                  }}
                />

                {/* Suite Options */}
                <div className="space-y-3 pt-2">
                  <h3 className="text-sm font-serif font-bold text-charcoal-900">
                    Choose Suite Type for {nights} {nights === 1 ? 'Night' : 'Nights'}
                  </h3>

                  {loadingAvail ? (
                    <div className="flex items-center justify-center py-10 text-charcoal-500 gap-2">
                      <Loader2 className="w-5 h-5 animate-spin text-sage-600" />
                      <span className="text-xs">Checking real-time suite inventory...</span>
                    </div>
                  ) : units.length === 0 ? (
                    <p className="text-xs text-charcoal-500">No suites configured for this retreat.</p>
                  ) : (
                    <div className="space-y-3">
                      {units.map((unit) => {
                        const avail = unitAvailabilities.find((a) => a.unit.id === unit.id);
                        const isAvailable = avail ? avail.available : true;
                        const isSelected = selectedUnit?.id === unit.id;

                        return (
                          <div
                            key={unit.id}
                            onClick={() => {
                              if (isAvailable) setSelectedUnit(unit);
                            }}
                            className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                              isSelected
                                ? 'border-sage-600 bg-sage-50/50 ring-2 ring-sage-600/20'
                                : isAvailable
                                ? 'border-ivory-300 hover:border-sage-400 bg-white'
                                : 'border-ivory-200 bg-ivory-50 opacity-60 cursor-not-allowed'
                            }`}
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-serif font-bold text-base text-charcoal-900">
                                  {unit.name}
                                </span>
                                {isAvailable ? (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-sage-100 text-sage-800">
                                    {avail ? `${avail.minRemaining} available` : 'Available'}
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-100 text-rose-800">
                                    Sold Out for Dates
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-charcoal-600 leading-relaxed max-w-lg">
                                {unit.description}
                              </p>
                              <div className="flex flex-wrap gap-1.5 pt-1">
                                {unit.amenities.map((am) => (
                                  <span
                                    key={am}
                                    className="px-1.5 py-0.5 text-[10px] rounded-md bg-ivory-100 text-charcoal-600"
                                  >
                                    {am}
                                  </span>
                                ))}
                              </div>
                            </div>

                            <div className="text-right shrink-0">
                              <div className="font-serif text-xl font-bold text-charcoal-900">
                                ${(unit.nightlyCents / 100).toFixed(0)}
                              </div>
                              <div className="text-[10px] text-charcoal-500">per night</div>
                              <div className="text-xs font-semibold text-sage-800 mt-1">
                                ${( (unit.nightlyCents * nights) / 100).toFixed(0)} total
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="pt-4 flex justify-end">
                  <Button
                    variant="primary"
                    disabled={!selectedUnit || nights < 1}
                    onClick={() => setStep(2)}
                  >
                    Continue to Pet & Vaccine Check
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}

            {/* ============================================================== */}
            {/* BOARDING: STEP 2 (Pet Selection & Live Vaccine Enforcement)     */}
            {/* ============================================================== */}
            {isBoarding && step === 2 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-serif font-bold text-charcoal-900">
                    Select Guest & Verify Vaccinations
                  </h2>
                  <p className="text-xs text-charcoal-600 mt-1">
                    To safeguard all boarding guests, core vaccines must be verified through departure date ({checkOut}).
                  </p>
                </div>

                <PetSelector
                  pets={pets}
                  selectedPetId={selectedPet?.id || undefined}
                  onSelectPet={(pet) => setSelectedPet(pet)}
                />

                {/* LIVE VACCINATION VERIFICATION BANNER */}
                {selectedPet && (
                  <div
                    className={`p-5 rounded-2xl border transition-all ${
                      vaccineCheck.valid
                        ? 'bg-sage-50/70 border-sage-200 text-sage-900'
                        : 'bg-amber-50/90 border-amber-300 text-amber-900'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {vaccineCheck.valid ? (
                        <ShieldCheck className="w-5 h-5 text-sage-700 shrink-0 mt-0.5" />
                      ) : (
                        <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                      )}

                      <div className="space-y-1.5 flex-1">
                        <div className="font-serif font-bold text-sm">
                          {vaccineCheck.valid
                            ? `Vaccination Clearance Verified for ${selectedPet.name}`
                            : `Boarding Vaccination Policy Action Required`}
                        </div>

                        {vaccineCheck.valid ? (
                          <p className="text-xs text-sage-800 leading-relaxed">
                            {selectedPet.name} has up-to-date Rabies, DHPP, and Bordetella records valid through your
                            stay until {checkOut}.
                          </p>
                        ) : (
                          <div className="space-y-2 text-xs">
                            <p className="leading-relaxed">
                              {selectedPet.name} does not currently meet PawNest boarding requirements through {checkOut}:
                            </p>
                            <ul className="list-disc list-inside space-y-0.5 font-medium">
                              {vaccineCheck.missingVaccines.map((v) => (
                                <li key={v} className="text-rose-700">
                                  Missing required vaccination: <strong>{v}</strong>
                                </li>
                              ))}
                              {vaccineCheck.expiringVaccines.map((v) => (
                                <li key={v.name} className="text-amber-800">
                                  <strong>{v.name}</strong> expires on {v.expiresOn} (before check-out)
                                </li>
                              ))}
                            </ul>
                            <div className="pt-2">
                              <Link
                                href={`/dashboard/pets/${selectedPet.id}`}
                                target="_blank"
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-600 text-white font-semibold text-xs hover:bg-amber-700 transition-colors shadow-2xs"
                              >
                                Update {selectedPet.name}’s Vaccinations in Dashboard ↗
                              </Link>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <div className="pt-4 flex items-center justify-between">
                  <Button variant="secondary" onClick={() => setStep(1)}>
                    <ChevronLeft className="w-4 h-4 mr-1" /> Back
                  </Button>
                  <Button
                    variant="primary"
                    disabled={!selectedPet || !vaccineCheck.valid}
                    onClick={() => setStep(3)}
                  >
                    Continue to Care Routine
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}

            {/* ============================================================== */}
            {/* BOARDING: STEP 3 (Care Instructions & Add-ons)                  */}
            {/* ============================================================== */}
            {isBoarding && step === 3 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-serif font-bold text-charcoal-900">
                    Care Routine & Add-on Services
                  </h2>
                  <p className="text-xs text-charcoal-600 mt-1">
                    Provide instructions to ensure your companion’s home routine is honoured seamlessly.
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-charcoal-700 mb-1">
                      Feeding Schedule & Food Brand
                    </label>
                    <input
                      type="text"
                      value={feeding}
                      onChange={(e) => setFeeding(e.target.value)}
                      placeholder="e.g. 2 cups Acana Pacifica at 8am and 6pm"
                      className="w-full px-4 py-2.5 rounded-xl border border-ivory-300 text-xs text-charcoal-900 focus:outline-none focus:ring-2 focus:ring-sage-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-charcoal-700 mb-1">
                      Medication Instructions (if any)
                    </label>
                    <input
                      type="text"
                      value={medications}
                      onChange={(e) => setMedications(e.target.value)}
                      placeholder="e.g. Apoquel 16mg in the morning with treat, or None"
                      className="w-full px-4 py-2.5 rounded-xl border border-ivory-300 text-xs text-charcoal-900 focus:outline-none focus:ring-2 focus:ring-sage-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-charcoal-700 mb-1">
                      Temperament, Fears & Quirks
                    </label>
                    <input
                      type="text"
                      value={behaviour}
                      onChange={(e) => setBehaviour(e.target.value)}
                      placeholder="e.g. Loves belly rubs, startled by sudden vacuum noises"
                      className="w-full px-4 py-2.5 rounded-xl border border-ivory-300 text-xs text-charcoal-900 focus:outline-none focus:ring-2 focus:ring-sage-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-charcoal-700 mb-1">
                      Emergency Contact Phone & Name
                    </label>
                    <input
                      type="text"
                      value={emergencyContact}
                      onChange={(e) => setEmergencyContact(e.target.value)}
                      placeholder="e.g. Maya Lin (+1 555-234-5678)"
                      className="w-full px-4 py-2.5 rounded-xl border border-ivory-300 text-xs text-charcoal-900 focus:outline-none focus:ring-2 focus:ring-sage-600"
                    />
                  </div>
                </div>

                {/* Add-ons selection */}
                {addOnServices.length > 0 && (
                  <div className="pt-4 border-t border-ivory-200 space-y-3">
                    <h3 className="text-sm font-serif font-bold text-charcoal-900">
                      Optional Retreat Add-ons
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {addOnServices.map((addon) => {
                        const isSelected = selectedAddOnIds.includes(addon.id);
                        return (
                          <div
                            key={addon.id}
                            onClick={() => handleToggleAddon(addon.id)}
                            className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                              isSelected
                                ? 'bg-sage-50 border-sage-600 ring-2 ring-sage-600/20'
                                : 'bg-white border-ivory-300 hover:border-sage-300'
                            }`}
                          >
                            <div>
                              <div className="font-serif font-bold text-xs text-charcoal-900">
                                {addon.name}
                              </div>
                              <p className="text-[11px] text-charcoal-500 line-clamp-1">{addon.description}</p>
                            </div>
                            <div className="text-right shrink-0">
                              <span className="font-serif font-bold text-xs text-charcoal-900">
                                +${(addon.basePriceCents / 100).toFixed(0)}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="pt-4 flex items-center justify-between">
                  <Button variant="secondary" onClick={() => setStep(2)}>
                    <ChevronLeft className="w-4 h-4 mr-1" /> Back
                  </Button>
                  <Button variant="primary" onClick={() => setStep(4)}>
                    Review & Confirm Stay
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}

            {/* ============================================================== */}
            {/* BOARDING: STEP 4 (Summary & Submit)                             */}
            {/* ============================================================== */}
            {isBoarding && step === 4 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-serif font-bold text-charcoal-900">
                    Review Your Reservation Details
                  </h2>
                  <p className="text-xs text-charcoal-600 mt-1">
                    Please confirm your companion’s stay details and retreat policies below.
                  </p>
                </div>

                {submitError && (
                  <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{submitError}</span>
                  </div>
                )}

                {/* Reservation Summary Card */}
                <div className="p-5 rounded-2xl bg-ivory-50/80 border border-ivory-300 space-y-4 text-xs">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pb-4 border-b border-ivory-200">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-charcoal-400">Guest</span>
                      <p className="font-serif font-bold text-sm text-charcoal-900">{selectedPet?.name}</p>
                      <p className="text-charcoal-500 text-[11px]">{selectedPet?.breed || 'Dog'}</p>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-charcoal-400">Suite</span>
                      <p className="font-serif font-bold text-sm text-charcoal-900">{selectedUnit?.name}</p>
                      <p className="text-charcoal-500 text-[11px]">{provider.name}</p>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-charcoal-400">Stay Duration</span>
                      <p className="font-serif font-bold text-sm text-charcoal-900">{nights} Nights</p>
                      <p className="text-charcoal-500 text-[11px]">{checkIn} → {checkOut}</p>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-charcoal-400">Health Standard</span>
                      <p className="font-semibold text-sage-800 flex items-center gap-1">
                        <Check className="w-3.5 h-3.5 text-sage-600" /> Rabies, DHPP, Bordetella
                      </p>
                    </div>
                  </div>

                  {/* Pricing Breakdown */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex justify-between text-charcoal-600">
                      <span>{selectedUnit?.name} ({nights} nights × ${(selectedUnit ? selectedUnit.nightlyCents / 100 : 0).toFixed(0)})</span>
                      <span>${(quote ? quote.priceBreakdown.baseCents / 100 : (selectedUnit ? selectedUnit.nightlyCents * nights / 100 : 0)).toFixed(2)}</span>
                    </div>

                    {quote && quote.priceBreakdown.addOns && quote.priceBreakdown.addOns.length > 0 && (
                      <div className="space-y-1 pt-1 border-t border-ivory-200/60">
                        {quote.priceBreakdown.addOns.map((ad) => (
                          <div key={ad.id} className="flex justify-between text-charcoal-600 text-[11px]">
                            <span>+ {ad.name}</span>
                            <span>${(ad.priceCents / 100).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex justify-between text-sm font-serif font-bold text-charcoal-900 pt-2 border-t border-ivory-300">
                      <span>Total Reservation Estimate</span>
                      <span>${(quote ? quote.priceCents / 100 : (selectedUnit ? selectedUnit.nightlyCents * nights / 100 : 0)).toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Cancellation Policy */}
                <div className="p-4 rounded-2xl bg-white border border-ivory-300 text-xs text-charcoal-600 space-y-1">
                  <div className="font-bold text-charcoal-900 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-sage-700" />
                    Flexible Cancellation Guarantee
                  </div>
                  <p>
                    Free cancellation up to {provider.cancellationHours || 24} hours before check-in. In demo mode, no credit card is charged.
                  </p>
                </div>

                <div className="pt-4 flex items-center justify-between">
                  <Button variant="secondary" onClick={() => setStep(3)}>
                    <ChevronLeft className="w-4 h-4 mr-1" /> Back
                  </Button>
                  <Button
                    variant="primary"
                    disabled={submitting}
                    onClick={handleConfirmBooking}
                    className="px-6 py-3"
                  >
                    {submitting ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" /> Confirming Reservation...
                      </span>
                    ) : (
                      'Confirm Boarding Reservation'
                    )}
                  </Button>
                </div>
              </div>
            )}

            {/* ============================================================== */}
            {/* GROOMING FLOW (Fallback for non-boarding)                       */}
            {/* ============================================================== */}
            {!isBoarding && step === 1 && (
              <div className="space-y-4">
                <h2 className="text-xl font-serif font-bold text-charcoal-900">Who are we styling today?</h2>
                <PetSelector
                  pets={pets}
                  selectedPetId={selectedPet?.id || undefined}
                  onSelectPet={(pet) => setSelectedPet(pet)}
                />
                <div className="pt-4 flex justify-end">
                  <Button variant="primary" disabled={!selectedPet} onClick={() => setStep(2)}>
                    Continue <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}

            {!isBoarding && step === 2 && (
              <div className="space-y-4">
                <h2 className="text-xl font-serif font-bold text-charcoal-900">Choose Service</h2>
                <div className="space-y-2">
                  {services.filter((s) => !s.isAddOn).map((s) => (
                    <div
                      key={s.id}
                      onClick={() => setSelectedService(s)}
                      className={`p-4 rounded-2xl border cursor-pointer flex justify-between ${
                        selectedService?.id === s.id ? 'border-sage-600 bg-sage-50' : 'border-ivory-300 bg-white'
                      }`}
                    >
                      <div>
                        <div className="font-serif font-bold">{s.name}</div>
                        <p className="text-xs text-charcoal-600">{s.description}</p>
                      </div>
                      <div className="font-serif font-bold">${(s.basePriceCents / 100).toFixed(0)}</div>
                    </div>
                  ))}
                </div>
                <div className="pt-4 flex justify-between">
                  <Button variant="secondary" onClick={() => setStep(1)}>Back</Button>
                  <Button variant="primary" disabled={!selectedService} onClick={() => setStep(3)}>Continue</Button>
                </div>
              </div>
            )}

            {!isBoarding && step === 3 && (
              <div className="space-y-4">
                <h2 className="text-xl font-serif font-bold text-charcoal-900">Select Date & Slot</h2>
                {selectedService && (
                  <SlotPicker
                    providerSlug={provider.slug}
                    serviceId={selectedService.id}
                    selectedSlot={selectedSlot || undefined}
                    onSelectSlot={setSelectedSlot}
                  />
                )}
                <div className="pt-4 flex justify-between">
                  <Button variant="secondary" onClick={() => setStep(2)}>Back</Button>
                  <Button variant="primary" disabled={!selectedSlot} onClick={() => setStep(4)}>Continue</Button>
                </div>
              </div>
            )}

            {!isBoarding && step === 4 && (
              <div className="space-y-4">
                <h2 className="text-xl font-serif font-bold text-charcoal-900">Confirm Booking</h2>
                {submitError && <div className="p-3 bg-rose-50 text-rose-800 text-xs rounded-xl">{submitError}</div>}
                <div className="p-4 bg-ivory-50 rounded-2xl border border-ivory-300">
                  <p><strong>Service:</strong> {selectedService?.name}</p>
                  <p><strong>Pet:</strong> {selectedPet?.name}</p>
                  <p><strong>Starts:</strong> {selectedSlot?.startsAt}</p>
                </div>
                <div className="pt-4 flex justify-between">
                  <Button variant="secondary" onClick={() => setStep(3)}>Back</Button>
                  <Button variant="primary" disabled={submitting} onClick={handleConfirmBooking}>
                    {submitting ? 'Confirming...' : 'Confirm Grooming Booking'}
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
