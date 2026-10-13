'use client';

import * as React from 'react';
import Link from 'next/link';
import { useMotionPreference } from '../../lib/motion/useReducedMotion';
import { Container } from './Container';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Badge } from '../ui/Badge';

export function Footer() {
  const { reduceMotion, toggleReduceMotion } = useMotionPreference();
  const [email, setEmail] = React.useState('');
  const [subscribed, setSubscribed] = React.useState(false);

  const handleNewsletter = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setSubscribed(true);
    setEmail('');
  };

  return (
    <footer className="border-t border-[var(--color-ivory-300)] bg-[var(--color-ivory-200)]/40 pt-16 pb-12 text-sm text-[var(--color-charcoal-600)]">
      <Container>
        {/* Top Banner: Demo Mode Indicator */}
        <div className="mb-12 p-4 rounded-[var(--radius-lg)] bg-[var(--color-peach-50)] border border-[var(--color-peach-200)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <Badge variant="demo">Demo Environment</Badge>
            <span className="text-[var(--color-peach-700)]">
              PawNest v1.0 is currently operating in demo mode. All bookings and orders are sample simulated transactions.
            </span>
          </div>
          <span className="text-[var(--color-charcoal-500)] shrink-0">Source of truth: 2026-10-13</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 pb-16">
          {/* Brand Column */}
          <div className="lg:col-span-2 space-y-4">
            <Link href="/" className="inline-flex items-center gap-2 group">
              <div className="w-8 h-8 rounded-full bg-[var(--color-sage-700)] text-[var(--color-ivory-50)] flex items-center justify-center">
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12v8c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2v-8c0-5.52-4.48-10-10-10zm-3 8c.83 0 1.5.67 1.5 1.5S9.83 13 9 13s-1.5-.67-1.5-1.5S8.17 10 9 10zm6 0c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5-1.5-.67-1.5-1.5.67-1.5 1.5-1.5zm-3 4.5c1.66 0 3 1.34 3 3 0 .55-.45 1-1 1h-4c-.55 0-1-.45-1-1 0-1.66 1.34-3 3-3z" />
                </svg>
              </div>
              <span className="font-serif text-2xl font-normal text-[var(--color-charcoal-900)]">
                PawNest
              </span>
            </Link>
            <p className="max-w-sm text-sm text-[var(--color-charcoal-600)] leading-relaxed">
              Considered pet care for thoughtful companions. Grooming, boarding, veterinary visits, and curated essentials under one calm roof.
            </p>

            {/* Newsletter Subscription */}
            <form onSubmit={handleNewsletter} className="pt-2 max-w-sm space-y-2">
              <span className="text-xs font-semibold text-[var(--color-charcoal-900)] uppercase tracking-wider block">
                The Calm Canine Journal
              </span>
              <div className="flex gap-2">
                <Input
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-10 text-xs"
                  required
                />
                <Button type="submit" size="sm" variant="primary" className="shrink-0 h-10">
                  {subscribed ? 'Subscribed' : 'Join'}
                </Button>
              </div>
            </form>
          </div>

          {/* Links: Services */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-[var(--color-charcoal-900)] uppercase tracking-wider">
              Care Services
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link href="/grooming" className="hover:text-[var(--color-sage-700)] transition-colors">
                  Grooming Discovery
                </Link>
              </li>
              <li>
                <Link href="/boarding" className="hover:text-[var(--color-sage-700)] transition-colors">
                  Boarding & Daycare
                </Link>
              </li>
              <li>
                <Link href="/vet" className="hover:text-[var(--color-sage-700)] transition-colors">
                  Veterinary Clinics
                </Link>
              </li>
              <li>
                <Link href="/supplies" className="hover:text-[var(--color-sage-700)] transition-colors">
                  Curated Supplies
                </Link>
              </li>
            </ul>
          </div>

          {/* Links: Customer & Dashboard */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-[var(--color-charcoal-900)] uppercase tracking-wider">
              Pet Parents
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link href="/dashboard" className="hover:text-[var(--color-sage-700)] transition-colors">
                  Parent Dashboard
                </Link>
              </li>
              <li>
                <Link href="/dashboard/pets" className="hover:text-[var(--color-sage-700)] transition-colors">
                  Pet Profiles
                </Link>
              </li>
              <li>
                <Link href="/dashboard/bookings" className="hover:text-[var(--color-sage-700)] transition-colors">
                  Bookings & Calendar
                </Link>
              </li>
              <li>
                <Link href="/dashboard/orders" className="hover:text-[var(--color-sage-700)] transition-colors">
                  Order History
                </Link>
              </li>
            </ul>
          </div>

          {/* Links: Legal & Credits */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-[var(--color-charcoal-900)] uppercase tracking-wider">
              Platform & Legal
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link href="/about" className="hover:text-[var(--color-sage-700)] transition-colors">
                  About PawNest
                </Link>
              </li>
              <li>
                <Link href="/legal/privacy" className="hover:text-[var(--color-sage-700)] transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/legal/terms" className="hover:text-[var(--color-sage-700)] transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/styleguide" className="hover:text-[var(--color-sage-700)] transition-colors">
                  Design Tokens
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar with Reduce Motion Toggle */}
        <div className="pt-8 border-t border-[var(--color-ivory-300)] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          <p>© {new Date().getFullYear()} PawNest Technologies Inc. All rights reserved.</p>

          <div className="flex items-center gap-4">
            {/* Reduce Motion in-app toggle */}
            <button
              onClick={toggleReduceMotion}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[var(--radius-sm)] border border-[var(--color-ivory-300)] bg-[var(--color-ivory-50)] hover:bg-[var(--color-ivory-100)] text-[var(--color-charcoal-700)] transition-colors"
              title="Toggle reduced motion preference"
            >
              <span>Reduce motion:</span>
              <span className="font-semibold text-[var(--color-sage-700)]">
                {reduceMotion ? 'On' : 'Off'}
              </span>
            </button>
            <span>USD ($)</span>
          </div>
        </div>
      </Container>
    </footer>
  );
}
