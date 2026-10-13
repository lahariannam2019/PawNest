import { Header } from '../../../components/layout/Header';
import { Footer } from '../../../components/layout/Footer';
import { Container } from '../../../components/layout/Container';
import { Badge } from '../../../components/ui/Badge';
import { AlertCircle } from 'lucide-react';
import { FeaturedProviders } from '../../../components/home/FeaturedProviders';

export default function VetPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[var(--color-ivory-100)]">
      <Header />
      <main className="flex-1 py-8 md:py-16">
        <Container>
          {/* Section 9.4 Emergency Disclaimer Banner */}
          <div className="mb-10 p-4 rounded-[var(--radius-lg)] bg-[var(--color-peach-100)]/70 border border-[var(--color-peach-400)]/60 text-[var(--color-peach-700)] flex items-start gap-3">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="text-xs leading-relaxed">
              <span className="font-bold">Medical Notice:</span> For medical emergencies, contact your nearest 24/7 emergency veterinary hospital immediately. PawNest appointments are for non-emergency preventative wellness, routine vaccinations, and check-ups.
            </div>
          </div>

          <div className="max-w-2xl mb-12 space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-widest text-[var(--color-sage-700)]">
                Clinical Care
              </span>
              <Badge variant="demo">Phase 6 Ready</Badge>
            </div>
            <h1 className="text-4xl md:text-5xl font-serif text-[var(--color-charcoal-900)]">
              Veterinary Clinics & Exams
            </h1>
            <p className="text-base text-[var(--color-charcoal-600)]">
              Book scheduled health check-ups, dental reviews, and vaccinations with verified neighborhood veterinary doctors.
            </p>
          </div>
        </Container>
        <FeaturedProviders />
      </main>
      <Footer />
    </div>
  );
}
