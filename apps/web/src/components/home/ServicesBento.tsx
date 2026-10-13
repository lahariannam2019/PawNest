import * as React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowUpRight } from 'lucide-react';
import { Container } from '../layout/Container';
import { Reveal } from '../motion/Reveal';

export function ServicesBento() {
  const services = [
    {
      title: 'Artisan Grooming',
      subtitle: 'Gentle baths, breed-specific styling & stress-free coats',
      href: '/grooming',
      image: '/images/svc-groom-01.jpg',
      span: 'lg:col-span-7 lg:row-span-2',
      tag: 'From $45',
    },
    {
      title: 'Calm Boarding & Suites',
      subtitle: 'Home-like suites with personal routines & play lawns',
      href: '/boarding',
      image: '/images/svc-board-01.jpg',
      span: 'lg:col-span-5',
      tag: 'From $65/night',
    },
    {
      title: 'Veterinary Clinics',
      subtitle: 'Routine wellness, dental care & preventative exams',
      href: '/vet',
      image: '/images/svc-vet-01.jpg',
      span: 'lg:col-span-5',
      tag: 'From $70',
    },
    {
      title: 'Curated Essentials',
      subtitle: 'Organic nutrition, ergonomic walks & orthopedic beds',
      href: '/supplies',
      image: '/images/svc-shop-01.jpg',
      span: 'lg:col-span-12',
      tag: 'Over 60 Items',
    },
  ];

  return (
    <section className="py-20 md:py-28">
      <Container>
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
          <div>
            <div className="text-xs font-bold uppercase tracking-widest text-[var(--color-sage-700)] mb-2">
              Integrated Pet Care
            </div>
            <h2 className="text-3xl md:text-5xl font-serif text-[var(--color-charcoal-900)] tracking-tight">
              Four pillars of whole-dog wellness.
            </h2>
          </div>
          <p className="text-sm md:text-base text-[var(--color-charcoal-600)] max-w-md">
            Seamlessly book between trusted services without filling out repetitive intake forms every time.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {services.map((svc, i) => (
            <div key={svc.title} className={`${svc.span} group`}>
              <Reveal delay={i * 0.1}>
                <Link
                  href={svc.href}
                  className="relative block h-72 lg:h-96 rounded-[var(--radius-xl)] overflow-hidden border border-[var(--color-ivory-300)] shadow-[var(--shadow-1)] hover:shadow-[var(--shadow-3)] transition-all duration-500"
                >
                  {/* Backdrop Image */}
                  <Image
                    src={svc.image}
                    alt={svc.title}
                    fill
                    sizes="(max-width: 1024px) 100vw, 50vw"
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  {/* Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-charcoal-900)]/80 via-[var(--color-charcoal-900)]/30 to-transparent" />

                  {/* Top Badge */}
                  <div className="absolute top-5 left-5">
                    <span className="px-3 py-1 rounded-full bg-[var(--color-ivory-50)]/90 backdrop-blur-md text-[var(--color-charcoal-900)] text-xs font-bold">
                      {svc.tag}
                    </span>
                  </div>

                  {/* Card Content & Hover Arrow */}
                  <div className="absolute bottom-6 left-6 right-6 flex items-end justify-between">
                    <div>
                      <h3 className="text-2xl font-serif text-[var(--color-ivory-50)] mb-1">
                        {svc.title}
                      </h3>
                      <p className="text-xs md:text-sm text-[var(--color-ivory-200)] max-w-md">
                        {svc.subtitle}
                      </p>
                    </div>

                    <div className="w-10 h-10 rounded-full bg-[var(--color-ivory-50)] text-[var(--color-charcoal-900)] flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-1 shadow-[var(--shadow-2)]">
                      <ArrowUpRight className="w-5 h-5" />
                    </div>
                  </div>
                </Link>
              </Reveal>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
