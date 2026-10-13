import * as React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ShieldCheck, Heart, ArrowRight, Bell, Sparkles } from 'lucide-react';
import { Container } from '../layout/Container';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Reveal } from '../motion/Reveal';

export function PetProfileFeature() {
  return (
    <section className="py-20 md:py-32 overflow-hidden">
      <Container>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          {/* Left: Floating PetCard Mockup */}
          <div className="lg:col-span-6 relative">
            <Reveal direction="right">
              <div className="relative mx-auto max-w-md">
                {/* Main PetCard */}
                <div className="bg-[var(--color-ivory-50)] border border-[var(--color-ivory-300)] rounded-[var(--radius-xl)] p-6 shadow-[var(--shadow-3)] space-y-5">
                  <div className="flex items-center gap-4">
                    <div className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-[var(--color-sage-500)] shadow-sm shrink-0">
                      <Image
                        src="/images/pet-01.jpg"
                        alt="Barnaby the Golden Retriever"
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-serif text-xl font-semibold text-[var(--color-charcoal-900)]">
                          Barnaby
                        </h3>
                        <Badge variant="sage">Active</Badge>
                      </div>
                      <p className="text-xs text-[var(--color-charcoal-600)]">
                        Golden Retriever · 3 yrs · 31.5 kg (Tier L)
                      </p>
                    </div>
                  </div>

                  {/* Health & Reminders Band */}
                  <div className="p-3.5 rounded-[var(--radius-md)] bg-[var(--color-sage-50)] border border-[var(--color-sage-200)] flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 text-[var(--color-sage-800)]">
                      <ShieldCheck className="w-4 h-4 text-[var(--color-sage-600)] shrink-0" />
                      <div>
                        <span className="font-bold block">Rabies & Bordetella</span>
                        <span className="text-[10px] text-[var(--color-sage-700)]">Valid through Dec 2026</span>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-[var(--color-sage-200)] text-[var(--color-sage-900)] font-semibold text-[10px]">
                      Protected
                    </span>
                  </div>

                  {/* Dietary & Habits */}
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between text-[var(--color-charcoal-600)] border-b border-[var(--color-ivory-200)] pb-2">
                      <span>Dietary Notes</span>
                      <span className="font-medium text-[var(--color-charcoal-900)]">Poultry-free, Grain-inclusive</span>
                    </div>
                    <div className="flex items-center justify-between text-[var(--color-charcoal-600)] border-b border-[var(--color-ivory-200)] pb-2">
                      <span>Temperament</span>
                      <span className="font-medium text-[var(--color-charcoal-900)]">Calm with big dogs, shy with hairdryers</span>
                    </div>
                    <div className="flex items-center justify-between text-[var(--color-charcoal-600)]">
                      <span>Vet Clinic</span>
                      <span className="font-medium text-[var(--color-charcoal-900)]">Veritas Veterinary Clinic</span>
                    </div>
                  </div>
                </div>

                {/* Floating Notification Arc */}
                <div className="absolute -bottom-6 -right-4 sm:-right-8 bg-[var(--color-ivory-100)] border border-[var(--color-ivory-300)] rounded-[var(--radius-lg)] p-4 shadow-[var(--shadow-2)] max-w-[260px] flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-[var(--color-peach-100)] text-[var(--color-peach-700)] flex items-center justify-center shrink-0">
                    <Bell className="w-4 h-4" />
                  </div>
                  <div className="text-left text-xs">
                    <div className="font-bold text-[var(--color-charcoal-900)]">Vaccine Due in 30 Days</div>
                    <p className="text-[11px] text-[var(--color-charcoal-600)]">
                      One-tap schedule wellness visit with Veritas Clinic.
                    </p>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>

          {/* Right: Editorial Storytelling */}
          <div className="lg:col-span-6 space-y-6">
            <Reveal direction="left">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[var(--color-peach-100)] text-[var(--color-peach-700)] text-xs font-semibold uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5" />
                The Core Innovation
              </div>
            </Reveal>

            <Reveal delay={0.1} direction="left">
              <h2 className="text-3xl sm:text-5xl font-serif text-[var(--color-charcoal-900)] tracking-tight leading-tight">
                One pet profile that makes every booking faster and safer.
              </h2>
            </Reveal>

            <Reveal delay={0.2} direction="left">
              <p className="text-base sm:text-lg text-[var(--color-charcoal-600)] leading-relaxed">
                When you book grooming, your groomer already knows coat sensitivities. When you book boarding, the facility sees verified vaccine dates automatically. No paper forms, no missed medications.
              </p>
            </Reveal>

            <Reveal delay={0.3} direction="left">
              <div className="pt-2 flex flex-wrap gap-4">
                <Link href="/auth/sign-up">
                  <Button variant="primary" size="lg" className="gap-2">
                    <span>Create Your Pet Profile</span>
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
                <Link href="/dashboard/pets">
                  <Button variant="secondary" size="lg">
                    Preview Dashboard
                  </Button>
                </Link>
              </div>
            </Reveal>
          </div>
        </div>
      </Container>
    </section>
  );
}
