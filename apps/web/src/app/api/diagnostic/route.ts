import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const isRailway = Boolean(
    process.env.RAILWAY_ENVIRONMENT_NAME ||
    process.env.RAILWAY_PROJECT_ID ||
    process.env.RAILWAY_STATIC_URL ||
    process.env.RAILWAY_PRIVATE_DOMAIN ||
    process.env.RAILWAY_DEPLOYMENT_ID ||
    process.env.RAILWAY_ENVIRONMENT
  );

  const rawApiUrl =
    (process.env.API_URL && process.env.API_URL.trim()) ||
    (process.env.NEXT_PUBLIC_API_URL && process.env.NEXT_PUBLIC_API_URL.trim()) ||
    (isRailway ? 'http://api.railway.internal:8080' : 'http://localhost:4000');
  const apiUrl = rawApiUrl.replace(/\/$/, '');

  // Collect safe environment variable presence (names only, NEVER values)
  const envKeys = Object.keys(process.env).filter(
    (key) =>
      key.startsWith('RAILWAY_') ||
      key.startsWith('NEXT_PUBLIC_') ||
      ['NODE_ENV', 'PORT', 'API_URL'].includes(key)
  );

  const directInternal = 'http://api.railway.internal:8080';

  // Probe both resolved apiUrl and direct internal host
  const probes: Record<string, any> = {};

  const testEndpoints = [
    { name: 'health', path: '/health' },
    { name: 'ready', path: '/ready' },
    { name: 'api_ready', path: '/api/v1/ready' },
    { name: 'categories', path: '/api/v1/categories' },
    { name: 'products', path: '/api/v1/products' },
  ];

  for (const endpoint of testEndpoints) {
    const targetUrl = `${directInternal}${endpoint.path}`;
    try {
      const res = await fetch(targetUrl, {
        cache: 'no-store',
        signal: AbortSignal.timeout(4000),
      });
      let body: any = null;
      try {
        body = await res.json();
      } catch {
        body = await res.text();
      }
      probes[endpoint.name] = {
        url: targetUrl,
        status: res.status,
        ok: res.ok,
        sample:
          !res.ok
            ? body
            : endpoint.name === 'products'
            ? { total: body?.total, count: body?.products?.length, firstItem: body?.products?.[0]?.title }
            : endpoint.name === 'categories'
            ? { count: body?.categories?.length, list: body?.categories?.map((c: any) => c.name) }
            : body,
      };
    } catch (err: any) {
      probes[endpoint.name] = {
        url: targetUrl,
        error: err.message,
        code: err.code || err.cause?.code,
      };
    }
  }

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    isRailway,
    railwayEnvName: process.env.RAILWAY_ENVIRONMENT_NAME || null,
    configuredApiUrl: rawApiUrl,
    resolvedApiUrl: apiUrl,
    envKeys,
    probes,
  });
}
