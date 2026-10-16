import { FastifyPluginAsync } from 'fastify';
import { prisma } from '../../lib/prisma.js';
import {
  DashboardSummary,
  TimelineEvent,
  BookingStatus,
  OrderStatus,
  BookingKind,
  PetSummary,
  VaccinationStatus,
  OrderSummary,
} from '@pawnest/shared';
import { formatOrderSummary } from '../orders/routes.js';
import { formatPetDto } from '../pets/routes.js';

export const dashboardRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.register(async (authGroup) => {
    authGroup.addHook('preHandler', fastify.authenticate);

    // GET /dashboard/summary (Aggregated dashboard overview & unified timeline)
    authGroup.get('/dashboard/summary', async (request): Promise<{ summary: DashboardSummary }> => {
      const userId = request.user!.userId;
      const now = new Date();

      // 1. Fetch User
      const user = await prisma.user.findUniqueOrThrow({
        where: { id: userId },
        select: { id: true, name: true, email: true },
      });

      // 2. Fetch Pets with vaccinations
      const dbPets = await prisma.pet.findMany({
        where: { userId, deletedAt: null },
        include: { vaccinations: true },
        orderBy: { createdAt: 'desc' },
      });

      const formattedPets: PetSummary[] = await Promise.all(dbPets.map(formatPetDto));


      // 3. Fetch Bookings (both upcoming and recent)
      const [allUserBookings, activeOrders, allUserOrders, dbNotifications, favouritesCount] =
        await Promise.all([
          prisma.booking.findMany({
            where: { userId },
            include: {
              provider: true,
              service: true,
              unit: true,
              pet: true,
            },
            orderBy: { startsAt: 'desc' },
            take: 20,
          }),
          prisma.order.findMany({
            where: {
              userId,
              status: { in: [OrderStatus.DEMO_PLACED, OrderStatus.PAID, OrderStatus.PROCESSING, OrderStatus.SHIPPED] },
            },
            include: { items: true },
            orderBy: { placedAt: 'desc' },
          }),
          prisma.order.findMany({
            where: { userId },
            include: { items: true },
            orderBy: { placedAt: 'desc' },
            take: 10,
          }),
          prisma.notification.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: 5,
          }),
          prisma.favourite.count({ where: { userId } }),
        ]);

      // Filter upcoming bookings
      const upcomingBookings = allUserBookings
        .filter((b) => new Date(b.startsAt) >= now && b.status !== BookingStatus.CANCELLED)
        .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())
        .slice(0, 3)
        .map((b) => ({
          id: b.id,
          reference: b.reference,
          kind: b.kind as BookingKind,
          status: b.status as BookingStatus,
          startsAt: b.startsAt.toISOString(),
          endsAt: b.endsAt.toISOString(),
          priceCents: b.priceCents,
          providerName: b.provider.name,
          providerSlug: b.provider.slug,
          petName: b.pet.name,
          petAvatarKey: b.pet.avatarKey,
          serviceName: b.service?.name ?? null,
          boardingUnitName: b.unit?.name ?? null,
        }));

      // Counts
      const activeBookingsCount = allUserBookings.filter(
        (b) =>
          (b.status === BookingStatus.CONFIRMED || b.status === BookingStatus.PENDING) &&
          new Date(b.endsAt) >= now
      ).length;

      const completedBookingsCount = await prisma.booking.count({
        where: { userId, status: BookingStatus.COMPLETED },
      });

      const unreadNotificationsCount = await prisma.notification.count({
        where: { userId, readAt: null },
      });

      const recentOrdersSummary: OrderSummary[] = allUserOrders.slice(0, 3).map(formatOrderSummary);

      // 4. Build Unified Timeline
      const timeline: TimelineEvent[] = [];

      // Add Bookings to Timeline
      for (const b of allUserBookings) {
        let type: 'GROOMING' | 'BOARDING' | 'VET';
        let title: string;
        let subtitle: string = b.provider.name;

        if (b.kind === BookingKind.BOARDING) {
          type = 'BOARDING';
          title = `Overnight Stay for ${b.pet.name} (${b.unit?.name || 'Retreat Suite'})`;
        } else if (b.kind === BookingKind.VET) {
          type = 'VET';
          title = `Veterinary Consultation for ${b.pet.name}`;
          if (b.service?.name) {
            subtitle = `${b.service.name} · ${b.provider.name}`;
          }
        } else {
          type = 'GROOMING';
          title = `${b.service?.name || 'Grooming Atelier'} for ${b.pet.name}`;
        }

        const isUpcoming = new Date(b.startsAt) >= now && b.status !== BookingStatus.CANCELLED;
        let badgeVariant: 'default' | 'success' | 'warning' | 'error' | 'outline' | 'demo' = 'default';
        if (b.status === BookingStatus.CONFIRMED) badgeVariant = 'success';
        else if (b.status === BookingStatus.PENDING) badgeVariant = 'warning';
        else if (b.status === BookingStatus.CANCELLED) badgeVariant = 'error';
        else if (b.status === BookingStatus.COMPLETED) badgeVariant = 'outline';

        timeline.push({
          id: `timeline-booking-${b.id}`,
          type,
          title,
          subtitle,
          date: b.startsAt.toISOString(),
          status: b.status,
          statusLabel: b.status.charAt(0) + b.status.slice(1).toLowerCase(),
          linkUrl: `/dashboard/bookings/${b.id}`,
          isUpcoming,
          badgeVariant,
          petName: b.pet.name,
          petAvatarKey: b.pet.avatarKey,
          totalCents: b.priceCents,
          reference: b.reference,
        });
      }

      // Add Orders to Timeline
      for (const o of allUserOrders) {
        const isUpcoming = o.status !== OrderStatus.DELIVERED && o.status !== OrderStatus.CANCELLED;
        let badgeVariant: 'default' | 'success' | 'warning' | 'error' | 'outline' | 'demo' = 'default';
        if (o.status === OrderStatus.DELIVERED) badgeVariant = 'success';
        else if (o.status === OrderStatus.SHIPPED) badgeVariant = 'success';
        else if (o.status === OrderStatus.CANCELLED) badgeVariant = 'error';
        else if (o.status === OrderStatus.DEMO_PLACED) badgeVariant = 'demo';

        const lineSummary =
          o.items.length === 1
            ? `${o.items[0].productName} (${o.items[0].quantity}x)`
            : `${o.items.length} items (${o.items[0].productName} + ${o.items.length - 1} more)`;

        timeline.push({
          id: `timeline-order-${o.id}`,
          type: 'ORDER',
          title: `Supply Order #${o.number}`,
          subtitle: `${lineSummary} · $${(o.totalCents / 100).toFixed(2)}`,
          date: o.placedAt.toISOString(),
          status: o.status,
          statusLabel: o.status.replace(/_/g, ' '),
          linkUrl: `/dashboard/orders/${o.id}`,
          isUpcoming,
          badgeVariant,
          totalCents: o.totalCents,
          reference: o.number,
        });
      }

      // Sort timeline: Upcoming events first (ascending date), then past events (descending date)
      timeline.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      return {
        summary: {
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
          },
          counts: {
            petsCount: formattedPets.length,
            activeBookingsCount,
            completedBookingsCount,
            activeOrdersCount: activeOrders.length,
            unreadNotificationsCount,
            favouritesCount,
          },
          upcomingBookings,
          recentOrders: recentOrdersSummary,
          pets: formattedPets,
          recentNotifications: dbNotifications.map((n) => ({
            id: n.id,
            type: n.type,
            title: n.title,
            body: n.body,
            linkUrl: n.linkUrl,
            readAt: n.readAt ? n.readAt.toISOString() : null,
            createdAt: n.createdAt.toISOString(),
          })),
          timeline,
        },
      };
    });
  });
};
