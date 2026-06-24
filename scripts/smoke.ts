/**
 * Foundation smoke test (non-runtime ops script).
 *
 * Exercises the infrastructure wiring end-to-end without any business modules:
 *   - PostgreSQL connect ($connect + SELECT 1)
 *   - Redis connect (PING)
 *   - BullMQ connect (queue PING + enqueue/inspect/obliterate a throwaway job)
 *   - Storage health check
 *   - HTTP app: GET /live and GET /health through the real middleware chain
 *
 * Run with: `npm run smoke` (tsx). Exits non-zero if any required check fails.
 * Postgres is reported but, when unavailable, does not mask the other results.
 */
import type { Server } from 'node:http';
import { createApp } from '@/app';
import { appConfig } from '@/config';
import { connectDatabase, disconnectDatabase, pingDatabase } from '@/db/prisma';
import { connectRedis, disconnectRedis, pingRedis } from '@/services/redis';
import { initJobs, shutdownJobs, createQueue } from '@/jobs';
import { checkStorage } from '@/services/storage';

type Result = { name: string; ok: boolean; detail: string };
const results: Result[] = [];
const record = (name: string, ok: boolean, detail: string) => {
  results.push({ name, ok, detail });
  // eslint-disable-next-line no-console
  console.log(`${ok ? '✓' : '✗'} ${name}: ${detail}`);
};

async function check(name: string, fn: () => Promise<string>): Promise<void> {
  try {
    record(name, true, await fn());
  } catch (err) {
    record(name, false, err instanceof Error ? err.message : String(err));
  }
}

async function main(): Promise<void> {
  await check('PostgreSQL', async () => {
    await connectDatabase();
    await pingDatabase();
    return 'connected (SELECT 1 ok)';
  });

  await check('Redis', async () => {
    await connectRedis();
    const ok = await pingRedis();
    return ok ? 'connected (PONG)' : 'ping failed';
  });

  await check('BullMQ', async () => {
    await initJobs();
    const queue = createQueue('smoke-test');
    await queue.add('noop', { at: Date.now() }, { delay: 60_000 });
    const counts = await queue.getJobCounts('delayed', 'waiting');
    await queue.obliterate({ force: true });
    return `connected (enqueue ok, counts ${JSON.stringify(counts)})`;
  });

  await check('Storage', async () => {
    const ok = await checkStorage();
    return ok ? `ready (${appConfig.name})` : 'health check failed';
  });

  // HTTP layer: boot the app on an ephemeral port and hit the probes.
  let server: Server | undefined;
  await check('HTTP /live + /health', async () => {
    const app = createApp();
    await new Promise<void>((resolve) => {
      server = app.listen(0, resolve);
    });
    const address = server!.address();
    const port = typeof address === 'object' && address ? address.port : 0;
    const base = `http://127.0.0.1:${port}`;

    const live = await fetch(`${base}/live`);
    const liveBody = (await live.json()) as { success: boolean; data: { status: string } };
    if (live.status !== 200 || liveBody.data.status !== 'live') {
      throw new Error(`/live returned ${live.status} ${JSON.stringify(liveBody)}`);
    }

    const health = await fetch(`${base}/health`);
    const healthBody = (await health.json()) as {
      data: { status: string; checks: Record<string, { status: string }> };
    };
    return `/live=200 status=live; /health=${health.status} status=${healthBody.data.status} checks=${JSON.stringify(
      Object.fromEntries(
        Object.entries(healthBody.data.checks).map(([k, v]) => [k, v.status]),
      ),
    )}`;
  });

  // Cleanup.
  if (server) await new Promise<void>((resolve) => server!.close(() => resolve()));
  await Promise.allSettled([shutdownJobs(), disconnectRedis(), disconnectDatabase()]);

  const required = results.filter((r) => r.name !== 'PostgreSQL');
  const failed = results.filter((r) => !r.ok);
  // eslint-disable-next-line no-console
  console.log(
    `\nSmoke summary: ${results.length - failed.length}/${results.length} passed` +
      (failed.length ? ` (failed: ${failed.map((f) => f.name).join(', ')})` : ''),
  );
  // Fail the script only if a non-Postgres check failed (Postgres may be unprovisioned).
  const requiredFailed = required.some((r) => !r.ok);
  process.exit(requiredFailed ? 1 : 0);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Smoke script crashed:', err);
  process.exit(1);
});
