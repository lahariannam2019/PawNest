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
    max: 120,
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

  // Readiness check (checks database connectivity)
  app.get('/ready', async (_request, reply) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return {
        status: 'pass',
        database: 'connected',
        timestamp: new Date().toISOString(),
      };
    } catch (err) {
      return reply.status(503).send({
        status: 'fail',
        database: 'disconnected',
        timestamp: new Date().toISOString(),
      });
    }
  });

  // Base API v1 group
  app.register(
    async (v1) => {
      v1.get('/info', async () => {
        return {
          name: 'PawNest API',
          version: '1.0.0',
          mode: process.env.PAYMENT_MODE || 'demo',
          isDemo: true,
        };
      });

      // Register auth and user route modules
      v1.register(authRoutes, { prefix: '/auth' });
      v1.register(userRoutes);
    },
    { prefix: '/api/v1' }
  );

  return app;
}
