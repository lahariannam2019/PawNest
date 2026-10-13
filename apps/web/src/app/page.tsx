import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8 text-center bg-[var(--color-ivory-100)]">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--color-sage-100)] text-[var(--color-sage-800)] text-xs font-semibold uppercase tracking-wider">
          🐾 PawNest Platform v1.0
        </div>
        <h1 className="text-5xl md:text-6xl font-normal font-serif text-[var(--color-charcoal-900)] tracking-tight">
          Care that feels like <span className="italic">home.</span>
        </h1>
        <p className="text-lg text-[var(--color-charcoal-600)] max-w-xl mx-auto leading-relaxed">
          Grooming, boarding, vet visits, and thoughtfully chosen supplies — one calm place for everything your dog needs.
        </p>
        <div className="pt-4 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/styleguide"
            className="px-6 py-3 rounded-[var(--radius-md)] bg-[var(--color-sage-700)] hover:bg-[var(--color-sage-800)] text-[var(--color-ivory-50)] font-medium transition-all shadow-[var(--shadow-1)] hover:shadow-[var(--shadow-2)] active:scale-98"
          >
            Design System Showcase
          </Link>
          <a
            href="/api/health"
            className="px-6 py-3 rounded-[var(--radius-md)] border border-[var(--color-ivory-300)] bg-[var(--color-ivory-50)] text-[var(--color-charcoal-900)] font-medium hover:bg-[var(--color-ivory-200)] transition-all"
          >
            API Health Check
          </a>
        </div>
      </div>
    </main>
  );
}
