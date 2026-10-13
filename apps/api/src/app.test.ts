import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from './app.js';
import { FastifyInstance } from 'fastify';

describe('PawNest API - Core Health & Info Endpoints', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = buildApp({ logger: false });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /health returns 200 with service status', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/health',
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.status).toBe('pass');
    expect(body.service).toBe('pawnest-api');
    expect(body.uptime).toBeDefined();
  });

  it('GET /api/v1/info returns api information and demo mode', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/info',
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.name).toBe('PawNest API');
    expect(body.version).toBe('1.0.0');
    expect(body.isDemo).toBe(true);
  });
});
