import { FastifyPluginAsync } from 'fastify';
import { authService } from './service.js';
import {
  RegisterSchema,
  LoginSchema,
  ForgotPasswordSchema,
  ResetPasswordSchema,
} from '@pawnest/shared';
import { z } from 'zod';

export const authRoutes: FastifyPluginAsync = async (app) => {
  const isProd = process.env.NODE_ENV === 'production';

  const setAuthCookies = (reply: any, accessToken: string, refreshToken: string, csrfToken: string) => {
    reply.setCookie('pn_at', accessToken, {
      path: '/',
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      maxAge: 15 * 60, // 15 mins
    });

    reply.setCookie('pn_rt', refreshToken, {
      path: '/api/v1/auth',
      httpOnly: true,
      secure: isProd,
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60, // 30 days
    });

    reply.setCookie('pn_csrf', csrfToken, {
      path: '/',
      httpOnly: false, // client-readable for double submit
      secure: isProd,
      sameSite: 'lax',
    });
  };

  const clearAuthCookies = (reply: any) => {
    reply.clearCookie('pn_at', { path: '/' });
    reply.clearCookie('pn_rt', { path: '/api/v1/auth' });
    reply.clearCookie('pn_csrf', { path: '/' });
  };

  // POST /auth/register
  app.post(
    '/register',
    {
      schema: {
        body: RegisterSchema,
      },
    },
    async (request, reply) => {
      const user = await authService.register(request.body as any);
      return reply.status(201).send({ user });
    }
  );

  // POST /auth/login
  app.post(
    '/login',
    {
      schema: {
        body: LoginSchema,
      },
    },
    async (request, reply) => {
      const userAgent = request.headers['user-agent'];
      const ip = request.ip;
      const result = await authService.login(request.body as any, userAgent, ip);

      setAuthCookies(reply, result.accessToken, result.refreshToken, result.csrfToken);
      return reply.send({ user: result.user, csrfToken: result.csrfToken });
    }
  );

  // POST /auth/refresh
  app.post('/refresh', async (request, reply) => {
    const rawRefreshToken = request.cookies.pn_rt;
    const userAgent = request.headers['user-agent'];
    const ip = request.ip;

    const result = await authService.refresh(rawRefreshToken || '', userAgent, ip);
    setAuthCookies(reply, result.accessToken, result.refreshToken, result.csrfToken);
    return reply.send({ success: true, csrfToken: result.csrfToken });
  });

  // POST /auth/logout
  app.post('/logout', async (request, reply) => {
    // If authenticated, revoke session
    const token = request.cookies.pn_at;
    if (token) {
      try {
        await app.authenticate(request, reply);
        if (request.user?.sessionId) {
          await authService.logout(request.user.sessionId);
        }
      } catch {
        // Continue clearing cookies regardless
      }
    }

    clearAuthCookies(reply);
    return reply.send({ success: true });
  });

  // POST /auth/verify-email
  app.post(
    '/verify-email',
    {
      schema: {
        body: z.object({ token: z.string().min(1) }),
      },
    },
    async (request, reply) => {
      const { token } = request.body as { token: string };
      await authService.verifyEmail(token);
      return reply.send({ success: true, message: 'Email address verified successfully' });
    }
  );

  // POST /auth/forgot-password
  app.post(
    '/forgot-password',
    {
      schema: {
        body: ForgotPasswordSchema,
      },
    },
    async (request, reply) => {
      const { email } = request.body as { email: string };
      await authService.forgotPassword(email);
      // Always 202 Accepted with generic message
      return reply.status(202).send({
        success: true,
        message: 'If an account exists with that email, a password recovery link has been sent.',
      });
    }
  );

  // POST /auth/reset-password
  app.post(
    '/reset-password',
    {
      schema: {
        body: ResetPasswordSchema,
      },
    },
    async (request, reply) => {
      const { token, password } = request.body as any;
      await authService.resetPassword(token, password);
      clearAuthCookies(reply);
      return reply.send({ success: true, message: 'Password has been reset. Please sign in.' });
    }
  );
};
