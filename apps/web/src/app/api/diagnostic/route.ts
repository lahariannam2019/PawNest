import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const rawApiUrl =
    process.env.API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.RAILWAY_SERVICE_API_URL ||
    (process.env.RAILWAY_ENVIRONMENT ? 'http://api.railway.internal:8080' : '');
  const apiUrl = (rawApiUrl || 'http://localhost:4000').replace(/\/$/, '');

  // Collect safe environment variable presence (names only, NEVER values)
  const envKeys = Object.keys(process.env).filter(
    (key) =>
      key.startsWith('RAILWAY_') ||
      key.startsWith('NEXT_PUBLIC_') ||
      ['NODE_ENV', 'PORT', 'API_URL'].includes(key)
  );

  const testTargets = [
    apiUrl,
    'http://api.railway.internal:4000',
    'http://api.railway.internal:8080',
    'http://api.railway.internal:3000',
  ].filter((url, idx, arr) => url && arr.indexOf(url) === idx);

  const targetResults: Record<string, any> = {};

  for (const target of testTargets) {
    try {
      const res = await fetch(`${target}/health`, {
        cache: 'no-store',
        signal: AbortSignal.timeout(3000),
      });
      let body: any = null;
      try {
        body = await res.json();
      } catch {
        body = await res.text();
      }
      targetResults[target] = {
        status: res.status,
        ok: res.ok,
        body,
      };
    } catch (err: any) {
      targetResults[target] = {
        error: err.message,
        code: err.code || err.cause?.code,
      };
    }
  }

  // Also test /ready and /api/v1/products against the active apiUrl
  let readyCheck = null;
  let productsCheck = null;

  try {
    const res = await fetch(`${apiUrl}/ready`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(3000),
    });
    readyCheck = { status: res.status, body: await res.json().catch(() => null) };
  } catch (err: any) {
    readyCheck = { error: err.message, code: err.code || err.cause?.code };
  }

  try {
    const res = await fetch(`${apiUrl}/api/v1/products`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(3000),
    });
    const body = await res.json().catch(() => null);
    productsCheck = {
      status: res.status,
      productCount: body?.products?.length ?? null,
      total: body?.total ?? null,
    };
  } catch (err: any) {
    productsCheck = { error: err.message, code: err.code || err.cause?.code };
  }

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    configuredApiUrl: rawApiUrl ? rawApiUrl.replace(/:[^:@]+@/, ':***@') : '(not set, using default)',
    resolvedApiUrl: apiUrl,
    envKeys,
    targetResults,
    readyCheck,
    productsCheck,
  });
}
