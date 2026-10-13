'use client';

import * as React from 'react';
import Image from 'next/image';
import { UserCheck, CalendarCheck, Sparkles } from 'lucide-react';
import { Container } from '../layout/Container';
import { Reveal } from '../motion/Reveal';

export function HowItWorks() {
  const steps = [
    {
      num: '01',
      title: 'Create your companion profile',
      desc: 'Add breed, age, weight, vaccine history, and personality quirks once. PawNest automatically matches size tiers and service eligibility.',
      icon: UserCheck,
      image: 'https://images.unsplash.com/photo-1534361960057-19889db9621e?auto=format&fit=crop&w=800&q=80',
    },
    {
      num: '02',
      title: 'Select vetted care or supplies',
      desc: 'Browse groomers, quiet boarding suites, or neighbourhood vets with real computed availability and upfront transparent prices.',
      icon: CalendarCheck,
      image: 'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?auto=format&fit=crop&w=800&q=80',
    },
    {
      num: '03',
      title: 'Relax and manage from one dashboard',
      desc: 'Track appointments, view vaccine expiration alerts, one-tap reschedule when life changes, and reorder favourite food effortlessly.',
      icon: Sparkles,
      image: 'https://images.unsplash.com/photo-1544568100-847a948585b9?auto=format&fit=crop&w=800&q=80',
    },
  ];

  return (
    <section className="py-20 md:py-28 bg-[var(--color-ivory-200)]/40 border-y border-[var(--color-ivory-300)]">
      <Container>
        <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
          <div className="text-xs font-bold uppercase tracking-widest text-[var(--color-sage-700)]">
            How PawNest Works
          </div>
          <h2 className="text-3xl md:text-5xl font-serif text-[var(--color-charcoal-900)] tracking-tight">
            Designed for calm, confident pet parenting.
          </h2>
          <p className="text-base text-[var(--color-charcoal-600)]">
            No frantic phone calls or scattered vaccination papers. Three simple steps to effortless care.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            return (
              <Reveal key={step.num} delay={idx * 0.15}>
                <div className="bg-[var(--color-ivory-50)] border border-[var(--color-ivory-300)] rounded-[var(--radius-xl)] p-6 space-y-6 shadow-[var(--shadow-1)] hover:shadow-[var(--shadow-2)] transition-shadow">
                  {/* Step Image */}
                  <div className="relative h-48 w-full rounded-[var(--radius-lg)] overflow-hidden">
                    <Image
                      src={step.image}
                      alt={step.title}
                      fill
                      sizes="(max-width: 768px) 100vw, 33vw"
                      className="object-cover"
                    />
                    <div className="absolute top-3 left-3 bg-[var(--color-ivory-50)] text-[var(--color-charcoal-900)] px-3 py-1 rounded-full text-xs font-bold shadow-sm">
                      Step {step.num}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-[var(--color-sage-700)]">
                      <Icon className="w-5 h-5" />
                      <h3 className="text-lg font-serif font-semibold text-[var(--color-charcoal-900)]">
                        {step.title}
                      </h3>
                    </div>
                    <p className="text-xs md:text-sm text-[var(--color-charcoal-600)] leading-relaxed">
                      {step.desc}
                    </p>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
