import { FastifyPluginAsync } from 'fastify';
import { prisma } from '../../lib/prisma.js';
import { verifyPassword, hashPassword } from '../../lib/crypto.js';
import { UnauthorizedError, NotFoundError } from '../../lib/errors.js';
import { scopedRepo } from '../../lib/scopedRepo.js';
import { ChangePasswordSchema, ShippingAddressSchema } from '@pawnest/shared';
import { z } from 'zod';

export const userRoutes: FastifyPluginAsync = async (app) => {
  // All routes in this module require authentication
  app.addHook('preHandler', app.authenticate);

  // GET /me
  app.get('/me', async (request) => {
    const user = await prisma.user.findUnique({
      where: { id: request.user!.userId },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        reduceMotion: true,
        notifyEmail: true,
        notifyReminders: true,
        emailVerifiedAt: true,
        createdAt: true,
      },
    });

    if (!user) throw new NotFoundError('User not found');
    return {
      user: {
        ...user,
        emailVerified: Boolean(user.emailVerifiedAt),
      },
    };
  });

  // PATCH /me
  app.patch(
    '/me',
    {
      schema: {
        body: z.object({
          name: z.string().min(2).optional(),
          phone: z.string().optional().nullable(),
          reduceMotion: z.boolean().optional(),
          notifyEmail: z.boolean().optional(),
          notifyReminders: z.boolean().optional(),
        }),
      },
    },
    async (request) => {
      const updated = await prisma.user.update({
        where: { id: request.user!.userId },
        data: request.body as any,
        select: {
          id: true,
          email: true,
          name: true,
          phone: true,
          role: true,
          reduceMotion: true,
          notifyEmail: true,
          notifyReminders: true,
          emailVerifiedAt: true,
        },
      });

      return {
        user: {
          ...updated,
          emailVerified: Boolean(updated.emailVerifiedAt),
        },
      };
    }
  );

  // POST /me/change-password
  app.post(
    '/me/change-password',
    {
      schema: {
        body: ChangePasswordSchema,
      },
    },
    async (request) => {
      const { currentPassword, newPassword } = request.body as any;
      const user = await prisma.user.findUnique({
        where: { id: request.user!.userId },
      });

      if (!user) throw new NotFoundError('User not found');

      const isValid = await verifyPassword(user.passwordHash, currentPassword);
      if (!isValid) {
        throw new UnauthorizedError('Current password is incorrect');
      }

      const passwordHash = await hashPassword(newPassword);
      await prisma.user.update({
        where: { id: user.id },
        data: { passwordHash },
      });

      return { success: true, message: 'Password updated successfully' };
    }
  );

  // GET /me/export (Data privacy compliance)
  app.get('/me/export', async (request) => {
    const user = await prisma.user.findUnique({
      where: { id: request.user!.userId },
      include: {
        pets: { include: { vaccinations: true } },
        bookings: true,
        orders: { include: { items: true } },
        addresses: true,
        favourites: true,
      },
    });

    return { exportDate: new Date().toISOString(), userData: user };
  });

  // DELETE /me (Account deletion / anonymization)
  app.delete('/me', async (request, reply) => {
    const userId = request.user!.userId;

    // Anonymize user records per Section 17
    await prisma.$transaction([
      prisma.session.deleteMany({ where: { userId } }),
      prisma.user.update({
        where: { id: userId },
        data: {
          email: `deleted-${userId}@anonymized.pawnest.example`,
          name: 'Deleted User',
          phone: null,
          deletedAt: new Date(),
        },
      }),
    ]);

    reply.clearCookie('pn_at', { path: '/' });
    reply.clearCookie('pn_rt', { path: '/api/v1/auth' });
    reply.clearCookie('pn_csrf', { path: '/' });

    return { success: true, message: 'Account deleted and data anonymized' };
  });

  // GET /me/addresses
  app.get('/me/addresses', async (request) => {
    const addresses = await prisma.address.findMany({
      where: { userId: request.user!.userId },
      orderBy: { isDefault: 'desc' },
    });
    return { items: addresses };
  });

  // POST /me/addresses
  app.post(
    '/me/addresses',
    {
      schema: {
        body: ShippingAddressSchema.extend({
          isDefault: z.boolean().default(false),
          label: z.string().optional().nullable(),
        }),
      },
    },
    async (request) => {
      const address = await prisma.address.create({
        data: {
          ...(request.body as any),
          userId: request.user!.userId,
        },
      });
      return { address };
    }
  );

  // PATCH /me/addresses/:id (Matrix row: owner 200, other user 404)
  app.patch(
    '/me/addresses/:id',
    {
      schema: {
        body: ShippingAddressSchema.partial().extend({
          isDefault: z.boolean().optional(),
          label: z.string().optional().nullable(),
        }),
      },
    },
    async (request) => {
      const { id } = request.params as { id: string };
      const repo = scopedRepo(request.user!.userId);
      const updated = await repo.addresses.update(id, request.body as any);
      return { address: updated };
    }
  );

  // DELETE /me/addresses/:id
  app.delete('/me/addresses/:id', async (request) => {
    const { id } = request.params as { id: string };
    const repo = scopedRepo(request.user!.userId);
    await repo.addresses.delete(id);
    return { success: true };
  });
};

