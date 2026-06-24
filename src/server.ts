/**
 * Server bootstrap: connect dependencies, start listening, handle graceful shutdown.
 *
 * Boot order (fail fast — a bad dependency stops startup, satisfying the acceptance
 * criteria that Prisma/Redis/BullMQ all connect before the app serves traffic):
 *   1. PostgreSQL ($connect)   2. Redis (ping)   3. BullMQ (ping)   4. storage check
 *   5. start workers (none in foundation)   6. HTTP listen
 *
 * SIGINT/SIGTERM drain the HTTP server first, then close jobs, Redis and Prisma.
 */
import type { Server } from 'node:http';
import { createApp } from './app';
import { appConfig } from '@/config';
import { logger } from '@/shared/logger';
import { connectDatabase, disconnectDatabase } from '@/db/prisma';
import { connectRedis, disconnectRedis } from '@/services/redis';
import { initJobs, startWorkers, shutdownJobs } from '@/jobs';
import { checkStorage } from '@/services/storage';

const bootLog = logger.child({ component: 'server' });

let server: Server | undefined;
let shuttingDown = false;

async function start(): Promise<void> {
  // 1–4: connect/verify every backing dependency before listening.
  await connectDatabase();
  await connectRedis();
  await initJobs();
  await checkStorage();

  // 5: background workers (none registered in the foundation phase).
  startWorkers();

  // 6: start accepting traffic.
  const app = createApp();
  server = app.listen(appConfig.port, () => {
    bootLog.info(
      { port: appConfig.port, env: appConfig.env, base_path: appConfig.apiBasePath },
      `SIDHKOFED CMS API listening on http://localhost:${appConfig.port}`,
    );
  });

  server.on('error', (err) => {
    bootLog.fatal({ err }, 'HTTP server error');
    void shutdown('server_error', 1);
  });
}

async function shutdown(reason: string, exitCode = 0): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  bootLog.info({ reason }, 'Shutting down…');

  // Stop accepting new connections, then drain.
  if (server) {
    await new Promise<void>((resolve) => server?.close(() => resolve()));
    bootLog.info('HTTP server closed');
  }

  // Close dependencies; never let one failure block the others.
  const results = await Promise.allSettled([shutdownJobs(), disconnectRedis(), disconnectDatabase()]);
  for (const r of results) {
    if (r.status === 'rejected') bootLog.error({ err: r.reason }, 'Error during shutdown');
  }

  bootLog.info('Shutdown complete');
  process.exit(exitCode);
}

// Process signal + fatal-error wiring.
process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('unhandledRejection', (reason) => {
  bootLog.error({ err: reason }, 'Unhandled promise rejection');
});
process.on('uncaughtException', (err) => {
  bootLog.fatal({ err }, 'Uncaught exception');
  void shutdown('uncaught_exception', 1);
});

start().catch((err) => {
  bootLog.fatal({ err }, 'Failed to start server');
  void shutdown('startup_failure', 1);
});
