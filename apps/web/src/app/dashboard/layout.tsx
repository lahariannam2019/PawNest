'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '../../lib/auth/AuthContext';
import {
  LayoutDashboard,
  Dog,
  Calendar,
  Stethoscope,
  ShoppingBag,
  Settings,
  LogOut,
  ChevronRight,
  ArrowLeft,
} from 'lucide-react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  React.useEffect(() => {
    if (!isLoading && !user) {
      router.push(`/auth/sign-in?next=${encodeURIComponent(pathname)}`);
    }
  }, [user, isLoading, router, pathname]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-ivory-100)]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-2 border-[var(--color-sage-700)] border-t-transparent animate-spin" />
          <span className="text-xs font-serif text-[var(--color-charcoal-600)]">
            Loading your pet care space...
          </span>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const navItems = [
    { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
    { href: '/dashboard/pets', label: 'Pet Profiles', icon: Dog },
    { href: '/dashboard/bookings', label: 'Bookings & Stays', icon: Calendar },
    { href: '/dashboard/appointments', label: 'Vet Visits', icon: Stethoscope },
    { href: '/dashboard/orders', label: 'Order History', icon: ShoppingBag },
    { href: '/dashboard/settings', label: 'Account Settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-[var(--color-ivory-100)] text-[var(--color-charcoal-800)] flex flex-col">
      {/* Top Bar */}
      <header className="sticky top-0 z-40 bg-[var(--color-ivory-100)]/90 backdrop-blur-md border-b border-[var(--color-ivory-300)] py-3 px-5 sm:px-8">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="inline-flex items-center gap-2 group">
              <div className="w-8 h-8 rounded-full bg-[var(--color-sage-700)] text-[var(--color-ivory-50)] flex items-center justify-center transition-transform group-hover:scale-105">
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12v8c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2v-8c0-5.52-4.48-10-10-10zm-3 8c.83 0 1.5.67 1.5 1.5S9.83 13 9 13s-1.5-.67-1.5-1.5S8.17 10 9 10zm6 0c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5-1.5-.67-1.5-1.5.67-1.5 1.5-1.5zm-3 4.5c1.66 0 3 1.34 3 3 0 .55-.45 1-1 1h-4c-.55 0-1-.45-1-1 0-1.66 1.34-3 3-3z" />
                </svg>
              </div>
              <span className="font-serif text-xl font-normal text-[var(--color-charcoal-900)]">
                PawNest
              </span>
            </Link>

            <div className="hidden sm:flex items-center text-xs text-[var(--color-charcoal-500)] gap-1">
              <ChevronRight className="w-3.5 h-3.5" />
              <span className="font-medium text-[var(--color-charcoal-700)]">Parent Portal</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--color-charcoal-600)] hover:text-[var(--color-charcoal-900)] transition-colors px-2.5 py-1 rounded-full hover:bg-[var(--color-ivory-200)]"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Marketplace</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Workspace */}
      <div className="flex-1 max-w-[1400px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8 flex gap-8">
        {/* Desktop Sidebar */}
        <aside className="hidden md:flex flex-col w-64 shrink-0 space-y-6">
          {/* User Profile Glance */}
          <div className="p-4 rounded-[var(--radius-xl)] bg-[var(--color-ivory-50)] border border-[var(--color-ivory-300)] shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[var(--color-sage-700)] text-[var(--color-ivory-50)] flex items-center justify-center font-bold text-sm">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-[var(--color-charcoal-900)] truncate">
                {user.name}
              </p>
              <p className="text-[11px] text-[var(--color-charcoal-500)] truncate">
                {user.email}
              </p>
            </div>
          </div>

          {/* Navigation Items */}
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.href === '/dashboard'
                  ? pathname === '/dashboard'
                  : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-[var(--radius-lg)] text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-[var(--color-sage-700)] text-[var(--color-ivory-50)] shadow-sm'
                      : 'text-[var(--color-charcoal-700)] hover:bg-[var(--color-ivory-200)] hover:text-[var(--color-charcoal-900)]'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Sign Out Button */}
          <div className="pt-4 border-t border-[var(--color-ivory-300)]">
            <button
              onClick={() => logout()}
              className="flex items-center gap-2.5 w-full px-3.5 py-2 rounded-[var(--radius-lg)] text-xs font-semibold text-rose-700 hover:bg-rose-50 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </aside>

        {/* Dynamic Content Pane */}
        <main className="flex-1 min-w-0 pb-16 md:pb-0">{children}</main>
      </div>

      {/* Mobile Bottom Tab Bar (Section 2) */}
      <nav
        aria-label="Mobile Navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[var(--color-ivory-50)]/95 backdrop-blur-md border-t border-[var(--color-ivory-300)] py-2 px-3 flex items-center justify-around shadow-lg"
      >
        {navItems.slice(0, 5).map((item) => {
          const Icon = item.icon;
          const isActive =
            item.href === '/dashboard'
              ? pathname === '/dashboard'
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-1 py-1 px-2 rounded-lg text-[10px] font-semibold transition-colors ${
                isActive
                  ? 'text-[var(--color-sage-700)]'
                  : 'text-[var(--color-charcoal-500)] hover:text-[var(--color-charcoal-800)]'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{item.label.split(' ')[0]}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
