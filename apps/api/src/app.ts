import fastify, { FastifyInstance, FastifyServerOptions } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import cookie from '@fastify/cookie';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import {
  serializerCompiler,
  validatorCompiler,
  jsonSchemaTransform,
} from 'fastify-type-provider-zod';
import { AppError } from './lib/errors.js';
import { prisma } from './lib/prisma.js';
import { ErrorCode } from '@pawnest/shared';

import { authPlugin } from './plugins/auth.js';
import { authRoutes } from './modules/auth/routes.js';
import { userRoutes } from './modules/users/routes.js';
import { petRoutes } from './modules/pets/routes.js';
import { uploadRoutes } from './modules/uploads/routes.js';
import { providerRoutes } from './modules/providers/routes.js';
import { bookingRoutes } from './modules/bookings/routes.js';
import { productRoutes } from './modules/products/routes.js';
import { cartRoutes } from './modules/cart/routes.js';
import { orderRoutes } from './modules/orders/routes.js';
import { dashboardRoutes } from './modules/dashboard/routes.js';
import { favouriteRoutes } from './modules/favourites/routes.js';
import { notificationRoutes } from './modules/notifications/routes.js';
import { reviewRoutes } from './modules/reviews/routes.js';
import { runSeed } from './seed/seed.js';

export function buildApp(opts: FastifyServerOptions = {}): FastifyInstance {
  const app = fastify({
    ...opts,
    requestIdHeader: 'x-request-id',
  });

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  // Security headers
  app.register(helmet, {
    contentSecurityPolicy: process.env.NODE_ENV === 'production',
  });

  // CORS
  app.register(cors, {
    origin: [process.env.WEB_ORIGIN || 'http://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token', 'Idempotency-Key'],
  });

  // Cookies
  app.register(cookie, {
    secret: process.env.COOKIE_SECRET || 'dev_cookie_secret_at_least_32_bytes_long_random',
  });

  // Rate Limiting
  app.register(rateLimit, {
    max: process.env.NODE_ENV === 'test' ? 10000 : 120,
    timeWindow: '1 minute',
  });

  // Register Auth Decorator Plugin
  app.register(authPlugin);

  // OpenAPI Swagger Documentation
  if (process.env.ENABLE_DOCS !== 'false') {
    app.register(swagger, {
      openapi: {
        info: {
          title: 'PawNest API',
          description: 'Official API for PawNest premium pet-care marketplace',
          version: '1.0.0',
        },
        servers: [{ url: '/api/v1' }],
      },
      transform: jsonSchemaTransform,
    });

    app.register(swaggerUi, {
      routePrefix: '/api/docs',
    });
  }

  // RFC 7807 Error Handler
  app.setErrorHandler((error: any, request, reply) => {
    request.log.error(error);

    if (error instanceof AppError) {
      const problem = error.toProblemDetail();
      problem.requestId = request.id;
      return reply
        .status(error.status)
        .type('application/problem+json')
        .send(problem);
    }

    // Fastify validation errors
    if (error.validation) {
      return reply
        .status(422)
        .type('application/problem+json')
        .send({
          type: 'https://pawnest.example/errors/validation_failed',
          title: 'Validation Error',
          status: 422,
          code: ErrorCode.VALIDATION_FAILED,
          detail: 'Request payload validation failed',
          errors: error.validation.map((v: any) => ({
            field: v.instancePath || 'body',
            message: v.message || 'Invalid field',
          })),
          requestId: request.id,
        });
    }

    // Zod validation errors
    if (error.name === 'ZodError' || error.issues) {
      return reply
        .status(422)
        .type('application/problem+json')
        .send({
          type: 'https://pawnest.example/errors/validation_failed',
          title: 'Validation Error',
          status: 422,
          code: ErrorCode.VALIDATION_FAILED,
          detail: 'Request payload validation failed',
          errors: error.issues?.map((i: any) => ({
            field: i.path?.join('.') || 'body',
            message: i.message,
          })),
          requestId: request.id,
        });
    }

    if (process.env.NODE_ENV !== 'production') {
      console.error('UNCAUGHT API ERROR:', error);
    }

    const statusCode = error.statusCode && error.statusCode >= 400 && error.statusCode < 600 ? error.statusCode : 500;
    return reply
      .status(statusCode)
      .type('application/problem+json')
      .send({
        type: 'https://pawnest.example/errors/internal_error',
        title: statusCode === 500 ? 'Internal Server Error' : error.name,
        status: statusCode,
        code: ErrorCode.INTERNAL_ERROR,
        detail: statusCode === 500 ? 'An unexpected error occurred' : error.message,
        requestId: request.id,
      });
  });

  // Liveness check
  app.get('/health', async () => {
    return {
      status: 'pass',
      timestamp: new Date().toISOString(),
      service: 'pawnest-api',
      uptime: process.uptime(),
    };
  });

  const checkDatabase = async () => {
    await prisma.$queryRaw`SELECT 1`;
    const tables: any = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `;
    let productCount: number | null = null;
    let categoryCount: number | null = null;
    let tableError: string | null = null;
    try {
      productCount = await prisma.product.count();
      categoryCount = await prisma.category.count();
    } catch (e: any) {
      tableError = e.message;
    }
    return {
      status: tableError ? 'warn' : 'pass',
      database: 'connected',
      tables: tables.map((t: any) => t.table_name),
      productCount,
      categoryCount,
      tableError,
      timestamp: new Date().toISOString(),
    };
  };

  // Readiness check (checks database connectivity and schema readiness)
  app.get('/ready', async (_request, reply) => {
    try {
      const result = await checkDatabase();
      return result;
    } catch (err: any) {
      return reply.status(503).send({
        status: 'fail',
        database: 'disconnected',
        error: err.message,
        timestamp: new Date().toISOString(),
      });
    }
  });

  // Base API v1 group
  app.register(
    async (v1) => {
      v1.get('/health', async () => {
        return {
          status: 'pass',
          timestamp: new Date().toISOString(),
          service: 'pawnest-api',
          uptime: process.uptime(),
        };
      });

      v1.get('/ready', async (_request, reply) => {
        try {
          const result = await checkDatabase();
          return result;
        } catch (err: any) {
          return reply.status(503).send({
            status: 'fail',
            database: 'disconnected',
            error: err.message,
            timestamp: new Date().toISOString(),
          });
        }
      });

      v1.get('/info', async () => {
        return {
          name: 'PawNest API',
          version: '1.0.0',
          mode: process.env.PAYMENT_MODE || 'demo',
          isDemo: true,
        };
      });

      v1.post('/admin/seed', async (_request, reply) => {
        try {
          const productCount = await prisma.product.count();
          if (productCount < 10) {
            await runSeed(prisma);
          }
          const finalCategories = await prisma.category.count();
          const finalProducts = await prisma.product.count();
          return {
            status: 'success',
            categories: finalCategories,
            products: finalProducts,
          };
        } catch (err: any) {
          return reply.status(500).send({
            status: 'error',
            message: err.message,
          });
        }
      });

      // Register auth, user, pet, upload, provider, and booking route modules
      v1.register(authRoutes, { prefix: '/auth' });
      v1.register(userRoutes);
      v1.register(petRoutes);
      v1.register(uploadRoutes);
      v1.register(providerRoutes);
      v1.register(bookingRoutes);
      v1.register(productRoutes);
      v1.register(cartRoutes);
      v1.register(orderRoutes);
      v1.register(dashboardRoutes);
      v1.register(favouriteRoutes);
      v1.register(notificationRoutes);
      v1.register(reviewRoutes);
    },
    { prefix: '/api/v1' }
  );

  return app;
}
