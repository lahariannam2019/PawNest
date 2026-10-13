import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { canUse3D } from './canUse3D';

describe('canUse3D capability gating', () => {
  const originalEnv = process.env.NEXT_PUBLIC_HERO_3D;
  let mockStorage: Record<string, string> = {};

  beforeEach(() => {
    process.env.NEXT_PUBLIC_HERO_3D = 'true';
    mockStorage = {};

    (globalThis as any).window = {
      innerWidth: 1200,
      matchMedia: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
      })),
    };

    (globalThis as any).localStorage = {
      getItem: (key: string) => mockStorage[key] || null,
      setItem: (key: string, val: string) => {
        mockStorage[key] = val;
      },
      clear: () => {
        mockStorage = {};
      },
    };

    Object.defineProperty(globalThis, 'navigator', {
      value: {
        connection: {
          saveData: false,
          effectiveType: '4g',
        },
        deviceMemory: 8,
      },
      configurable: true,
      writable: true,
    });

    (globalThis as any).document = {
      createElement: (tag: string) => {
        if (tag === 'canvas') {
          return {
            getContext: (contextId: string) => (contextId === 'webgl2' ? {} : null),
          };
        }
        return {};
      },
    };
  });

  afterEach(() => {
    process.env.NEXT_PUBLIC_HERO_3D = originalEnv;
    delete (globalThis as any).window;
    delete (globalThis as any).localStorage;
    delete (globalThis as any).navigator;
    delete (globalThis as any).document;
    vi.restoreAllMocks();
  });

  it('returns true when all conditions are satisfied', () => {
    expect(canUse3D()).toBe(true);
  });

  it('returns false when window is undefined (SSR)', () => {
    delete (globalThis as any).window;
    expect(canUse3D()).toBe(false);
  });

  it('returns false when NEXT_PUBLIC_HERO_3D is not true', () => {
    process.env.NEXT_PUBLIC_HERO_3D = 'false';
    expect(canUse3D()).toBe(false);

    delete process.env.NEXT_PUBLIC_HERO_3D;
    expect(canUse3D()).toBe(false);
  });

  it('returns false when prefers-reduced-motion is true', () => {
    (globalThis as any).window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query.includes('prefers-reduced-motion'),
      media: query,
    }));
    expect(canUse3D()).toBe(false);
  });

  it('returns false when in-app reduce motion preference is saved', () => {
    mockStorage['pawnest_reduce_motion'] = 'true';
    expect(canUse3D()).toBe(false);
  });

  it('returns false when viewport width is below 768px', () => {
    (globalThis as any).window.innerWidth = 390;
    expect(canUse3D()).toBe(false);
  });

  it('returns false when Data Saver mode is active', () => {
    (globalThis as any).navigator.connection.saveData = true;
    expect(canUse3D()).toBe(false);
  });

  it('returns false on slow connections (slow-2g, 2g, 3g)', () => {
    for (const slow of ['slow-2g', '2g', '3g']) {
      (globalThis as any).navigator.connection.effectiveType = slow;
      expect(canUse3D()).toBe(false);
    }
  });

  it('returns false when deviceMemory is less than 4GB', () => {
    (globalThis as any).navigator.deviceMemory = 2;
    expect(canUse3D()).toBe(false);
  });

  it('returns false when WebGL2 context is unavailable', () => {
    (globalThis as any).document.createElement = () => ({
      getContext: () => null,
    });
    expect(canUse3D()).toBe(false);
  });
});
