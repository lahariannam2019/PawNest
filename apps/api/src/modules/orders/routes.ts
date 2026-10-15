import { FastifyPluginAsync } from 'fastify';
import { prisma } from '../../lib/prisma.js';
import { NotFoundError, ValidationError, ConflictError, ForbiddenError } from '../../lib/errors.js';
import {
  CheckoutSessionSchema,
  ConfirmDemoCheckoutSchema,
  AdminUpdateOrderStatusSchema,
  OrderStatus,
  PaymentMode,
  Role,
  ErrorCode,
  FREE_SHIPPING_THRESHOLD_CENTS,
  STANDARD_SHIPPING_CENTS,
  ESTIMATED_TAX_RATE,
  STOCK_RESERVATION_TTL_MINUTES,
  OrderSummary,
  OrderItemSummary,
  CheckoutSessionResult,
} from '@pawnest/shared';
import { demoPaymentProvider, stripePaymentProvider } from '../payments/provider.js';

export async function expireOldReservations() {
  const now = new Date();
  const expiredOrders = await prisma.order.findMany({
    where: {
      status: OrderStatus.PENDING_PAYMENT,
      reservationExpiresAt: { lte: now },
    },
    include: { items: true },
  });

  for (const order of expiredOrders) {
    try {
      await prisma.$transaction(async (tx) => {
        // Release reserved quantities
        for (const item of order.items) {
          await tx.productVariant.update({
            where: { id: item.variantId },
            data: {
              reserved: { decrement: item.quantity },
            },
          });
        }

        await tx.order.update({
          where: { id: order.id },
          data: {
            status: OrderStatus.CANCELLED,
            cancelledAt: new Date(),
          },
        });
      });
    } catch (err) {
      console.error(`Failed to expire reservation for order ${order.id}:`, err);
    }
  }

  return expiredOrders.length;
}

export function formatOrderSummary(order: any): OrderSummary {
  const items: OrderItemSummary[] = order.items.map((i: any) => ({
    id: i.id,
    variantId: i.variantId,
    productName: i.productName,
    variantName: i.variantName,
    sku: i.sku,
    unitPriceCents: i.unitPriceCents,
    quantity: i.quantity,
    totalPriceCents: i.unitPriceCents * i.quantity,
  }));

  return {
    id: order.id,
    number: order.number,
    userId: order.userId,
    status: order.status as OrderStatus,
    paymentMode: order.paymentMode as PaymentMode,
    currency: order.currency,
    subtotalCents: order.subtotalCents,
    shippingCents: order.shippingCents,
    taxCents: order.taxCents,
    totalCents: order.totalCents,
    shippingAddress: order.shippingAddress as any,
    isDemo: order.isDemo,
    reservationExpiresAt: order.reservationExpiresAt?.toISOString() || null,
    placedAt: order.placedAt.toISOString(),
    paidAt: order.paidAt?.toISOString() || null,
    shippedAt: order.shippedAt?.toISOString() || null,
    deliveredAt: order.deliveredAt?.toISOString() || null,
    cancelledAt: order.cancelledAt?.toISOString() || null,
    items,
  };
}

