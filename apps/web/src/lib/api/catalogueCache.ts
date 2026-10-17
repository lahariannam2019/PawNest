interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const memoryCache = new Map<string, CacheEntry<any>>();
const DEFAULT_TTL_MS = 60 * 1000; // 60 seconds

/**
 * Retrieve cached catalogue data if available and fresh.
 */
export function getCachedCatalogue<T>(key: string, ttlMs: number = DEFAULT_TTL_MS): T | null {
  const entry = memoryCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > ttlMs) {
    memoryCache.delete(key);
    return null;
  }
  return entry.data as T;
}

/**
 * Store catalogue query results in memory cache.
 */
export function setCachedCatalogue<T>(key: string, data: T): void {
  // Bound cache size to prevent memory bloat
  if (memoryCache.size > 200) {
    const oldestKey = memoryCache.keys().next().value;
    if (oldestKey) memoryCache.delete(oldestKey);
  }
  memoryCache.set(key, { data, timestamp: Date.now() });
}

/**
 * Clear the catalogue cache (e.g. after mutating providers/products).
 */
export function clearCatalogueCache(): void {
  memoryCache.clear();
}
