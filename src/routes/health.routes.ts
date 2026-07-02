/**
 * Health / liveness / readiness endpoints (deliverable §9).
 *
 *   GET /live   — process liveness only (is the event loop up?). Always 200 while
 *                 the process can answer. Used by orchestrators to restart hung pods.
 *   GET /ready  — readiness: every backing dependency (PostgreSQL, Redis, BullMQ,
 *                 storage) must be reachable. 200 when all pass, 503 otherwise. Used
 *                 to gate traffic / load-balancer membership.
 *   GET /health — aggregate snapshot with per-dependency detail (200/503).
 *
 * Mounted at the app root (not under /api/v1) — these are operational probes, not the
 * versioned public/admin contract. They still use the standard response envelope.
 */
import { Router, type Request, type Response } from 'express';
import { success } from '@/shared/envelope';
import { pingDatabase } from '@/db/prisma';
import { pingRedis } from '@/services/redis';
import { pingQueueBackend } from '@/jobs/connection';
import { storage } from '@/services/storage';
import { appConfig } from '@/config';
import { logger } from '@/shared/logger';

const healthLog = logger.child({ component: 'health' });

type CheckStatus = 'up' | 'down';
interface DependencyCheck {
  status: CheckStatus;
  latency_ms: number;
  error?: string;
}

async function runCheck(fn: () => Promise<boolean>): Promise<DependencyCheck> {
  const start = Date.now();
  try {
    const ok = await fn();
    return { status: ok ? 'up' : 'down', latency_ms: Date.now() - start };
  } catch (err) {
    return {
      status: 'down',
      latency_ms: Date.now() - start,
      error: err instanceof Error ? err.message : 'unknown error',
    };
  }
}

async function collectChecks(): Promise<Record<string, DependencyCheck>> {
  const [database, redis, queue, storageCheck] = await Promise.all([
    runCheck(pingDatabase),
    runCheck(pingRedis),
    runCheck(pingQueueBackend),
    runCheck(() => storage.healthCheck()),
  ]);
  return { database, redis, queue, storage: storageCheck };
}

const baseInfo = () => ({
  name: appConfig.name,
  env: appConfig.env,
  uptime_seconds: Math.round(process.uptime()),
  timestamp: new Date().toISOString(),
});

export const healthRouter = Router();

// Liveness — cheap, no dependency calls.
healthRouter.get('/live', (req: Request, res: Response) => {
  res.status(200).json(success({ status: 'live', ...baseInfo() }, String(req.id)));
});

// Readiness — all dependencies must be up.
healthRouter.get('/ready', async (req: Request, res: Response) => {
  const checks = await collectChecks();
  const ready = Object.values(checks).every((c) => c.status === 'up');
  if (!ready) healthLog.warn({ checks }, 'Readiness check failed');
  res
    .status(ready ? 200 : 503)
    .json(success({ status: ready ? 'ready' : 'not_ready', ...baseInfo(), checks }, String(req.id)));
});

// Aggregate health snapshot.
healthRouter.get('/health', async (req: Request, res: Response) => {
  const checks = await collectChecks();
  const healthy = Object.values(checks).every((c) => c.status === 'up');
  res
    .status(healthy ? 200 : 503)
    .json(success({ status: healthy ? 'ok' : 'degraded', ...baseInfo(), checks }, String(req.id)));
});
