import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { storageAdapter, localStorageAdapter } from '../../integrations/storage/storage.js';
import { UnauthorizedError, NotFoundError } from '../../lib/errors.js';

export const uploadRoutes: FastifyPluginAsync = async (app) => {
  // POST /uploads/presign (Authenticated)
  app.post(
    '/uploads/presign',
    {
      preHandler: [app.authenticate],
      schema: {
        body: z.object({
          contentType: z.string(),
          fileSize: z.number().int().positive(),
          filename: z.string().optional(),
        }),
      },
    },
    async (request) => {
      const { contentType, fileSize, filename } = request.body as any;
      const userId = request.user!.userId;

      const result = await storageAdapter.presignUpload({
        userId,
        contentType,
        fileSize,
        filename,
      });

      return result;
    }
  );

  // POST /uploads/direct (Upload endpoint for development storage adapter)
  app.post(
    '/uploads/direct',
    async (request, reply) => {
      const { key, token, expires } = request.query as { key?: string; token?: string; expires?: string };

      if (!key || !token || !expires) {
        throw new UnauthorizedError('Missing signature parameters for upload');
      }

      const expiresUnix = parseInt(expires, 10);
      if (isNaN(expiresUnix) || !localStorageAdapter.verifyToken(key, expiresUnix, token)) {
        throw new UnauthorizedError('Upload signature is invalid or expired');
      }

      // Read raw binary body from request
      const contentType = request.headers['content-type'] || 'application/octet-stream';
      let buffer: Buffer;

      if (Buffer.isBuffer(request.body)) {
        buffer = request.body;
      } else if (typeof request.body === 'string') {
        buffer = Buffer.from(request.body);
      } else if (request.body && typeof (request.body as any).toBuffer === 'function') {
        buffer = await (request.body as any).toBuffer();
      } else {
        // Fallback for json / object payload if parsed
        buffer = Buffer.from(JSON.stringify(request.body));
      }

      if (buffer.length > 5 * 1024 * 1024) {
        return reply.status(413).send({
          type: 'https://pawnest.example/errors/payload-too-large',
          title: 'Payload Too Large',
          status: 413,
          detail: 'File exceeds 5 MB limit',
        });
      }

      await storageAdapter.saveFile(key, buffer, contentType);
      return { success: true, key };
    }
  );

  // GET /uploads/file (Serves file only if signed token is valid)
  app.get(
    '/uploads/file',
    async (request, reply) => {
      const { key, token, expires } = request.query as { key?: string; token?: string; expires?: string };

      if (!key || !token || !expires) {
        throw new UnauthorizedError('Access token required to view asset');
      }

      const expiresUnix = parseInt(expires, 10);
      if (isNaN(expiresUnix) || !localStorageAdapter.verifyToken(key, expiresUnix, token)) {
        throw new UnauthorizedError('Asset signature is invalid or expired');
      }

      const file = await storageAdapter.getFile(key);
      if (!file) {
        throw new NotFoundError('Asset not found');
      }

      reply.header('Content-Type', file.contentType);
      reply.header('Cache-Control', 'private, max-age=86400');
      return reply.send(file.buffer);
    }
  );
};
