import { FastifyPluginAsync } from 'fastify';
import { prisma } from '../../lib/prisma.js';
import { Prisma } from '@prisma/client';
import {
  NotFoundError,
  ValidationError,
  ConflictError,
  ForbiddenError,
} from '../../lib/errors.js';
import {
  BookingStatus,
  Role,
  ErrorCode,
  CreateProviderReviewSchema,
  AdminUpdateBookingStatusSchema,
  EligibleBookingForReview,
  ProviderReviewSummary,
} from '@pawnest/shared';

type CompletedBookingWithRelations = Prisma.BookingGetPayload<{
  include: {
    provider: true;
    service: true;
    pet: true;
    review: true;
  };
}>;

export const reviewRoutes: FastifyPluginAsync = async (fastify) => {
  // Authenticated endpoints
  fastify.register(async (authGroup) => {
    authGroup.addHook('preHandler', fastify.authenticate);

    // GET /me/reviewable (List user's completed bookings eligible for review)
    authGroup.get('/me/reviewable', async (request): Promise<{ items: EligibleBookingForReview[] }> => {
      const userId = request.user!.userId;

      const completedBookings = await prisma.booking.findMany({
        where: {
          userId,
          status: BookingStatus.COMPLETED,
        },
        include: {
          provider: true,
          service: true,
          pet: true,
          review: true,
        },
        orderBy: { startsAt: 'desc' },
      });

      const items: EligibleBookingForReview[] = completedBookings.map((b: CompletedBookingWithRelations) => ({
        id: b.id,
        reference: b.reference,
        providerId: b.providerId,
        providerName: b.provider.name,
        providerSlug: b.provider.slug,
        petName: b.pet.name,
        serviceName: b.service?.name ?? null,
        startsAt: b.startsAt.toISOString(),
        endsAt: b.endsAt.toISOString(),
        hasReview: !!b.review,
      }));

      return { items };
    });

    // POST /providers/:slug/reviews (Submit review for a COMPLETED booking)
    authGroup.post('/providers/:slug/reviews', async (request, reply) => {
      const userId = request.user!.userId;
      const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
      const { slug } = request.params as { slug: string };
      const body = CreateProviderReviewSchema.parse(request.body);
      const { bookingId, rating, title, body: reviewBody } = body;

      const provider = await prisma.provider.findUnique({
        where: { slug },
      });

      if (!provider) {
        throw new NotFoundError(`Provider ${slug} not found`);
      }

      // Check booking ownership & provider match
      const booking = await prisma.booking.findFirst({
        where: { id: bookingId, userId },
      });

      if (!booking) {
        throw new NotFoundError('Booking not found or does not belong to you');
      }

      if (booking.providerId !== provider.id) {
        throw new ValidationError('This booking is not with the specified provider');
      }

      // PLAN BUSINESS RULE: Only COMPLETED bookings can be reviewed
      if (booking.status !== BookingStatus.COMPLETED) {
        throw new ValidationError(
          'Reviews may only be submitted after your appointment or stay is completed'
        );
      }

      // Check if already reviewed
      const existingReview = await prisma.review.findUnique({
        where: { bookingId },
      });

      if (existingReview) {
        throw new ConflictError(
          ErrorCode.CONFLICT,
          'A reflection has already been recorded for this appointment'
        );
      }

      const createdReview = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        const review = await tx.review.create({
          data: {
            userId,
            providerId: provider.id,
            bookingId,
            rating,
            title: title?.trim() || null,
            body: reviewBody?.trim() || null,
            isSample: false,
          },
        });

        // Recalculate provider aggregate rating
        const agg = await tx.review.aggregate({
          where: { providerId: provider.id },
          _avg: { rating: true },
          _count: { rating: true },
        });

        await tx.provider.update({
          where: { id: provider.id },
          data: {
            ratingAvg: agg._avg.rating || rating,
            ratingCount: agg._count.rating,
          },
        });

        // Add celebratory notification
        await tx.notification.create({
          data: {
            userId,
            type: 'REVIEW_SUBMITTED',
            title: 'Reflection Shared',
            body: `Your review for ${provider.name} was successfully shared with the community.`,
            linkUrl: `/grooming/${provider.slug}`,
          },
        });

        return review;
      });

      const result: ProviderReviewSummary = {
        id: createdReview.id,
        userId: createdReview.userId,
        userName: user.name,
        providerId: createdReview.providerId,
        bookingId: createdReview.bookingId,
        rating: createdReview.rating,
        title: createdReview.title,
        body: createdReview.body,
        isSample: createdReview.isSample,
        createdAt: createdReview.createdAt.toISOString(),
      };

      return reply.status(201).send({ review: result });
    });

    // PATCH /admin/bookings/:id/status (Admin status progression, e.g. marking COMPLETED)
    authGroup.patch('/admin/bookings/:id/status', async (request) => {
      const user = await prisma.user.findUnique({
        where: { id: request.user!.userId },
      });

      if (!user || user.role !== Role.ADMIN) {
        throw new ForbiddenError('Admin role required');
      }

      const { id } = request.params as { id: string };
      const body = AdminUpdateBookingStatusSchema.parse(request.body);
      const { status, notes } = body;

      const booking = await prisma.booking.findUnique({
        where: { id },
      });

      if (!booking) {
        throw new NotFoundError(`Booking ${id} not found`);
      }

      const updated = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        const b = await tx.booking.update({
          where: { id },
          data: { status },
        });

        await tx.auditLog.create({
          data: {
            userId: user.id,
            action: 'ADMIN_UPDATE_BOOKING_STATUS',
            entity: 'Booking',
            entityId: b.id,
            meta: { from: booking.status, to: status, notes },
          },
        });

        return b;
      });

      return { booking: updated };
    });
  });
};
