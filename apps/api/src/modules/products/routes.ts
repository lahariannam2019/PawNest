import { FastifyPluginAsync } from 'fastify';
import { prisma } from '../../lib/prisma.js';
import { NotFoundError, ValidationError } from '../../lib/errors.js';
import {
  ProductFilterSchema,
  CreateProductReviewSchema,
  ProductSortOption,
  Species,
  CategorySummary,
  ProductListItemSummary,
  ProductDetailSummary,
  ProductReviewSummary,
} from '@pawnest/shared';

export const productRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /categories (Tree & Counts)
  fastify.get('/categories', async (_request, reply) => {
    reply.header('Cache-Control', 'public, max-age=300, stale-while-revalidate=600');
    const categories = await prisma.category.findMany({
      orderBy: { sortOrder: 'asc' },
      include: {
        _count: {
          select: { products: { where: { isActive: true } } },
        },
      },
    });

    const categorySummaries: CategorySummary[] = categories.map((c) => ({
      id: c.id,
      slug: c.slug,
      name: c.name,
      parentId: c.parentId,
      sortOrder: c.sortOrder,
      imageKey: c.imageKey,
      productCount: c._count.products,
      children: [],
    }));

    // Build hierarchy if parentId is used
    const rootCategories: CategorySummary[] = [];
    const map = new Map<string, CategorySummary>();
    for (const c of categorySummaries) {
      map.set(c.id, c);
    }
    for (const c of categorySummaries) {
      if (c.parentId && map.has(c.parentId)) {
        map.get(c.parentId)!.children!.push(c);
      } else {
        rootCategories.push(c);
      }
    }

    return { categories: rootCategories };
  });

  // GET /products (Catalogue search and filters)
  fastify.get('/products', async (request, reply) => {
    reply.header('Cache-Control', 'public, max-age=15, stale-while-revalidate=60');
    const query = ProductFilterSchema.parse(request.query);
    const {
      category,
      q,
      species,
      lifeStage,
      brand,
      minPrice,
      maxPrice,
      inStock,
      sort = ProductSortOption.NEWEST,
      page = 1,
      limit = 20,
    } = query;

    const where: any = {
      isActive: true,
    };

    if (category) {
      where.category = {
        slug: category,
      };
    }

    if (species) {
      where.species = {
        has: species as Species,
      };
    }

    if (lifeStage) {
      where.lifeStage = {
        has: lifeStage,
      };
    }

    if (brand) {
      where.brand = {
        contains: brand,
        mode: 'insensitive',
      };
    }

    if (q && q.trim()) {
      const term = q.trim();
      where.OR = [
        { name: { contains: term, mode: 'insensitive' } },
        { brand: { contains: term, mode: 'insensitive' } },
        { description: { contains: term, mode: 'insensitive' } },
        { tags: { has: term } },
      ];
    }

    // Variant-level stock and price filtering
    const variantWhere: any = {};
    if (minPrice != null || maxPrice != null) {
      variantWhere.priceCents = {};
      if (minPrice != null) variantWhere.priceCents.gte = Math.round(minPrice * 100);
      if (maxPrice != null) variantWhere.priceCents.lte = Math.round(maxPrice * 100);
    }

    if (inStock === true) {
      // Must have variant with stock > reserved
      variantWhere.stock = { gt: 0 };
    }

    if (Object.keys(variantWhere).length > 0) {
      where.variants = {
        some: variantWhere,
      };
    }

    let orderBy: any = { createdAt: 'desc' };
    if (sort === ProductSortOption.RATING) {
      orderBy = { ratingAvg: 'desc' };
    }

    const skip = (page - 1) * limit;

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          category: true,
          variants: {
            orderBy: { priceCents: 'asc' },
          },
        },
        orderBy,
        skip,
        take: limit,
      }),
      prisma.product.count({ where }),
    ]);

    // Map to summaries
    let items: ProductListItemSummary[] = products.map((p) => {
      const prices = p.variants.map((v) => v.priceCents);
      const minPriceCents = prices.length > 0 ? Math.min(...prices) : 0;
      const maxPriceCents = prices.length > 0 ? Math.max(...prices) : 0;
      const hasStock = p.variants.some((v) => v.stock - v.reserved > 0);

      return {
        id: p.id,
        slug: p.slug,
        name: p.name,
        brand: p.brand,
        categoryId: p.categoryId,
        categorySlug: p.category.slug,
        categoryName: p.category.name,
        species: p.species as Species[],
        lifeStage: p.lifeStage,
        tags: p.tags,
        imageKeys: p.imageKeys,
        model3dKey: p.model3dKey,
        ratingAvg: Number(p.ratingAvg),
        ratingCount: p.ratingCount,
        minPriceCents,
        maxPriceCents,
        inStock: hasStock,
        isDemo: p.isDemo,
      };
    });

    // In-memory sort for prices if requested
    if (sort === ProductSortOption.PRICE_ASC) {
      items.sort((a, b) => a.minPriceCents - b.minPriceCents);
    } else if (sort === ProductSortOption.PRICE_DESC) {
      items.sort((a, b) => b.maxPriceCents - a.maxPriceCents);
    }

    return {
      products: items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasMore: skip + items.length < total,
    };
  });

  // GET /products/:slug (Product Detail)
  fastify.get('/products/:slug', async (request) => {
    const { slug } = request.params as { slug: string };

    const product = await prisma.product.findUnique({
      where: { slug },
      include: {
        category: true,
        variants: {
          orderBy: { priceCents: 'asc' },
        },
      },
    });

    if (!product || !product.isActive) {
      throw new NotFoundError(`Product "${slug}" not found`);
    }

    const detail: ProductDetailSummary = {
      id: product.id,
      slug: product.slug,
      name: product.name,
      brand: product.brand,
      description: product.description,
      details: product.details as any,
      categoryId: product.categoryId,
      categorySlug: product.category.slug,
      categoryName: product.category.name,
      species: product.species as Species[],
      lifeStage: product.lifeStage,
      tags: product.tags,
      imageKeys: product.imageKeys,
      model3dKey: product.model3dKey,
      ratingAvg: Number(product.ratingAvg),
      ratingCount: product.ratingCount,
      isDemo: product.isDemo,
      isActive: product.isActive,
      variants: product.variants.map((v) => ({
        id: v.id,
        productId: v.productId,
        sku: v.sku,
        name: v.name,
        priceCents: v.priceCents,
        compareAtCents: v.compareAtCents,
        currency: v.currency,
        stock: v.stock,
        reserved: v.reserved,
        availableStock: Math.max(0, v.stock - v.reserved),
        weightGrams: v.weightGrams,
      })),
    };

    return { product: detail };
  });

  // GET /products/:slug/reviews (Reviews)
  fastify.get('/products/:slug/reviews', async (request) => {
    const { slug } = request.params as { slug: string };

    const product = await prisma.product.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (!product) {
      throw new NotFoundError(`Product "${slug}" not found`);
    }

    const reviews = await prisma.productReview.findMany({
      where: { productId: product.id },
      include: {
        user: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const items: ProductReviewSummary[] = reviews.map((r) => ({
      id: r.id,
      productId: r.productId,
      userId: r.userId,
      userName: r.user.name || 'PawNest Pet Parent',
      rating: r.rating,
      title: r.title,
      body: r.body,
      isSample: r.isSample,
      createdAt: r.createdAt.toISOString(),
    }));

    return { reviews: items };
  });

  // POST /products/:slug/reviews (Create Review - Authenticated)
  fastify.post(
    '/products/:slug/reviews',
    { preHandler: [fastify.authenticate] },
    async (request) => {
      const { slug } = request.params as { slug: string };
      const userId = request.user!.userId;
      const body = CreateProductReviewSchema.parse(request.body);

      const product = await prisma.product.findUnique({
        where: { slug },
      });

      if (!product) {
        throw new NotFoundError(`Product "${slug}" not found`);
      }

      const review = await prisma.productReview.create({
        data: {
          productId: product.id,
          userId,
          rating: body.rating,
          title: body.title || null,
          body: body.body,
          isSample: false,
        },
        include: {
          user: { select: { name: true } },
        },
      });

      // Recalculate average rating
      const allReviews = await prisma.productReview.findMany({
        where: { productId: product.id },
        select: { rating: true },
      });

      const totalRating = allReviews.reduce((sum, r) => sum + r.rating, 0);
      const newAvg = totalRating / allReviews.length;

      await prisma.product.update({
        where: { id: product.id },
        data: {
          ratingAvg: newAvg,
          ratingCount: allReviews.length,
        },
      });

      return {
        review: {
          id: review.id,
          productId: review.productId,
          userId: review.userId,
          userName: review.user.name,
          rating: review.rating,
          title: review.title,
          body: review.body,
          isSample: review.isSample,
          createdAt: review.createdAt.toISOString(),
        },
      };
    }
  );
};
