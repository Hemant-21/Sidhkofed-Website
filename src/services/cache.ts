/**
 * Cross-cutting JSON cache service.
 *
 * Production no longer depends on in-process cache. This in-process TTL cache keeps the same
 * interface used by content modules and degrades naturally to DB reads after a restart.
 */
import { cacheConfig } from '@/config';

interface CacheEntry {
  value: string;
  expiresAt: number;
}

const globalForCache = globalThis as unknown as { jsonCache?: Map<string, CacheEntry> };
const store = globalForCache.jsonCache ?? new Map<string, CacheEntry>();
globalForCache.jsonCache = store;

function isExpired(entry: CacheEntry): boolean {
  return entry.expiresAt <= Date.now();
}

async function getJson<T>(key: string): Promise<T | null> {
  const entry = store.get(key);
  if (!entry) return null;
  if (isExpired(entry)) {
    store.delete(key);
    return null;
  }
  return JSON.parse(entry.value) as T;
}

async function setJson(key: string, value: unknown, ttlSeconds = cacheConfig.ttlSeconds): Promise<void> {
  if (ttlSeconds <= 0) return;
  store.set(key, {
    value: JSON.stringify(value),
    expiresAt: Date.now() + Math.max(1, ttlSeconds) * 1000,
  });
}

async function del(key: string): Promise<void> {
  store.delete(key);
}

async function delByPrefix(prefix: string): Promise<void> {
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) store.delete(key);
  }
}

export const cacheService = { getJson, setJson, del, delByPrefix };
