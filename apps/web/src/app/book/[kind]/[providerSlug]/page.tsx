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
  STANDARD_VET_VISIT_TYPES,
  VET_SYMPTOM_OPTIONS,
  EMERGENCY_DISCLAIMER_TEXT,
} from '@pawnest/shared';
import {
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Check,
  AlertCircle,
  AlertTriangle,
  Loader2,
  Calendar,
  ShieldAlert,
  ShieldCheck,
  Home,
  Clock,
  Heart,
  FileText,
  Stethoscope,
  Activity,
  Syringe,
  Info,
  PhoneCall,
  Scissors,
} from 'lucide-react';

export default function BookingWizardPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();

  const kindParam = (params?.kind as string)?.toUpperCase();
  const kind = (kindParam === 'BOARDING' ? 'BOARDING' : kindParam === 'VET' ? 'VET' : 'GROOMING') as BookingKind;
  const isBoarding = kind === 'BOARDING';
  const isVet = kind === 'VET';
  const isGrooming = !isBoarding && !isVet;

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

  // Grooming & Vet Specific Selections
  const [selectedService, setSelectedService] = useState<ServiceSummary | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<AvailabilitySlot | null>(null);

  // Veterinary Specific Selections
  const [visitType, setVisitType] = useState<string>('WELLNESS');
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [reason, setReason] = useState<string>('Routine preventive examination and health screening');
  const [emergencyAcknowledged, setEmergencyAcknowledged] = useState<boolean>(false);

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
        if (provData.services && provData.services.length > 0) {
          const match = preselectedServiceId
            ? provData.services.find((s) => s.id === preselectedServiceId)
            : provData.services.find((s) => !s.isAddOn);
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

    apiFetch<{ units: BoardingUnitAvailability[] }>(
      `/providers/${provider.slug}/boarding-availability?checkIn=${checkIn}&checkOut=${checkOut}&petCount=1`
    )
      .then((data) => {
        if (mounted) {
          setUnitAvailabilities(data.units || []);
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

  // Live Vaccination Check whenever pet or checkOut changes
  useEffect(() => {
    if (!isBoarding || !selectedPet || !checkOut) return;
    const res = validateBoardingVaccines(selectedPet.species, selectedPet.vaccinations || [], checkOut);
    setVaccineCheck(res);
  }, [isBoarding, selectedPet, checkOut]);

  // Quote Calculation
  useEffect(() => {
    if (!selectedPet || !provider) return;
    if (isBoarding && (!selectedUnit || !checkIn || !checkOut)) return;
    if (!isBoarding && (!selectedService || !selectedSlot)) return;

    let mounted = true;
    setQuoteLoading(true);

    const startsAt = isBoarding
      ? new Date(`${checkIn}T14:00:00Z`).toISOString()
      : selectedSlot!.startsAt;
    const endsAt = isBoarding
      ? new Date(`${checkOut}T11:00:00Z`).toISOString()
      : selectedSlot!.endsAt;

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
        kind,
        serviceId: isBoarding ? undefined : selectedService?.id,
        boardingUnitId: isBoarding ? selectedUnit?.id : undefined,
        startsAt,
        endsAt,
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

  function handleToggleSymptom(symptom: string) {
    setSymptoms((prev) =>
      prev.includes(symptom) ? prev.filter((item) => item !== symptom) : [...prev, symptom]
    );
  }

  async function handleConfirmBooking() {
    if (!selectedPet || !provider) return;
    if (isBoarding && (!selectedUnit || !checkIn || !checkOut)) return;
    if (!isBoarding && (!selectedService || !selectedSlot)) return;

    if (isVet) {
      if (!emergencyAcknowledged) {
        setSubmitError('You must acknowledge the emergency care disclaimer before scheduling your appointment.');
        return;
      }
      if (!reason.trim()) {
        setSubmitError('Please provide a primary reason or description of your visit.');
        return;
      }
    }

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

      if (isVet) {
        bookingPayload.visitType = visitType;
        bookingPayload.symptoms = symptoms;
        bookingPayload.reason = reason.trim();
        bookingPayload.emergencyAcknowledged = emergencyAcknowledged;
      }
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

  if (authLoading || (!user && !authLoading) || loadingInitial) {
    return (
      <div className="min-h-screen flex flex-col bg-ivory-100">
        <Header />
        <div className="flex-1 flex flex-col items-center justify-center py-20 text-charcoal-500">
          <Loader2 className="w-8 h-8 animate-spin text-sage-600 mb-3" />
          <p className="text-sm font-serif">
            {!user && !authLoading ? 'Redirecting to sign-in to reserve appointment...' : 'Preparing reservation wizard...'}
          </p>
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
          <Link href={isBoarding ? '/boarding' : isVet ? '/vet' : '/grooming'}>
            <Button variant="primary">Return to Directory</Button>
          </Link>
        </Container>
        <Footer />
      </div>
    );
  }

  const addOnServices = services.filter((s) => s.isAddOn);
  const primaryServices = services.filter((s) => !s.isAddOn);
  const availableSymptoms = selectedPet?.species === 'CAT' ? VET_SYMPTOM_OPTIONS.CAT : VET_SYMPTOM_OPTIONS.DOG;

  return (
    <div className="min-h-screen flex flex-col bg-ivory-100">
      <Header />

      <main className="flex-1 py-10 md:py-16">
        <Container className="max-w-4xl">
          {/* Header Bar */}
          <div className="mb-8">
            <Link
              href={`/${isBoarding ? 'boarding' : isVet ? 'vet' : 'grooming'}/${provider.slug}`}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-charcoal-600 hover:text-sage-700 transition-colors mb-3"
            >
              <ChevronLeft className="w-4 h-4" /> Back to {provider.name}
            </Link>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h1 className="text-3xl font-serif font-bold text-charcoal-900">
                  {isBoarding
                    ? `Reserve Stay at ${provider.name}`
                    : isVet
                    ? `Schedule Visit with ${provider.name}`
                    : `Book with ${provider.name}`}
                </h1>
                <p className="text-xs text-charcoal-500 mt-1">
                  {provider.addressLine}, {provider.city} · Interactive appointment wizard
                </p>
              </div>

              <span className="inline-flex items-center gap-1 self-start sm:self-auto px-3 py-1 rounded-full text-xs font-semibold bg-peach-100 text-peach-700 border border-peach-200">
                <Sparkles className="w-3.5 h-3.5 text-peach-500" /> Demo Reservation
              </span>
            </div>
          </div>

          {/* Persistent Emergency Warning for Vet Mode */}
          {isVet && (
            <div className="mb-8 p-4 rounded-2xl bg-amber-50/90 border border-amber-200 text-amber-950 flex items-start gap-3 text-xs leading-relaxed shadow-2xs">
              <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <strong className="text-amber-900 uppercase tracking-tight text-[11px] block">
                  Routine Care & Scheduled Visits Only
                </strong>
                <span>
                  {EMERGENCY_DISCLAIMER_TEXT} If your companion has severe respiratory distress, acute bloat, or sudden trauma, transport them to the nearest 24/7 animal emergency hospital immediately.
                </span>
              </div>
            </div>
          )}

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
                : isVet
                ? [
                    { s: 1, label: '1. Patient Profile' },
                    { s: 2, label: '2. Clinical Intake' },
                    { s: 3, label: '3. Doctor Slot' },
                    { s: 4, label: '4. Review & Triage' },
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

                <DateRangePicker
                  checkIn={checkIn}
                  checkOut={checkOut}
                  onChange={({ checkIn: start, checkOut: end, nights: n }) => {
                    setCheckIn(start);
                    setCheckOut(end);
                    setNights(n);
                  }}
                />

                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-serif font-bold text-sm text-charcoal-900">
                      Available Private Suites ({nights} nights)
                    </h3>
                    {loadingAvail && (
                      <span className="text-xs text-sage-700 flex items-center gap-1">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Verifying capacity...
                      </span>
                    )}
                  </div>

                  {units.length === 0 ? (
                    <p className="text-xs text-charcoal-500 italic">No boarding suites registered for this facility.</p>
                  ) : (
                    <div className="grid grid-cols-1 gap-3">
                      {units.map((unit) => {
                        const avail = unitAvailabilities.find((a) => a.unit.id === unit.id);
                        const isAvailable = avail ? avail.available : true;
                        const minRemaining = avail?.minRemaining ?? unit.capacity;
                        const isSelected = selectedUnit?.id === unit.id;

                        return (
                          <div
                            key={unit.id}
                            onClick={() => isAvailable && setSelectedUnit(unit)}
                            className={`p-4 rounded-2xl border transition-all flex items-start justify-between gap-4 ${
                              !isAvailable
                                ? 'opacity-50 bg-ivory-100 border-ivory-300 cursor-not-allowed'
                                : isSelected
                                ? 'border-sage-600 bg-sage-50/70 ring-2 ring-sage-600/20 cursor-pointer shadow-xs'
                                : 'border-ivory-300 bg-white hover:border-sage-300 cursor-pointer'
                            }`}
                          >
                            <div className="space-y-1 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-serif font-bold text-base text-charcoal-900">
                                  {unit.name}
                                </span>
                                {isAvailable ? (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-sage-100 text-sage-800">
                                    {minRemaining} suite{minRemaining > 1 ? 's' : ''} left
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-100 text-rose-800">
                                    Fully Reserved
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
            {/* VETERINARY: STEP 1 (Patient Selection & Health Background)      */}
            {/* ============================================================== */}
            {isVet && step === 1 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-serif font-bold text-charcoal-900">
                    Select Patient & Review Medical History
                  </h2>
                  <p className="text-xs text-charcoal-600 mt-1">
                    Select which companion will be examined. Existing health notes, known allergies, and vaccination history will be pre-filled.
                  </p>
                </div>

                <PetSelector
                  pets={pets}
                  selectedPetId={selectedPet?.id || undefined}
                  onSelectPet={(pet) => setSelectedPet(pet)}
                />

                {/* Patient Health Summary Card */}
                {selectedPet && (
                  <div className="p-5 rounded-2xl bg-sage-50/70 border border-sage-200 text-xs text-sage-950 space-y-3">
                    <div className="flex items-center justify-between border-b border-sage-200/60 pb-2">
                      <span className="font-serif font-bold text-sm text-sage-900 flex items-center gap-1.5">
                        <Heart className="w-4 h-4 text-sage-600" /> Patient Profile Context: {selectedPet.name}
                      </span>
                      <span className="text-[11px] font-semibold text-sage-800">
                        {selectedPet.species === 'DOG' ? 'Canine' : 'Feline'} · {selectedPet.breed || 'Mixed'}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-sage-700 block mb-0.5">Known Allergies</span>
                        <p className="text-sage-900 font-medium">
                          {selectedPet.allergies && selectedPet.allergies.length > 0
                            ? selectedPet.allergies.join(', ')
                            : 'None recorded'}
                        </p>
                      </div>

                      <div>
                        <span className="text-[10px] uppercase font-bold text-sage-700 block mb-0.5">Chronic Conditions</span>
                        <p className="text-sage-900 font-medium">
                          {selectedPet.conditions && selectedPet.conditions.length > 0
                            ? selectedPet.conditions.join(', ')
                            : 'None recorded'}
                        </p>
                      </div>

                      <div>
                        <span className="text-[10px] uppercase font-bold text-sage-700 block mb-0.5">Current Medications</span>
                        <p className="text-sage-900 font-medium">
                          {selectedPet.medications && selectedPet.medications.length > 0
                            ? selectedPet.medications.join(', ')
                            : 'None recorded'}
                        </p>
                      </div>
                    </div>

                    {selectedPet.vaccinations && selectedPet.vaccinations.length > 0 && (
                      <div className="pt-2 border-t border-sage-200/60">
                        <span className="text-[10px] uppercase font-bold text-sage-700 block mb-1">
                          Active Vaccinations on File
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {selectedPet.vaccinations.map((vac) => (
                            <span
                              key={vac.id}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white border border-sage-300 text-[11px] text-sage-900 font-medium"
                            >
                              <ShieldCheck className="w-3 h-3 text-sage-600" />
                              {vac.name} (Valid to {vac.expiresOn ? new Date(vac.expiresOn).toLocaleDateString() : 'Active'})
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="pt-4 flex justify-end">
                  <Button variant="primary" disabled={!selectedPet} onClick={() => setStep(2)}>
                    Continue to Clinical Intake <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}

            {/* ============================================================== */}
            {/* VETERINARY: STEP 2 (Clinical Intake & Symptoms Checklist)       */}
            {/* ============================================================== */}
            {isVet && step === 2 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-serif font-bold text-charcoal-900">
                    Consultation Type & Medical Observations
                  </h2>
                  <p className="text-xs text-charcoal-600 mt-1">
                    Select your visit reason and any observations to help your veterinarian prepare appropriate exam protocols.
                  </p>
                </div>

                {/* Safety Advisory Banner */}
                <div className="p-3.5 rounded-xl bg-ivory-100 border border-ivory-300 text-charcoal-700 flex items-start gap-2.5 text-xs">
                  <Info className="w-4 h-4 text-sage-600 shrink-0 mt-0.5" />
                  <p>
                    <strong>Non-Diagnostic Notice:</strong> This symptom intake form is strictly for preparatory triage and scheduling. A licensed veterinarian will perform a physical nose-to-tail clinical examination in person.
                  </p>
                </div>

                {/* Visit Type Selector */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-charcoal-700">
                    Visit Category
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {[
                      { code: 'WELLNESS', label: 'Wellness Exam', icon: Heart },
                      { code: 'VACCINATION', label: 'Booster Vaccines', icon: Syringe },
                      { code: 'SICK_PET', label: 'Sick Consultation', icon: Activity },
                      { code: 'DENTAL', label: 'Dental Staging', icon: Sparkles },
                      { code: 'FOLLOW_UP', label: 'Follow-up Check', icon: Stethoscope },
                    ].map((vt) => {
                      const Icon = vt.icon;
                      const isSelected = visitType === vt.code;
                      return (
                        <button
                          key={vt.code}
                          type="button"
                          onClick={() => setVisitType(vt.code)}
                          className={`p-3 rounded-xl border text-center transition-all flex flex-col items-center gap-1.5 ${
                            isSelected
                              ? 'bg-sage-600 text-white border-sage-600 font-semibold shadow-xs'
                              : 'bg-white border-ivory-300 text-charcoal-700 hover:border-sage-300'
                          }`}
                        >
                          <Icon className={`w-4 h-4 ${isSelected ? 'text-white' : 'text-sage-600'}`} />
                          <span className="text-[11px] leading-tight">{vt.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Consultation Service Selection */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-charcoal-700">
                    Select Examination Service
                  </label>
                  <div className="space-y-2">
                    {primaryServices.map((s) => (
                      <div
                        key={s.id}
                        onClick={() => setSelectedService(s)}
                        className={`p-4 rounded-2xl border cursor-pointer flex items-center justify-between gap-4 transition-all ${
                          selectedService?.id === s.id
                            ? 'border-sage-600 bg-sage-50/70 ring-2 ring-sage-600/20'
                            : 'border-ivory-300 bg-white hover:border-sage-300'
                        }`}
                      >
                        <div>
                          <div className="font-serif font-bold text-sm text-charcoal-900">{s.name}</div>
                          <p className="text-xs text-charcoal-600 max-w-lg mt-0.5">{s.description}</p>
                          <span className="text-[11px] text-charcoal-400 mt-1 inline-block">
                            Estimated examination duration: {s.durationMin} minutes
                          </span>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="font-serif font-bold text-lg text-charcoal-900">
                            ${(s.basePriceCents / 100).toFixed(0)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Species-Specific Symptom Checklist */}
                <div className="space-y-2 pt-2 border-t border-ivory-200">
                  <label className="block text-xs font-bold uppercase tracking-wider text-charcoal-700">
                    Observed Symptoms or Triage Indicators ({selectedPet?.name})
                  </label>
                  <p className="text-[11px] text-charcoal-500">
                    Select any symptoms observed in recent days to alert the doctor.
                  </p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {availableSymptoms.map((symp) => {
                      const isSelected = symptoms.includes(symp);
                      return (
                        <button
                          key={symp}
                          type="button"
                          onClick={() => handleToggleSymptom(symp)}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                            isSelected
                              ? 'bg-amber-100 text-amber-900 border border-amber-300 font-semibold'
                              : 'bg-white text-charcoal-700 border border-ivory-300 hover:border-charcoal-400'
                          }`}
                        >
                          {isSelected ? '✓ ' : '+ '}
                          {symp}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Primary Reason / Description */}
                <div className="space-y-2 pt-2 border-t border-ivory-200">
                  <label className="block text-xs font-bold uppercase tracking-wider text-charcoal-700">
                    Primary Reason for Visit & Detailed Notes <span className="text-rose-600">*</span>
                  </label>
                  <textarea
                    rows={3}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Describe what you have noticed, when it started, changes in appetite, or specific questions for the doctor..."
                    className="w-full px-4 py-2.5 rounded-xl border border-ivory-300 text-xs text-charcoal-900 focus:outline-none focus:ring-2 focus:ring-sage-600"
                  />
                </div>

                {/* Add-on Diagnostics */}
                {addOnServices.length > 0 && (
                  <div className="pt-2 border-t border-ivory-200 space-y-3">
                    <label className="block text-xs font-bold uppercase tracking-wider text-charcoal-700">
                      Optional In-House Diagnostics & Tests
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {addOnServices.map((addon) => {
                        const isSelected = selectedAddOnIds.includes(addon.id);
                        return (
                          <div
                            key={addon.id}
                            onClick={() => handleToggleAddon(addon.id)}
                            className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                              isSelected
                                ? 'bg-sage-50 border-sage-600 ring-2 ring-sage-600/20'
                                : 'bg-white border-ivory-300 hover:border-sage-300'
                            }`}
                          >
                            <div>
                              <div className="font-semibold text-xs text-charcoal-900">{addon.name}</div>
                              <p className="text-[10px] text-charcoal-500 mt-0.5 line-clamp-2">{addon.description}</p>
                            </div>
                            <div className="text-right">
                              <span className="font-bold text-xs text-charcoal-900">
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
                  <Button variant="secondary" onClick={() => setStep(1)}>
                    <ChevronLeft className="w-4 h-4 mr-1" /> Back
                  </Button>
                  <Button
                    variant="primary"
                    disabled={!selectedService || !reason.trim()}
                    onClick={() => setStep(3)}
                  >
                    Select Doctor Slot <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}

            {/* ============================================================== */}
            {/* VETERINARY / GROOMING: STEP 3 (Date & Slot Selection)           */}
            {/* ============================================================== */}
            {!isBoarding && step === 3 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-serif font-bold text-charcoal-900">
                    {isVet ? 'Select Doctor Examination Time' : 'Select Treatment Slot'}
                  </h2>
                  <p className="text-xs text-charcoal-600 mt-1">
                    {isVet
                      ? 'Available appointments are generated in real-time according to clinical operating hours.'
                      : 'Choose your preferred date and treatment window.'}
                  </p>
                </div>

                {selectedService && (
                  <SlotPicker
                    providerSlug={provider.slug}
                    serviceId={selectedService.id}
                    selectedSlot={selectedSlot || undefined}
                    onSelectSlot={setSelectedSlot}
                  />
                )}

                <div className="pt-4 flex items-center justify-between">
                  <Button variant="secondary" onClick={() => setStep(2)}>
                    <ChevronLeft className="w-4 h-4 mr-1" /> Back
                  </Button>
                  <Button
                    variant="primary"
                    disabled={!selectedSlot}
                    onClick={() => setStep(4)}
                  >
                    Review Appointment <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}

            {/* ============================================================== */}
            {/* VETERINARY: STEP 4 (Emergency Disclaimer & Confirmation)        */}
            {/* ============================================================== */}
            {isVet && step === 4 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-serif font-bold text-charcoal-900">
                    Review Veterinary Appointment & Medical Disclaimer
                  </h2>
                  <p className="text-xs text-charcoal-600 mt-1">
                    Please verify your pet’s clinical consultation details and complete the emergency triage acknowledgement.
                  </p>
                </div>

                {submitError && (
                  <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{submitError}</span>
                  </div>
                )}

                {/* Appointment Particulars Card */}
                <div className="p-5 rounded-2xl bg-ivory-50/80 border border-ivory-300 space-y-4 text-xs">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pb-4 border-b border-ivory-200">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-charcoal-400">Patient</span>
                      <p className="font-serif font-bold text-sm text-charcoal-900">{selectedPet?.name}</p>
                      <p className="text-charcoal-500 text-[11px]">{selectedPet?.breed || 'Pet'}</p>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-charcoal-400">Clinic</span>
                      <p className="font-serif font-bold text-sm text-charcoal-900">{provider.name}</p>
                      <p className="text-charcoal-500 text-[11px]">{provider.city}</p>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-charcoal-400">Appointment</span>
                      <p className="font-serif font-bold text-sm text-charcoal-900">
                        {selectedSlot &&
                          new Date(selectedSlot.startsAt).toLocaleDateString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                          })}
                      </p>
                      <p className="text-charcoal-500 text-[11px]">
                        {selectedSlot &&
                          new Date(selectedSlot.startsAt).toLocaleTimeString('en-US', {
                            hour: 'numeric',
                            minute: '2-digit',
                            hour12: true,
                            timeZone: 'UTC',
                          })}
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-charcoal-400">Visit Category</span>
                      <p className="font-serif font-bold text-sm text-sage-900">{visitType}</p>
                      <p className="text-charcoal-500 text-[11px]">{selectedService?.name}</p>
                    </div>
                  </div>

                  {/* Symptoms & Reason Review */}
                  <div className="space-y-2 pt-1 pb-3 border-b border-ivory-200">
                    <span className="text-[10px] uppercase font-bold text-charcoal-400">Reported Observations</span>
                    {symptoms.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {symptoms.map((s) => (
                          <span key={s} className="px-2 py-0.5 rounded bg-amber-100/70 text-amber-900 text-[11px] font-medium">
                            {s}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-charcoal-500 text-[11px]">Routine checkup without acute symptom flags.</p>
                    )}
                    <p className="text-xs text-charcoal-700 italic pt-1">
                      &ldquo;{reason}&rdquo;
                    </p>
                  </div>

                  {/* Pricing Breakdown */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex justify-between text-charcoal-600">
                      <span>{selectedService?.name}</span>
                      <span>${(quote ? quote.priceBreakdown.baseCents / 100 : (selectedService?.basePriceCents || 0) / 100).toFixed(2)}</span>
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
                      <span>Total Consultation & Diagnostics</span>
                      <span>${(quote ? quote.priceCents / 100 : (selectedService?.basePriceCents || 0) / 100).toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* MANDATORY EMERGENCY DISCLAIMER CHECKBOX */}
                <div className="p-5 rounded-2xl bg-amber-50/90 border-2 border-amber-300 text-amber-950 space-y-3">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                    <div className="space-y-1 text-xs">
                      <strong className="text-amber-900 font-serif text-sm block">
                        Mandatory Emergency Care Disclaimer & Acknowledgement
                      </strong>
                      <p className="text-amber-900/90 leading-relaxed">
                        {EMERGENCY_DISCLAIMER_TEXT} PawNest does not diagnose pet illnesses online and is not an emergency response service.
                      </p>
                    </div>
                  </div>

                  <label className="flex items-start gap-3 pt-2 border-t border-amber-200 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={emergencyAcknowledged}
                      onChange={(e) => setEmergencyAcknowledged(e.target.checked)}
                      className="mt-1 w-4 h-4 rounded border-amber-400 text-sage-600 focus:ring-sage-500 shrink-0"
                    />
                    <span className="text-xs text-amber-950 font-medium leading-snug">
                      I understand and acknowledge that this booking is strictly for scheduled routine or non-emergency veterinary care. If my pet experiences acute respiratory distress, severe trauma, collapsed state, bloat, or life-threatening symptoms, I will take them to an emergency veterinary clinic immediately.
                    </span>
                  </label>
                </div>

                <div className="pt-4 flex items-center justify-between">
                  <Button variant="secondary" onClick={() => setStep(3)}>
                    <ChevronLeft className="w-4 h-4 mr-1" /> Back
                  </Button>
                  <Button
                    variant="primary"
                    disabled={submitting || !emergencyAcknowledged}
                    onClick={handleConfirmBooking}
                    className="px-6 py-3 font-semibold"
                  >
                    {submitting ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" /> Scheduling Appointment...
                      </span>
                    ) : (
                      'Confirm Veterinary Appointment'
                    )}
                  </Button>
                </div>
              </div>
            )}

            {/* ============================================================== */}
            {/* GROOMING: STEP 1 (Pet Selection)                               */}
            {/* ============================================================== */}
            {isGrooming && step === 1 && (
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

            {/* ============================================================== */}
            {/* GROOMING: STEP 2 (Treatment & Add-on Selection)                 */}
            {/* ============================================================== */}
            {isGrooming && step === 2 && (() => {
              const groomingPrimary = services
                .filter((s) => !s.isAddOn)
                .filter((s) => !selectedPet || !s.species || s.species.length === 0 || s.species.includes(selectedPet.species));
              const groomingAddOns = services
                .filter((s) => s.isAddOn)
                .filter((s) => !selectedPet || !s.species || s.species.length === 0 || s.species.includes(selectedPet.species));

              return (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-serif font-bold text-charcoal-900">Choose Treatment & Coat Care</h2>
                    <p className="text-xs text-charcoal-600 mt-1">
                      Showing treatments tailored for {selectedPet?.name} ({selectedPet?.species === 'CAT' ? 'Feline' : 'Canine'} · {selectedPet?.breed || 'Pet'}).
                    </p>
                  </div>

                  {groomingPrimary.length === 0 ? (
                    <div className="p-8 text-center rounded-2xl border border-dashed border-ivory-300 bg-ivory-50/50 space-y-2">
                      <Scissors className="w-8 h-8 text-charcoal-400 mx-auto" />
                      <p className="font-serif font-semibold text-charcoal-800">No matching services available</p>
                      <p className="text-xs text-charcoal-500 max-w-sm mx-auto">
                        This salon does not offer treatments tailored for {selectedPet ? selectedPet.species.toLowerCase() + 's' : 'this pet'} currently. You can change your pet selection or choose another salon.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {groomingPrimary.map((s) => (
                        <div
                          key={s.id}
                          onClick={() => setSelectedService(s)}
                          className={`p-4 rounded-2xl border cursor-pointer flex justify-between items-center transition-all ${
                            selectedService?.id === s.id
                              ? 'border-sage-600 bg-sage-50/70 ring-2 ring-sage-600/20 shadow-2xs'
                              : 'border-ivory-300 bg-white hover:border-sage-300'
                          }`}
                        >
                          <div className="space-y-0.5">
                            <div className="font-serif font-bold text-sm text-charcoal-900">{s.name}</div>
                            <p className="text-xs text-charcoal-600 max-w-lg">{s.description}</p>
                            <span className="text-[11px] text-charcoal-400 block pt-0.5">
                              Estimated duration: {s.durationMin} minutes
                            </span>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="font-serif font-bold text-lg text-charcoal-900">
                              ${(s.basePriceCents / 100).toFixed(0)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add-on Grooming Treatments */}
                  {groomingAddOns.length > 0 && (
                    <div className="pt-4 border-t border-ivory-200 space-y-3">
                      <label className="block text-xs font-bold uppercase tracking-wider text-charcoal-700">
                        Optional Add-On Spa Treatments
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {groomingAddOns.map((addon) => {
                          const isSelected = selectedAddOnIds.includes(addon.id);
                          return (
                            <div
                              key={addon.id}
                              onClick={() => handleToggleAddon(addon.id)}
                              className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                                isSelected
                                  ? 'bg-sage-50 border-sage-600 ring-2 ring-sage-600/20 shadow-2xs'
                                  : 'bg-white border-ivory-300 hover:border-sage-300'
                              }`}
                            >
                              <div>
                                <div className="font-semibold text-xs text-charcoal-900">{addon.name}</div>
                                <p className="text-[10px] text-charcoal-500 mt-0.5 line-clamp-2">{addon.description}</p>
                              </div>
                              <div className="text-right">
                                <span className="font-bold text-xs text-charcoal-900">
                                  +${(addon.basePriceCents / 100).toFixed(0)}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="pt-4 flex justify-between">
                    <Button variant="secondary" onClick={() => setStep(1)}>
                      <ChevronLeft className="w-4 h-4 mr-1" /> Back
                    </Button>
                    <Button variant="primary" disabled={!selectedService} onClick={() => setStep(3)}>
                      Select Treatment Slot <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                </div>
              );
            })()}

            {/* ============================================================== */}
            {/* GROOMING: STEP 4 (Review & Confirmation)                       */}
            {/* ============================================================== */}
            {isGrooming && step === 4 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-serif font-bold text-charcoal-900">Review & Confirm Grooming Session</h2>
                  <p className="text-xs text-charcoal-600 mt-1">
                    Review your bespoke styling appointment and add any special handling or coat sensitivity notes.
                  </p>
                </div>

                {submitError && (
                  <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{submitError}</span>
                  </div>
                )}

                <div className="p-5 bg-ivory-50/80 rounded-2xl border border-ivory-300 space-y-4 text-xs">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pb-4 border-b border-ivory-200">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-charcoal-400">Pet</span>
                      <p className="font-serif font-bold text-sm text-charcoal-900">{selectedPet?.name}</p>
                      <p className="text-charcoal-500 text-[11px]">{selectedPet?.breed || 'Pet'}</p>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-charcoal-400">Salon</span>
                      <p className="font-serif font-bold text-sm text-charcoal-900">{provider.name}</p>
                      <p className="text-charcoal-500 text-[11px]">{provider.city}</p>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-charcoal-400">Date & Window</span>
                      <p className="font-serif font-bold text-sm text-charcoal-900">
                        {selectedSlot &&
                          new Date(selectedSlot.startsAt).toLocaleDateString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                          })}
                      </p>
                      <p className="text-charcoal-500 text-[11px]">
                        {selectedSlot &&
                          new Date(selectedSlot.startsAt).toLocaleTimeString('en-US', {
                            hour: 'numeric',
                            minute: '2-digit',
                            hour12: true,
                            timeZone: 'UTC',
                          })}
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-charcoal-400">Primary Treatment</span>
                      <p className="font-serif font-bold text-sm text-sage-900">{selectedService?.name}</p>
                      <p className="text-charcoal-500 text-[11px]">{selectedService?.durationMin} min duration</p>
                    </div>
                  </div>

                  {/* Grooming Instructions & Sensitivities */}
                  <div className="space-y-2 pt-1 pb-3 border-b border-ivory-200">
                    <label className="block text-xs font-bold uppercase tracking-wider text-charcoal-700">
                      Coat Sensitivities & Styling Preferences (Optional)
                    </label>
                    <textarea
                      rows={2}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="e.g. Sensitive around paws, scissor trim face short, prefers low-noise dryer..."
                      className="w-full px-4 py-2.5 rounded-xl border border-ivory-300 text-xs text-charcoal-900 focus:outline-none focus:ring-2 focus:ring-sage-600 bg-white"
                    />
                  </div>

                  {/* Pricing Breakdown */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex justify-between text-charcoal-600">
                      <span>{selectedService?.name}</span>
                      <span>${(quote ? quote.priceBreakdown.baseCents / 100 : (selectedService?.basePriceCents || 0) / 100).toFixed(2)}</span>
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
                      <span>Total Estimated Service</span>
                      <span>${(quote ? quote.priceCents / 100 : (selectedService?.basePriceCents || 0) / 100).toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 flex justify-between">
                  <Button variant="secondary" onClick={() => setStep(3)}>
                    <ChevronLeft className="w-4 h-4 mr-1" /> Back
                  </Button>
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
