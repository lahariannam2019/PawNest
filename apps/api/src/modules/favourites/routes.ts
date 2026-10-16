import { FastifyPluginAsync } from 'fastify';
import { prisma } from '../../lib/prisma.js';
import { NotFoundError, ValidationError } from '../../lib/errors.js';
import {
  FavouriteKind,
  ToggleFavouriteSchema,
  FavouriteSummary,
} from '@pawnest/shared';

export const favouriteRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.register(async (authGroup) => {
    authGroup.addHook('preHandler', fastify.authenticate);

    // GET /me/favourites (List user's favourites)
    authGroup.get('/me/favourites', async (request) => {
      const userId = request.user!.userId;
      const { kind } = request.query as { kind?: FavouriteKind };

      const whereClause: any = { userId };
      if (kind && Object.values(FavouriteKind).includes(kind)) {
        whereClause.kind = kind;
      }

      const favourites = await prisma.favourite.findMany({
        where: whereClause,
        include: {
          provider: true,
          product: {
            include: {
              variants: {
                where: { stock: { gt: 0 } },
                orderBy: { priceCents: 'asc' },
                take: 1,
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      const items: FavouriteSummary[] = favourites.map((f) => ({
        id: f.id,
        kind: f.kind as FavouriteKind,
        createdAt: f.createdAt.toISOString(),
        providerId: f.providerId,
        productId: f.productId,
        provider: f.provider
          ? {
              id: f.provider.id,
              slug: f.provider.slug,
              type: f.provider.type as any,
              name: f.provider.name,
              tagline: f.provider.tagline,
              addressLine: f.provider.addressLine,
              city: f.provider.city,
              ratingAvg: Number(f.provider.ratingAvg),
              ratingCount: f.provider.ratingCount,
              imageKeys: f.provider.imageKeys,
              isDemo: f.provider.isDemo,
            }
          : null,
        product: f.product
          ? {
              id: f.product.id,
              slug: f.product.slug,
              name: f.product.name,
              brand: f.product.brand,
              minPriceCents: f.product.variants[0]?.priceCents ?? 0,
              imageKeys: f.product.imageKeys,
              ratingAvg: Number(f.product.ratingAvg),
              ratingCount: f.product.ratingCount,
              isDemo: f.product.isDemo,
            }
          : null,
      }));

      return { favourites: items };
    });

    // GET /me/favourites/ids (Fast query returning only sets of favorited IDs)
    authGroup.get('/me/favourites/ids', async (request) => {
      const userId = request.user!.userId;

      const favourites = await prisma.favourite.findMany({
        where: { userId },
        select: { kind: true, providerId: true, productId: true },
      });

      const providerIds: string[] = [];
      const productIds: string[] = [];

      for (const f of favourites) {
        if (f.kind === FavouriteKind.PROVIDER && f.providerId) {
          providerIds.push(f.providerId);
        } else if (f.kind === FavouriteKind.PRODUCT && f.productId) {
          productIds.push(f.productId);
        }
      }

      return { providerIds, productIds };
    });

    // POST /me/favourites (Toggle / Add favourite)
    authGroup.post('/me/favourites', async (request, reply) => {
      const userId = request.user!.userId;
      const body = ToggleFavouriteSchema.parse(request.body);
      const { kind, id } = body;

      if (kind === FavouriteKind.PROVIDER) {
        const provider = await prisma.provider.findUnique({ where: { id } });
        if (!provider) {
          throw new NotFoundError(`Provider ${id} not found`);
        }

        const existing = await prisma.favourite.findFirst({
          where: { userId, kind: FavouriteKind.PROVIDER, providerId: id },
        });

        if (existing) {
          // Toggle off if already favorited
          await prisma.favourite.delete({ where: { id: existing.id } });
          return { success: true, isFavourited: false };
        }

        await prisma.favourite.create({
          data: {
            userId,
            kind: FavouriteKind.PROVIDER,
            providerId: id,
          },
        });

        return reply.status(201).send({ success: true, isFavourited: true });
      } else if (kind === FavouriteKind.PRODUCT) {
        const product = await prisma.product.findUnique({ where: { id } });
        if (!product) {
          throw new NotFoundError(`Product ${id} not found`);
        }

        const existing = await prisma.favourite.findFirst({
          where: { userId, kind: FavouriteKind.PRODUCT, productId: id },
        });

        if (existing) {
          // Toggle off
          await prisma.favourite.delete({ where: { id: existing.id } });
          return { success: true, isFavourited: false };
        }

        await prisma.favourite.create({
          data: {
            userId,
            kind: FavouriteKind.PRODUCT,
            productId: id,
          },
        });

        return reply.status(201).send({ success: true, isFavourited: true });
      }

      throw new ValidationError('Invalid favourite kind');
    });

    // DELETE /me/favourites/:kind/:id (Explicit removal)
    authGroup.delete('/me/favourites/:kind/:id', async (request) => {
      const userId = request.user!.userId;
      const { kind, id } = request.params as { kind: string; id: string };

      if (kind !== FavouriteKind.PROVIDER && kind !== FavouriteKind.PRODUCT) {
        throw new ValidationError('Kind must be PROVIDER or PRODUCT');
      }

      const existing = await prisma.favourite.findFirst({
        where: {
          userId,
          kind: kind as FavouriteKind,
          ...(kind === FavouriteKind.PROVIDER ? { providerId: id } : { productId: id }),
        },
      });

      if (existing) {
        await prisma.favourite.delete({ where: { id: existing.id } });
      }

      return { success: true, isFavourited: false };
    });

    // PUT /me/favourites/:kind/:id (Idempotent Add)
    authGroup.put('/me/favourites/:kind/:id', async (request, reply) => {
      const userId = request.user!.userId;
      const { kind, id } = request.params as { kind: string; id: string };

      if (kind !== FavouriteKind.PROVIDER && kind !== FavouriteKind.PRODUCT) {
        throw new ValidationError('Kind must be PROVIDER or PRODUCT');
      }

      const existing = await prisma.favourite.findFirst({
        where: {
          userId,
          kind: kind as FavouriteKind,
          ...(kind === FavouriteKind.PROVIDER ? { providerId: id } : { productId: id }),
        },
      });

      if (existing) {
        return { success: true, isFavourited: true };
      }

      await prisma.favourite.create({
        data: {
          userId,
          kind: kind as FavouriteKind,
          ...(kind === FavouriteKind.PROVIDER ? { providerId: id } : { productId: id }),
        },
      });

      return reply.status(201).send({ success: true, isFavourited: true });
    });
  });
};

