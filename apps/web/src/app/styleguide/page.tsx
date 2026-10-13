import Link from 'next/link';

export default function StyleguidePage() {
  const colors = [
    { name: 'ivory-50', hex: '#FDFBF6', bg: 'bg-[var(--color-ivory-50)]', text: 'text-[var(--color-charcoal-900)]' },
    { name: 'ivory-100', hex: '#FAF6EE', bg: 'bg-[var(--color-ivory-100)]', text: 'text-[var(--color-charcoal-900)]' },
    { name: 'ivory-200', hex: '#F2EBDC', bg: 'bg-[var(--color-ivory-200)]', text: 'text-[var(--color-charcoal-900)]' },
    { name: 'ivory-300', hex: '#E7DDC8', bg: 'bg-[var(--color-ivory-300)]', text: 'text-[var(--color-charcoal-900)]' },
    { name: 'sage-100', hex: '#E1EAD9', bg: 'bg-[var(--color-sage-100)]', text: 'text-[var(--color-sage-900)]' },
    { name: 'sage-500', hex: '#6F8F72', bg: 'bg-[var(--color-sage-500)]', text: 'text-white' },
    { name: 'sage-700', hex: '#44614C', bg: 'bg-[var(--color-sage-700)]', text: 'text-[var(--color-ivory-50)]' },
    { name: 'sage-900', hex: '#22332A', bg: 'bg-[var(--color-sage-900)]', text: 'text-white' },
    { name: 'peach-100', hex: '#FBE6D8', bg: 'bg-[var(--color-peach-100)]', text: 'text-[var(--color-peach-700)]' },
    { name: 'peach-400', hex: '#E79F78', bg: 'bg-[var(--color-peach-400)]', text: 'text-white' },
    { name: 'peach-700', hex: '#8F4E31', bg: 'bg-[var(--color-peach-700)]', text: 'text-white' },
    { name: 'charcoal-700', hex: '#3B423E', bg: 'bg-[var(--color-charcoal-700)]', text: 'text-white' },
    { name: 'charcoal-900', hex: '#1F2421', bg: 'bg-[var(--color-charcoal-900)]', text: 'text-white' },
  ];

  return (
    <div className="min-h-screen p-8 md:p-16 max-w-5xl mx-auto space-y-12 bg-[var(--color-ivory-100)]">
      <div className="space-y-2">
        <Link href="/" className="text-sm font-semibold text-[var(--color-sage-700)] hover:underline">
          ← Back to PawNest
        </Link>
        <h1 className="text-4xl font-serif text-[var(--color-charcoal-900)]">PawNest Design System Tokens</h1>
        <p className="text-[var(--color-charcoal-600)]">
          Source of truth design tokens implemented in accordance with Section 3 of the plan.
        </p>
      </div>

      {/* Palette */}
      <section className="space-y-4">
        <h2 className="text-2xl font-serif text-[var(--color-charcoal-900)]">Colour Palette</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {colors.map((c) => (
            <div key={c.name} className={`p-4 rounded-[var(--radius-md)] border border-[var(--color-ivory-300)] ${c.bg} ${c.text} shadow-[var(--shadow-1)]`}>
              <div className="font-semibold text-sm">{c.name}</div>
              <div className="text-xs opacity-80">{c.hex}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Typography */}
      <section className="space-y-6">
        <h2 className="text-2xl font-serif text-[var(--color-charcoal-900)]">Typography Hierarchy</h2>
        <div className="space-y-4 p-6 rounded-[var(--radius-lg)] bg-[var(--color-ivory-50)] border border-[var(--color-ivory-300)]">
          <div>
            <span className="text-xs font-bold text-[var(--color-charcoal-500)] uppercase tracking-wider">Display 2XL</span>
            <div className="text-5xl font-serif">Care that feels like home.</div>
          </div>
          <div>
            <span className="text-xs font-bold text-[var(--color-charcoal-500)] uppercase tracking-wider">H1 Serif</span>
            <div className="text-3xl font-serif">Find considered pet care nearby</div>
          </div>
          <div>
            <span className="text-xs font-bold text-[var(--color-charcoal-500)] uppercase tracking-wider">H2 Serif</span>
            <div className="text-2xl font-serif">A calm sanctuary for your companion</div>
          </div>
          <div>
            <span className="text-xs font-bold text-[var(--color-charcoal-500)] uppercase tracking-wider">Body UI</span>
            <p className="text-base text-[var(--color-charcoal-700)] leading-relaxed">
              PawNest combines grooming, boarding, veterinary appointments, and premium supplies under a unified pet profile.
            </p>
          </div>
        </div>
      </section>

      {/* Signature Arch Shape */}
      <section className="space-y-4">
        <h2 className="text-2xl font-serif text-[var(--color-charcoal-900)]">Signature Arch Motif</h2>
        <div className="flex gap-6 items-end">
          <div className="w-32 h-44 bg-[var(--color-sage-200)] border border-[var(--color-sage-300)] rounded-[var(--radius-arch)] flex items-center justify-center text-xs font-medium text-[var(--color-sage-900)] shadow-[var(--shadow-2)]">
            Arch 1
          </div>
          <div className="w-40 h-56 bg-[var(--color-peach-100)] border border-[var(--color-peach-200)] rounded-[var(--radius-arch)] flex items-center justify-center text-xs font-medium text-[var(--color-peach-700)] shadow-[var(--shadow-3)]">
            Arch 2 (Hero Frame)
          </div>
        </div>
      </section>
    </div>
  );
}
