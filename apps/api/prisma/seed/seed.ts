import { PrismaClient, Species, PetSex, SizeTier, ProviderType, BookingKind, BookingStatus, Role, EmailTokenType } from '@prisma/client';
import { hashPassword } from '../../src/lib/crypto.js';

const prisma = new PrismaClient();

async function main() {
  if (process.env.NODE_ENV === 'production' && !process.env.ALLOW_SEED_IN_PRODUCTION) {
    console.error('Seed script refused to run in production without ALLOW_SEED_IN_PRODUCTION=true');
    process.exit(1);
  }

  console.log('Seeding PawNest database...');

  // 1. Users
  const defaultPasswordHash = await hashPassword('P@wnestDemo2026!');
  const adminPasswordHash = await hashPassword('AdminSecret2026!');

  const demoUser = await prisma.user.upsert({
    where: { email: 'demo@pawnest.example' },
    update: {},
    create: {
      email: 'demo@pawnest.example',
      passwordHash: defaultPasswordHash,
      name: 'Maya Lin',
      phone: '+1 (555) 234-5678',
      role: Role.CUSTOMER,
      emailVerifiedAt: new Date(),
    },
  });

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@pawnest.example' },
    update: {},
    create: {
      email: 'admin@pawnest.example',
      passwordHash: adminPasswordHash,
      name: 'Ops Admin',
      phone: '+1 (555) 999-0000',
      role: Role.ADMIN,
      emailVerifiedAt: new Date(),
    },
  });

  const demoUser2 = await prisma.user.upsert({
    where: { email: 'demo2@pawnest.example' },
    update: {},
    create: {
      email: 'demo2@pawnest.example',
      passwordHash: defaultPasswordHash,
      name: 'Daniel Reed',
      phone: '+1 (555) 876-5432',
      role: Role.CUSTOMER,
      emailVerifiedAt: new Date(),
    },
  });

  // 2. Demo User Address
  await prisma.address.deleteMany({ where: { userId: demoUser.id } });
  await prisma.address.create({
    data: {
      userId: demoUser.id,
      label: 'Home',
      recipient: 'Maya Lin',
      line1: '142 Franklin Street',
      line2: 'Apt 4B',
      city: 'Brooklyn',
      region: 'NY',
      postalCode: '11222',
      country: 'US',
      phone: '+1 (555) 234-5678',
      isDefault: true,
    },
  });

  // 3. Pets for Maya Lin
  await prisma.pet.deleteMany({ where: { userId: demoUser.id } });

  const barnaby = await prisma.pet.create({
    data: {
      userId: demoUser.id,
      name: 'Barnaby',
      species: Species.DOG,
      breed: 'Golden Retriever',
      sex: PetSex.MALE,
      birthDate: new Date(Date.now() - 3 * 365 * 24 * 60 * 60 * 1000),
      approxAgeMonths: 36,
      weightKg: 30.5,
      sizeTier: SizeTier.L,
      neutered: true,
      microchipId: '985141002348123',
      allergies: ['Chicken meal', 'Corn'],
      conditions: ['Mild seasonal eczema'],
      medications: ['Apoquel (as needed)'],
      temperament: ['Gentle', 'Loves cuddles', 'Water enthusiast'],
      fears: ['Loud thunderstorms'],
      notes: 'Very patient during blow drying. Loves ear scratches.',
      vetClinicName: 'Greenpoint Animal Hospital',
      vaccinations: {
        create: [
          {
            name: 'Rabies (3-Year)',
            administeredOn: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000),
            expiresOn: new Date(Date.now() + 540 * 24 * 60 * 60 * 1000),
            vetName: 'Dr. Sarah Mitchell, DVM',
          },
          {
            name: 'DHPP Core Booster',
            administeredOn: new Date(Date.now() - 345 * 24 * 60 * 60 * 1000),
            expiresOn: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000), // Due in 20 days -> DUE_SOON
            vetName: 'Dr. Sarah Mitchell, DVM',
          },
          {
            name: 'Bordetella (Kennel Cough)',
            administeredOn: new Date(Date.now() - 400 * 24 * 60 * 60 * 1000),
            expiresOn: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000), // Expired 35 days ago -> EXPIRED
            vetName: 'Dr. Sarah Mitchell, DVM',
          },
        ],
      },
    },
  });

  const mochi = await prisma.pet.create({
    data: {
      userId: demoUser.id,
      name: 'Mochi',
      species: Species.DOG,
      breed: 'French Bulldog',
      sex: PetSex.FEMALE,
      birthDate: new Date(Date.now() - 18 * 30 * 24 * 60 * 60 * 1000),
      approxAgeMonths: 18,
      weightKg: 11.2,
      sizeTier: SizeTier.M,
      neutered: true,
      microchipId: '985141005512994',
      allergies: ['Beef'],
      conditions: ['Sensitive brachycephalic airway'],
      medications: [],
      temperament: ['Playful', 'Snuggly', 'Quiet'],
      fears: ['Vacuum cleaner'],
      notes: 'Please use low heat setting when drying facial folds.',
      vetClinicName: 'SoHo Veterinary Clinic',
      vaccinations: {
        create: [
          {
            name: 'Rabies (1-Year)',
            administeredOn: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
            expiresOn: new Date(Date.now() + 275 * 24 * 60 * 60 * 1000),
            vetName: 'Dr. Raymond Clark, DVM',
          },
          {
            name: 'DHPP Core Booster',
            administeredOn: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
            expiresOn: new Date(Date.now() + 275 * 24 * 60 * 60 * 1000),
            vetName: 'Dr. Raymond Clark, DVM',
          },
        ],
      },
    },
  });

  const cleo = await prisma.pet.create({
    data: {
      userId: demoUser.id,
      name: 'Cleo',
      species: Species.CAT,
      breed: 'British Shorthair',
      sex: PetSex.FEMALE,
      birthDate: new Date(Date.now() - 24 * 30 * 24 * 60 * 60 * 1000),
      approxAgeMonths: 24,
      weightKg: 4.8,
      sizeTier: SizeTier.S,
      neutered: true,
      microchipId: '985141009841221',
      allergies: [],
      conditions: [],
      medications: [],
      temperament: ['Dignified', 'Independent', 'Curious'],
      fears: ['Carrier bags'],
      notes: 'Prefers quiet rooms and low acoustic stress.',
      vetClinicName: 'Greenpoint Animal Hospital',
      vaccinations: {
        create: [
          {
            name: 'FVRCP Core Vaccine',
            administeredOn: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000),
            expiresOn: new Date(Date.now() + 245 * 24 * 60 * 60 * 1000),
            vetName: 'Dr. Sarah Mitchell, DVM',
          },
        ],
      },
    },
  });

  // 4. Providers & Groomers (8 Groomers per Appendix B)
  const groomersData = [
    {
      slug: 'the-velvet-hound-groomery',
      name: 'The Velvet Hound Groomery',
      tagline: 'Holistic coat care and stress-free hand styling',
      description: 'A serene boutique salon founded by master stylists dedicated to low-stress handling, organic botanicals, and bespoke breed trims in natural morning light.',
      addressLine: '184 Franklin St',
      city: 'Brooklyn',
      region: 'NY',
      country: 'US',
      lat: 40.7282,
      lng: -73.953,
      timezone: 'America/New_York',
      phone: '+1 (718) 555-0142',
      websiteUrl: 'https://velvethound.example',
      speciesAccepted: [Species.DOG, Species.CAT],
      amenities: ['Private Styling Suites', 'Organic Aromatherapy', 'Hydro-Massage Bath', 'Cushioned Non-Slip Tables'],
      imageKeys: ['/images/svc-groom-01.jpg', '/images/how-01.jpg', '/images/story-01.jpg'],
      ratingAvg: 4.95,
      ratingCount: 48,
      cancellationHours: 24,
      autoConfirm: true,
      isDemo: true,
    },
    {
      slug: 'whiskers-and-co-atelier',
      name: 'Whiskers & Co. Atelier',
      tagline: 'Modern editorial pet styling along the waterfront',
      description: 'DUMBO waterfront salon specializing in precision scissor work, botanical mud treatments, and tranquil private sessions designed for sensitive pets.',
      addressLine: '55 Water St',
      city: 'Brooklyn',
      region: 'NY',
      country: 'US',
      lat: 40.7033,
      lng: -73.989,
      timezone: 'America/New_York',
      phone: '+1 (718) 555-0188',
      websiteUrl: 'https://whiskersatelier.example',
      speciesAccepted: [Species.DOG, Species.CAT],
      amenities: ['Waterfront Views', 'Single-Dog Sessions', 'Ozone Spa Therapy', 'Breed-Standard Scissoring'],
      imageKeys: ['/images/hero-01.jpg', '/images/pet-01.jpg', '/images/story-02.jpg'],
      ratingAvg: 4.88,
      ratingCount: 32,
      cancellationHours: 24,
      autoConfirm: true,
      isDemo: true,
    },
    {
      slug: 'canine-couture-spa',
      name: 'Canine Couture Spa',
      tagline: 'Luxury coat restoration and therapeutic grooming',
      description: 'High-touch SoHo sanctuary offering Japanese-style styling, silk protein conditioner baths, and acoustic dampening to soothe urban pups.',
      addressLine: '422 Broome St',
      city: 'New York',
      region: 'NY',
      country: 'US',
      lat: 40.7233,
      lng: -73.9985,
      timezone: 'America/New_York',
      phone: '+1 (212) 555-0199',
      websiteUrl: 'https://caninecouture.example',
      speciesAccepted: [Species.DOG],
      amenities: ['Silk Protein Treatments', 'Quiet Dry Cabinets', 'Hand-Scissor Experts', 'Herbal Paw Soaks'],
      imageKeys: ['/images/how-02.jpg', '/images/svc-groom-01.jpg', '/images/hero-02.jpg'],
      ratingAvg: 4.92,
      ratingCount: 56,
      cancellationHours: 48,
      autoConfirm: true,
      isDemo: true,
    },
    {
      slug: 'the-gentle-brush-studio',
      name: 'The Gentle Brush Studio',
      tagline: 'Patience-first grooming for puppies and seniors',
      description: 'Park Slope neighbourhood studio offering unhurried appointments, orthopedic matting, and loving care for nervous rescues and golden oldies.',
      addressLine: '312 7th Ave',
      city: 'Brooklyn',
      region: 'NY',
      country: 'US',
      lat: 40.671,
      lng: -73.978,
      timezone: 'America/New_York',
      phone: '+1 (718) 555-0164',
      websiteUrl: 'https://gentlebrush.example',
      speciesAccepted: [Species.DOG, Species.CAT],
      amenities: ['Senior Orthopedic Support', 'Puppy Socialization', 'Hypoallergenic Shampoos', 'Fear-Free Certified'],
      imageKeys: ['/images/how-03.jpg', '/images/story-03.jpg', '/images/svc-groom-01.jpg'],
      ratingAvg: 4.85,
      ratingCount: 29,
      cancellationHours: 24,
      autoConfirm: true,
      isDemo: true,
    },
    {
      slug: 'paw-and-palm-grooming-bar',
      name: 'Paw & Palm Grooming Bar',
      tagline: 'Warm botanicals, natural conditioning and calm care',
      description: 'Lush Williamsburg oasis offering restorative herbal baths, deshedding treatments, and contemporary trims for modern city dogs.',
      addressLine: '228 Bedford Ave',
      city: 'Brooklyn',
      region: 'NY',
      country: 'US',
      lat: 40.7144,
      lng: -73.9553,
      timezone: 'America/New_York',
      phone: '+1 (718) 555-0131',
      websiteUrl: 'https://pawandpalm.example',
      speciesAccepted: [Species.DOG],
      amenities: ['Warm Botanical Rinses', 'Blueberry Facials', 'Deshedding Champions', 'Glass Salon Viewing'],
      imageKeys: ['/images/story-01.jpg', '/images/hero-01.jpg', '/images/how-01.jpg'],
      ratingAvg: 4.79,
      ratingCount: 41,
      cancellationHours: 24,
      autoConfirm: true,
      isDemo: true,
    },
    {
      slug: 'meadow-and-mane-dog-spa',
      name: 'Meadow & Mane Dog Spa',
      tagline: 'Editorial scissoring and organic coat wellness',
      description: 'West Village salon inspired by European grooming traditions. Focused on low-noise dryers, non-chemical botanical perfumes, and calm breed styling.',
      addressLine: '74 Charles St',
      city: 'New York',
      region: 'NY',
      country: 'US',
      lat: 40.7358,
      lng: -74.0036,
      timezone: 'America/New_York',
      phone: '+1 (212) 555-0177',
      websiteUrl: 'https://meadowandmane.example',
      speciesAccepted: [Species.DOG, Species.CAT],
      amenities: ['Acoustic Isolation', 'European Breed Trims', 'Nagayu CO2 Therapy', 'Private Check-In'],
      imageKeys: ['/images/story-02.jpg', '/images/svc-groom-01.jpg', '/images/pet-01.jpg'],
      ratingAvg: 4.97,
      ratingCount: 64,
      cancellationHours: 48,
      autoConfirm: true,
      isDemo: true,
    },
    {
      slug: 'pawsitive-glow-salon',
      name: 'Pawsitive Glow Salon',
      tagline: 'Friendly neighborhood care with a gentle touch',
      description: 'Cobble Hill favorite featuring quick turnaround sanitary trims, gentle puppy introductions, and warm, patient staff.',
      addressLine: '194 Court St',
      city: 'Brooklyn',
      region: 'NY',
      country: 'US',
      lat: 40.6865,
      lng: -73.9962,
      timezone: 'America/New_York',
      phone: '+1 (718) 555-0122',
      websiteUrl: 'https://pawsitiveglow.example',
      speciesAccepted: [Species.DOG],
      amenities: ['Fast Express Styling', 'Gentle Puppy Intro', 'Oatmeal Baths', 'Walk-in Nail Trims'],
      imageKeys: ['/images/how-01.jpg', '/images/hero-02.jpg', '/images/story-03.jpg'],
      ratingAvg: 4.75,
      ratingCount: 22,
      cancellationHours: 12,
      autoConfirm: true,
      isDemo: true,
    },
    {
      slug: 'urban-bark-studio',
      name: 'Urban Bark Studio',
      tagline: 'Precision trims for active, adventurous city hounds',
      description: 'Contemporary Chelsea loft studio equipped with modern hydro-baths, hypoallergenic coat treatments, and hand-stripping expertise.',
      addressLine: '160 W 22nd St',
      city: 'New York',
      region: 'NY',
      country: 'US',
      lat: 40.7465,
      lng: -74.0014,
      timezone: 'America/New_York',
      phone: '+1 (212) 555-0115',
      websiteUrl: 'https://urbanbark.example',
      speciesAccepted: [Species.DOG],
      amenities: ['Hand-Stripping Specialist', 'High-Velocity Low-Heat Dry', 'Organic Flea Rinses', 'Spacious Suites'],
      imageKeys: ['/images/pet-01.jpg', '/images/how-02.jpg', '/images/story-01.jpg'],
      ratingAvg: 4.82,
      ratingCount: 37,
      cancellationHours: 24,
      autoConfirm: true,
      isDemo: true,
    },
  ];

  for (const g of groomersData) {
    const provider = await prisma.provider.upsert({
      where: { slug: g.slug },
      update: { ...g, ratingAvg: g.ratingAvg, type: ProviderType.GROOMER },
      create: { ...g, ratingAvg: g.ratingAvg, type: ProviderType.GROOMER },
    });

    // Business Hours: Monday to Saturday (1..6) 09:00 - 18:00
    for (let day = 1; day <= 6; day++) {
      await prisma.providerHours.upsert({
        where: {
          providerId_weekday_opensAt: {
            providerId: provider.id,
            weekday: day,
            opensAt: '09:00',
          },
        },
        update: { closesAt: '18:00', stations: 2 },
        create: {
          providerId: provider.id,
          weekday: day,
          opensAt: '09:00',
          closesAt: '18:00',
          stations: 2,
        },
      });
    }

    // Services
    const services = [
      {
        name: 'Full Editorial Groom & Bath',
        description: 'Complete bath, double organic shampoo, precision scissor styling, nail clip, ear clean, and blow-dry.',
        durationMin: 90,
        bufferMin: 15,
        basePriceCents: 8500,
        sizePricing: { XS: 0, S: 500, M: 1500, L: 2500, XL: 4000 },
        species: [Species.DOG],
        isAddOn: false,
      },
      {
        name: 'Bath, Brush & De-Shed Treatment',
        description: 'Hydro-massage bath with coat conditioning, high-velocity blow-out, undercoat carding, and paw tidy.',
        durationMin: 60,
        bufferMin: 10,
        basePriceCents: 5500,
        sizePricing: { XS: 0, S: 500, M: 1000, L: 2000, XL: 3000 },
        species: [Species.DOG],
        isAddOn: false,
      },
      {
        name: 'Puppy First Spa Introduction',
        description: 'Patience-led gentle introduction to warm water, soft brush, paw handling, and low-frequency blower.',
        durationMin: 45,
        bufferMin: 15,
        basePriceCents: 4500,
        sizePricing: null,
        species: [Species.DOG],
        isAddOn: false,
      },
      {
        name: 'Sanitary Trim & Paw Care',
        description: 'Pad shaving, sanitary hygiene trim, nail smoothing, and soothing botanical balm application.',
        durationMin: 30,
        bufferMin: 10,
        basePriceCents: 3500,
        sizePricing: null,
        species: [Species.DOG, Species.CAT],
        isAddOn: false,
      },
      // Add-ons
      {
        name: 'Oatmeal Soothing Soak',
        description: 'Colloidal oatmeal rinse formulated to reduce itching and moisturize dry seasonal skin.',
        durationMin: 10,
        bufferMin: 0,
        basePriceCents: 1500,
        sizePricing: null,
        species: [Species.DOG, Species.CAT],
        isAddOn: true,
      },
      {
        name: 'Blueberry Facial & Teeth Clean',
        description: 'Gentle tear-stain cleansing foam followed by enzymatic enzymatic gel teeth brushing.',
        durationMin: 15,
        bufferMin: 0,
        basePriceCents: 2000,
        sizePricing: null,
        species: [Species.DOG],
        isAddOn: true,
      },
      {
        name: 'Nagayu CO2 Skin Treatment',
        description: 'Japanese carbonated hydrotherapy tablet improving microcirculation and coat health.',
        durationMin: 15,
        bufferMin: 0,
        basePriceCents: 2500,
        sizePricing: null,
        species: [Species.DOG],
        isAddOn: true,
      },
    ];

    for (const svc of services) {
      const existing = await prisma.service.findFirst({
        where: { providerId: provider.id, name: svc.name },
      });
      if (existing) {
        await prisma.service.update({
          where: { id: existing.id },
          data: {
            ...svc,
            kind: BookingKind.GROOMING,
          },
        });
      } else {
        await prisma.service.create({
          data: {
            ...svc,
            providerId: provider.id,
            kind: BookingKind.GROOMING,
            currency: 'USD',
          },
        });
      }
    }
  }

  // 5. Sample Reviews for Groomers
  const sampleGroomer = await prisma.provider.findUnique({
    where: { slug: 'the-velvet-hound-groomery' },
    include: { services: true },
  });

  if (sampleGroomer && sampleGroomer.services[0]) {
    // Create completed booking to attach review to
    const pastBookingRef = 'PN-GRM-SEED01';
    let pastBooking = await prisma.booking.findUnique({
      where: { reference: pastBookingRef },
    });
    if (!pastBooking) {
      pastBooking = await prisma.booking.create({
        data: {
          reference: pastBookingRef,
          userId: demoUser.id,
          petId: barnaby.id,
          providerId: sampleGroomer.id,
          serviceId: sampleGroomer.services[0].id,
          kind: BookingKind.GROOMING,
          status: BookingStatus.COMPLETED,
          startsAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
          endsAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000 + 90 * 60 * 1000),
          priceCents: 11000,
          currency: 'USD',
          priceBreakdown: {
            baseCents: 8500,
            sizeAdjustmentCents: 2500,
            addOnsCents: 0,
            totalCents: 11000,
          },
          isDemo: true,
        },
      });
    }

    await prisma.review.upsert({
      where: { bookingId: pastBooking.id },
      update: {},
      create: {
        userId: demoUser.id,
        providerId: sampleGroomer.id,
        bookingId: pastBooking.id,
        rating: 5,
        title: 'Barnaby looks absolutely radiant and calm!',
        body: 'Barnaby usually gets nervous with loud blowers, but the team at Velvet Hound was so patient and gentle. His golden coat feels like silk and he left with a happy tail wag.',
        isSample: true,
      },
    });

    // Create an upcoming booking for Mochi
    const upcomingBookingRef = 'PN-GRM-SEED02';
    const upcomingDate = new Date(Date.now() + 4 * 24 * 60 * 60 * 1000);
    upcomingDate.setUTCHours(14, 0, 0, 0);

    const existingUpcoming = await prisma.booking.findUnique({
      where: { reference: upcomingBookingRef },
    });
    if (!existingUpcoming) {
      await prisma.booking.create({
        data: {
          reference: upcomingBookingRef,
          userId: demoUser.id,
          petId: mochi.id,
          providerId: sampleGroomer.id,
          serviceId: sampleGroomer.services[1].id,
          kind: BookingKind.GROOMING,
          status: BookingStatus.CONFIRMED,
          startsAt: upcomingDate,
          endsAt: new Date(upcomingDate.getTime() + 60 * 60 * 1000),
          priceCents: 6500,
          currency: 'USD',
          priceBreakdown: {
            baseCents: 5500,
            sizeAdjustmentCents: 1000,
            addOnsCents: 0,
            totalCents: 6500,
          },
          isDemo: true,
        },
      });
    }
  }

  console.log('Seed completed successfully!');
  console.log('Demo Credentials:');
  console.log('  Customer: demo@pawnest.example / P@wnestDemo2026!');
  console.log('  Admin:    admin@pawnest.example / AdminSecret2026!');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
