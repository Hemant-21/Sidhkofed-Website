/**
 * Small cross-function helpers for the Website Metrics module: the public-cache prefix (Stage 3's
 * public endpoint should read through a cache keyed under this prefix, and MUST invalidate it the
 * same way on any change it makes) and the authenticated-user guard used by every mutating service
 * function. Mirrors `dashboard.shared.ts`.
 */
import { ValidationError } from '@/shared/errors';
import { cacheService } from '@/services/cache';
import type { AuditContext } from '@/modules/audit/audit.service';

/**
 * Stage 3 hook: the public `/public/website-metrics` endpoint (not built here) should cache its
 * responses under keys prefixed with this constant and call `invalidateWebsiteMetricsPublicCache()`
 * (or replicate this prefix) so a publish/unpublish/archive/restore here is reflected promptly.
 */
export const WEBSITE_METRICS_PUBLIC_CACHE_PREFIX = 'website_metrics:public';

export async function invalidateWebsiteMetricsPublicCache(): Promise<void> {
  await cacheService.delByPrefix(`${WEBSITE_METRICS_PUBLIC_CACHE_PREFIX}:`);
}

export function requireUser(ctx: AuditContext): string {
  if (!ctx.userId) throw new ValidationError({ _: ['An authenticated user is required.'] });
  return ctx.userId;
}

/** Deterministic JSON stringify (recursively sorted object keys) for config-equality checks. */
export function stableStringify(value: unknown): string {
  return JSON.stringify(sortDeep(value));
}

function sortDeep(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortDeep);
  if (value !== null && typeof value === 'object') {
    return Object.keys(value as Record<string, unknown>)
      .sort()
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = sortDeep((value as Record<string, unknown>)[key]);
        return acc;
      }, {});
  }
  return value;
}
