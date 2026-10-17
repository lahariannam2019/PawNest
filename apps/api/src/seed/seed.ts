import { PrismaClient, Species, PetSex, SizeTier, ProviderType, BookingKind, BookingStatus, Role, EmailTokenType } from '@prisma/client';
import { hashPassword } from '../lib/crypto.js';
import { seedProductsAndOrders } from './products-seed.js';

const defaultPrisma = new PrismaClient();

export async function runSeed(prismaClient?: PrismaClient) {
  const prisma = prismaClient || defaultPrisma;
  console.log('Seeding PawNest database...');

  // Ensure schema compatibility for Booking, ProductVariant, and ProductReview
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "Booking" 
    ADD COLUMN IF NOT EXISTS "emergencyAcknowledged" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS "reminderSentAt" TIMESTAMP(3),
    ADD COLUMN IF NOT EXISTS "reminderJobId" TEXT;
  `).catch((e: any) => {
    console.warn('Could not run raw alter table for Booking:', e.message);
  });

  await prisma.$executeRawUnsafe(`
    ALTER TABLE "ProductVariant" ADD COLUMN IF NOT EXISTS "weightGrams" INTEGER;
  `).catch((e: any) => {
    console.warn('Could not run raw alter table for ProductVariant:', e.message);
  });

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "ProductReview" (
      "id" TEXT NOT NULL,
      "productId" TEXT NOT NULL,
      "userId" TEXT NOT NULL,
      "rating" INTEGER NOT NULL,
      "title" TEXT,
      "body" TEXT NOT NULL,
      "isSample" BOOLEAN NOT NULL DEFAULT false,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "ProductReview_pkey" PRIMARY KEY ("id")
    );
    CREATE INDEX IF NOT EXISTS "ProductReview_productId_createdAt_idx" ON "ProductReview"("productId", "createdAt");
  `).catch((e: any) => {
    console.warn('Could not run raw create table for ProductReview:', e.message);
  });

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
  await prisma.review.deleteMany({ where: { userId: demoUser.id } });
  await prisma.booking.deleteMany({ where: { userId: demoUser.id } });
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

  const luna = await prisma.pet.create({
    data: {
      userId: demoUser.id,
      name: 'Luna',
      species: Species.DOG,
      breed: 'Golden Retriever',
      sex: PetSex.FEMALE,
      birthDate: new Date(Date.now() - 2 * 365 * 24 * 60 * 60 * 1000),
      approxAgeMonths: 24,
      weightKg: 28.0,
      sizeTier: SizeTier.L,
      neutered: true,
      microchipId: '985141009941829',
      allergies: [],
      conditions: [],
      medications: [],
      temperament: ['Friendly', 'Social', 'Gentle with other dogs'],
      fears: [],
      notes: 'Loves group play and swimming. Very food motivated.',
      vetClinicName: 'Greenpoint Animal Hospital',
      vaccinations: {
        create: [
          {
            name: 'Rabies (3-Year)',
            administeredOn: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
            expiresOn: new Date(Date.now() + 660 * 24 * 60 * 60 * 1000), // Valid for nearly 2 years
            vetName: 'Dr. Sarah Mitchell, DVM',
          },
          {
            name: 'DHPP Core Booster',
            administeredOn: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
            expiresOn: new Date(Date.now() + 300 * 24 * 60 * 60 * 1000), // Valid for 300 days
            vetName: 'Dr. Sarah Mitchell, DVM',
          },
          {
            name: 'Bordetella (Oral)',
            administeredOn: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            expiresOn: new Date(Date.now() + 335 * 24 * 60 * 60 * 1000), // Valid for 335 days
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
      imageKeys: ['/images/providers/the-velvet-hound-groomery.jpg'],
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
      imageKeys: ['/images/providers/whiskers-and-co-atelier.jpg'],
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
      imageKeys: ['/images/providers/canine-couture-spa.jpg'],
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
      imageKeys: ['/images/providers/the-gentle-brush-studio.jpg'],
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
      imageKeys: ['/images/providers/paw-and-palm-grooming-bar.jpg'],
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
      imageKeys: ['/images/providers/meadow-and-mane-dog-spa.jpg'],
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
      imageKeys: ['/images/providers/pawsitive-glow-salon.jpg'],
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
      imageKeys: ['/images/providers/urban-bark-studio.jpg'],
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
      const serviceData: any = {
        name: svc.name,
        description: svc.description,
        durationMin: svc.durationMin,
        bufferMin: svc.bufferMin,
        basePriceCents: svc.basePriceCents,
        species: svc.species,
        isAddOn: svc.isAddOn,
        kind: BookingKind.GROOMING,
      };
      if (svc.sizePricing) {
        serviceData.sizePricing = svc.sizePricing;
      }
      if (existing) {
        await prisma.service.update({
          where: { id: existing.id },
          data: serviceData,
        });
      } else {
        await prisma.service.create({
          data: {
            ...serviceData,
            providerId: provider.id,
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

  // 6. Boarding Facilities & Suites (5 Facilities per Appendix B)
  const boardingData = [
    {
      slug: 'meadowbrook-canine-retreat',
      name: 'Meadowbrook Canine Retreat & Lodge',
      tagline: 'Country-club style boarding with expansive private play lawns',
      description: 'Set on quiet leafy acreage in Millbrook with private heated and air-conditioned suites, orthopaedic bedding, and three daily outdoor play sessions.',
      addressLine: '42 Country Club Way',
      city: 'Millbrook',
      region: 'NY',
      country: 'US',
      lat: 41.785,
      lng: -73.6934,
      timezone: 'America/New_York',
      phone: '+1 (845) 677-9201',
      speciesAccepted: [Species.DOG],
      amenities: ['Private Outdoor Run', 'Orthopaedic Bedding', '24/7 Veterinary Supervision', 'Webcam Suite Access', 'Daily Group Play', 'Medication Support'],
      imageKeys: ['/images/providers/meadowbrook-canine-retreat.jpg'],
      ratingAvg: 4.95,
      ratingCount: 48,
      cancellationHours: 48,
      units: [
        {
          name: 'Deluxe Garden Suite',
          description: 'Spacious private suite featuring direct access to a private grass yard, raised memory foam bed, and soundproof acoustic walls.',
          capacity: 6,
          maxPets: 2,
          nightlyCents: 7500,
          amenities: ['Private Grass Yard', 'Memory Foam Bed', 'Soundproof Walls', '2x Daily Walks'],
        },
        {
          name: 'Penthouse Canine Suite',
          description: 'Ultra-luxe suite with panoramic daylight views, 24/7 high-definition suite webcam, bedtime tuck-in service, and organic nightcap treat.',
          capacity: 3,
          maxPets: 2,
          nightlyCents: 12000,
          amenities: ['24/7 Suite Webcam', 'Bedtime Tuck-in', 'Gourmet Nightly Treat', 'Dedicated Concierge'],
        },
        {
          name: 'Classic Lodge Room',
          description: 'Comfortable, climate-controlled slumber pod designed for restful sleep after active days in the agility yard.',
          capacity: 10,
          maxPets: 1,
          nightlyCents: 5500,
          amenities: ['Climate Controlled', 'Daily Housekeeping', 'Activity Yard Access', 'Fresh Bedding Daily'],
        },
      ],
      addOns: [
        { name: 'Extended Nature Trail Hike (45 min)', description: 'One-on-one guided woodland scent walk with personal caregiver.', basePriceCents: 3000, durationMin: 45 },
        { name: 'Bedtime Snuggle & Paw Balm Massage', description: 'Gentle paw massage with organic shea butter and soothing lavender mist.', basePriceCents: 2000, durationMin: 20 },
        { name: 'Gourmet Kong Stuffer (Peanut Butter & Pumpkin)', description: 'Frozen enrichment toy packed with organic peanut butter, blueberries, and pumpkin puree.', basePriceCents: 1200, durationMin: 15 },
        { name: 'Medication Administration', description: 'Administered precisely on schedule by trained staff with medical log verification.', basePriceCents: 1000, durationMin: 10 },
      ],
    },
    {
      slug: 'the-urban-haven-dog-hotel',
      name: 'The Urban Haven Dog Hotel',
      tagline: 'Boutique overnight hotel and holistic wellness sanctuary',
      description: 'Located in DUMBO with lofted ceilings, ambient soundscapes, individual suites with private glass entries, and twice-daily rooftop strolls overlooking the Manhattan skyline.',
      addressLine: '74 Water Street',
      city: 'Brooklyn',
      region: 'NY',
      country: 'US',
      lat: 40.7033,
      lng: -73.9892,
      timezone: 'America/New_York',
      phone: '+1 (718) 555-0144',
      speciesAccepted: [Species.DOG],
      amenities: ['Rooftop Play Yard', 'Aromatherapy Mist', '24/7 On-Site Attendant', 'Nightly Storytime', 'Gourmet Meal Service'],
      imageKeys: ['/images/providers/the-urban-haven-dog-hotel.jpg'],
      ratingAvg: 4.91,
      ratingCount: 37,
      cancellationHours: 24,
      units: [
        {
          name: 'DUMBO Loft Suite',
          description: 'Spacious exposed-brick loft room with plush tufted bed, ambient noise machine, and gentle dimming lights.',
          capacity: 5,
          maxPets: 2,
          nightlyCents: 8500,
          amenities: ['Exposed Brick Loft', 'Sound Machine', 'Rooftop Access', 'Daily Photo Update'],
        },
        {
          name: 'Executive Skyline Suite',
          description: 'Corner room with custom furniture, personal air purification, live streaming video camera, and individual concierge.',
          capacity: 2,
          maxPets: 2,
          nightlyCents: 14000,
          amenities: ['Private Webcam', 'Personal Air Purifier', 'Evening Rooftop Stroll', 'Hand-Crafted Treats'],
        },
        {
          name: 'Cosy Snug Suite',
          description: 'Intimate, warm bedroom designed specifically to reduce anxiety in puppies and smaller dogs.',
          capacity: 8,
          maxPets: 1,
          nightlyCents: 6500,
          amenities: ['Calming Pheromone Diffuser', 'Cuddle Blanket', 'Quiet Zone', '2x Daily Walks'],
        },
      ],
      addOns: [
        { name: 'Rooftop Sunset Stroll (30 min)', description: 'Private evening promenade with stunning sunset views of Brooklyn Bridge.', basePriceCents: 2500, durationMin: 30 },
        { name: 'Departure Cleanse & Fluff Dry', description: 'Fresh bath and thorough coat blowout before heading home.', basePriceCents: 4500, durationMin: 45 },
      ],
    },
    {
      slug: 'whispering-pines-boarding',
      name: 'Whispering Pines Boarding & Spa',
      tagline: 'Spacious country suites with dedicated personal caregivers',
      description: 'A peaceful woodland campus designed to eliminate kennel stress. Every guest receives individual one-on-one attention, enrichment games, and tailored feeding routines.',
      addressLine: '185 Pine Ridge Road',
      city: 'Bedford',
      region: 'NY',
      country: 'US',
      lat: 41.2043,
      lng: -73.6437,
      timezone: 'America/New_York',
      phone: '+1 (914) 234-7800',
      speciesAccepted: [Species.DOG, Species.CAT],
      amenities: ['Forest Nature Trails', 'Separate Feline Wing', '24/7 Caregiver', 'Specialized Diets', 'Heated Floors'],
      imageKeys: ['/images/providers/whispering-pines-boarding.jpg'],
      ratingAvg: 4.88,
      ratingCount: 29,
      cancellationHours: 48,
      units: [
        {
          name: 'Pine Ridge Canine Suite',
          description: 'Expansive private bedroom with heated slate floors, raised orthopaedic cot, and double-insulated walls for acoustic calm.',
          capacity: 6,
          maxPets: 2,
          nightlyCents: 7000,
          amenities: ['Heated Slate Floors', 'Orthopaedic Bed', 'Nature Trail Walk', 'Daily Brushing'],
        },
        {
          name: 'Serenity Feline Chalet',
          description: 'Multi-level vertical climbing towers, bird-watching window perches, and soothing feline pheromones in a 100% dog-free wing.',
          capacity: 4,
          maxPets: 1,
          nightlyCents: 4500,
          amenities: ['Bird-Watching Perch', 'Multi-Level Tower', 'Separate Quiet Wing', 'Individual Playtime'],
        },
        {
          name: 'Woodland Family Cabin',
          description: 'Large suite sized comfortably for two to three dogs from the same household to stay and play together.',
          capacity: 2,
          maxPets: 3,
          nightlyCents: 13000,
          amenities: ['Multi-Pet Capacity', 'Double Play Yards', 'Family Cuddle Time', 'Private Yard'],
        },
      ],
      addOns: [
        { name: 'Forest Agility & Scent Games', description: 'Interactive sensory exploration and agility exercises in our secure wooded enclosure.', basePriceCents: 2800, durationMin: 35 },
        { name: 'Herbal Paw & Coat Conditioner', description: 'Organic botanical leave-in coat spray and gentle paw pad moisturizer.', basePriceCents: 1500, durationMin: 15 },
      ],
    },
    {
      slug: 'greenwich-village-pet-oasis',
      name: 'Greenwich Village Pet Oasis',
      tagline: 'Quiet sanctuary suites in the heart of downtown Manhattan',
      description: 'Tailored for urban dogs who cherish calm routines. Sound-dampened suites, soothing classical music, individual leash walks in Washington Square, and organic treats.',
      addressLine: '210 Bleecker Street',
      city: 'New York',
      region: 'NY',
      country: 'US',
      lat: 40.7295,
      lng: -74.0021,
      timezone: 'America/New_York',
      phone: '+1 (212) 555-0199',
      speciesAccepted: [Species.DOG],
      amenities: ['Private Leash Walks', 'Organic Treats', 'Medical Care Administration', 'Webcam Live Feed', 'Air Purification'],
      imageKeys: ['/images/providers/greenwich-village-pet-oasis.jpg'],
      ratingAvg: 4.93,
      ratingCount: 41,
      cancellationHours: 24,
      units: [
        {
          name: 'Village Classic Suite',
          description: 'Chic downtown bedroom equipped with orthopaedic bolsters, HEPA medical-grade air filtration, and calming acoustics.',
          capacity: 6,
          maxPets: 1,
          nightlyCents: 8000,
          amenities: ['HEPA Air Filter', 'Orthopaedic Bolster Bed', '2x Neighborhood Walks', 'Evening Treat'],
        },
        {
          name: 'Washington Square Penthouse',
          description: 'Spacious suite with floor-to-ceiling soundproof glass, personal webcam feed, and private concierge park strolls.',
          capacity: 2,
          maxPets: 2,
          nightlyCents: 13500,
          amenities: ['Webcam Stream', 'Park Strolls', 'Gourmet Bedtime Bowl', 'Concierge Updates'],
        },
      ],
      addOns: [
        { name: 'Private Washington Square Excursion', description: 'Dedicated personal walker for 45 minutes of calm park exploration.', basePriceCents: 3200, durationMin: 45 },
      ],
    },
    {
      slug: 'prospect-park-paws-respite',
      name: 'Prospect Park Paws Respite',
      tagline: 'Modern boutique boarding adjacent to Prospect Park',
      description: 'Designed around natural daylight, large secure play pavilions, and individual climate-controlled slumber pods for maximum rest after active park days.',
      addressLine: '320 7th Avenue',
      city: 'Brooklyn',
      region: 'NY',
      country: 'US',
      lat: 40.6695,
      lng: -73.9812,
      timezone: 'America/New_York',
      phone: '+1 (718) 555-0182',
      speciesAccepted: [Species.DOG, Species.CAT],
      amenities: ['Park Excursions', 'Daylight Atrium', '24/7 Monitoring', 'Sensory Enrichment', 'Grooming Add-ons'],
      imageKeys: ['/images/providers/prospect-park-paws-respite.jpg'],
      ratingAvg: 4.97,
      ratingCount: 52,
      cancellationHours: 24,
      units: [
        {
          name: 'Park View Garden Suite',
          description: 'Sunny ground-floor suite looking out onto landscaped courtyards with plush bedding and private quiet zone.',
          capacity: 5,
          maxPets: 2,
          nightlyCents: 7800,
          amenities: ['Courtyard View', 'Plush Bedding', '2x Park Outings', 'Sound Insulation'],
        },
        {
          name: 'Atrium Slumber Pod',
          description: 'Cozy, den-like sleeping pod engineered for restful restorative sleep after active daycare sessions.',
          capacity: 8,
          maxPets: 1,
          nightlyCents: 6200,
          amenities: ['Restorative Acoustic Pod', 'Calming Lighting', 'Park Outing', 'Nightly Check-in'],
        },
        {
          name: 'Clementine Feline Sanctuary',
          description: 'Tranquil kitty suite with climbing bridges, interactive puzzle feeders, and floor-to-ceiling sun perches in a quiet feline retreat.',
          capacity: 4,
          maxPets: 1,
          nightlyCents: 4800,
          amenities: ['Climbing Bridges', 'Sun Perch', 'Puzzle Feeders', 'Catnip Play Sessions'],
        },
      ],
      addOns: [
        { name: 'Prospect Park Long-Leash Adventure (60 min)', description: 'Fun, invigorating nature adventure through the ravine trails.', basePriceCents: 3500, durationMin: 60 },
        { name: 'Evening Brush & Belly Rub Session', description: 'Relaxing 20-minute unwinding session before tuck-in.', basePriceCents: 1800, durationMin: 20 },
      ],
    },
  ];

  let firstBoardingProvider: any = null;
  let firstBoardingUnit: any = null;

  for (const b of boardingData) {
    const { units, addOns, ...providerData } = b;
    const provider = await prisma.provider.upsert({
      where: { slug: providerData.slug },
      update: {
        ...providerData,
        type: ProviderType.BOARDING,
        isDemo: true,
        isActive: true,
      },
      create: {
        ...providerData,
        type: ProviderType.BOARDING,
        isDemo: true,
        isActive: true,
      },
    });

    if (!firstBoardingProvider) firstBoardingProvider = provider;

    // Hours (08:00 - 19:00 Mon-Sun)
    for (let day = 0; day <= 6; day++) {
      await prisma.providerHours.upsert({
        where: {
          providerId_weekday_opensAt: {
            providerId: provider.id,
            weekday: day,
            opensAt: '08:00',
          },
        },
        update: { closesAt: '19:00', stations: 5 },
        create: {
          providerId: provider.id,
          weekday: day,
          opensAt: '08:00',
          closesAt: '19:00',
          stations: 5,
        },
      });
    }

    // Boarding Units
    for (const unit of units) {
      const existingUnit = await prisma.boardingUnit.findFirst({
        where: { providerId: provider.id, name: unit.name },
      });
      let savedUnit;
      if (existingUnit) {
        savedUnit = await prisma.boardingUnit.update({
          where: { id: existingUnit.id },
          data: unit,
        });
      } else {
        savedUnit = await prisma.boardingUnit.create({
          data: {
            ...unit,
            providerId: provider.id,
            currency: 'USD',
          },
        });
      }
      if (!firstBoardingUnit) firstBoardingUnit = savedUnit;
    }

    // Add-on services
    for (const svc of addOns) {
      const existingSvc = await prisma.service.findFirst({
        where: { providerId: provider.id, name: svc.name },
      });
      if (existingSvc) {
        await prisma.service.update({
          where: { id: existingSvc.id },
          data: {
            ...svc,
            kind: BookingKind.BOARDING,
            isAddOn: true,
          },
        });
      } else {
        await prisma.service.create({
          data: {
            ...svc,
            providerId: provider.id,
            kind: BookingKind.BOARDING,
            isAddOn: true,
            currency: 'USD',
            bufferMin: 0,
            species: providerData.speciesAccepted,
          },
        });
      }
    }

    // Sample Reviews
    const sampleReviews = [
      {
        userName: 'Elena Rostova',
        rating: 5,
        title: 'Complete peace of mind while away on travel',
        body: 'Finding boarding for a dog with sensitive digestion was terrifying until we discovered this sanctuary. The daily updates and webcam made our trip stress-free.',
      },
      {
        userName: 'Marcus Sterling',
        rating: 5,
        title: 'Spacious suites and deeply caring staff',
        body: 'The private outdoor yard attached to the suite is worth every penny. Our retriever came home refreshed, happy, and smelling wonderful.',
      },
      {
        userName: 'Chloe Bennett',
        rating: 5,
        title: 'Clean, serene and beautifully managed',
        body: 'Zero loud kennel noise. You can tell real thought went into the acoustics and bedding. We will never board anywhere else.',
      },
    ];

    for (let i = 0; i < sampleReviews.length; i++) {
      const rev = sampleReviews[i];
      const seedBookingRef = `PN-BND-REV-${provider.slug.slice(0, 8)}-${i}`;
      let seedBooking = await prisma.booking.findUnique({ where: { reference: seedBookingRef } });
      if (!seedBooking) {
        const pastDate = new Date(Date.now() - (30 + i * 15) * 24 * 60 * 60 * 1000);
        seedBooking = await prisma.booking.create({
          data: {
            reference: seedBookingRef,
            userId: demoUser.id,
            petId: luna.id,
            providerId: provider.id,
            boardingUnitId: firstBoardingUnit ? firstBoardingUnit.id : null,
            kind: BookingKind.BOARDING,
            status: BookingStatus.COMPLETED,
            startsAt: pastDate,
            endsAt: new Date(pastDate.getTime() + 3 * 24 * 60 * 60 * 1000),
            priceCents: 22500,
            currency: 'USD',
            priceBreakdown: {
              nights: 3,
              nightlyCents: 7500,
              baseCents: 22500,
              addOnsCents: 0,
              totalCents: 22500,
            },
            isDemo: true,
          },
        });
      }

      await prisma.review.upsert({
        where: { bookingId: seedBooking.id },
        update: {},
        create: {
          userId: demoUser.id,
          providerId: provider.id,
          bookingId: seedBooking.id,
          rating: rev.rating,
          title: rev.title,
          body: rev.body,
          isSample: true,
        },
      });
    }
  }

  // 7. Seed Past & Upcoming Boarding Bookings for Maya & Luna
  if (firstBoardingProvider && firstBoardingUnit) {
    const demoPastBoardingRef = 'PN-BND-SEED01';
    let pastBoarding = await prisma.booking.findUnique({ where: { reference: demoPastBoardingRef } });
    if (!pastBoarding) {
      const pastStart = new Date(Date.now() - 21 * 24 * 60 * 60 * 1000);
      pastBoarding = await prisma.booking.create({
        data: {
          reference: demoPastBoardingRef,
          userId: demoUser.id,
          petId: luna.id,
          providerId: firstBoardingProvider.id,
          boardingUnitId: firstBoardingUnit.id,
          kind: BookingKind.BOARDING,
          status: BookingStatus.COMPLETED,
          startsAt: pastStart,
          endsAt: new Date(pastStart.getTime() + 3 * 24 * 60 * 60 * 1000),
          priceCents: 22500,
          currency: 'USD',
          priceBreakdown: {
            nights: 3,
            nightlyCents: 7500,
            baseCents: 22500,
            addOnsCents: 0,
            totalCents: 22500,
          },
          careInstructions: {
            feeding: '2 cups Acana Pacifica morning and evening',
            medications: 'None',
            behaviour: 'Gentle, loves social group play',
            emergencyContact: 'Maya Lin: +1 (555) 234-5678',
          },
          isDemo: true,
        },
      });
    }

    const demoUpcomingBoardingRef = 'PN-BND-SEED02';
    const upcomingStart = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);
    upcomingStart.setUTCHours(14, 0, 0, 0);
    const upcomingEnd = new Date(upcomingStart.getTime() + 4 * 24 * 60 * 60 * 1000);
    upcomingEnd.setUTCHours(11, 0, 0, 0);

    const existingUpcomingBnd = await prisma.booking.findUnique({
      where: { reference: demoUpcomingBoardingRef },
    });
    if (!existingUpcomingBnd) {
      await prisma.booking.create({
        data: {
          reference: demoUpcomingBoardingRef,
          userId: demoUser.id,
          petId: luna.id,
          providerId: firstBoardingProvider.id,
          boardingUnitId: firstBoardingUnit.id,
          kind: BookingKind.BOARDING,
          status: BookingStatus.CONFIRMED,
          startsAt: upcomingStart,
          endsAt: upcomingEnd,
          priceCents: 30000,
          currency: 'USD',
          priceBreakdown: {
            nights: 4,
            nightlyCents: 7500,
            baseCents: 30000,
            addOnsCents: 0,
            totalCents: 30000,
          },
          careInstructions: {
            feeding: '2 cups kibble at 8am and 6pm with warm water',
            medications: 'None',
            behaviour: 'Very energetic in the morning, sleeps soundly with soft music',
            emergencyContact: 'Daniel Reed: +1 (555) 876-5432',
          },
          isDemo: true,
        },
      });
    }
  }

  // 8. Seed Veterinary Clinics (Appendix B)
  const vetProvidersData = [
    {
      slug: 'hudson-river-vet',
      name: 'Hudson River Veterinary Hospital',
      tagline: 'Modern compassionate medical care for downtown dogs & cats',
      description: 'Comprehensive general practice providing advanced preventive diagnostics, fear-free handling, wellness care, and surgical dentistry in Tribeca.',
      addressLine: '320 Greenwich Street',
      city: 'New York',
      region: 'NY',
      country: 'US',
      lat: 40.7185,
      lng: -74.0098,
      timezone: 'America/New_York',
      phone: '+1 (212) 555-8387',
      websiteUrl: 'https://hudsonrivervet.example',
      speciesAccepted: [Species.DOG, Species.CAT],
      amenities: ['Digital X-Ray', 'In-House Laboratory', 'Dedicated Dental Suite', 'Cat-Friendly Exam Rooms', 'Ultrasound Imaging', 'Full Pharmacy'],
      imageKeys: ['/images/providers/hudson-river-vet.jpg'],
      ratingAvg: 4.95,
      ratingCount: 38,
      cancellationHours: 24,
      autoConfirm: true,
      isDemo: true,
      services: [
        { name: 'Wellness & Preventive Exam', description: 'Comprehensive physical examination, vitals, dental check, coat health, and nutrition consultation.', durationMin: 30, basePriceCents: 8500, species: [Species.DOG, Species.CAT], isAddOn: false },
        { name: 'Core Vaccination & Immunity Visit', description: 'Administration of core rabies and lifestyle booster vaccines with a pre-vaccine health screen.', durationMin: 20, basePriceCents: 6500, species: [Species.DOG, Species.CAT], isAddOn: false },
        { name: 'Comprehensive Sick Pet Consultation', description: 'Detailed evaluation of acute symptoms: digestive upset, lethargy, skin lesions, respiratory, or mobility changes.', durationMin: 45, basePriceCents: 11000, species: [Species.DOG, Species.CAT], isAddOn: false },
        { name: 'Comprehensive Dental Examination', description: 'Oral cavity staging, gingivitis assessment, calculus evaluation, and dental prophylaxis recommendations.', durationMin: 30, basePriceCents: 9500, species: [Species.DOG, Species.CAT], isAddOn: false },
        { name: 'Post-Treatment Follow-up & Suture Recheck', description: 'Re-evaluation of ongoing treatment response, wound check, suture removal, or medication adjustments.', durationMin: 20, basePriceCents: 4500, species: [Species.DOG, Species.CAT], isAddOn: false },
        { name: 'Comprehensive Fecal & Parasite Screen', description: 'Centrifugal flotation analysis for giardia and internal parasites.', durationMin: 0, basePriceCents: 4000, species: [Species.DOG, Species.CAT], isAddOn: true },
        { name: 'Chemistry & Complete Blood Panel', description: 'Same-day in-house organ health profile and complete blood count.', durationMin: 0, basePriceCents: 12500, species: [Species.DOG, Species.CAT], isAddOn: true },
        { name: 'Universal Microchip Implantation', description: 'ISO standard microchip with lifetime pet registry activation.', durationMin: 0, basePriceCents: 5500, species: [Species.DOG, Species.CAT], isAddOn: true },
      ],
      reviews: [
        { userName: 'Maya Lin', rating: 5, title: 'Exceptional bedside manner', body: 'Dr. Evans and the staff took time to make Barnaby feel comfortable with zero stress. Truly gentle professionals.' },
        { userName: 'David K.', rating: 5, title: 'Clear diagnostics and transparent pricing', body: 'Bloodwork results came back while we waited. Everything was explained clearly without upselling.' },
        { userName: 'Sophia R.', rating: 5, title: 'Outstanding cat care', body: 'The feline-only exam room made a huge difference for my anxious cat. Highly recommended.' },
      ]
    },
    {
      slug: 'brooklyn-heights-vet',
      name: 'Brooklyn Heights Animal Medical Centre',
      tagline: 'Fear-Free certified clinical excellence in historic Brooklyn',
      description: 'Dedicated to stress-free veterinary medicine with quiet rooms, gentle handling, and advanced diagnostic capabilities.',
      addressLine: '155 Montague Street',
      city: 'Brooklyn',
      region: 'NY',
      country: 'US',
      lat: 40.6960,
      lng: -73.9933,
      timezone: 'America/New_York',
      phone: '+1 (718) 555-4838',
      websiteUrl: 'https://brooklynheightsvet.example',
      speciesAccepted: [Species.DOG, Species.CAT],
      amenities: ['Fear-Free Certified', 'In-House Diagnostic Lab', 'Cat-Only Waiting Zone', 'Acupuncture & Laser Therapy', 'Digital Radiography'],
      imageKeys: ['/images/providers/brooklyn-heights-vet.jpg'],
      ratingAvg: 4.90,
      ratingCount: 29,
      cancellationHours: 24,
      autoConfirm: true,
      isDemo: true,
      services: [
        { name: 'Wellness & Preventive Exam', description: 'Comprehensive physical examination, vitals, dental check, coat health, and nutrition consultation.', durationMin: 30, basePriceCents: 8500, species: [Species.DOG, Species.CAT], isAddOn: false },
        { name: 'Core Vaccination & Immunity Visit', description: 'Administration of core rabies and lifestyle booster vaccines with a pre-vaccine health screen.', durationMin: 20, basePriceCents: 6500, species: [Species.DOG, Species.CAT], isAddOn: false },
        { name: 'Comprehensive Sick Pet Consultation', description: 'Detailed evaluation of acute symptoms: digestive upset, lethargy, skin lesions, respiratory, or mobility changes.', durationMin: 45, basePriceCents: 11000, species: [Species.DOG, Species.CAT], isAddOn: false },
        { name: 'Comprehensive Dental Examination', description: 'Oral cavity staging, gingivitis assessment, calculus evaluation, and dental prophylaxis recommendations.', durationMin: 30, basePriceCents: 9500, species: [Species.DOG, Species.CAT], isAddOn: false },
      ],
      reviews: [
        { userName: 'Claire W.', rating: 5, title: 'Calmest vet visit ever', body: 'My dog usually shakes at the clinic, but here he happily took treats and barely noticed his booster shot.' },
      ]
    },
    {
      slug: 'central-park-west-vet',
      name: 'Central Park West Veterinary Clinic',
      tagline: 'Specialized wellness and geriatric health by Central Park',
      description: 'Premium pet healthcare offering specialized wellness plans, senior pet geriatric care, cardiology screening, and surgery.',
      addressLine: '215 Central Park West',
      city: 'New York',
      region: 'NY',
      country: 'US',
      lat: 40.7760,
      lng: -73.9750,
      timezone: 'America/New_York',
      phone: '+1 (212) 555-9271',
      websiteUrl: 'https://cpwvet.example',
      speciesAccepted: [Species.DOG, Species.CAT],
      amenities: ['Senior Pet Geriatric Care', 'Cardiology & Ultrasound', 'Dedicated Dental Theatre', 'On-Site Pharmacy', 'Surgical Suite'],
      imageKeys: ['/images/providers/central-park-west-vet.jpg'],
      ratingAvg: 4.88,
      ratingCount: 34,
      cancellationHours: 24,
      autoConfirm: true,
      isDemo: true,
      services: [
        { name: 'Wellness & Preventive Exam', description: 'Comprehensive physical examination, vitals, dental check, coat health, and nutrition consultation.', durationMin: 30, basePriceCents: 9000, species: [Species.DOG, Species.CAT], isAddOn: false },
        { name: 'Core Vaccination & Immunity Visit', description: 'Administration of core rabies and lifestyle booster vaccines with a pre-vaccine health screen.', durationMin: 20, basePriceCents: 7000, species: [Species.DOG, Species.CAT], isAddOn: false },
        { name: 'Comprehensive Sick Pet Consultation', description: 'Detailed evaluation of acute symptoms: digestive upset, lethargy, skin lesions, respiratory, or mobility changes.', durationMin: 45, basePriceCents: 11500, species: [Species.DOG, Species.CAT], isAddOn: false },
      ],
      reviews: [
        { userName: 'Elena P.', rating: 5, title: 'Incredible senior dog care', body: 'They manage our senior golden retriever with so much warmth and expertise. Couldn’t be happier.' },
      ]
    },
    {
      slug: 'prospect-heights-vet',
      name: 'Prospect Heights Veterinary Atelier',
      tagline: 'Neighbourhood preventive care and holistic wellness',
      description: 'Community-oriented veterinary practice emphasizing low-stress examinations, preventive wellness packages, and patient education.',
      addressLine: '628 Vanderbilt Avenue',
      city: 'Brooklyn',
      region: 'NY',
      country: 'US',
      lat: 40.6775,
      lng: -73.9680,
      timezone: 'America/New_York',
      phone: '+1 (718) 555-6192',
      websiteUrl: 'https://prospectheightsvet.example',
      speciesAccepted: [Species.DOG, Species.CAT],
      amenities: ['Low-Stress Handling', 'Preventive Wellness Plans', 'Rapid Blood Analysis', 'Nutritional Counseling', 'Digital Dental X-Ray'],
      imageKeys: ['/images/providers/prospect-heights-vet.jpg'],
      ratingAvg: 4.92,
      ratingCount: 22,
      cancellationHours: 24,
      autoConfirm: true,
      isDemo: true,
      services: [
        { name: 'Wellness & Preventive Exam', description: 'Comprehensive physical examination, vitals, dental check, coat health, and nutrition consultation.', durationMin: 30, basePriceCents: 8500, species: [Species.DOG, Species.CAT], isAddOn: false },
        { name: 'Core Vaccination & Immunity Visit', description: 'Administration of core rabies and lifestyle booster vaccines with a pre-vaccine health screen.', durationMin: 20, basePriceCents: 6500, species: [Species.DOG, Species.CAT], isAddOn: false },
        { name: 'Comprehensive Sick Pet Consultation', description: 'Detailed evaluation of acute symptoms: digestive upset, lethargy, skin lesions, respiratory, or mobility changes.', durationMin: 45, basePriceCents: 11000, species: [Species.DOG, Species.CAT], isAddOn: false },
      ],
      reviews: [
        { userName: 'Marcus T.', rating: 5, title: 'Caring neighborhood clinic', body: 'Super friendly, clear explanations, and they followed up the next day to check on how our puppy was doing.' },
      ]
    },
    {
      slug: 'astoria-vet-wellness',
      name: 'Astoria Veterinary Specialists & Wellness',
      tagline: 'Comprehensive clinical care & diagnostic excellence in Queens',
      description: 'Modern facility featuring internal medicine diagnostics, comprehensive surgery, cat & dog wellness, and triage guidance in Astoria.',
      addressLine: '31-18 Broadway',
      city: 'Astoria',
      region: 'NY',
      country: 'US',
      lat: 40.7650,
      lng: -73.9230,
      timezone: 'America/New_York',
      phone: '+1 (718) 555-3810',
      websiteUrl: 'https://astoriavet.example',
      speciesAccepted: [Species.DOG, Species.CAT],
      amenities: ['Emergency Triage Guidance', 'Endoscopy & Ultrasound', 'Advanced Dental Care', 'Allergy & Dermatology Consults', 'Full In-House Pharmacy'],
      imageKeys: ['/images/providers/astoria-vet-wellness.jpg'],
      ratingAvg: 4.89,
      ratingCount: 27,
      cancellationHours: 24,
      autoConfirm: true,
      isDemo: true,
      services: [
        { name: 'Wellness & Preventive Exam', description: 'Comprehensive physical examination, vitals, dental check, coat health, and nutrition consultation.', durationMin: 30, basePriceCents: 8500, species: [Species.DOG, Species.CAT], isAddOn: false },
        { name: 'Core Vaccination & Immunity Visit', description: 'Administration of core rabies and lifestyle booster vaccines with a pre-vaccine health screen.', durationMin: 20, basePriceCents: 6500, species: [Species.DOG, Species.CAT], isAddOn: false },
        { name: 'Comprehensive Sick Pet Consultation', description: 'Detailed evaluation of acute symptoms: digestive upset, lethargy, skin lesions, respiratory, or mobility changes.', durationMin: 45, basePriceCents: 11000, species: [Species.DOG, Species.CAT], isAddOn: false },
      ],
      reviews: [
        { userName: 'Rachel G.', rating: 5, title: 'Thorough and compassionate', body: 'The doctor caught an ear infection early and treated it immediately. Compassionate staff.' },
      ]
    },
  ];

  let firstVetProvider: any = null;
  let firstVetWellnessService: any = null;
  let firstVetVaccineService: any = null;

  for (const vData of vetProvidersData) {
    const { services, reviews, ...providerFields } = vData;

    const provider = await prisma.provider.upsert({
      where: { slug: providerFields.slug },
      update: {
        ...providerFields,
        type: ProviderType.VET_CLINIC,
      },
      create: {
        ...providerFields,
        type: ProviderType.VET_CLINIC,
      },
    });

    if (!firstVetProvider) {
      firstVetProvider = provider;
    }

    // Weekly Operating Hours (Mon-Sat 08:30-18:00, stations = 2)
    for (let weekday = 1; weekday <= 6; weekday++) {
      await prisma.providerHours.upsert({
        where: {
          providerId_weekday_opensAt: {
            providerId: provider.id,
            weekday,
            opensAt: '08:30',
          },
        },
        update: {
          closesAt: '18:00',
          stations: 2,
        },
        create: {
          providerId: provider.id,
          weekday,
          opensAt: '08:30',
          closesAt: '18:00',
          stations: 2,
        },
      });
    }

    // Sunday Hours (10:00-15:00, stations = 1)
    await prisma.providerHours.upsert({
      where: {
        providerId_weekday_opensAt: {
          providerId: provider.id,
          weekday: 0,
          opensAt: '10:00',
        },
      },
      update: {
        closesAt: '15:00',
        stations: 1,
      },
      create: {
        providerId: provider.id,
        weekday: 0,
        opensAt: '10:00',
        closesAt: '15:00',
        stations: 1,
      },
    });

    // Services
    for (const s of services) {
      const createdService = await prisma.service.upsert({
        where: {
          id: `${provider.slug}-${s.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
        },
        update: {
          name: s.name,
          description: s.description,
          durationMin: s.durationMin,
          basePriceCents: s.basePriceCents,
          species: s.species,
          isAddOn: s.isAddOn,
        },
        create: {
          id: `${provider.slug}-${s.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
          providerId: provider.id,
          kind: BookingKind.VET,
          name: s.name,
          description: s.description,
          durationMin: s.durationMin,
          basePriceCents: s.basePriceCents,
          species: s.species,
          isAddOn: s.isAddOn,
        },
      });

      if (provider.slug === 'hudson-river-vet') {
        if (s.name.includes('Wellness')) firstVetWellnessService = createdService;
        if (s.name.includes('Vaccination')) firstVetVaccineService = createdService;
      }
    }

    // Sample Reviews
    for (let i = 0; i < reviews.length; i++) {
      const r = reviews[i];
      const seedBookingRef = `PN-VET-REV-${provider.slug.slice(0, 8)}-${i}`;
      let seedBooking = await prisma.booking.findUnique({ where: { reference: seedBookingRef } });
      if (!seedBooking) {
        const pastDate = new Date(Date.now() - (20 + i * 10) * 24 * 60 * 60 * 1000);
        seedBooking = await prisma.booking.create({
          data: {
            reference: seedBookingRef,
            userId: demoUser.id,
            petId: barnaby.id,
            providerId: provider.id,
            kind: BookingKind.VET,
            status: BookingStatus.COMPLETED,
            startsAt: pastDate,
            endsAt: new Date(pastDate.getTime() + 30 * 60 * 1000),
            priceCents: 8500,
            currency: 'USD',
            priceBreakdown: {
              baseCents: 8500,
              sizeAdjustmentCents: 0,
              addOnsCents: 0,
              totalCents: 8500,
            },
            visitType: 'WELLNESS',
            symptoms: [],
            reason: 'Routine health checkup',
            emergencyAcknowledged: true,
            isDemo: true,
          },
        });
      }

      await prisma.review.upsert({
        where: { bookingId: seedBooking.id },
        update: {},
        create: {
          userId: demoUser.id,
          providerId: provider.id,
          bookingId: seedBooking.id,
          rating: r.rating,
          title: r.title,
          body: r.body,
          isSample: true,
        },
      });
    }
  }

  // 9. Seed Past & Upcoming Veterinary Appointments for Maya, Barnaby & Luna
  if (firstVetProvider && firstVetWellnessService) {
    const demoPastVetRef = 'PN-VET-SEED01';
    let pastVet = await prisma.booking.findUnique({ where: { reference: demoPastVetRef } });
    if (!pastVet) {
      const pastStart = new Date(Date.now() - 45 * 24 * 60 * 60 * 1000);
      pastStart.setUTCHours(14, 0, 0, 0);
      const pastEnd = new Date(pastStart.getTime() + 30 * 60 * 1000);

      await prisma.booking.create({
        data: {
          reference: demoPastVetRef,
          userId: demoUser.id,
          petId: barnaby.id,
          providerId: firstVetProvider.id,
          serviceId: firstVetWellnessService.id,
          kind: BookingKind.VET,
          status: BookingStatus.COMPLETED,
          startsAt: pastStart,
          endsAt: pastEnd,
          priceCents: 8500,
          currency: 'USD',
          priceBreakdown: {
            baseCents: 8500,
            sizeAdjustmentCents: 0,
            addOnsCents: 0,
            totalCents: 8500,
          },
          visitType: 'WELLNESS',
          symptoms: ['Routine annual wellness evaluation'],
          reason: 'Annual preventive exam, vitals check, and skin check for seasonal dryness.',
          emergencyAcknowledged: true,
          isDemo: true,
        },
      });
    }

    if (firstVetVaccineService) {
      const demoUpcomingVetRef = 'PN-VET-SEED02';
      const upcomingStart = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
      upcomingStart.setUTCHours(10, 30, 0, 0);
      const upcomingEnd = new Date(upcomingStart.getTime() + 20 * 60 * 1000);

      const existingUpcomingVet = await prisma.booking.findUnique({
        where: { reference: demoUpcomingVetRef },
      });

      if (!existingUpcomingVet) {
        await prisma.booking.create({
          data: {
            reference: demoUpcomingVetRef,
            userId: demoUser.id,
            petId: luna.id,
            providerId: firstVetProvider.id,
            serviceId: firstVetVaccineService.id,
            kind: BookingKind.VET,
            status: BookingStatus.CONFIRMED,
            startsAt: upcomingStart,
            endsAt: upcomingEnd,
            priceCents: 6500,
            currency: 'USD',
            priceBreakdown: {
              baseCents: 6500,
              sizeAdjustmentCents: 0,
              addOnsCents: 0,
              totalCents: 6500,
            },
            visitType: 'VACCINATION',
            symptoms: [],
            reason: 'Annual vaccine booster and heartworm preventive renewal check.',
            emergencyAcknowledged: true,
            isDemo: true,
          },
        });
      }
    }
  }

  // 10. Phase 7: Seed Products, Categories, Reviews, and Delivered Order
  await seedProductsAndOrders(prisma, demoUser.id);

  console.log('Seed completed successfully!');
  console.log('Demo Credentials:');
  console.log('  Customer: demo@pawnest.example / P@wnestDemo2026!');
  console.log('  Admin:    admin@pawnest.example / AdminSecret2026!');
}
