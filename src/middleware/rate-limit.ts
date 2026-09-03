/**
 * In-process fixed-window rate limiting.
 *
 * This is suitable for the planned single app-server deployment. Counters reset on
 * process restart; use IIS/network-level controls for broader perimeter throttling.
 */
import { createHash } from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';
import { abuseConfig, rateLimitConfig } from '@/config';
import { RateLimitError } from '@/shared/errors';
import { logger } from '@/shared/logger';

const rlLog = logger.child({ component: 'rate-limit' });

export interface RateLimitOptions {
  scope: string;
  max: number;
  windowSec: number;
}

interface Counter {
  count: number;
  resetAt: number;
}

const globalForRateLimit = globalThis as unknown as { rateLimitCounters?: Map<string, Counter> };
const counters = globalForRateLimit.rateLimitCounters ?? new Map<string, Counter>();
globalForRateLimit.rateLimitCounters = counters;

function clientKey(req: Request): string {
  const ip = req.ip ?? 'unknown';
  return createHash('sha256').update(`${ip}:${abuseConfig.ipHashSalt}`).digest('hex').slice(0, 32);
}

function sweepExpired(now: number): void {
  for (const [key, counter] of counters) {
    if (counter.resetAt <= now) counters.delete(key);
  }
}

export function rateLimit(options: RateLimitOptions) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!rateLimitConfig.enabled || options.max <= 0) return next();

    const now = Date.now();
    sweepExpired(now);

    const key = `ratelimit:${options.scope}:${clientKey(req)}`;
    const existing = counters.get(key);
    const counter =
      existing && existing.resetAt > now
        ? existing
        : { count: 0, resetAt: now + options.windowSec * 1000 };

    counter.count += 1;
    counters.set(key, counter);

    const ttl = Math.max(1, Math.ceil((counter.resetAt - now) / 1000));
    const remaining = Math.max(0, options.max - counter.count);
    res.setHeader('RateLimit-Limit', String(options.max));
    res.setHeader('RateLimit-Remaining', String(remaining));
    res.setHeader('RateLimit-Reset', String(ttl));

    if (counter.count > options.max) {
      res.setHeader('Retry-After', String(ttl));
      rlLog.warn(
        { scope: options.scope, count: counter.count, limit: options.max, request_id: String(req.id) },
        'Rate limit exceeded',
      );
      return next(new RateLimitError());
    }

    return next();
  };
}

export const loginRateLimit = rateLimit({ scope: 'auth:login', ...rateLimitConfig.login });
export const refreshRateLimit = rateLimit({ scope: 'auth:refresh', ...rateLimitConfig.refresh });
export const logoutRateLimit = rateLimit({ scope: 'auth:logout', ...rateLimitConfig.refresh });
export const uploadRateLimit = rateLimit({ scope: 'media:upload', ...rateLimitConfig.upload });

export const enquiryRateLimit = rateLimit({
  scope: 'enquiry:submit',
  max: abuseConfig.enquiryRateLimitPerIpHour,
  windowSec: 3600,
});
