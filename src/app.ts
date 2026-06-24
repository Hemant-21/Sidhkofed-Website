/**
 * HTTP application assembly (no `listen` here — that is server.ts).
 *
 * Wires the cross-cutting middleware chain in the correct order (deliverable §2):
 *   request id → request logging → security headers → CORS → compression →
 *   body parsing → routes → 404 → global error handler.
 *
 * Returning the configured app (not starting it) keeps it importable by tests.
 */
import express, { type Express } from 'express';
import helmet from 'helmet';
import cors, { type CorsOptions } from 'cors';
import compression from 'compression';
import { appConfig, isProduction } from '@/config';
import { requestId } from '@/middleware/request-id';
import { requestLogger } from '@/middleware/request-logger';
import { errorHandler } from '@/middleware/error-handler';
import { notFound } from '@/middleware/not-found';
import { healthRouter } from '@/routes/health.routes';
import { apiRouter } from '@/routes';

function buildCorsOptions(): CorsOptions {
  // Phase 1: the public website is the only first-party browser origin; refresh
  // cookies require credentialed CORS. Additional origins are added explicitly.
  const allowed = new Set([appConfig.publicWebsiteUrl]);
  return {
    origin(origin, callback) {
      // Allow same-origin / non-browser (no Origin header) and the configured site.
      if (!origin || allowed.has(origin)) return callback(null, true);
      return callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id', 'If-None-Match'],
    exposedHeaders: ['X-Request-Id', 'ETag', 'Location'],
    maxAge: 600,
  };
}

export function createApp(): Express {
  const app = express();

  // Behind a reverse proxy/load balancer in every real deployment.
  app.set('trust proxy', isProduction ? 1 : false);
  app.disable('x-powered-by');

  // 1. Correlation id (must be first so logs + envelopes share it).
  app.use(requestId);

  // 2. Structured request logging.
  app.use(requestLogger);

  // 3. Security headers.
  app.use(
    helmet({
      // The CMS API is JSON-only; CSP is enforced by the frontend app, not here.
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  // 4. CORS (credentialed, allow-listed origins).
  app.use(cors(buildCorsOptions()));

  // 5. Response compression.
  app.use(compression());

  // 6. Body parsing with conservative limits (uploads use multipart in the media module).
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // 7. Operational probes at the root.
  app.use(healthRouter);

  // 8. Versioned API surface.
  app.use(appConfig.apiBasePath, apiRouter);

  // 9. Unmatched routes → typed 404.
  app.use(notFound);

  // 10. Global error handler (last).
  app.use(errorHandler);

  return app;
}
