'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, Home, Stethoscope, ShoppingBag, MapPin, Calendar, Search } from 'lucide-react';
import { Button } from '../ui/Button';

type SearchTab = 'grooming' | 'boarding' | 'vet' | 'supplies';

export function SearchComposer() {
  const router = useRouter();
  const [activeTab, setActiveTab] = React.useState<SearchTab>('grooming');
  const [location, setLocation] = React.useState('Brooklyn, NY');
  const [date, setDate] = React.useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const query = new URLSearchParams();
    if (location) query.set('city', location);
    if (date) query.set('date', date);

    if (activeTab === 'grooming') {
      router.push(`/grooming?${query.toString()}`);
    } else if (activeTab === 'boarding') {
      router.push(`/boarding?${query.toString()}`);
    } else if (activeTab === 'vet') {
      router.push(`/vet?${query.toString()}`);
    } else {
      router.push(`/supplies?q=${encodeURIComponent(location)}`);
    }
  };

  const tabs = [
    { id: 'grooming' as const, label: 'Grooming', icon: Sparkles },
    { id: 'boarding' as const, label: 'Boarding', icon: Home },
    { id: 'vet' as const, label: 'Veterinary', icon: Stethoscope },
    { id: 'supplies' as const, label: 'Supplies', icon: ShoppingBag },
  ];

  return (
    <div className="w-full max-w-4xl mx-auto rounded-[var(--radius-xl)] bg-[var(--color-ivory-50)]/95 backdrop-blur-md border border-[var(--color-ivory-300)] p-3 md:p-4 shadow-[var(--shadow-3)]">
      {/* Category Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto pb-3 mb-2 border-b border-[var(--color-ivory-300)]/70 scrollbar-none">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all shrink-0 ${
                isActive
                  ? 'bg-[var(--color-sage-700)] text-[var(--color-ivory-50)] shadow-[var(--shadow-1)]'
                  : 'text-[var(--color-charcoal-700)] hover:bg-[var(--color-ivory-200)]'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Input Fields Bar */}
      <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-3 items-center">
        {/* Location Input */}
        <div className="md:col-span-5 relative flex items-center px-4 py-2 rounded-[var(--radius-md)] bg-[var(--color-ivory-100)] border border-[var(--color-ivory-300)] hover:border-[var(--color-sage-500)] transition-colors">
          <MapPin className="w-4 h-4 text-[var(--color-sage-600)] shrink-0 mr-3" />
          <div className="flex-1">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-[var(--color-charcoal-500)]">
              Where
            </span>
            <input
              type="text"
              suppressHydrationWarning
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Neighbourhood or city"
              className="w-full bg-transparent text-sm text-[var(--color-charcoal-900)] font-medium placeholder:text-[var(--color-charcoal-500)] focus:outline-none"
            />
          </div>
        </div>

        {/* Date / Need Input */}
        <div className="md:col-span-4 relative flex items-center px-4 py-2 rounded-[var(--radius-md)] bg-[var(--color-ivory-100)] border border-[var(--color-ivory-300)] hover:border-[var(--color-sage-500)] transition-colors">
          <Calendar className="w-4 h-4 text-[var(--color-sage-600)] shrink-0 mr-3" />
          <div className="flex-1">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-[var(--color-charcoal-500)]">
              {activeTab === 'supplies' ? 'Pet Type' : 'When'}
            </span>
            <input
              type={activeTab === 'supplies' ? 'text' : 'date'}
              suppressHydrationWarning
              value={date}
              onChange={(e) => setDate(e.target.value)}
              placeholder={activeTab === 'supplies' ? 'e.g. Adult Dog' : 'Choose date'}
              className="w-full bg-transparent text-sm text-[var(--color-charcoal-900)] font-medium placeholder:text-[var(--color-charcoal-500)] focus:outline-none"
            />
          </div>
        </div>

        {/* Submit CTA */}
        <div className="md:col-span-3">
          <Button type="submit" variant="primary" size="md" className="w-full h-[52px] gap-2">
            <Search className="w-4 h-4" />
            <span>Search Care</span>
          </Button>
        </div>
      </form>
    </div>
  );
}
