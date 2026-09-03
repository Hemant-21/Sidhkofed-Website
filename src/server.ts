/**
 * Server bootstrap: connect dependencies, start listening, handle graceful shutdown.
 *
 * Boot order:
 *   1. PostgreSQL ($connect)   2. background jobs init   3. storage check
 *   4. start workers           5. HTTP listen
 *
 * SIGINT/SIGTERM drain the HTTP server first, then close jobs and Prisma.
 */
import type { Server } from 'node:http';
import { createApp } from './app';
import { appConfig, isProduction, uploadConfig } from '@/config';
import { logger } from '@/shared/logger';
import { connectDatabase, disconnectDatabase } from '@/db/prisma';
import { initJobs, startWorkers, shutdownJobs } from '@/jobs';
import { checkStorage } from '@/services/storage';
import { verifyScannerStartup } from '@/modules/media/media.scanner';

const bootLog = logger.child({ component: 'server' });

let server: Server | undefined;
let shuttingDown = false;

async function start(): Promise<void> {
  await connectDatabase();
  await initJobs();
  const storageOk = await checkStorage();
  if (!storageOk) {
    throw new Error('Storage health check failed - refusing to start.');
  }

  await verifyScannerStartup({ enabled: uploadConfig.malwareScanEnabled, isProduction });
  await startWorkers();

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
  bootLog.info({ reason }, 'Shutting down...');

  if (server) {
    await new Promise<void>((resolve) => server?.close(() => resolve()));
    bootLog.info('HTTP server closed');
  }

  const results = await Promise.allSettled([shutdownJobs(), disconnectDatabase()]);
  for (const r of results) {
    if (r.status === 'rejected') bootLog.error({ err: r.reason }, 'Error during shutdown');
  }

  bootLog.info('Shutdown complete');
  process.exit(exitCode);
}

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
