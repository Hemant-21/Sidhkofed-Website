/**
 * HTTP request logging (pino-http), bound to the same logger and the request id.
 *
 * Emits one structured line per request with method, url, status and latency. Health
 * probes are logged at `debug` to avoid noise; server errors at `error`. Reuses
 * `req.id` from the requestId middleware as the log correlation id.
 */
import { pinoHttp } from 'pino-http';
import type { RequestHandler } from 'express';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { logger } from '@/shared/logger';

// pino-http augments IncomingMessage; cast to the Express middleware signature.
export const requestLogger = pinoHttp({
  logger,
  // Reuse the correlation id assigned by the requestId middleware.
  genReqId: (req: IncomingMessage & { id?: string }, res: ServerResponse) => {
    const id = req.id ?? `req_${Date.now()}`;
    res.setHeader('X-Request-Id', id);
    return id;
  },
  customLogLevel: (_req, res, err) => {
    if (err || res.statusCode >= 500) return 'error';
    if (res.statusCode >= 400) return 'warn';
    if (res.statusCode >= 300) return 'silent';
    return 'info';
  },
  customSuccessMessage: (req, res) => `${req.method} ${req.url} ${res.statusCode}`,
  autoLogging: {
    ignore: (req) => req.url === '/health' || req.url === '/live' || req.url === '/ready',
  },
  serializers: {
    req: (req) => ({ id: req.id, method: req.method, url: req.url }),
    res: (res) => ({ statusCode: res.statusCode }),
  },
}) as unknown as RequestHandler;
