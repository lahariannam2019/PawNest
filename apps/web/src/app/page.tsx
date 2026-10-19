import { Header } from '../components/layout/Header';
import { Footer } from '../components/layout/Footer';
import { Hero } from '../components/home/Hero';
import { ValuesStrip } from '../components/home/ValuesStrip';
import { ServicesBento } from '../components/home/ServicesBento';
import { HowItWorks } from '../components/home/HowItWorks';
import { SuppliesPreview } from '../components/home/SuppliesPreview';
import { PetProfileFeature } from '../components/home/PetProfileFeature';
import { SampleStories } from '../components/home/SampleStories';
import { CtaBand } from '../components/home/CtaBand';

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col bg-[var(--color-ivory-100)] text-[var(--color-charcoal-700)] selection:bg-[var(--color-sage-100)]">
      {/* 1. Header */}
      <Header />

      <main className="flex-1">
        {/* 2. Hero & Search Composer */}
        <Hero />

        {/* 3. Values Strip */}
        <ValuesStrip />

        {/* 4. Services Bento */}
        <ServicesBento />

        {/* 5. How It Works */}
        <HowItWorks />

        {/* 6. Supplies Preview */}
        <SuppliesPreview />

        {/* 8. Pet Profile Feature */}
        <PetProfileFeature />

        {/* 9. Sample Stories */}
        <SampleStories />

        {/* 10. CTA Band */}
        <CtaBand />
      </main>

      {/* 11. Footer */}
      <Footer />
    </div>
  );
}
