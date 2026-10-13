import * as React from 'react';
import { Shield, FileCheck, CircleDollarSign, HeartHandshake } from 'lucide-react';
import { Container } from '../layout/Container';

export function ValuesStrip() {
  const values = [
    {
      icon: Shield,
      title: 'Vetted by Process',
      desc: 'Transparent guidelines and verified care standards across every partner.',
    },
    {
      icon: FileCheck,
      title: 'One Unified Pet Profile',
      desc: 'Dietary notes, vaccine records, and temperament stored once for all bookings.',
    },
    {
      icon: CircleDollarSign,
      title: 'Clear Upfront Pricing',
      desc: 'No hidden salon add-on fees or checkout surprises. Exact quotes before booking.',
    },
    {
      icon: HeartHandshake,
      title: 'Considered Supplies',
      desc: 'Thoughtfully tested foods, natural treats, and durable lifestyle goods.',
    },
  ];

  return (
    <div className="py-12 border-y border-[var(--color-ivory-300)] bg-[var(--color-ivory-50)]/70">
      <Container>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {values.map((v, i) => {
            const Icon = v.icon;
            return (
              <div key={i} className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-[var(--radius-md)] bg-[var(--color-sage-100)] text-[var(--color-sage-700)] flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-serif text-base font-semibold text-[var(--color-charcoal-900)] mb-1">
                    {v.title}
                  </h3>
                  <p className="text-xs text-[var(--color-charcoal-600)] leading-relaxed">
                    {v.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </Container>
    </div>
  );
}
