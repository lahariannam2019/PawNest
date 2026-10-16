import { FastifyPluginAsync } from 'fastify';
import { prisma } from '../../lib/prisma.js';
import { NotFoundError } from '../../lib/errors.js';
import {
  NotificationSummary,
  NotificationListResponse,
} from '@pawnest/shared';

export interface CreateNotificationParams {
  userId: string;
  type: string;
  title: string;
  body: string;
  linkUrl?: string | null;
  dedupeWindowMinutes?: number;
}

/**
 * Creates an in-app notification with deduplication within a rolling window.
 */
export async function createNotificationSafely(params: CreateNotificationParams) {
  const { userId, type, title, body, linkUrl, dedupeWindowMinutes = 60 } = params;

  if (dedupeWindowMinutes > 0) {
    const windowStart = new Date(Date.now() - dedupeWindowMinutes * 60 * 1000);
    const existing = await prisma.notification.findFirst({
      where: {
        userId,
        type,
        title,
        createdAt: { gte: windowStart },
      },
    });

    if (existing) {
      return existing;
    }
  }

  return prisma.notification.create({
    data: {
      userId,
      type,
      title,
      body,
      linkUrl: linkUrl || null,
    },
  });
}

export const notificationRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.register(async (authGroup) => {
    authGroup.addHook('preHandler', fastify.authenticate);

    // GET /notifications (Paginated notification center)
    authGroup.get('/notifications', async (request): Promise<NotificationListResponse> => {
      const userId = request.user!.userId;
      const { limit = '20', offset = '0' } = request.query as { limit?: string; offset?: string };

      const take = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
      const skip = Math.max(parseInt(offset, 10) || 0, 0);

      const [notifications, total, unreadCount] = await Promise.all([
        prisma.notification.findMany({
          where: { userId },
          orderBy: { createdAt: 'desc' },
          take,
          skip,
        }),
        prisma.notification.count({ where: { userId } }),
        prisma.notification.count({ where: { userId, readAt: null } }),
      ]);

      const items: NotificationSummary[] = notifications.map((n) => ({
        id: n.id,
        type: n.type,
        title: n.title,
        body: n.body,
        linkUrl: n.linkUrl,
        readAt: n.readAt ? n.readAt.toISOString() : null,
        createdAt: n.createdAt.toISOString(),
      }));

      return {
        items,
        unreadCount,
        total,
      };
    });

    // POST /notifications/:id/read (Mark single notification as read)
    authGroup.post('/notifications/:id/read', async (request) => {
      const userId = request.user!.userId;
      const { id } = request.params as { id: string };

      const notification = await prisma.notification.findFirst({
        where: { id, userId },
      });

      if (!notification) {
        throw new NotFoundError(`Notification ${id} not found`);
      }

      if (!notification.readAt) {
        const updated = await prisma.notification.update({
          where: { id: notification.id },
          data: { readAt: new Date() },
        });

        return {
          notification: {
            id: updated.id,
            type: updated.type,
            title: updated.title,
            body: updated.body,
            linkUrl: updated.linkUrl,
            readAt: updated.readAt!.toISOString(),
            createdAt: updated.createdAt.toISOString(),
          },
        };
      }

      return {
        notification: {
          id: notification.id,
          type: notification.type,
          title: notification.title,
          body: notification.body,
          linkUrl: notification.linkUrl,
          readAt: notification.readAt.toISOString(),
          createdAt: notification.createdAt.toISOString(),
        },
      };
    });

    // POST /notifications/read-all (Mark all user's notifications as read)
    authGroup.post('/notifications/read-all', async (request) => {
      const userId = request.user!.userId;

      const result = await prisma.notification.updateMany({
        where: { userId, readAt: null },
        data: { readAt: new Date() },
      });

      return {
        success: true,
        updatedCount: result.count,
      };
    });
  });
};
