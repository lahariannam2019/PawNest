'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Search, Heart, ShoppingBag, User as UserIcon, Menu, X } from 'lucide-react';
import { Button } from '../ui/Button';
import { Container } from './Container';

export function Header() {
  const pathname = usePathname();
  const [isScrolled, setIsScrolled] = React.useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  React.useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 40);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { href: '/grooming', label: 'Grooming' },
    { href: '/boarding', label: 'Boarding' },
    { href: '/vet', label: 'Veterinary' },
    { href: '/supplies', label: 'Supplies' },
  ];

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-300 ${
        isScrolled
          ? 'bg-[var(--color-ivory-100)]/90 backdrop-blur-md border-b border-[var(--color-ivory-300)] py-3 shadow-[var(--shadow-1)]'
          : 'bg-transparent py-5'
      }`}
    >
      <Container>
        <div className="flex items-center justify-between">
          {/* Logo & Wordmark */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-full bg-[var(--color-sage-700)] text-[var(--color-ivory-50)] flex items-center justify-center transition-transform duration-300 group-hover:scale-105 shadow-[var(--shadow-1)]">
              {/* Refined paw-in-arch mark */}
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12v8c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2v-8c0-5.52-4.48-10-10-10zm-3 8c.83 0 1.5.67 1.5 1.5S9.83 13 9 13s-1.5-.67-1.5-1.5S8.17 10 9 10zm6 0c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5-1.5-.67-1.5-1.5.67-1.5 1.5-1.5zm-3 4.5c1.66 0 3 1.34 3 3 0 .55-.45 1-1 1h-4c-.55 0-1-.45-1-1 0-1.66 1.34-3 3-3z" />
              </svg>
            </div>
            <span className="font-serif text-2xl font-normal tracking-tight text-[var(--color-charcoal-900)]">
              PawNest
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-8" aria-label="Main Navigation">
            {navLinks.map((link) => {
              const isActive = pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`text-sm font-medium transition-colors hover:text-[var(--color-sage-700)] relative py-1 ${
                    isActive
                      ? 'text-[var(--color-sage-700)] font-semibold'
                      : 'text-[var(--color-charcoal-700)]'
                  }`}
                >
                  {link.label}
                  {isActive && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--color-sage-700)] rounded-full" />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Desktop Action Icons */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              href="/supplies"
              aria-label="Search care and supplies"
              className="p-2.5 rounded-full text-[var(--color-charcoal-700)] hover:text-[var(--color-charcoal-900)] hover:bg-[var(--color-ivory-200)] transition-colors"
            >
              <Search className="w-5 h-5" />
            </Link>

            <Link
              href="/dashboard/favourites"
              aria-label="Saved favourites"
              className="p-2.5 rounded-full text-[var(--color-charcoal-700)] hover:text-[var(--color-charcoal-900)] hover:bg-[var(--color-ivory-200)] transition-colors"
            >
              <Heart className="w-5 h-5" />
            </Link>

            <Link
              href="/cart"
              aria-label="Shopping cart"
              className="p-2.5 rounded-full text-[var(--color-charcoal-700)] hover:text-[var(--color-charcoal-900)] hover:bg-[var(--color-ivory-200)] transition-colors relative"
            >
              <ShoppingBag className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-4 h-4 bg-[var(--color-sage-700)] text-[var(--color-ivory-50)] text-[10px] font-bold rounded-full flex items-center justify-center">
                0
              </span>
            </Link>

            <div className="h-4 w-px bg-[var(--color-ivory-300)] mx-1" />

            <Link href="/auth/sign-in">
              <Button variant="ghost" size="sm" className="gap-2">
                <UserIcon className="w-4 h-4" />
                <span>Sign In</span>
              </Button>
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden items-center gap-2">
            <Link
              href="/cart"
              aria-label="Shopping cart"
              className="p-2 rounded-full text-[var(--color-charcoal-700)] relative"
            >
              <ShoppingBag className="w-5 h-5" />
              <span className="absolute top-0 right-0 w-4 h-4 bg-[var(--color-sage-700)] text-[var(--color-ivory-50)] text-[10px] font-bold rounded-full flex items-center justify-center">
                0
              </span>
            </Link>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-[var(--color-charcoal-900)] hover:bg-[var(--color-ivory-200)]"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Sheet */}
        {mobileMenuOpen && (
          <div className="md:hidden mt-4 pt-4 border-t border-[var(--color-ivory-300)] bg-[var(--color-ivory-100)] pb-6 space-y-4">
            <nav className="flex flex-col space-y-2">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-3 py-2 rounded-lg text-base font-medium text-[var(--color-charcoal-800)] hover:bg-[var(--color-ivory-200)]"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
            <div className="pt-2 border-t border-[var(--color-ivory-300)] flex flex-col gap-2">
              <Link href="/auth/sign-in" onClick={() => setMobileMenuOpen(false)}>
                <Button variant="secondary" className="w-full">
                  Sign In
                </Button>
              </Link>
              <Link href="/auth/sign-up" onClick={() => setMobileMenuOpen(false)}>
                <Button variant="primary" className="w-full">
                  Create Pet Profile
                </Button>
              </Link>
            </div>
          </div>
        )}
      </Container>
    </header>
  );
}