export const orderRoutes: FastifyPluginAsync = async (fastify) => {
  // Public Webhook Endpoint (Stripe)
  fastify.post('/webhooks/stripe', async (request, reply) => {
    const signature = request.headers['stripe-signature'] as string | undefined;
    const rawPayload = JSON.stringify(request.body);

    let webhookResult;
    try {
      webhookResult = await stripePaymentProvider.verifyWebhook(rawPayload, signature);
    } catch (err: any) {
      throw new ValidationError(`Webhook verification failed: ${err.message}`);
    }

    const { orderNumber, isPaid } = webhookResult;

    if (!isPaid) {
      return { received: true, ignored: true };
    }

    const existingOrder = await prisma.order.findUnique({
      where: { number: orderNumber },
      include: { items: true },
    });

    if (!existingOrder) {
      throw new NotFoundError(`Order with number ${orderNumber} not found`);
    }

    // Idempotent guard
    if (existingOrder.status === OrderStatus.PAID) {
      return { received: true, alreadyProcessed: true };
    }

    await prisma.$transaction(async (tx) => {
      // Transition reserved stock to sold stock
      for (const item of existingOrder.items) {
        await tx.productVariant.update({
          where: { id: item.variantId },
          data: {
            stock: { decrement: item.quantity },
            reserved: { decrement: item.quantity },
          },
        });
      }

      await tx.order.update({
        where: { id: existingOrder.id },
        data: {
          status: OrderStatus.PAID,
          paymentMode: PaymentMode.STRIPE_TEST,
          paidAt: new Date(),
        },
      });

      // Clear the user's cart items
      const userCart = await tx.cart.findUnique({ where: { userId: existingOrder.userId } });
      if (userCart) {
        await tx.cartItem.deleteMany({ where: { cartId: userCart.id } });
      }
    });

    return { received: true };
  });

  // Authenticated Order Operations
  fastify.register(async (authGroup) => {
    authGroup.addHook('preHandler', fastify.authenticate);

    // POST /checkout/session (Create Checkout Session with authoritative price re-quote & stock reservation)
    authGroup.post('/checkout/session', async (request) => {
      const userId = request.user!.userId;
      const idempotencyKey = (request.headers['idempotency-key'] as string | undefined) || null;
      const body = CheckoutSessionSchema.parse(request.body);
      const { shippingAddress, clientExpectedTotalCents, paymentMode = PaymentMode.DEMO } = body;

      // Check idempotency
      if (idempotencyKey) {
        const existingOrder = await prisma.order.findFirst({
          where: { userId, idempotencyKey },
          include: { items: true },
        });

        if (existingOrder) {
          const provider = paymentMode === PaymentMode.DEMO ? demoPaymentProvider : stripePaymentProvider;
          const session = await provider.createPaymentSession({ order: existingOrder as any });
          return {
            session: {
              orderId: existingOrder.id,
              orderNumber: existingOrder.number,
              subtotalCents: existingOrder.subtotalCents,
              shippingCents: existingOrder.shippingCents,
              taxCents: existingOrder.taxCents,
              totalCents: existingOrder.totalCents,
              paymentMode: existingOrder.paymentMode,
              expiresAt: existingOrder.reservationExpiresAt?.toISOString() || new Date().toISOString(),
              demoToken: session.token,
              checkoutUrl: session.sessionUrl,
            } as CheckoutSessionResult,
          };
        }
      }

      // 1. Fetch user's cart
      const cart = await prisma.cart.findUnique({
        where: { userId },
        include: {
          items: {
            include: {
              variant: {
                include: { product: true },
              },
            },
          },
        },
      });

      if (!cart || cart.items.length === 0) {
        throw new ValidationError('Cart is empty. Add items before checking out.');
      }

      // 2. Authoritative price recalculation
      let calculatedSubtotal = 0;
      for (const item of cart.items) {
        calculatedSubtotal += item.variant.priceCents * item.quantity;
      }
      const calculatedShipping =
        calculatedSubtotal >= FREE_SHIPPING_THRESHOLD_CENTS ? 0 : STANDARD_SHIPPING_CENTS;
      const calculatedTax = Math.round(calculatedSubtotal * ESTIMATED_TAX_RATE);
      const calculatedTotal = calculatedSubtotal + calculatedShipping + calculatedTax;

      // 3. Price drift check (RFC 7807 Conflict CART_CHANGED)
      if (clientExpectedTotalCents != null && clientExpectedTotalCents !== calculatedTotal) {
        throw new ConflictError(
          ErrorCode.CART_CHANGED,
          `Cart prices or items have changed since you viewed them. Expected $${(
            clientExpectedTotalCents / 100
          ).toFixed(2)}, current total is $${(calculatedTotal / 100).toFixed(2)}.`
        );
      }

      // 4. Concurrency lock & stock reservation in transaction
      const reservationExpiresAt = new Date(Date.now() + STOCK_RESERVATION_TTL_MINUTES * 60 * 1000);
      const orderNumber = `PN-ORD-${Date.now().toString(36).toUpperCase()}-${Math.random()
        .toString(36)
        .slice(2, 6)
        .toUpperCase()}`;

      // Sort variant IDs to strictly prevent database deadlocks under high concurrency
      const sortedVariantIds = [...new Set(cart.items.map((i) => i.variantId))].sort();

      const createdOrder = await prisma.$transaction(
        async (tx) => {
          // Acquire transactional advisory lock for each variant
          for (const variantId of sortedVariantIds) {
            await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`variant_stock:${variantId}`}))`;
          }

          // Check available stock (stock - reserved >= item.quantity)
          for (const item of cart.items) {
            const currentVariant = await tx.productVariant.findUnique({
              where: { id: item.variantId },
            });

            if (!currentVariant) {
              throw new NotFoundError(`Product variant ${item.variantId} not found`);
            }

            const available = currentVariant.stock - currentVariant.reserved;
            if (available < item.quantity) {
              throw new ConflictError(
                ErrorCode.SLOT_TAKEN,
                `Insufficient stock for "${item.variant.product.name} - ${item.variant.name}". Requested ${item.quantity}, but only ${Math.max(
                  0,
                  available
                )} available.`
              );
            }

            // Reserve stock
            await tx.productVariant.update({
              where: { id: item.variantId },
              data: {
                reserved: { increment: item.quantity },
              },
            });
          }

          // Create the order
          const newOrder = await tx.order.create({
            data: {
              number: orderNumber,
              userId,
              status: OrderStatus.PENDING_PAYMENT,
              paymentMode: paymentMode as PaymentMode,
              currency: 'USD',
              subtotalCents: calculatedSubtotal,
              shippingCents: calculatedShipping,
              taxCents: calculatedTax,
              totalCents: calculatedTotal,
              shippingAddress: shippingAddress as any,
              isDemo: true,
              idempotencyKey,
              reservationExpiresAt,
              items: {
                create: cart.items.map((i) => ({
                  variantId: i.variantId,
                  productName: i.variant.product.name,
                  variantName: i.variant.name,
                  sku: i.variant.sku,
                  unitPriceCents: i.variant.priceCents,
                  quantity: i.quantity,
                })),
              },
            },
            include: { items: true },
          });

          return newOrder;
        },
        {
          timeout: 15000,
        }
      );

      // 5. Generate payment session
      const provider = paymentMode === PaymentMode.DEMO ? demoPaymentProvider : stripePaymentProvider;
      const session = await provider.createPaymentSession({ order: createdOrder as any });

      const result: CheckoutSessionResult = {
        orderId: createdOrder.id,
        orderNumber: createdOrder.number,
        subtotalCents: createdOrder.subtotalCents,
        shippingCents: createdOrder.shippingCents,
        taxCents: createdOrder.taxCents,
        totalCents: createdOrder.totalCents,
        paymentMode: createdOrder.paymentMode as PaymentMode,
        expiresAt: reservationExpiresAt.toISOString(),
        demoToken: session.token,
        checkoutUrl: session.sessionUrl,
      };

      return { session: result };
    });

    // POST /checkout/demo/confirm (Confirm Demo Order)
    authGroup.post('/checkout/demo/confirm', async (request) => {
      const userId = request.user!.userId;
      const body = ConfirmDemoCheckoutSchema.parse(request.body);
      const { demoToken } = body;

      // Extract orderId from token format: demo_tok_<orderId>_<random>
      const parts = demoToken.split('_');
      if (parts.length < 3 || parts[0] !== 'demo' || parts[1] !== 'tok') {
        throw new ValidationError('Invalid demo token format');
      }
      const orderId = parts[2];

      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: { items: true },
      });

      if (!order || order.userId !== userId) {
        throw new NotFoundError('Order not found or unauthorized');
      }

      if (order.status !== OrderStatus.PENDING_PAYMENT) {
        throw new ConflictError(ErrorCode.CONFLICT, `Order is already in status ${order.status}`);
      }

      if (order.reservationExpiresAt && order.reservationExpiresAt.getTime() < Date.now()) {
        throw new ConflictError(ErrorCode.CONFLICT, 'Stock reservation has expired. Please check out again.');
      }

      // CRITICAL RULE: Demo orders must NEVER display a real "paid" status!
      // Status is DEMO_PLACED with paymentMode: DEMO
      const updatedOrder = await prisma.$transaction(async (tx) => {
        const o = await tx.order.update({
          where: { id: order.id },
          data: {
            status: OrderStatus.DEMO_PLACED,
            paymentMode: PaymentMode.DEMO,
            paidAt: new Date(),
          },
          include: { items: true },
        });

        // Clear user's cart
        const userCart = await tx.cart.findUnique({ where: { userId } });
        if (userCart) {
          await tx.cartItem.deleteMany({ where: { cartId: userCart.id } });
        }

        // Create in-app notification
        await tx.notification.create({
          data: {
            userId,
            type: 'ORDER_PLACED',
            title: `Order Placed (${o.number})`,
            body: `Your demo order for $${(o.totalCents / 100).toFixed(2)} has been placed successfully.`,
            linkUrl: `/dashboard/orders/${o.id}`,
          },
        });

        return o;
      });

      return { order: formatOrderSummary(updatedOrder) };
    });

    // GET /orders (List own orders)
    authGroup.get('/orders', async (request) => {
      const userId = request.user!.userId;

      const orders = await prisma.order.findMany({
        where: { userId },
        include: { items: true },
        orderBy: { placedAt: 'desc' },
      });

      return { orders: orders.map(formatOrderSummary) };
    });

    // GET /orders/:id (Get single own order)
    authGroup.get('/orders/:id', async (request) => {
      const userId = request.user!.userId;
      const { id } = request.params as { id: string };

      const order = await prisma.order.findFirst({
        where: { id, userId },
        include: { items: true },
      });

      if (!order) {
        throw new NotFoundError(`Order ${id} not found`);
      }

      return { order: formatOrderSummary(order) };
    });

    // POST /orders/:id/cancel (Cancel order and release reserved/sold stock)
    authGroup.post('/orders/:id/cancel', async (request) => {
      const userId = request.user!.userId;
      const { id } = request.params as { id: string };

      const order = await prisma.order.findFirst({
        where: { id, userId },
        include: { items: true },
      });

      if (!order) {
        throw new NotFoundError(`Order ${id} not found`);
      }

      if (
        order.status === OrderStatus.SHIPPED ||
        order.status === OrderStatus.DELIVERED ||
        order.status === OrderStatus.CANCELLED
      ) {
        throw new ConflictError(
          ErrorCode.CONFLICT,
          `Cannot cancel order in status ${order.status}`
        );
      }

      const cancelledOrder = await prisma.$transaction(async (tx) => {
        // If stock was only reserved (PENDING_PAYMENT, DEMO_PLACED), release reserved
        if (order.status === OrderStatus.PENDING_PAYMENT || order.status === OrderStatus.DEMO_PLACED) {
          for (const item of order.items) {
            await tx.productVariant.update({
              where: { id: item.variantId },
              data: {
                reserved: { decrement: item.quantity },
              },
            });
          }
        } else if (order.status === OrderStatus.PAID || order.status === OrderStatus.PROCESSING) {
          // If stock was already deducted, restore stock
          for (const item of order.items) {
            await tx.productVariant.update({
              where: { id: item.variantId },
              data: {
                stock: { increment: item.quantity },
              },
            });
          }
        }

        const o = await tx.order.update({
          where: { id: order.id },
          data: {
            status: OrderStatus.CANCELLED,
            cancelledAt: new Date(),
          },
          include: { items: true },
        });

        // Audit log
        await tx.auditLog.create({
          data: {
            userId,
            action: 'ORDER_CANCELLED',
            entity: 'Order',
            entityId: o.id,
            meta: { previousStatus: order.status },
          },
        });

        return o;
      });

      return { order: formatOrderSummary(cancelledOrder) };
    });

    // PATCH /admin/orders/:id/status (Admin-only status transition)
    authGroup.patch('/admin/orders/:id/status', async (request) => {
      const user = await prisma.user.findUnique({
        where: { id: request.user!.userId },
      });

      if (!user || user.role !== Role.ADMIN) {
        throw new ForbiddenError('Admin role required');
      }

      const { id } = request.params as { id: string };
      const body = AdminUpdateOrderStatusSchema.parse(request.body);
      const { status } = body;

      const order = await prisma.order.findUnique({
        where: { id },
        include: { items: true },
      });

      if (!order) {
        throw new NotFoundError(`Order ${id} not found`);
      }

      const updated = await prisma.$transaction(async (tx) => {
        const updateData: any = { status };

        if (status === OrderStatus.SHIPPED && !order.shippedAt) {
          updateData.shippedAt = new Date();
          // If status was DEMO_PLACED or PENDING, convert reserved to permanently sold
          if (order.status === OrderStatus.DEMO_PLACED || order.status === OrderStatus.PENDING_PAYMENT) {
            for (const item of order.items) {
              await tx.productVariant.update({
                where: { id: item.variantId },
                data: {
                  stock: { decrement: item.quantity },
                  reserved: { decrement: item.quantity },
                },
              });
            }
          }
        } else if (status === OrderStatus.DELIVERED && !order.deliveredAt) {
          updateData.deliveredAt = new Date();
        } else if (status === OrderStatus.CANCELLED) {
          updateData.cancelledAt = new Date();
          // Release stock if cancelled
          for (const item of order.items) {
            if (order.status === OrderStatus.PAID || order.status === OrderStatus.PROCESSING) {
              await tx.productVariant.update({
                where: { id: item.variantId },
                data: { stock: { increment: item.quantity } },
              });
            } else if (order.status === OrderStatus.PENDING_PAYMENT || order.status === OrderStatus.DEMO_PLACED) {
              await tx.productVariant.update({
                where: { id: item.variantId },
                data: { reserved: { decrement: item.quantity } },
              });
            }
          }
        }

        const o = await tx.order.update({
          where: { id: order.id },
          data: updateData,
          include: { items: true },
        });

        await tx.auditLog.create({
          data: {
            userId: user.id,
            action: 'ADMIN_UPDATE_ORDER_STATUS',
            entity: 'Order',
            entityId: o.id,
            meta: { from: order.status, to: status, notes: body.notes },
          },
        });

        return o;
      });

      return { order: formatOrderSummary(updated) };
    });
  });
};
