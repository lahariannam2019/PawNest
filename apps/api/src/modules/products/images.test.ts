import { describe, it, expect } from 'vitest';
import { prisma } from '../../lib/prisma.js';
import fs from 'node:fs';
import path from 'node:path';

describe('Marketplace Data & Unique Images Integrity', () => {
  const webPublicDir = path.resolve(process.cwd(), '../web/public');
  // Handle if test runs from monorepo root or apps/api
  const resolvedPublicDir = fs.existsSync(webPublicDir)
    ? webPublicDir
    : path.resolve(process.cwd(), 'apps/web/public');

  it('verifies that public directory exists', () => {
    expect(fs.existsSync(resolvedPublicDir)).toBe(true);
  });

  it('enforces 100% of providers have image keys and valid distinct files on disk', async () => {
    const providers = await prisma.provider.findMany({
      select: { id: true, slug: true, name: true, imageKeys: true },
    });

    expect(providers.length).toBeGreaterThanOrEqual(18);

    const providerImages = new Set<string>();

    for (const prov of providers) {
      // Must not be a lingering test fixture
      expect(prov.name).not.toBe('Test Groomer');
      expect(prov.slug).not.toContain('test-groomer');

      // Must have image keys
      expect(prov.imageKeys.length).toBeGreaterThanOrEqual(1);

      for (const imgKey of prov.imageKeys) {
        // Strip leading slash
        const relativeKey = imgKey.startsWith('/') ? imgKey.slice(1) : imgKey;
        const diskPath = path.join(resolvedPublicDir, relativeKey);
        const exists = fs.existsSync(diskPath);
        expect(exists, `Provider image not found on disk: ${diskPath} for ${prov.name}`).toBe(true);

        // Zero reuse across distinct providers
        expect(
          providerImages.has(imgKey),
          `Provider image reuse detected for ${imgKey} on ${prov.name}`
        ).toBe(false);
        providerImages.add(imgKey);
      }
    }
  });

  it('enforces 100% of products have image keys and valid distinct files on disk', async () => {
    const products = await prisma.product.findMany({
      where: { isActive: true },
      select: { id: true, slug: true, name: true, imageKeys: true },
    });

    expect(products.length).toBeGreaterThanOrEqual(19);

    const productImages = new Set<string>();

    for (const prod of products) {
      // Must not be a test fixture
      expect(prod.name).not.toContain('Expiring Item');
      expect(prod.name).not.toContain('Contest Prod');
      expect(prod.slug).not.toContain('contest-prod');

      // Must have image keys
      expect(prod.imageKeys.length).toBeGreaterThanOrEqual(1);

      for (const imgKey of prod.imageKeys) {
        const relativeKey = imgKey.startsWith('/') ? imgKey.slice(1) : imgKey;
        const diskPath = path.join(resolvedPublicDir, relativeKey);
        const exists = fs.existsSync(diskPath);
        expect(exists, `Product image not found on disk: ${diskPath} for ${prod.name}`).toBe(true);

        // Zero reuse across distinct products
        expect(
          productImages.has(imgKey),
          `Product image reuse detected for ${imgKey} on ${prod.name}`
        ).toBe(false);
        productImages.add(imgKey);
      }
    }
  });

  it('enforces zero image reuse between providers and products', async () => {
    const providers = await prisma.provider.findMany({ select: { imageKeys: true } });
    const products = await prisma.product.findMany({ select: { imageKeys: true } });

    const provSet = new Set(providers.flatMap((p) => p.imageKeys));
    const prodSet = new Set(products.flatMap((p) => p.imageKeys));

    for (const key of provSet) {
      expect(
        prodSet.has(key),
        `Collision between provider and product images: ${key}`
      ).toBe(false);
    }
  });

  it('verifies that all provider names and slugs are unique', async () => {
    const providers = await prisma.provider.findMany({ select: { slug: true, name: true } });
    const names = new Set<string>();
    const slugs = new Set<string>();

    for (const p of providers) {
      expect(names.has(p.name), `Duplicate provider name: ${p.name}`).toBe(false);
      expect(slugs.has(p.slug), `Duplicate provider slug: ${p.slug}`).toBe(false);
      names.add(p.name);
      slugs.add(p.slug);
    }
  });

  it('verifies that all active product names and slugs are unique', async () => {
    const products = await prisma.product.findMany({
      where: { isActive: true },
      select: { slug: true, name: true },
    });
    const names = new Set<string>();
    const slugs = new Set<string>();

    for (const p of products) {
      expect(names.has(p.name), `Duplicate product name: ${p.name}`).toBe(false);
      expect(slugs.has(p.slug), `Duplicate product slug: ${p.slug}`).toBe(false);
      names.add(p.name);
      slugs.add(p.slug);
    }
  });
});
