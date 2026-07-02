/**
 * Request id middleware.
 *
 * Assigns each request a correlation id (`req_<uuid>`), honoring an inbound
 * `X-Request-Id` when present (trusted proxy chains), and echoes it back on the
 * response header. Downstream code reads `req.id`; the envelope puts it in
 * `meta.request_id`.
 */
import { randomUUID } from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';

export const REQUEST_ID_HEADER = 'x-request-id';

function normalizeInbound(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  // Accept only short, safe ids to avoid header/log injection.
  return /^[\w.-]{1,128}$/.test(trimmed) ? trimmed : undefined;
}

export function requestId(req: Request, res: Response, next: NextFunction): void {
  const inbound = normalizeInbound(req.headers[REQUEST_ID_HEADER]);
  req.id = inbound ?? `req_${randomUUID()}`;
  res.setHeader('X-Request-Id', req.id);
  next();
}
