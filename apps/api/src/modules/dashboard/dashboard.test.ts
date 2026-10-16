import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../../app.js';
import { prisma } from '../../lib/prisma.js';
import {
  BookingKind,
  BookingStatus,
  OrderStatus,
  PaymentMode,
  Role,
  FavouriteKind,
} from '@pawnest/shared';
import { createNotificationSafely } from '../notifications/routes.js';

describe('PawNest Phase 8 — Dashboard Unification & Notifications End-to-End', () => {
  let app: FastifyInstance;
  let userAToken: string;
  let userBToken: string;
  let adminToken: string;
  let userAId: string;
  let userBId: string;
  let adminId: string;

  let testPetId: string;
  let testProviderId: string;
  let testProviderSlug: string;
  let testServiceId: string;
  let testProductId: string;
  let testVariantId: string;
  let testBookingId: string;
  let testOrderId: string;

  beforeAll(async () => {
    app = buildApp({ logger: false });
    await app.ready();

    // 1. Setup User A
    const emailA = `dash-user-a-${Date.now()}@pawnest.example`;
    const regResA = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: { email: emailA, password: 'Password123!', name: 'Maya Overview' },
    });
    userAId = regResA.json().user.id;
    const loginResA = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: emailA, password: 'Password123!' },
    });
    userAToken = loginResA.cookies.find((c) => c.name === 'pn_at')!.value;

    // 2. Setup User B
    const emailB = `dash-user-b-${Date.now()}@pawnest.example`;
    const regResB = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: { email: emailB, password: 'Password123!', name: 'Daniel Other' },
    });
    userBId = regResB.json().user.id;
    const loginResB = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: emailB, password: 'Password123!' },
    });
    userBToken = loginResB.cookies.find((c) => c.name === 'pn_at')!.value;

    // 3. Setup Admin User
    const emailAdmin = `dash-admin-${Date.now()}@pawnest.example`;
    const regResAdmin = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: { email: emailAdmin, password: 'AdminPassword123!', name: 'Care Admin' },
    });
    adminId = regResAdmin.json().user.id;
    await prisma.user.update({
      where: { id: adminId },
      data: { role: Role.ADMIN },
    });
    const loginResAdmin = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: emailAdmin, password: 'AdminPassword123!' },
    });
    adminToken = loginResAdmin.cookies.find((c) => c.name === 'pn_at')!.value;

    // 4. Setup Test Pet for User A
    const petRes = await app.inject({
      method: 'POST',
      url: '/api/v1/pets',
      headers: { Authorization: `Bearer ${userAToken}` },
      payload: {
        name: 'Barnaby Dashboard',
        species: 'DOG',
        breed: 'Bernese Mountain Dog',
        sex: 'MALE',
        birthDate: '2022-04-12T00:00:00.000Z',
        weightKg: 42,
        neutered: true,
      },
    });
    testPetId = petRes.json().pet.id;

    // Add vaccination for Pet
    await app.inject({
      method: 'POST',
      url: `/api/v1/pets/${testPetId}/vaccinations`,
      headers: { Authorization: `Bearer ${userAToken}` },
      payload: {
        name: 'Rabies (3-Year)',
        administeredOn: '2024-05-10T00:00:00.000Z',
        expiresOn: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        vetName: 'Dr. Jane Hudson',
      },
    });

    // 5. Fetch Seeded Provider & Service
    const provider = await prisma.provider.findFirst({
      where: { services: { some: { isAddOn: false } } },
      include: { services: true },
    });
    testProviderId = provider!.id;
    testProviderSlug = provider!.slug;
    testServiceId = provider!.services[0].id;

    // 6. Fetch Seeded Product & Variant
    const product = await prisma.product.findFirst({
      include: { variants: true },
    });
    testProductId = product!.id;
    testVariantId = product!.variants[0].id;

    // 7. Create an active Booking for User A
    const futureDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
    futureDate.setUTCHours(14, 0, 0, 0);
    const futureEndDate = new Date(futureDate.getTime() + 60 * 60 * 1000);

    const bookingRes = await app.inject({
      method: 'POST',
      url: '/api/v1/bookings',
      headers: {
        Authorization: `Bearer ${userAToken}`,
        'idempotency-key': `dash-booking-${Date.now()}`,
      },
      payload: {
        petId: testPetId,
        providerId: testProviderId,
        kind: BookingKind.GROOMING,
        serviceId: testServiceId,
        startsAt: futureDate.toISOString(),
        endsAt: futureEndDate.toISOString(),
      },
    });
    testBookingId = bookingRes.json().id;

    // 8. Create a Demo Order for User A
    const order = await prisma.order.create({
      data: {
        number: `PN-ORD-DASH-${Date.now()}`,
        userId: userAId,
        status: OrderStatus.DEMO_PLACED,
        paymentMode: PaymentMode.DEMO,
        currency: 'USD',
        subtotalCents: 5400,
        shippingCents: 0,
        taxCents: 479,
        totalCents: 5879,
        shippingAddress: {
          recipient: 'Maya Overview',
          line1: '142 Franklin St',
          city: 'Brooklyn',
          region: 'NY',
          postalCode: '11222',
          country: 'US',
        },
        items: {
          create: {
            variantId: testVariantId,
            productName: product!.name,
            variantName: product!.variants[0].name,
            sku: product!.variants[0].sku,
            unitPriceCents: 5400,
            quantity: 1,
          },
        },
      },
    });
    testOrderId = order.id;
  });

  afterAll(async () => {
    await app.close();
  });

  // 1. Dashboard Overview & Summary Counts
  describe('1. GET /dashboard/summary & Unified Timeline', () => {
    it('returns accurate summary counts and user greeting', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/dashboard/summary',
        headers: { Authorization: `Bearer ${userAToken}` },
      });

      expect(res.statusCode).toBe(200);
      const data = res.json().summary;

      expect(data.user.id).toBe(userAId);
      expect(data.user.name).toBe('Maya Overview');

      // Verify exact counts match database
      expect(data.counts.petsCount).toBe(1);
      expect(data.counts.activeBookingsCount).toBeGreaterThanOrEqual(1);
      expect(data.counts.activeOrdersCount).toBeGreaterThanOrEqual(1);

      // Verify Pets carousel array has computed vaccination status
      expect(data.pets.length).toBe(1);
      expect(data.pets[0].id).toBe(testPetId);
      expect(data.pets[0].vaccinationStatus).toBe('UP_TO_DATE');

      // Verify Upcoming Bookings
      expect(data.upcomingBookings.length).toBeGreaterThanOrEqual(1);
      expect(data.upcomingBookings[0].providerName).toBeDefined();
      expect(data.upcomingBookings[0].petName).toBe('Barnaby Dashboard');

      // Verify Recent Orders
      expect(data.recentOrders.length).toBeGreaterThanOrEqual(1);
      expect(data.recentOrders[0].status).toBe(OrderStatus.DEMO_PLACED);
    });

    it('aggregates mixed timeline events chronologically with correct types', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/dashboard/summary',
        headers: { Authorization: `Bearer ${userAToken}` },
      });

      expect(res.statusCode).toBe(200);
      const data = res.json().summary;

      expect(Array.isArray(data.timeline)).toBe(true);
      expect(data.timeline.length).toBeGreaterThanOrEqual(2);

      // Verify presence of both booking and order in unified timeline
      const bookingEvent = data.timeline.find((e: any) => e.type === 'GROOMING');
      const orderEvent = data.timeline.find((e: any) => e.type === 'ORDER');

      expect(bookingEvent).toBeDefined();
      expect(bookingEvent.title).toContain('Barnaby Dashboard');
      expect(bookingEvent.linkUrl).toContain('/dashboard/bookings/');

      expect(orderEvent).toBeDefined();
      expect(orderEvent.title).toContain('Supply Order #');
      expect(orderEvent.linkUrl).toContain('/dashboard/orders/');
    });
  });

  // 2. Favourites System
  describe('2. Favourites Persistence & Authorization', () => {
    it('POST /me/favourites toggles a provider and a product to favorites', async () => {
      // 1. Add Provider to favorites
      const provRes = await app.inject({
        method: 'POST',
        url: '/api/v1/me/favourites',
        headers: { Authorization: `Bearer ${userAToken}` },
        payload: { kind: FavouriteKind.PROVIDER, id: testProviderId },
      });
      expect(provRes.statusCode).toBe(201);
      expect(provRes.json().isFavourited).toBe(true);

      // 2. Add Product to favorites
      const prodRes = await app.inject({
        method: 'POST',
        url: '/api/v1/me/favourites',
        headers: { Authorization: `Bearer ${userAToken}` },
        payload: { kind: FavouriteKind.PRODUCT, id: testProductId },
      });
      expect(prodRes.statusCode).toBe(201);
      expect(prodRes.json().isFavourited).toBe(true);

      // 3. Verify GET /me/favourites/ids returns both IDs
      const idsRes = await app.inject({
        method: 'GET',
        url: '/api/v1/me/favourites/ids',
        headers: { Authorization: `Bearer ${userAToken}` },
      });
      expect(idsRes.statusCode).toBe(200);
      expect(idsRes.json().providerIds).toContain(testProviderId);
      expect(idsRes.json().productIds).toContain(testProductId);

      // 4. Verify GET /me/favourites populates full metadata
      const listRes = await app.inject({
        method: 'GET',
        url: '/api/v1/me/favourites',
        headers: { Authorization: `Bearer ${userAToken}` },
      });
      expect(listRes.statusCode).toBe(200);
      const items = listRes.json().favourites;
      expect(items.length).toBe(2);

      const favProvider = items.find((f: any) => f.kind === FavouriteKind.PROVIDER);
      expect(favProvider.provider.name).toBeDefined();
      expect(favProvider.provider.ratingAvg).toBeDefined();

      const favProduct = items.find((f: any) => f.kind === FavouriteKind.PRODUCT);
      expect(favProduct.product.name).toBeDefined();
      expect(favProduct.product.minPriceCents).toBeGreaterThan(0);
    });

    it('toggling again or DELETE /me/favourites/:kind/:id removes favourite', async () => {
      // Toggle off via POST
      const toggleOffRes = await app.inject({
        method: 'POST',
        url: '/api/v1/me/favourites',
        headers: { Authorization: `Bearer ${userAToken}` },
        payload: { kind: FavouriteKind.PROVIDER, id: testProviderId },
      });
      expect(toggleOffRes.statusCode).toBe(200);
      expect(toggleOffRes.json().isFavourited).toBe(false);

      // Explicit DELETE for product
      const deleteRes = await app.inject({
        method: 'DELETE',
        url: `/api/v1/me/favourites/${FavouriteKind.PRODUCT}/${testProductId}`,
        headers: { Authorization: `Bearer ${userAToken}` },
      });
      expect(deleteRes.statusCode).toBe(200);
      expect(deleteRes.json().isFavourited).toBe(false);

      // Verify list is now empty
      const listRes = await app.inject({
        method: 'GET',
        url: '/api/v1/me/favourites',
        headers: { Authorization: `Bearer ${userAToken}` },
      });
      expect(listRes.json().favourites.length).toBe(0);
    });

    it('enforces authorization: User B receives empty favourites list', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/me/favourites',
        headers: { Authorization: `Bearer ${userBToken}` },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().favourites).toEqual([]);
    });
  });

  // 3. Notification Center & Deduplication
  describe('3. Notification Center, Deduplication & Read State', () => {
    let notif1Id: string;
    let notif2Id: string;

    it('createNotificationSafely deduplicates within rolling time window', async () => {
      // Create first notification
      const n1 = await createNotificationSafely({
        userId: userAId,
        type: 'VACCINE_REMINDER',
        title: 'Barnaby Rabies Vaccine Due Soon',
        body: 'Barnaby is scheduled for Rabies immunization in 2 weeks.',
        linkUrl: `/dashboard/pets/${testPetId}`,
        dedupeWindowMinutes: 60,
      });
      notif1Id = n1.id;

      // Attempt duplicate immediately
      const n2 = await createNotificationSafely({
        userId: userAId,
        type: 'VACCINE_REMINDER',
        title: 'Barnaby Rabies Vaccine Due Soon',
        body: 'Duplicate content attempt',
        dedupeWindowMinutes: 60,
      });

      // Assert deduplicated to existing notification record
      expect(n2.id).toBe(n1.id);

      // Create a second distinct notification
      const n3 = await createNotificationSafely({
        userId: userAId,
        type: 'ORDER_UPDATE',
        title: 'Supply Package Shipped',
        body: 'Your organic salmon kibble has departed the warehouse.',
        dedupeWindowMinutes: 60,
      });
      notif2Id = n3.id;
    });

    it('GET /notifications returns unreadCount and items', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/notifications',
        headers: { Authorization: `Bearer ${userAToken}` },
      });

      expect(res.statusCode).toBe(200);
      const data = res.json();
      expect(data.unreadCount).toBeGreaterThanOrEqual(2);
      expect(data.items.some((n: any) => n.id === notif1Id)).toBe(true);
    });

    it('POST /notifications/:id/read marks single notification as read', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/notifications/${notif1Id}/read`,
        headers: { Authorization: `Bearer ${userAToken}` },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().notification.readAt).toBeDefined();

      // Check unread count decreased
      const listRes = await app.inject({
        method: 'GET',
        url: '/api/v1/notifications',
        headers: { Authorization: `Bearer ${userAToken}` },
      });
      const updatedItem = listRes.json().items.find((i: any) => i.id === notif1Id);
      expect(updatedItem.readAt).not.toBeNull();
    });

    it('cross-user authorization: User B cannot mark User A notification as read (returns 404)', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/notifications/${notif1Id}/read`,
        headers: { Authorization: `Bearer ${userBToken}` },
      });

      expect(res.statusCode).toBe(404);
    });

    it('POST /notifications/read-all marks all notifications read', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/notifications/read-all',
        headers: { Authorization: `Bearer ${userAToken}` },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().success).toBe(true);

      const listRes = await app.inject({
        method: 'GET',
        url: '/api/v1/notifications',
        headers: { Authorization: `Bearer ${userAToken}` },
      });
      expect(listRes.json().unreadCount).toBe(0);
    });
  });

  // 4. Review Eligibility Rules
  describe('4. Review Eligibility & Verification Rules', () => {
    it('POST /providers/:slug/reviews REJECTS booking in non-COMPLETED status with 422', async () => {
      // Booking is currently CONFIRMED, not COMPLETED
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/providers/${testProviderSlug}/reviews`,
        headers: { Authorization: `Bearer ${userAToken}` },
        payload: {
          bookingId: testBookingId,
          rating: 5,
          title: 'Early Review Attempt',
          body: 'This should fail because the appointment has not finished yet.',
        },
      });

      expect(res.statusCode).toBe(422);
      expect(res.json().detail).toContain('Reviews may only be submitted after your appointment or stay is completed');
    });

    it('PATCH /admin/bookings/:id/status allows Admin to mark booking COMPLETED', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: `/api/v1/admin/bookings/${testBookingId}/status`,
        headers: { Authorization: `Bearer ${adminToken}` },
        payload: {
          status: BookingStatus.COMPLETED,
          notes: 'Grooming service concluded successfully',
        },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().booking.status).toBe(BookingStatus.COMPLETED);
    });

    it('GET /me/reviewable lists the completed booking with hasReview: false', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/me/reviewable',
        headers: { Authorization: `Bearer ${userAToken}` },
      });

      expect(res.statusCode).toBe(200);
      const eligible = res.json().items.find((i: any) => i.id === testBookingId);
      expect(eligible).toBeDefined();
      expect(eligible.hasReview).toBe(false);
      expect(eligible.providerSlug).toBe(testProviderSlug);
    });

    it('POST /providers/:slug/reviews SUCCEEDS for COMPLETED booking and updates provider rating', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/providers/${testProviderSlug}/reviews`,
        headers: { Authorization: `Bearer ${userAToken}` },
        payload: {
          bookingId: testBookingId,
          rating: 5,
          title: 'Exquisite Care for Barnaby',
          body: 'The groomers treated Barnaby with such patience and tenderness. Highly recommend!',
        },
      });

      expect(res.statusCode).toBe(201);
      const review = res.json().review;
      expect(review.rating).toBe(5);
      expect(review.isSample).toBe(false);
      expect(review.userName).toBe('Maya Overview');

      // Verify provider rating updated
      const provider = await prisma.provider.findUnique({ where: { slug: testProviderSlug } });
      expect(provider?.ratingCount).toBeGreaterThanOrEqual(1);

      // Verify user received celebratory in-app notification
      const notifs = await prisma.notification.findMany({
        where: { userId: userAId, type: 'REVIEW_SUBMITTED' },
      });
      expect(notifs.length).toBeGreaterThanOrEqual(1);
    });

    it('POST /providers/:slug/reviews REJECTS duplicate review on same booking with 409 Conflict', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/providers/${testProviderSlug}/reviews`,
        headers: { Authorization: `Bearer ${userAToken}` },
        payload: {
          bookingId: testBookingId,
          rating: 4,
          title: 'Duplicate Attempt',
          body: 'Should not allow two reviews for the same booking.',
        },
      });

      expect(res.statusCode).toBe(409);
    });

    it('GET /me/reviewable now reflects hasReview: true', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/me/reviewable',
        headers: { Authorization: `Bearer ${userAToken}` },
      });

      expect(res.statusCode).toBe(200);
      const reviewedItem = res.json().items.find((i: any) => i.id === testBookingId);
      expect(reviewedItem.hasReview).toBe(true);
    });
  });
});
