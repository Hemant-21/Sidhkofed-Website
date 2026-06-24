/**
 * Prisma client singleton (the only place a PrismaClient is instantiated).
 *
 * Repositories import `prisma` from here; never `new PrismaClient()` per request
 * (docs/foundation/04-coding-standards.md §3). In development the instance is cached
 * on `globalThis` so HMR / tsx watch reloads don't open a new pool every reload.
 */
import { PrismaClient } from '@prisma/client';
import { isProduction } from '@/config';
import { logger } from '@/shared/logger';

const prismaLog = logger.child({ component: 'prisma' });

/** Shape of a Prisma `emit: 'event'` log payload (stable across client versions). */
interface PrismaLogEvent {
  timestamp: Date;
  message: string;
  target: string;
}

function createPrismaClient(): PrismaClient {
  const client = new PrismaClient({
    log: [
      { level: 'warn', emit: 'event' },
      { level: 'error', emit: 'event' },
    ],
  });
  client.$on('warn', (e: PrismaLogEvent) => prismaLog.warn({ target: e.target }, e.message));
  client.$on('error', (e: PrismaLogEvent) => prismaLog.error({ target: e.target }, e.message));
  return client;
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma: PrismaClient = globalForPrisma.prisma ?? createPrismaClient();

if (!isProduction) {
  globalForPrisma.prisma = prisma;
}

/** Open the connection eagerly at boot so failures surface immediately. */
export async function connectDatabase(): Promise<void> {
  await prisma.$connect();
  prismaLog.info('PostgreSQL connected');
}

export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
  prismaLog.info('PostgreSQL disconnected');
}

/**
 * Lightweight liveness probe for the health endpoints.
 * Uses `SELECT 1` so it works before any content tables/migrations exist.
 */
export async function pingDatabase(): Promise<boolean> {
  await prisma.$queryRaw`SELECT 1`;
  return true;
}
