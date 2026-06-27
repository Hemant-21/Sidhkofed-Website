/**
 * Redis-backed fixed-window rate limiting (pre-Phase-5 audit, Issue 5).
 *
 * A small INCR + EXPIRE counter per (route-scope, client key, window). The first request in
 * a window sets the TTL; subsequent requests increment. Over the limit → `429` via the shared
 * `RateLimitError`, plus standard `RateLimit-*` / `Retry-After` headers and a structured
 * security log. The client key is the privacy-safe hashed IP (never the raw IP).
 *
 * Fail-open: if Redis is unreachable the request is allowed (availability over enforcement)
 * and the failure is logged — an outage must not lock everyone out.
 */
import { createHash } from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';
import { redis } from '@/services/redis';
import { abuseConfig, rateLimitConfig } from '@/config';
import { RateLimitError } from '@/shared/errors';
import { logger } from '@/shared/logger';

const rlLog = logger.child({ component: 'rate-limit' });

export interface RateLimitOptions {
  /** Stable scope name, e.g. `auth:login` — namespaces the counter. */
  scope: string;
  /** Max requests permitted within the window. */
  max: number;
  /** Window length in seconds. */
  windowSec: number;
}

/** Privacy-safe client identifier (hashed IP — matches the enquiry IP-hash approach). */
function clientKey(req: Request): string {
  const ip = req.ip ?? 'unknown';
  return createHash('sha256').update(`${ip}:${abuseConfig.ipHashSalt}`).digest('hex').slice(0, 32);
}

/**
 * Build a rate-limit middleware for a scope. When `RATE_LIMIT_ENABLED=false` it is a no-op
 * passthrough (useful in tests/local).
 */
export function rateLimit(options: RateLimitOptions) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!rateLimitConfig.enabled || options.max <= 0) return next();

    const key = `ratelimit:${options.scope}:${clientKey(req)}`;
    redis
      .multi()
      .incr(key)
      .ttl(key)
      .exec()
      .then(async (results) => {
        // results: [[err, count], [err, ttl]]
        const count = Number(results?.[0]?.[1] ?? 0);
        let ttl = Number(results?.[1]?.[1] ?? -1);
        if (count === 1 || ttl < 0) {
          await redis.expire(key, options.windowSec);
          ttl = options.windowSec;
        }

        const remaining = Math.max(0, options.max - count);
        res.setHeader('RateLimit-Limit', String(options.max));
        res.setHeader('RateLimit-Remaining', String(remaining));
        res.setHeader('RateLimit-Reset', String(ttl));

        if (count > options.max) {
          res.setHeader('Retry-After', String(ttl));
          rlLog.warn(
            { scope: options.scope, count, limit: options.max, request_id: String(req.id) },
            'Rate limit exceeded',
          );
          throw new RateLimitError();
        }
        next();
      })
      .catch((err) => {
        if (err instanceof RateLimitError) return next(err);
        // Redis failure → fail open (do not lock out legitimate traffic).
        rlLog.error({ err, scope: options.scope }, 'Rate limiter error — allowing request (fail-open)');
        next();
      });
  };
}

/** Preconfigured limiters for the audited surfaces (Issue 5). */
export const loginRateLimit = rateLimit({ scope: 'auth:login', ...rateLimitConfig.login });
export const refreshRateLimit = rateLimit({ scope: 'auth:refresh', ...rateLimitConfig.refresh });
export const logoutRateLimit = rateLimit({ scope: 'auth:logout', ...rateLimitConfig.refresh });
export const uploadRateLimit = rateLimit({ scope: 'media:upload', ...rateLimitConfig.upload });

/**
 * Enquiry submission rate limiter — by hashed IP (CMS requirements §4.12).
 * Window: 1 hour; max configurable via ENQUIRY_RATELIMIT_PER_IP_HOUR (default 5).
 * A separate per-contact limiter is enforced inside the service via deduplication fingerprint.
 */
export const enquiryRateLimit = rateLimit({
  scope: 'enquiry:submit',
  max: abuseConfig.enquiryRateLimitPerIpHour,
  windowSec: 3600,
});
