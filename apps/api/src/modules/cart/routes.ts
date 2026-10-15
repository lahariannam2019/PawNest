import { FastifyPluginAsync } from 'fastify';
import { prisma } from '../../lib/prisma.js';
import { NotFoundError, ValidationError, ConflictError } from '../../lib/errors.js';
import {
  AddToCartSchema,
  UpdateCartItemSchema,
  MergeCartSchema,
  CartSummary,
  CartItemSummary,
  FREE_SHIPPING_THRESHOLD_CENTS,
  STANDARD_SHIPPING_CENTS,
  ESTIMATED_TAX_RATE,
} from '@pawnest/shared';

export async function computeCartSummary(cartId: string): Promise<CartSummary> {
  const cart = await prisma.cart.findUnique({
    where: { id: cartId },
    include: {
      items: {
        include: {
          variant: {
            include: {
              product: true,
            },
          },
        },
        orderBy: { id: 'asc' },
      },
    },
  });

  if (!cart) {
    return {
      id: cartId,
      items: [],
      subtotalCents: 0,
      shippingCents: 0,
      taxCents: 0,
      totalCents: 0,
      freeShippingThresholdCents: FREE_SHIPPING_THRESHOLD_CENTS,
      qualifiesForFreeShipping: false,
      itemCount: 0,
    };
  }

  const items: CartItemSummary[] = cart.items.map((item) => {
    const v = item.variant;
    const p = v.product;
    const available = Math.max(0, v.stock - v.reserved);
    const lineTotal = v.priceCents * item.quantity;

    return {
      id: item.id,
      variantId: v.id,
      productId: p.id,
      productSlug: p.slug,
      productName: p.name,
      variantName: v.name,
      sku: v.sku,
      unitPriceCents: v.priceCents,
      quantity: item.quantity,
      totalPriceCents: lineTotal,
      imageKey: p.imageKeys[0] || null,
      availableStock: available,
      inStock: available > 0,
    };
  });

  const subtotalCents = items.reduce((sum, item) => sum + item.totalPriceCents, 0);
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  const qualifiesForFreeShipping = subtotalCents >= FREE_SHIPPING_THRESHOLD_CENTS;
  const shippingCents = items.length === 0 ? 0 : qualifiesForFreeShipping ? 0 : STANDARD_SHIPPING_CENTS;
  const taxCents = items.length === 0 ? 0 : Math.round(subtotalCents * ESTIMATED_TAX_RATE);
  const totalCents = subtotalCents + shippingCents + taxCents;

  return {
    id: cart.id,
    items,
    subtotalCents,
    shippingCents,
    taxCents,
    totalCents,
    freeShippingThresholdCents: FREE_SHIPPING_THRESHOLD_CENTS,
    qualifiesForFreeShipping,
    itemCount,
  };
}

export const cartRoutes: FastifyPluginAsync = async (fastify) => {
  // All cart operations require authentication
  fastify.addHook('preHandler', fastify.authenticate);

  // Helper to get or create cart for user
  async function getOrCreateUserCart(userId: string) {
    let cart = await prisma.cart.findUnique({
      where: { userId },
    });
    if (!cart) {
      cart = await prisma.cart.create({
        data: { userId },
      });
    }
    return cart;
  }

  // GET /cart
  fastify.get('/cart', async (request) => {
    const userId = request.user!.userId;
    const cart = await getOrCreateUserCart(userId);
    const summary = await computeCartSummary(cart.id);
    return { cart: summary };
  });

  // POST /cart/items
  fastify.post('/cart/items', async (request) => {
    const userId = request.user!.userId;
    const body = AddToCartSchema.parse(request.body);
    const { variantId, quantity } = body;

    const cart = await getOrCreateUserCart(userId);

    // Verify variant exists and has stock
    const variant = await prisma.productVariant.findUnique({
      where: { id: variantId },
      include: { product: true },
    });

    if (!variant || !variant.product.isActive) {
      throw new NotFoundError('Product variant not found or inactive');
    }

    const available = variant.stock - variant.reserved;
    if (available <= 0) {
      throw new ConflictError('OUT_OF_STOCK', `Variant "${variant.name}" is currently out of stock`);
    }

    // Check line limit (max 50 lines)
    const existingLineCount = await prisma.cartItem.count({
      where: { cartId: cart.id },
    });

    const existingItem = await prisma.cartItem.findUnique({
      where: {
        cartId_variantId: {
          cartId: cart.id,
          variantId,
        },
      },
    });

    if (!existingItem && existingLineCount >= 50) {
      throw new ValidationError('Cart cannot exceed 50 unique items');
    }

    const targetQty = existingItem ? Math.min(20, existingItem.quantity + quantity) : quantity;

    if (existingItem) {
      await prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: targetQty },
      });
    } else {
      await prisma.cartItem.create({
        data: {
          cartId: cart.id,
          variantId,
          quantity: targetQty,
        },
      });
    }

    const summary = await computeCartSummary(cart.id);
    return { cart: summary };
  });

  // PATCH /cart/items/:id
  fastify.patch('/cart/items/:id', async (request) => {
    const userId = request.user!.userId;
    const { id } = request.params as { id: string };
    const body = UpdateCartItemSchema.parse(request.body);

    const cart = await getOrCreateUserCart(userId);

    const item = await prisma.cartItem.findFirst({
      where: { id, cartId: cart.id },
      include: { variant: true },
    });

    if (!item) {
      throw new NotFoundError('Cart item not found');
    }

    await prisma.cartItem.update({
      where: { id },
      data: { quantity: body.quantity },
    });

    const summary = await computeCartSummary(cart.id);
    return { cart: summary };
  });

  // DELETE /cart/items/:id
  fastify.delete('/cart/items/:id', async (request) => {
    const userId = request.user!.userId;
    const { id } = request.params as { id: string };

    const cart = await getOrCreateUserCart(userId);

    const item = await prisma.cartItem.findFirst({
      where: { id, cartId: cart.id },
    });

    if (!item) {
      throw new NotFoundError('Cart item not found');
    }

    await prisma.cartItem.delete({
      where: { id },
    });

    const summary = await computeCartSummary(cart.id);
    return { cart: summary };
  });

  // POST /cart/merge (Guest cart merging after sign-in)
  fastify.post('/cart/merge', async (request) => {
    const userId = request.user!.userId;
    const body = MergeCartSchema.parse(request.body);

    const cart = await getOrCreateUserCart(userId);

    for (const item of body.items) {
      const variant = await prisma.productVariant.findUnique({
        where: { id: item.variantId },
      });

      if (!variant) continue;

      const existing = await prisma.cartItem.findUnique({
        where: {
          cartId_variantId: {
            cartId: cart.id,
            variantId: item.variantId,
          },
        },
      });

      if (existing) {
        const mergedQty = Math.min(20, existing.quantity + item.quantity);
        await prisma.cartItem.update({
          where: { id: existing.id },
          data: { quantity: mergedQty },
        });
      } else {
        const currentCount = await prisma.cartItem.count({ where: { cartId: cart.id } });
        if (currentCount < 50) {
          await prisma.cartItem.create({
            data: {
              cartId: cart.id,
              variantId: item.variantId,
              quantity: Math.min(20, item.quantity),
            },
          });
        }
      }
    }

    const summary = await computeCartSummary(cart.id);
    return { cart: summary };
  });
};
