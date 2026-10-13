import type { Metadata } from 'next';
import { Fraunces, Manrope } from 'next/font/google';
import '../styles/globals.css';

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
  display: 'swap',
  axes: ['opsz', 'SOFT'],
});

const manrope = Manrope({
  subsets: ['latin'],
  variable: '--font-manrope',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'PawNest — Considered Care for Dogs',
  description:
    'Grooming, boarding, veterinary visits, and thoughtfully chosen supplies — one calm place for everything your dog needs.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${fraunces.variable} ${manrope.variable}`}>
      <body className="antialiased min-h-screen bg-[var(--color-ivory-100)] text-[var(--color-charcoal-700)] selection:bg-[var(--color-sage-100)]">
        {children}
      </body>
    </html>
  );
}
