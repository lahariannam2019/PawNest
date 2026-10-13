import * as React from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Container } from '../layout/Container';
import { Button } from '../ui/Button';
import { Reveal } from '../motion/Reveal';

export function CtaBand() {
  return (
    <section className="py-24 bg-[var(--color-sage-900)] text-[var(--color-ivory-50)] text-center relative overflow-hidden">
      {/* Decorative Warm Ambient Glow */}
      <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-[var(--color-peach-500)]/10 blur-[120px] rounded-full pointer-events-none" />

      <Container size="narrow">
        <div className="space-y-6 relative z-10">
          <Reveal direction="down">
            <span className="text-xs font-bold uppercase tracking-widest text-[var(--color-sage-300)]">
              Begin Today
            </span>
          </Reveal>

          <Reveal delay={0.1}>
            <h2 className="text-4xl sm:text-6xl font-serif font-normal tracking-tight text-[var(--color-ivory-50)] leading-tight">
              Start with your pet’s profile.
            </h2>
          </Reveal>

          <Reveal delay={0.2}>
            <p className="text-base sm:text-lg text-[var(--color-sage-200)] max-w-xl mx-auto leading-relaxed">
              Join thousands of conscious companions experiencing a calmer, safer way to book care and shop essentials.
            </p>
          </Reveal>

          <Reveal delay={0.3}>
            <div className="pt-4 flex flex-wrap justify-center gap-4">
              <Link href="/auth/sign-up">
                <Button
                  size="lg"
                  className="bg-[var(--color-ivory-50)] text-[var(--color-sage-900)] hover:bg-[var(--color-ivory-100)] gap-2 shadow-[var(--shadow-3)]"
                >
                  <span>Create Account</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <Link href="/grooming">
                <Button
                  size="lg"
                  variant="secondary"
                  className="border-[var(--color-sage-500)] text-[var(--color-ivory-50)] hover:bg-[var(--color-sage-800)]"
                >
                  Explore Partners
                </Button>
              </Link>
            </div>
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
