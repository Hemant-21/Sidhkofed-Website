/**
 * Integration tests — full auth flow over HTTP against the real app, Prisma and Redis.
 *
 * GUARDED: this suite is skipped unless `RUN_INTEGRATION=1` and a real DATABASE_URL /
 * REDIS_URL are reachable (the migrations must have been applied). It self-seeds a
 * disposable Super Admin so it does not depend on `npm run db:seed`.
 *
 *   RUN_INTEGRATION=1 DATABASE_URL=... REDIS_URL=... npm run test:integration
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';

const RUN = process.env.RUN_INTEGRATION === '1';

const EMAIL = `it-admin-${Date.now()}@sidhkofed.test`;
const PASSWORD = 'Integration#Pass123';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let app: Express;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let prisma: any;
let userId: string | undefined;

describe.skipIf(!RUN)('auth flow (integration)', () => {
  beforeAll(async () => {
    const { createApp } = await import('@/app');
    const db = await import('@/db/prisma');
    const { connectRedis } = await import('@/services/redis');
    const { hashPassword } = await import('@/modules/auth/password');
    const { ROLE_KEYS } = await import('@/modules/auth/auth.permissions');

    app = createApp();
    prisma = db.prisma;
    await db.connectDatabase();
    await connectRedis();

    const role = await prisma.role.upsert({
      where: { key: ROLE_KEYS.superAdmin },
      update: {},
      create: { key: ROLE_KEYS.superAdmin, nameEn: 'Super Admin', isSystem: true },
    });
    const user = await prisma.user.upsert({
      where: { email: EMAIL },
      update: { passwordHash: await hashPassword(PASSWORD), isActive: true },
      create: { email: EMAIL, fullName: 'IT Admin', passwordHash: await hashPassword(PASSWORD), isActive: true },
    });
    userId = user.id;
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: user.id, roleId: role.id } },
      update: {},
      create: { userId: user.id, roleId: role.id },
    });
  });

  afterAll(async () => {
    if (prisma && userId) {
      await prisma.userRole.deleteMany({ where: { userId } });
      await prisma.auditLog.deleteMany({ where: { userId } });
      await prisma.user.delete({ where: { id: userId } }).catch(() => undefined);
      await prisma.$disconnect();
    }
  });

  it('rejects invalid credentials with 401 and the generic message', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({ email: EMAIL, password: 'wrong' });
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('authentication_required');
  });

  it('logs in, returns a Bearer access token, and sets the refresh cookie', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({ email: EMAIL, password: PASSWORD });
    expect(res.status).toBe(200);
    expect(res.body.data.token_type).toBe('Bearer');
    expect(res.body.data.access_token).toBeTruthy();
    expect(res.body.data.user.roles).toContain('super_admin');
    expect(res.headers['set-cookie']?.join(';')).toContain('sidhkofed_rt');
  });

  it('returns the profile from /auth/me with a valid bearer token', async () => {
    const login = await request(app).post('/api/v1/auth/login').send({ email: EMAIL, password: PASSWORD });
    const token = login.body.data.access_token as string;
    const me = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${token}`);
    expect(me.status).toBe(200);
    expect(me.body.data.email).toBe(EMAIL);
    expect(me.body.data).not.toHaveProperty('password_hash');
  });

  it('rotates the refresh token and logs out idempotently', async () => {
    const agent = request.agent(app);
    await agent.post('/api/v1/auth/login').send({ email: EMAIL, password: PASSWORD });
    const refreshed = await agent.post('/api/v1/auth/refresh').send({});
    expect(refreshed.status).toBe(200);
    expect(refreshed.body.data.access_token).toBeTruthy();
    const out = await agent.post('/api/v1/auth/logout').send({});
    expect(out.status).toBe(204);
    // Idempotent — logging out again still succeeds.
    const outAgain = await agent.post('/api/v1/auth/logout').send({});
    expect(outAgain.status).toBe(204);
  });
});
