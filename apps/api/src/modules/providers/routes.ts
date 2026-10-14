import { FastifyPluginAsync } from 'fastify';
import { prisma } from '../../lib/prisma.js';
import { NotFoundError, ValidationError } from '../../lib/errors.js';
import { availabilityService } from '../availability/availability.service.js';
import { BoardingAvailabilityService } from '../availability/boarding-availability.service.js';
import {
  ProviderFilterSchema,
  AvailabilityQuerySchema,
  BoardingAvailabilityQuerySchema,
  ProviderSummary,
  ServiceSummary,
  ReviewSummary,
  ProviderType,
  Species,
  STANDARD_VET_VISIT_TYPES,
  VET_SYMPTOM_OPTIONS,
  EMERGENCY_DISCLAIMER_TEXT,
} from '@pawnest/shared';

const boardingAvailabilityService = new BoardingAvailabilityService();

export const providerRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /vet/visit-types (Public)
  fastify.get('/vet/visit-types', async () => {
    return {
      visitTypes: STANDARD_VET_VISIT_TYPES,
      symptoms: VET_SYMPTOM_OPTIONS,
      disclaimer: EMERGENCY_DISCLAIMER_TEXT,
    };
  });

  // GET /providers (Discovery & search)
  fastify.get('/providers', async (request, reply) => {
    const query = ProviderFilterSchema.parse(request.query);
    const { type, q, species, minRating, city, cursor, limit = 20 } = query;

    const where: any = {
      isActive: true,
    };

    if (type) {
      where.type = type;
    }

    if (city) {
      where.city = { contains: city, mode: 'insensitive' };
    }

    if (minRating) {
      where.ratingAvg = { gte: minRating };
    }

    if (species) {
      where.speciesAccepted = { has: species };
    }

    if (q && q.trim()) {
      const term = q.trim();
      where.OR = [
        { name: { contains: term, mode: 'insensitive' } },
        { tagline: { contains: term, mode: 'insensitive' } },
        { description: { contains: term, mode: 'insensitive' } },
        { city: { contains: term, mode: 'insensitive' } },
        { addressLine: { contains: term, mode: 'insensitive' } },
      ];
    }

    const providers = await prisma.provider.findMany({
      where,
      take: limit + 1,
      cursor: cursor ? { id: cursor } : undefined,
      orderBy: [{ ratingAvg: 'desc' }, { id: 'asc' }],
      include: {
        services: {
          where: { isActive: true, isAddOn: false },
          select: { basePriceCents: true },
        },
        units: {
          select: { nightlyCents: true },
        },
      },
    });

    let nextCursor: string | undefined = undefined;
    if (providers.length > limit) {
      const nextItem = providers.pop();
      nextCursor = nextItem?.id;
    }

    const items: ProviderSummary[] = providers.map((p) => {
      const servicePrices = p.services.map((s) => s.basePriceCents);
      const unitPrices = p.units?.map((u) => u.nightlyCents) || [];
      const allPrices = [...servicePrices, ...unitPrices];
      const minPriceCents = allPrices.length ? Math.min(...allPrices) : undefined;

      return {
        id: p.id,
        slug: p.slug,
        type: p.type as any,
        name: p.name,
        tagline: p.tagline,
        description: p.description,
        addressLine: p.addressLine,
        city: p.city,
        region: p.region,
        country: p.country,
        lat: p.lat,
        lng: p.lng,
        timezone: p.timezone,
        speciesAccepted: p.speciesAccepted as any[],
        amenities: p.amenities,
        imageKeys: p.imageKeys,
        ratingAvg: Number(p.ratingAvg),
        ratingCount: p.ratingCount,
        priceFromCents: minPriceCents,
        isDemo: p.isDemo,
      };
    });

    return { items, nextCursor };
  });

  // GET /providers/:slug (Detail)
  fastify.get<{ Params: { slug: string } }>('/providers/:slug', async (request, reply) => {
    const { slug } = request.params;

    const provider = await prisma.provider.findUnique({
      where: { slug },
      include: {
        hours: {
          orderBy: [{ weekday: 'asc' }, { opensAt: 'asc' }],
        },
        services: {
          where: { isActive: true },
          orderBy: [{ isAddOn: 'asc' }, { basePriceCents: 'asc' }],
        },
        units: {
          orderBy: { nightlyCents: 'asc' },
        },
        reviews: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            user: { select: { name: true } },
          },
        },
      },
    });

    if (!provider || !provider.isActive) {
      throw new NotFoundError('Provider not found');
    }

    const servicePrices = provider.services.filter((s) => !s.isAddOn).map((s) => s.basePriceCents);
    const unitPrices = provider.units.map((u) => u.nightlyCents);
    const allPrices = [...servicePrices, ...unitPrices];
    const minPriceCents = allPrices.length ? Math.min(...allPrices) : undefined;

    return {
      provider: {
        id: provider.id,
        slug: provider.slug,
        type: provider.type,
        name: provider.name,
        tagline: provider.tagline,
        description: provider.description,
        addressLine: provider.addressLine,
        city: provider.city,
        region: provider.region,
        country: provider.country,
        lat: provider.lat,
        lng: provider.lng,
        timezone: provider.timezone,
        phone: provider.phone,
        websiteUrl: provider.websiteUrl,
        speciesAccepted: provider.speciesAccepted,
        amenities: provider.amenities,
        imageKeys: provider.imageKeys,
        ratingAvg: Number(provider.ratingAvg),
        ratingCount: provider.ratingCount,
        cancellationHours: provider.cancellationHours,
        autoConfirm: provider.autoConfirm,
        isDemo: provider.isDemo,
        priceFromCents: minPriceCents,
      },
      hours: provider.hours,
      units: provider.units.map((u) => ({
        id: u.id,
        providerId: u.providerId,
        name: u.name,
        description: u.description,
        capacity: u.capacity,
        maxPets: u.maxPets,
        nightlyCents: u.nightlyCents,
        currency: u.currency,
        amenities: u.amenities,
      })),
      services: provider.services.map((s) => ({
        id: s.id,
        providerId: s.providerId,
        kind: s.kind,
        name: s.name,
        description: s.description,
        durationMin: s.durationMin,
        bufferMin: s.bufferMin,
        basePriceCents: s.basePriceCents,
        currency: s.currency,
        sizePricing: s.sizePricing as Record<string, number> | null,
        species: s.species,
        isAddOn: s.isAddOn,
        isActive: s.isActive,
      })),
      reviews: provider.reviews.map((r) => ({
        id: r.id,
        providerId: r.providerId,
        userName: r.user.name,
        rating: r.rating,
        title: r.title,
        body: r.body,
        isSample: r.isSample,
        createdAt: r.createdAt.toISOString(),
      })),
    };
  });

  // GET /providers/:slug/services
  fastify.get<{ Params: { slug: string } }>('/providers/:slug/services', async (request, reply) => {
    const { slug } = request.params;
    const provider = await prisma.provider.findUnique({
      where: { slug },
      select: { id: true, isActive: true },
    });

    if (!provider || !provider.isActive) {
      throw new NotFoundError('Provider not found');
    }

    const services = await prisma.service.findMany({
      where: { providerId: provider.id, isActive: true },
      orderBy: [{ isAddOn: 'asc' }, { basePriceCents: 'asc' }],
    });

    return services.map((s) => ({
      id: s.id,
      providerId: s.providerId,
      kind: s.kind,
      name: s.name,
      description: s.description,
      durationMin: s.durationMin,
      bufferMin: s.bufferMin,
      basePriceCents: s.basePriceCents,
      currency: s.currency,
      sizePricing: s.sizePricing as Record<string, number> | null,
      species: s.species,
      isAddOn: s.isAddOn,
      isActive: s.isActive,
    }));
  });

  // GET /providers/:slug/availability (Slot-based: Grooming & Vet)
  fastify.get<{ Params: { slug: string } }>('/providers/:slug/availability', async (request, reply) => {
    const { slug } = request.params;
    const query = AvailabilityQuerySchema.parse(request.query);

    const provider = await prisma.provider.findUnique({
      where: { slug },
      select: { id: true, isActive: true },
    });

    if (!provider || !provider.isActive) {
      throw new NotFoundError('Provider not found');
    }

    const slots = await availabilityService.computeSlots({
      providerId: provider.id,
      serviceId: query.serviceId,
      dateStr: query.date,
      petId: query.petId,
    });

    return { slots };
  });

  // GET /providers/:slug/boarding-availability (Multi-night: Boarding)
  fastify.get<{ Params: { slug: string } }>('/providers/:slug/boarding-availability', async (request, reply) => {
    const { slug } = request.params;
    const query = BoardingAvailabilityQuerySchema.parse(request.query);

    const provider = await prisma.provider.findUnique({
      where: { slug },
      select: { id: true, isActive: true },
    });

    if (!provider || !provider.isActive) {
      throw new NotFoundError('Provider not found');
    }

    const availability = await boardingAvailabilityService.computeAvailability({
      providerId: provider.id,
      checkInDateStr: query.checkIn,
      checkOutDateStr: query.checkOut,
      petCount: query.petCount,
    });

    return { availability };
  });

  // GET /providers/:slug/reviews
  fastify.get<{ Params: { slug: string } }>('/providers/:slug/reviews', async (request, reply) => {
    const { slug } = request.params;
    const provider = await prisma.provider.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (!provider) {
      throw new NotFoundError('Provider not found');
    }

    const reviews = await prisma.review.findMany({
      where: { providerId: provider.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: { user: { select: { name: true } } },
    });

    return reviews.map((r) => ({
      id: r.id,
      providerId: r.providerId,
      userName: r.user.name,
      rating: r.rating,
      title: r.title,
      body: r.body,
      isSample: r.isSample,
      createdAt: r.createdAt.toISOString(),
    }));
  });

  // Authenticated Favourites routes (Section 15.3)
  fastify.get('/me/favourites', async (request, reply) => {
    const user = (request as any).user;
    if (!user) {
      return reply.status(401).send({ message: 'Unauthorized' });
    }

    const favourites = await prisma.favourite.findMany({
      where: { userId: user.sub },
    });
    return favourites;
  });

  fastify.put<{ Params: { kind: string; id: string } }>('/me/favourites/:kind/:id', async (request, reply) => {
    const user = (request as any).user;
    if (!user) {
      return reply.status(401).send({ message: 'Unauthorized' });
    }

    const { kind, id } = request.params;
    const favouriteKind = kind.toUpperCase() as any;

    const existing = await prisma.favourite.findFirst({
      where: {
        userId: user.sub,
        kind: favouriteKind,
        ...(favouriteKind === 'PROVIDER' ? { providerId: id } : { productId: id }),
      },
    });

    if (existing) {
      return existing;
    }

    const fav = await prisma.favourite.create({
      data: {
        userId: user.sub,
        kind: favouriteKind,
        providerId: favouriteKind === 'PROVIDER' ? id : null,
        productId: favouriteKind === 'PRODUCT' ? id : null,
      },
    });

    return fav;
  });

  fastify.delete<{ Params: { kind: string; id: string } }>('/me/favourites/:kind/:id', async (request, reply) => {
    const user = (request as any).user;
    if (!user) {
      return reply.status(401).send({ message: 'Unauthorized' });
    }

    const { kind, id } = request.params;
    const favouriteKind = kind.toUpperCase() as any;

    await prisma.favourite.deleteMany({
      where: {
        userId: user.sub,
        kind: favouriteKind,
        ...(favouriteKind === 'PROVIDER' ? { providerId: id } : { productId: id }),
      },
    });

    return { success: true };
  });
};
