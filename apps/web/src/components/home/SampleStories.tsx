import * as React from 'react';
import Image from 'next/image';
import { Container } from '../layout/Container';
import { Badge } from '../ui/Badge';
import { Reveal } from '../motion/Reveal';

export function SampleStories() {
  const stories = [
    {
      name: 'Maya & Oliver',
      breed: 'Golden Retriever, 3 yrs',
      quote:
        'Finding trustworthy boarding used to take me a week of phone tag. With PawNest, Oliver’s feeding routine and vaccines are already verified, and the booking was confirmed in minutes.',
      service: 'Boarding at Clover Meadow',
      image: 'https://images.unsplash.com/photo-1537151608828-ea2b11777ee8?auto=format&fit=crop&w=400&q=80',
    },
    {
      name: 'Daniel & Maple',
      breed: 'Labradoodle Puppy, 8 mos',
      quote:
        'As a first-time puppy parent, having vet appointment scheduling alongside grooming tips and starter supplies gave me so much peace of mind.',
      service: 'Wellness Visit at Veritas Clinic',
      image: 'https://images.unsplash.com/photo-1507146426996-ef05306b995a?auto=format&fit=crop&w=400&q=80',
    },
    {
      name: 'Priya, Luna & Toby',
      breed: 'Beagle & British Shorthair',
      quote:
        'Managing care for both a dog and a cat from one family dashboard is unmatched. Grooming rebooking is literally one click.',
      service: 'Artisan Grooming & Care',
      image: 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=400&q=80',
    },
  ];

  return (
    <section className="py-20 md:py-28 bg-[var(--color-ivory-200)]/40 border-y border-[var(--color-ivory-300)]">
      <Container>
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-12 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-bold uppercase tracking-widest text-[var(--color-sage-700)]">
                Experiences
              </span>
              <Badge variant="demo">Sample Stories</Badge>
            </div>
            <h2 className="text-3xl md:text-5xl font-serif text-[var(--color-charcoal-900)] tracking-tight">
              Loved by thoughtful dog parents.
            </h2>
          </div>
          <p className="text-xs text-[var(--color-charcoal-500)] max-w-xs">
            *Representative member experiences illustrating the unified pet profile workflow.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {stories.map((s, idx) => (
            <Reveal key={s.name} delay={idx * 0.15}>
              <div className="h-full bg-[var(--color-ivory-50)] border border-[var(--color-ivory-300)] rounded-[var(--radius-xl)] p-6 flex flex-col justify-between space-y-6 shadow-[var(--shadow-1)]">
                <p className="text-sm text-[var(--color-charcoal-700)] leading-relaxed italic font-serif">
                  “{s.quote}”
                </p>

                <div className="pt-4 border-t border-[var(--color-ivory-200)] flex items-center gap-3.5">
                  <div className="relative w-12 h-12 rounded-full overflow-hidden shrink-0 border border-[var(--color-ivory-300)]">
                    <Image
                      src={s.image}
                      alt={s.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div>
                    <h4 className="font-serif text-sm font-semibold text-[var(--color-charcoal-900)]">
                      {s.name}
                    </h4>
                    <span className="text-xs text-[var(--color-charcoal-500)] block">
                      {s.breed}
                    </span>
                    <span className="text-[10px] font-semibold text-[var(--color-sage-700)] block mt-0.5">
                      {s.service}
                    </span>
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
