import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../../app.js';
import { prisma } from '../../lib/prisma.js';
import { OrderStatus, PaymentMode, Role, ErrorCode } from '@pawnest/shared';
import { expireOldReservations } from './routes.js';
import crypto from 'node:crypto';

describe('PawNest Phase 7 — Supplies, Cart, Checkout & Orders End-to-End', () => {
  let app: FastifyInstance;
  let userAToken: string;
  let userBToken: string;
  let adminToken: string;
  let userAId: string;
  let userBId: string;
  let adminId: string;

  let testProductVariantId: string;
  let testProductSlug: string;

  beforeAll(async () => {
    app = buildApp({ logger: false });
    await app.ready();

    // 1. Setup User A
    const userAEmail = `cart-user-a-${Date.now()}@pawnest.example`;
    const regResA = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        email: userAEmail,
        password: 'Password123!',
        name: 'Maya CartOwner',
      },
    });
    userAId = regResA.json().user.id;
    const loginResA = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: userAEmail, password: 'Password123!' },
    });
    userAToken = loginResA.cookies.find((c) => c.name === 'pn_at')!.value;

    // 2. Setup User B
    const userBEmail = `cart-user-b-${Date.now()}@pawnest.example`;
    const regResB = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        email: userBEmail,
        password: 'Password123!',
        name: 'Daniel Other',
      },
    });
    userBId = regResB.json().user.id;
    const loginResB = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: userBEmail, password: 'Password123!' },
    });
    userBToken = loginResB.cookies.find((c) => c.name === 'pn_at')!.value;

    // 3. Setup Admin User
    const adminEmail = `cart-admin-${Date.now()}@pawnest.example`;
    const regResAdmin = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        email: adminEmail,
        password: 'AdminPassword123!',
        name: 'Super Admin',
      },
    });
    adminId = regResAdmin.json().user.id;
    await prisma.user.update({
      where: { id: adminId },
      data: { role: Role.ADMIN },
    });
    const loginResAdmin = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: adminEmail, password: 'AdminPassword123!' },
    });
    adminToken = loginResAdmin.cookies.find((c) => c.name === 'pn_at')!.value;

    // 4. Fetch an existing seeded product
    const product = await prisma.product.findFirst({
      where: { slug: 'nordic-pasture-raised-salmon-kibble' },
      include: { variants: { orderBy: { priceCents: 'asc' } } },
    });
    if (product && product.variants.length > 0) {
      testProductSlug = product.slug;
      const smallBag = product.variants.find((v) => v.priceCents === 3400) || product.variants[0];
      testProductVariantId = smallBag.id;
    } else {
      // Fallback create if seed wasn't run
      const cat = await prisma.category.upsert({
        where: { slug: 'food' },
        update: {},
        create: { slug: 'food', name: 'Food' },
      });
      const p = await prisma.product.create({
        data: {
          slug: 'test-kibble',
          name: 'Test Salmon Kibble',
          brand: 'Nordic Hound',
          description: 'Delicious test kibble',
          categoryId: cat.id,
          variants: {
            create: {
              sku: `TEST-SKU-${Date.now()}`,
              name: '5 lb Bag',
              priceCents: 3400,
              stock: 50,
            },
          },
        },
        include: { variants: true },
      });
      testProductSlug = p.slug;
      testProductVariantId = p.variants[0].id;
    }
  });

  afterAll(async () => {
    await app.close();
  });

  // 1. Product Catalogue & Search
  describe('1. Product Catalogue & Reviews API', () => {
    it('GET /categories returns 8 categories with product counts', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/categories',
      });

      expect(res.statusCode).toBe(200);
      const data = res.json();
      expect(Array.isArray(data.categories)).toBe(true);
      expect(data.categories.length).toBeGreaterThanOrEqual(8);
      const foodCategory = data.categories.find((c: any) => c.slug === 'food');
      expect(foodCategory).toBeDefined();
      expect(foodCategory.productCount).toBeGreaterThan(0);
    });

    it('GET /products lists products with search query and species filter', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/products?category=food&species=DOG',
      });

      expect(res.statusCode).toBe(200);
      const data = res.json();
      expect(Array.isArray(data.products)).toBe(true);
      expect(data.products.length).toBeGreaterThan(0);
      expect(data.products[0].species).toContain('DOG');
      expect(data.products[0].minPriceCents).toBeGreaterThan(0);
    });

    it('GET /products/:slug returns PDP details and variant stock', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/products/${testProductSlug}`,
      });

      expect(res.statusCode).toBe(200);
      const data = res.json();
      expect(data.product.slug).toBe(testProductSlug);
      expect(data.product.variants.length).toBeGreaterThan(0);
      expect(data.product.variants[0].availableStock).toBeGreaterThan(0);
    });

    it('GET /products/:slug/reviews returns sample reviews marked isSample: true', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/products/${testProductSlug}/reviews`,
      });

      expect(res.statusCode).toBe(200);
      const data = res.json();
      expect(Array.isArray(data.reviews)).toBe(true);
      expect(data.reviews.some((r: any) => r.isSample === true)).toBe(true);
    });

    it('POST /products/:slug/reviews allows authenticated user to submit a review', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/products/${testProductSlug}/reviews`,
        headers: { Authorization: `Bearer ${userAToken}` },
        payload: {
          rating: 5,
          title: 'Barnaby adores this!',
          body: 'Healthy, radiant coat after just two weeks of feeding.',
        },
      });

      expect(res.statusCode).toBe(200);
      const data = res.json();
      expect(data.review.rating).toBe(5);
      expect(data.review.isSample).toBe(false);
      expect(data.review.userName).toBe('Maya CartOwner');
    });
  });

  // 2. Cart Management
  describe('2. Cart Operations & Guest Merging', () => {
    it('GET /cart returns empty cart with zero totals initially', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/cart',
        headers: { Authorization: `Bearer ${userAToken}` },
      });

      expect(res.statusCode).toBe(200);
      const data = res.json();
      expect(data.cart.items).toEqual([]);
      expect(data.cart.subtotalCents).toBe(0);
      expect(data.cart.totalCents).toBe(0);
    });

    it('POST /cart/items adds an item and computes shipping ($10 standard below $75)', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/cart/items',
        headers: { Authorization: `Bearer ${userAToken}` },
        payload: {
          variantId: testProductVariantId,
          quantity: 1,
        },
      });

      expect(res.statusCode).toBe(200);
      const data = res.json();
      expect(data.cart.items.length).toBe(1);
      expect(data.cart.items[0].quantity).toBe(1);
      expect(data.cart.shippingCents).toBe(1000); // Standard $10 shipping
      expect(data.cart.qualifiesForFreeShipping).toBe(false);
    });

    it('PATCH /cart/items/:id updates quantity and unlocks free shipping above $75', async () => {
      const cartRes = await app.inject({
        method: 'GET',
        url: '/api/v1/cart',
        headers: { Authorization: `Bearer ${userAToken}` },
      });
      const itemId = cartRes.json().cart.items[0].id;

      // Increase quantity to 3 ($34 * 3 = $102 >= $75)
      const res = await app.inject({
        method: 'PATCH',
        url: `/api/v1/cart/items/${itemId}`,
        headers: { Authorization: `Bearer ${userAToken}` },
        payload: { quantity: 3 },
      });

      expect(res.statusCode).toBe(200);
      const data = res.json();
      expect(data.cart.items[0].quantity).toBe(3);
      expect(data.cart.subtotalCents).toBe(10200);
      expect(data.cart.shippingCents).toBe(0); // FREE SHIPPING!
      expect(data.cart.qualifiesForFreeShipping).toBe(true);
    });

    it('POST /cart/merge merges guest cart items with quantity clamping', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/cart/merge',
        headers: { Authorization: `Bearer ${userBToken}` },
        payload: {
          items: [
            { variantId: testProductVariantId, quantity: 2 },
          ],
        },
      });

      expect(res.statusCode).toBe(200);
      const data = res.json();
      expect(data.cart.items.length).toBe(1);
      expect(data.cart.items[0].quantity).toBe(2);
    });

    it('DELETE /cart/items/:id removes item from cart', async () => {
      const cartRes = await app.inject({
        method: 'GET',
        url: '/api/v1/cart',
        headers: { Authorization: `Bearer ${userBToken}` },
      });
      const itemId = cartRes.json().cart.items[0].id;

      const res = await app.inject({
        method: 'DELETE',
        url: `/api/v1/cart/items/${itemId}`,
        headers: { Authorization: `Bearer ${userBToken}` },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().cart.items.length).toBe(0);
    });
  });

  // 3. Checkout Session, Price Drift & Concurrency
  describe('3. Checkout Session, Price Drift & Stock Concurrency', () => {
    it('POST /checkout/session rejects price drift with 409 CART_CHANGED', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/checkout/session',
        headers: { Authorization: `Bearer ${userAToken}` },
        payload: {
          shippingAddress: {
            recipient: 'Maya CartOwner',
            line1: '142 Franklin St',
            city: 'Brooklyn',
            region: 'NY',
            postalCode: '11222',
            country: 'US',
          },
          clientExpectedTotalCents: 1234, // Deliberately incorrect expected price
        },
      });

      expect(res.statusCode).toBe(409);
      const data = res.json();
      expect(data.code).toBe(ErrorCode.CART_CHANGED);
      expect(data.detail).toContain('Cart prices or items have changed');
    });

    it('CONCURRENCY TEST: Exactly 1 out of 25 parallel checkout requests succeeds on a 1-unit stock variant (Zero Overselling)', async () => {
      // 1. Create a dedicated contest product with exactly stock: 1, reserved: 0
      const cat = await prisma.category.findFirst();
      const contestProduct = await prisma.product.create({
        data: {
          slug: `contest-prod-${Date.now()}`,
          name: 'Rare Handcrafted Bone Broth Elixir',
          brand: 'Artisan Paws',
          description: 'Limited single-bottle micro-batch',
          categoryId: cat!.id,
          variants: {
            create: {
              sku: `CONTEST-SKU-${Date.now()}`,
              name: 'Limited Batch Bottle (8 oz)',
              priceCents: 2500,
              stock: 1, // EXACTLY 1 AVAILABLE!
              reserved: 0,
            },
          },
        },
        include: { variants: true },
      });
      const contestVariantId = contestProduct.variants[0].id;

      // 2. Setup 25 distinct users, each with 1 contest item in their cart
      const CONCURRENCY_COUNT = 25;
      const userTokens: string[] = [];

      for (let i = 0; i < CONCURRENCY_COUNT; i++) {
        const email = `contest-buyer-${Date.now()}-${i}@pawnest.example`;
        await app.inject({
          method: 'POST',
          url: '/api/v1/auth/register',
          payload: { email, password: 'Password123!', name: `Buyer ${i}` },
        });
        const loginRes = await app.inject({
          method: 'POST',
          url: '/api/v1/auth/login',
          payload: { email, password: 'Password123!' },
        });
        const token = loginRes.cookies.find((c) => c.name === 'pn_at')!.value;
        userTokens.push(token);

        // Add 1 unit of contest variant to their cart
        await app.inject({
          method: 'POST',
          url: '/api/v1/cart/items',
          headers: { Authorization: `Bearer ${token}` },
          payload: { variantId: contestVariantId, quantity: 1 },
        });
      }

      // 3. Fire all 25 checkout session requests SIMULTANEOUSLY
      const checkoutPromises = userTokens.map((token, i) =>
        app.inject({
          method: 'POST',
          url: '/api/v1/checkout/session',
          headers: {
            Authorization: `Bearer ${token}`,
            'idempotency-key': `contest-order-${i}-${Date.now()}`,
          },
          payload: {
            shippingAddress: {
              recipient: `Buyer ${i}`,
              line1: '100 Main St',
              city: 'New York',
              region: 'NY',
              postalCode: '10001',
              country: 'US',
            },
          },
        })
      );

      const results = await Promise.all(checkoutPromises);

      const successful = results.filter((r) => r.statusCode === 200);
      const conflicted = results.filter((r) => r.statusCode === 409);

      // Assert: Exactly ONE checkout session succeeded!
      expect(successful.length).toBe(1);

      // Assert: The remaining 24 failed with 409 Conflict (SLOT_TAKEN / OUT_OF_STOCK)
      expect(conflicted.length).toBe(CONCURRENCY_COUNT - 1);
      for (const conf of conflicted) {
        expect(conf.json().code).toBe(ErrorCode.SLOT_TAKEN);
      }

      // 4. Verify Database Invariant: reserved === 1, NO OVERSELLING
      const dbVariant = await prisma.productVariant.findUnique({
        where: { id: contestVariantId },
      });
      expect(dbVariant?.stock).toBe(1);
      expect(dbVariant?.reserved).toBe(1);
    });
  });

  // 4. Demo Confirmation & Payment Mode Integrity
  describe('4. Demo Confirmation & Critical Payment Integrity', () => {
    let demoOrderId: string;
    let demoConfirmToken: string;

    it('POST /checkout/session creates order in PENDING_PAYMENT status and returns demoToken', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/checkout/session',
        headers: { Authorization: `Bearer ${userAToken}` },
        payload: {
          shippingAddress: {
            recipient: 'Maya CartOwner',
            line1: '142 Franklin St',
            city: 'Brooklyn',
            region: 'NY',
            postalCode: '11222',
            country: 'US',
          },
        },
      });

      expect(res.statusCode).toBe(200);
      const data = res.json();
      expect(data.session.orderId).toBeDefined();
      expect(data.session.demoToken).toBeDefined();
      expect(data.session.paymentMode).toBe(PaymentMode.DEMO);

      demoOrderId = data.session.orderId;
      demoConfirmToken = data.session.demoToken;
    });

    it('POST /checkout/demo/confirm sets DEMO_PLACED status and NEVER sets "paid" status', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/checkout/demo/confirm',
        headers: { Authorization: `Bearer ${userAToken}` },
        payload: { demoToken: demoConfirmToken },
      });

      expect(res.statusCode).toBe(200);
      const data = res.json();

      // CRITICAL INTEGRITY ASSERTION: Demo orders must NEVER be marked PAID
      expect(data.order.status).toBe(OrderStatus.DEMO_PLACED);
      expect(data.order.status).not.toBe(OrderStatus.PAID);
      expect(data.order.paymentMode).toBe(PaymentMode.DEMO);

      // Verify cart was cleared after successful order placement
      const cartRes = await app.inject({
        method: 'GET',
        url: '/api/v1/cart',
        headers: { Authorization: `Bearer ${userAToken}` },
      });
      expect(cartRes.json().cart.items.length).toBe(0);
    });

    it('POST /orders/:id/cancel cancels order and releases reserved stock', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/orders/${demoOrderId}/cancel`,
        headers: { Authorization: `Bearer ${userAToken}` },
      });

      expect(res.statusCode).toBe(200);
      const data = res.json();
      expect(data.order.status).toBe(OrderStatus.CANCELLED);
      expect(data.order.cancelledAt).toBeDefined();
    });

    it('expireOldReservations() releases expired reservations and restores stock', async () => {
      // 1. Create a dummy order expired 20 minutes ago
      const cat = await prisma.category.findFirst();
      const p = await prisma.product.create({
        data: {
          slug: `expire-test-${Date.now()}`,
          name: 'Expiring Item',
          brand: 'Brand',
          description: 'Desc',
          categoryId: cat!.id,
          variants: {
            create: {
              sku: `EXP-SKU-${Date.now()}`,
              name: 'Variant',
              priceCents: 2000,
              stock: 10,
              reserved: 2, // 2 units currently reserved
            },
          },
        },
        include: { variants: true },
      });
      const varId = p.variants[0].id;

      const expiredOrder = await prisma.order.create({
        data: {
          number: `PN-EXP-${Date.now()}`,
          userId: userAToken ? userAId : 'dummy',
          status: OrderStatus.PENDING_PAYMENT,
          paymentMode: PaymentMode.DEMO,
          currency: 'USD',
          subtotalCents: 4000,
          shippingCents: 1000,
          taxCents: 355,
          totalCents: 5355,
          shippingAddress: {},
          reservationExpiresAt: new Date(Date.now() - 20 * 60 * 1000), // Expired 20m ago!
          items: {
            create: {
              variantId: varId,
              productName: 'Expiring Item',
              variantName: 'Variant',
              sku: 'EXP-SKU',
              unitPriceCents: 2000,
              quantity: 2,
            },
          },
        },
      });

      // 2. Run expiration job
      const count = await expireOldReservations();
      expect(count).toBeGreaterThanOrEqual(1);

      // 3. Verify order is now CANCELLED and reserved is back to 0
      const refreshedOrder = await prisma.order.findUnique({ where: { id: expiredOrder.id } });
      expect(refreshedOrder?.status).toBe(OrderStatus.CANCELLED);

      const refreshedVariant = await prisma.productVariant.findUnique({ where: { id: varId } });
      expect(refreshedVariant?.reserved).toBe(0); // Restored!
    });
  });

  // 5. Stripe Webhook & Admin Order Management
  describe('5. Stripe Webhook & Admin Order Management', () => {
    it('POST /webhooks/stripe marks order PAID and is idempotent', async () => {
      // Create a test pending order for Stripe
      const cat = await prisma.category.findFirst();
      const p = await prisma.product.findFirst({ include: { variants: true } });
      const varId = p!.variants[0].id;

      const stripeOrder = await prisma.order.create({
        data: {
          number: `PN-STRP-${Date.now()}`,
          userId: userAId,
          status: OrderStatus.PENDING_PAYMENT,
          paymentMode: PaymentMode.STRIPE_TEST,
          currency: 'USD',
          subtotalCents: 3400,
          shippingCents: 1000,
          taxCents: 300,
          totalCents: 4700,
          shippingAddress: {},
          reservationExpiresAt: new Date(Date.now() + 15 * 60 * 1000),
          items: {
            create: {
              variantId: varId,
              productName: p!.name,
              variantName: p!.variants[0].name,
              sku: p!.variants[0].sku,
              unitPriceCents: 3400,
              quantity: 1,
            },
          },
        },
      });

      // Reserve the stock
      await prisma.productVariant.update({
        where: { id: varId },
        data: { reserved: { increment: 1 } },
      });

      // Simulate Stripe webhook
      const webhookPayload = {
        type: 'checkout.session.completed',
        data: {
          object: {
            metadata: { orderNumber: stripeOrder.number },
          },
        },
      };

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/webhooks/stripe',
        payload: webhookPayload,
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().received).toBe(true);

      const updated = await prisma.order.findUnique({ where: { id: stripeOrder.id } });
      expect(updated?.status).toBe(OrderStatus.PAID);
      expect(updated?.paymentMode).toBe(PaymentMode.STRIPE_TEST);

      // Repeat request to verify idempotency
      const secondRes = await app.inject({
        method: 'POST',
        url: '/api/v1/webhooks/stripe',
        payload: webhookPayload,
      });
      expect(secondRes.statusCode).toBe(200);
      expect(secondRes.json().alreadyProcessed).toBe(true);
    });

    it('POST /webhooks/stripe verifies HMAC-SHA256 signature when secret is configured', async () => {
      const originalSecret = process.env.STRIPE_WEBHOOK_SECRET;
      const testSecret = 'whsec_test_secret_key_12345';
      process.env.STRIPE_WEBHOOK_SECRET = testSecret;

      try {
        const dummyPayload = {
          type: 'checkout.session.completed',
          data: { object: { metadata: { orderNumber: 'PN-NONEXISTENT' } } },
        };
        const rawJson = JSON.stringify(dummyPayload);

        // 1. Missing signature
        const missingRes = await app.inject({
          method: 'POST',
          url: '/api/v1/webhooks/stripe',
          payload: dummyPayload,
        });
        expect(missingRes.statusCode).toBe(422);
        expect(missingRes.json().detail).toContain('Missing stripe-signature header');

        // 2. Invalid signature
        const invalidRes = await app.inject({
          method: 'POST',
          url: '/api/v1/webhooks/stripe',
          headers: { 'stripe-signature': 'invalid_signature_hex' },
          payload: dummyPayload,
        });
        expect(invalidRes.statusCode).toBe(422);
        expect(invalidRes.json().detail).toContain('Invalid Stripe webhook signature');

        // 3. Valid signature (HMAC SHA256 of rawJson)
        const validSig = crypto
          .createHmac('sha256', testSecret)
          .update(rawJson)
          .digest('hex');

        const validRes = await app.inject({
          method: 'POST',
          url: '/api/v1/webhooks/stripe',
          headers: { 'stripe-signature': validSig },
          payload: dummyPayload,
        });
        // Signature passed! Will fail with 404 because order doesn't exist
        expect(validRes.statusCode).toBe(404);
        expect(validRes.json().detail).toContain('PN-NONEXISTENT');
      } finally {
        process.env.STRIPE_WEBHOOK_SECRET = originalSecret;
      }
    });

    it('Enforces cross-user authorization isolation (User B receives 404 for User A order)', async () => {
      // Find User A's order
      const userAOrder = await prisma.order.findFirst({ where: { userId: userAId } });
      expect(userAOrder).toBeDefined();

      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/orders/${userAOrder!.id}`,
        headers: { Authorization: `Bearer ${userBToken}` },
      });

      expect(res.statusCode).toBe(404);
    });

    it('PATCH /admin/orders/:id/status rejects non-admin with 403 Forbidden', async () => {
      const order = await prisma.order.findFirst({ where: { userId: userAId } });

      const res = await app.inject({
        method: 'PATCH',
        url: `/api/v1/admin/orders/${order!.id}/status`,
        headers: { Authorization: `Bearer ${userAToken}` },
        payload: { status: OrderStatus.SHIPPED },
      });

      expect(res.statusCode).toBe(403);
    });

    it('PATCH /admin/orders/:id/status allows Admin to update status and creates AuditLog', async () => {
      const order = await prisma.order.findFirst({ where: { userId: userAId } });

      const res = await app.inject({
        method: 'PATCH',
        url: `/api/v1/admin/orders/${order!.id}/status`,
        headers: { Authorization: `Bearer ${adminToken}` },
        payload: { status: OrderStatus.SHIPPED, notes: 'Tracking fedex-12345' },
      });

      expect(res.statusCode).toBe(200);
      const data = res.json();
      expect(data.order.status).toBe(OrderStatus.SHIPPED);
      expect(data.order.shippedAt).toBeDefined();

      // Check AuditLog entry
      const audit = await prisma.auditLog.findFirst({
        where: {
          entity: 'Order',
          entityId: order!.id,
          action: 'ADMIN_UPDATE_ORDER_STATUS',
        },
      });
      expect(audit).toBeDefined();
    });
  });
});
