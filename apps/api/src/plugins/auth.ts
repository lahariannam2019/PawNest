import { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';
import jwt from 'jsonwebtoken';
import { UnauthorizedError, ForbiddenError } from '../lib/errors.js';
import { Role } from '@pawnest/shared';

export interface AuthUser {
  userId: string;
  role: Role;
  sessionId: string;
}

declare module 'fastify' {
  interface FastifyRequest {
    user?: AuthUser;
  }
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    requireAdmin: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

const authPluginCallback: FastifyPluginAsync = async (app) => {
  const jwtSecret = process.env.JWT_ACCESS_SECRET || 'dev_jwt_access_secret_at_least_64_bytes_long_random_entropy';

  app.decorate('authenticate', async (request: FastifyRequest, _reply: FastifyReply) => {
    // 1. Get access token from cookie or Authorization header
    const token =
      request.cookies.pn_at ||
      request.headers.authorization?.replace(/^Bearer\s+/i, '');

    if (!token) {
      throw new UnauthorizedError('Authentication token missing');
    }

    try {
      const decoded = jwt.verify(token, jwtSecret) as {
        sub: string;
        role: Role;
        sid: string;
      };

      request.user = {
        userId: decoded.sub,
        role: decoded.role,
        sessionId: decoded.sid,
      };
    } catch (err: any) {
      throw new UnauthorizedError('Authentication token expired or invalid');
    }
  });

  app.decorate('requireAdmin', async (request: FastifyRequest, reply: FastifyReply) => {
    await app.authenticate(request, reply);
    if (request.user?.role !== Role.ADMIN) {
      throw new ForbiddenError('Administrator privilege required');
    }
  });
};

export const authPlugin = fp(authPluginCallback);
