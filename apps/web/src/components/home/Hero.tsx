'use client';

import * as React from 'react';
import Link from 'next/link';
import { ShieldCheck, ArrowRight } from 'lucide-react';
import { Button } from '../ui/Button';
import { Hero3D } from '../media/Hero3D';
import { SearchComposer } from './SearchComposer';
import { Reveal } from '../motion/Reveal';

export function Hero() {
  return (
    <section className="relative pt-6 pb-20 md:pt-12 md:pb-28 overflow-hidden">
      <div className="max-w-[1280px] mx-auto px-5 sm:px-8 lg:px-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          {/* Left: Copy & Actions */}
          <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
            <Reveal direction="down">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[var(--color-sage-100)] text-[var(--color-sage-800)] text-xs font-semibold uppercase tracking-wider">
                <span className="w-2 h-2 rounded-full bg-[var(--color-sage-600)] animate-pulse" />
                Considered care for dogs
              </div>
            </Reveal>

            <Reveal delay={0.1}>
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-normal font-serif text-[var(--color-charcoal-900)] tracking-tight leading-[1.05]">
                Care that feels like <span className="italic font-normal">home.</span>
              </h1>
            </Reveal>

            <Reveal delay={0.2}>
              <p className="text-lg sm:text-xl text-[var(--color-charcoal-600)] max-w-xl mx-auto lg:mx-0 leading-relaxed font-normal">
                Grooming, boarding, veterinary visits, and thoughtfully chosen supplies — one calm place for everything your dog needs.
              </p>
            </Reveal>

            <Reveal delay={0.3}>
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 pt-2">
                <Link href="/grooming">
                  <Button variant="primary" size="lg" className="gap-2">
                    <span>Find Care</span>
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
                <Link href="/supplies">
                  <Button variant="secondary" size="lg">
                    Shop Essentials
                  </Button>
                </Link>
              </div>
            </Reveal>
          </div>

          {/* Right: Signature Arch Photo & Floating Chips */}
          <div className="lg:col-span-5 relative flex justify-center lg:justify-end">
            <div className="relative w-full max-w-[380px] sm:max-w-[420px]">
              {/* Arch Photo / 3D Hero */}
              <Hero3D
                posterSrc="/images/hero-01.jpg"
                alt="A golden retriever resting peacefully by a sunlit window in morning light"
              />

              {/* Floating Context Chip (Bottom Right) */}
              <div className="absolute -bottom-4 -right-4 sm:-right-6 bg-[var(--color-ivory-50)]/95 backdrop-blur-md border border-[var(--color-ivory-300)] rounded-[var(--radius-lg)] p-3 shadow-[var(--shadow-2)] flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[var(--color-peach-100)] text-[var(--color-peach-700)] flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <div className="text-[11px] font-bold text-[var(--color-charcoal-500)] uppercase tracking-wider">
                    Vaccines Valid
                  </div>
                  <div className="text-xs font-semibold text-[var(--color-charcoal-900)]">
                    Rabies & DHPP Active
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Search Composer Docked Below Hero */}
        <div className="mt-14 md:mt-20">
          <Reveal delay={0.4}>
            <SearchComposer />
          </Reveal>
        </div>
      </div>
    </section>
  );
}
