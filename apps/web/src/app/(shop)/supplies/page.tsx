import { Header } from '../../../components/layout/Header';
import { Footer } from '../../../components/layout/Footer';
import { Container } from '../../../components/layout/Container';
import { Badge } from '../../../components/ui/Badge';
import { SuppliesPreview } from '../../../components/home/SuppliesPreview';

export default function SuppliesPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[var(--color-ivory-100)]">
      <Header />
      <main className="flex-1 py-12 md:py-20">
        <Container>
          <div className="max-w-2xl mb-8 space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-widest text-[var(--color-sage-700)]">
                The PawNest Market
              </span>
              <Badge variant="demo">Phase 7 Ready</Badge>
            </div>
            <h1 className="text-4xl md:text-5xl font-serif text-[var(--color-charcoal-900)]">
              Curated Supplies & Essentials
            </h1>
            <p className="text-base text-[var(--color-charcoal-600)]">
              Natural recipes, non-toxic toys, gentle grooming potions, and durable walk wear.
            </p>
          </div>
        </Container>
        <SuppliesPreview />
      </main>
      <Footer />
    </div>
  );
}
