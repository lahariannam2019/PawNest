import { Prisma } from '@prisma/client';
import { prisma } from './prisma.js';
import { NotFoundError } from './errors.js';

/**
 * Section 16.2 Authorization Helper:
 * Every query on user-owned data must enforce `where: { userId }`.
 * When accessing another user's resource, always throw a 404 NotFoundError
 * to prevent user resource/ID enumeration.
 */
export function scopedRepo(userId: string) {
  return {
    userId,

    // Addresses
    addresses: {
      findMany: (args: Parameters<typeof prisma.address.findMany>[0] = {}) => {
        return prisma.address.findMany({
          ...args,
          where: { ...(args.where || {}), userId },
        });
      },
      findById: async (id: string) => {
        const record = await prisma.address.findFirst({
          where: { id, userId },
        });
        if (!record) throw new NotFoundError('Address not found');
        return record;
      },
      update: async (id: string, data: Parameters<typeof prisma.address.update>[0]['data']) => {
        // verify ownership first
        const existing = await prisma.address.findFirst({ where: { id, userId } });
        if (!existing) throw new NotFoundError('Address not found');
        return prisma.address.update({ where: { id }, data });
      },
      delete: async (id: string) => {
        const existing = await prisma.address.findFirst({ where: { id, userId } });
        if (!existing) throw new NotFoundError('Address not found');
        return prisma.address.delete({ where: { id } });
      },
    },

    // Pets
    pets: {
      findMany: (args: Parameters<typeof prisma.pet.findMany>[0] = {}) => {
        return prisma.pet.findMany({
          ...args,
          where: { ...(args.where || {}), userId, deletedAt: null },
        });
      },
      findById: async (id: string, include?: Prisma.PetInclude) => {
        const record = await prisma.pet.findFirst({
          where: { id, userId, deletedAt: null },
          include,
        });
        if (!record) throw new NotFoundError('Pet not found');
        return record;
      },
      update: async (id: string, data: Parameters<typeof prisma.pet.update>[0]['data']) => {
        const existing = await prisma.pet.findFirst({ where: { id, userId, deletedAt: null } });
        if (!existing) throw new NotFoundError('Pet not found');
        return prisma.pet.update({ where: { id }, data });
      },
      softDelete: async (id: string) => {
        const existing = await prisma.pet.findFirst({ where: { id, userId, deletedAt: null } });
        if (!existing) throw new NotFoundError('Pet not found');
        return prisma.pet.update({ where: { id }, data: { deletedAt: new Date() } });
      },
    },

    // Bookings
    bookings: {
      findMany: (args: Parameters<typeof prisma.booking.findMany>[0] = {}) => {
        return prisma.booking.findMany({
          ...args,
          where: { ...(args.where || {}), userId },
        });
      },
      findById: async (id: string, include?: Prisma.BookingInclude) => {
        const record = await prisma.booking.findFirst({
          where: { id, userId },
          include,
        });
        if (!record) throw new NotFoundError('Booking not found');
        return record;
      },
      cancel: async (id: string) => {
        const existing = await prisma.booking.findFirst({ where: { id, userId } });
        if (!existing) throw new NotFoundError('Booking not found');
        return prisma.booking.update({
          where: { id },
          data: { status: 'CANCELLED', cancelledAt: new Date() },
        });
      },
    },

    // Orders
    orders: {
      findMany: (args: Parameters<typeof prisma.order.findMany>[0] = {}) => {
        return prisma.order.findMany({
          ...args,
          where: { ...(args.where || {}), userId },
        });
      },
      findById: async (id: string, include?: Prisma.OrderInclude) => {
        const record = await prisma.order.findFirst({
          where: { id, userId },
          include,
        });
        if (!record) throw new NotFoundError('Order not found');
        return record;
      },
    },
  };
}
