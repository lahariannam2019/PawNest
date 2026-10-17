import * as React from 'react';
import Link from 'next/link';
import Image from 'next/image';

export interface AuthShellProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}

export function AuthShell({ title, subtitle, children }: AuthShellProps) {
  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-12 bg-[var(--color-ivory-100)]">
      {/* Left Column: Form */}
      <div className="lg:col-span-7 flex flex-col justify-between p-6 sm:p-12 lg:p-20">
        <div>
          {/* Brand Logo */}
          <Link href="/" className="inline-flex items-center gap-2 group mb-12">
            <div className="w-8 h-8 rounded-full bg-[var(--color-sage-700)] text-[var(--color-ivory-50)] flex items-center justify-center shadow-sm">
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12v8c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2v-8c0-5.52-4.48-10-10-10zm-3 8c.83 0 1.5.67 1.5 1.5S9.83 13 9 13s-1.5-.67-1.5-1.5S8.17 10 9 10zm6 0c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5-1.5-.67-1.5-1.5.67-1.5 1.5-1.5zm-3 4.5c1.66 0 3 1.34 3 3 0 .55-.45 1-1 1h-4c-.55 0-1-.45-1-1 0-1.66 1.34-3 3-3z" />
              </svg>
            </div>
            <span className="font-serif text-2xl font-normal text-[var(--color-charcoal-900)]">
              PawNest
            </span>
          </Link>

          <div className="max-w-md mx-auto lg:mx-0 space-y-6">
            <div className="space-y-2">
              <h1 className="text-3xl sm:text-4xl font-serif text-[var(--color-charcoal-900)] tracking-tight">
                {title}
              </h1>
              <p className="text-sm text-[var(--color-charcoal-600)]">
                {subtitle}
              </p>
            </div>

            {children}
          </div>
        </div>

        {/* Footer */}
        <div className="pt-8 text-xs text-[var(--color-charcoal-500)] max-w-md mx-auto lg:mx-0">
          Protected by PawNest privacy & session security.
        </div>
      </div>

      {/* Right Column: Arched Dog Photo (hidden on small viewports) */}
      <div className="hidden lg:flex lg:col-span-5 relative bg-[var(--color-ivory-200)]/60 items-center justify-center p-12 overflow-hidden border-l border-[var(--color-ivory-300)]">
        <div className="relative w-full max-w-md aspect-[4/5] rounded-[var(--radius-arch)] overflow-hidden shadow-[var(--shadow-3)]">
          <Image
            src="/images/hero-02.jpg"
            alt="Attentive dog portrait"
            fill
            sizes="500px"
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent flex items-end p-8">
            <div className="bg-[#1F2421]/80 backdrop-blur-md rounded-2xl p-5 border border-white/15 shadow-lg w-full">
              <p className="text-white font-serif text-base sm:text-lg leading-relaxed drop-shadow-sm">
                “One pet profile that makes every grooming and veterinary appointment faster and safer.”
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
