/**
 * Health / liveness / readiness endpoints.
 *
 * GET /live   - process liveness only.
 * GET /ready  - readiness: PostgreSQL and storage must be reachable.
 * GET /health - aggregate snapshot with per-dependency detail.
 */
import { Router, type Request, type Response } from 'express';
import { success } from '@/shared/envelope';
import { pingDatabase } from '@/db/prisma';
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
  const [database, storageCheck] = await Promise.all([
    runCheck(pingDatabase),
    runCheck(() => storage.healthCheck()),
  ]);
  return { database, storage: storageCheck };
}

const baseInfo = () => ({
  name: appConfig.name,
  env: appConfig.env,
  uptime_seconds: Math.round(process.uptime()),
  timestamp: new Date().toISOString(),
});

export const healthRouter = Router();

healthRouter.get('/live', (req: Request, res: Response) => {
  res.status(200).json(success({ status: 'live', ...baseInfo() }, String(req.id)));
});

healthRouter.get('/ready', async (req: Request, res: Response) => {
  const checks = await collectChecks();
  const ready = Object.values(checks).every((c) => c.status === 'up');
  if (!ready) healthLog.warn({ checks }, 'Readiness check failed');
  res
    .status(ready ? 200 : 503)
    .json(success({ status: ready ? 'ready' : 'not_ready', ...baseInfo(), checks }, String(req.id)));
});

healthRouter.get('/health', async (req: Request, res: Response) => {
  const checks = await collectChecks();
  const healthy = Object.values(checks).every((c) => c.status === 'up');
  res
    .status(healthy ? 200 : 503)
    .json(success({ status: healthy ? 'ok' : 'degraded', ...baseInfo(), checks }, String(req.id)));
});
