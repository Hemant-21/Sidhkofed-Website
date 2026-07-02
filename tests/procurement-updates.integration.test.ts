/**
 * Integration tests — procurement update CRUD, lifecycle, RBAC, master relationships (commodity),
 * rate transport and public visibility, over HTTP against the real app, Prisma and Redis.
 *
 * GUARDED: skipped unless `RUN_INTEGRATION=1` with a reachable DATABASE_URL / REDIS_URL and the
 * phase9 migration applied. Self-seeds disposable users + a procurement-update type + a commodity;
 * cleans them up afterwards.
 *
 *   RUN_INTEGRATION=1 DATABASE_URL=... REDIS_URL=... npm run test:integration
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';

const RUN = process.env.RUN_INTEGRATION === '1';
const STAMP = Date.now();
const PASSWORD = 'Integration#Pass123';

let app: Express;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let prisma: any;
const created: { users: string[]; typeId?: string; commodityId?: string; updateId?: string } = { users: [] };

async function login(email: string): Promise<string> {
  const res = await request(app).post('/api/v1/auth/login').send({ email, password: PASSWORD });
  return res.body.data.access_token as string;
}

describe.skipIf(!RUN)('procurement-updates (integration)', () => {
  let editorToken: string;
  let publisherToken: string;

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

    async function userWithRole(suffix: string, roleKey: string): Promise<string> {
      const role = await prisma.role.findUnique({ where: { key: roleKey } });
      const email = `it-proc-${suffix}-${STAMP}@sidhkofed.test`;
      const user = await prisma.user.upsert({
        where: { email },
        update: { passwordHash: await hashPassword(PASSWORD), isActive: true },
        create: { email, fullName: `IT ${suffix}`, passwordHash: await hashPassword(PASSWORD), isActive: true },
      });
      created.users.push(user.id);
      if (role) {
        await prisma.userRole.upsert({
          where: { userId_roleId: { userId: user.id, roleId: role.id } },
          update: {},
          create: { userId: user.id, roleId: role.id },
        });
      }
      return email;
    }

    const editorEmail = await userWithRole('editor', ROLE_KEYS.contentEditor);
    const publisherEmail = await userWithRole('publisher', ROLE_KEYS.publisher);

    const type = await prisma.procurementUpdateType.upsert({
      where: { slug: `it-rate-${STAMP}` },
      update: {},
      create: { nameEn: `IT Rate ${STAMP}`, slug: `it-rate-${STAMP}`, isActive: true },
    });
    created.typeId = type.id;

    const commodity = await prisma.commodity.upsert({
      where: { slug: `it-honey-${STAMP}` },
      update: {},
      create: { nameEn: `IT Honey ${STAMP}`, slug: `it-honey-${STAMP}`, isActive: true },
    });
    created.commodityId = commodity.id;

    editorToken = await login(editorEmail);
    publisherToken = await login(publisherEmail);
  });

  afterAll(async () => {
    if (!prisma) return;
    await prisma.procurementUpdate.deleteMany({ where: { procurementUpdateTypeId: created.typeId } }).catch(() => undefined);
    if (created.commodityId) await prisma.commodity.delete({ where: { id: created.commodityId } }).catch(() => undefined);
    if (created.typeId) await prisma.procurementUpdateType.delete({ where: { id: created.typeId } }).catch(() => undefined);
    for (const id of created.users) {
      await prisma.userRole.deleteMany({ where: { userId: id } }).catch(() => undefined);
      await prisma.auditLog.deleteMany({ where: { userId: id } }).catch(() => undefined);
      await prisma.user.delete({ where: { id } }).catch(() => undefined);
    }
    await prisma.$disconnect();
  });

  it('lets a Content Editor create a draft rate update with commodity + rate', async () => {
    const res = await request(app)
      .post('/api/v1/admin/procurement-updates')
      .set('Authorization', `Bearer ${editorToken}`)
      .send({
        procurement_update_type_id: created.typeId,
        commodity_id: created.commodityId,
        title_en: `Honey rate ${STAMP}`,
        rate: 250.5,
        unit: 'per kg',
        effective_date: '2026-02-01',
        period_start: '2026-02-01',
        period_end: '2026-04-30',
        status: 'active',
      });
    expect(res.status).toBe(201);
    expect(res.body.data.rate).toBe(250.5);
    created.updateId = res.body.data.id;
  });

  it('rejects period_end before period_start with 422', async () => {
    const res = await request(app)
      .post('/api/v1/admin/procurement-updates')
      .set('Authorization', `Bearer ${editorToken}`)
      .send({
        procurement_update_type_id: created.typeId,
        title_en: 'Bad period',
        period_start: '2026-03-01',
        period_end: '2026-01-01',
      });
    expect(res.status).toBe(422);
  });

  it('forbids a Content Editor from publishing (RBAC 403)', async () => {
    const res = await request(app)
      .post(`/api/v1/admin/procurement-updates/${created.updateId}/publish`)
      .set('Authorization', `Bearer ${editorToken}`)
      .send({});
    expect(res.status).toBe(403);
  });

  it('lets a Publisher publish, then exposes it publicly by slug + filters by commodity', async () => {
    const pub = await request(app)
      .post(`/api/v1/admin/procurement-updates/${created.updateId}/publish`)
      .set('Authorization', `Bearer ${publisherToken}`)
      .send({});
    expect(pub.status).toBe(200);
    const slug = pub.body.data.slug as string;

    const detail = await request(app).get(`/api/v1/public/procurement-updates/${slug}`);
    expect(detail.status).toBe(200);
    expect(detail.body.data.commodity.id).toBe(created.commodityId);
    expect(detail.body.data).not.toHaveProperty('created_by');

    const filtered = await request(app).get(`/api/v1/public/procurement-updates?commodity=it-honey-${STAMP}`);
    const ids = (filtered.body.data as Array<{ id: string }>).map((d) => d.id);
    expect(ids).toContain(created.updateId);
  });

  it('rejects unknown list filters with 422 (admin + public)', async () => {
    const admin = await request(app)
      .get('/api/v1/admin/procurement-updates?bogus=1')
      .set('Authorization', `Bearer ${publisherToken}`);
    expect(admin.status).toBe(422);
    expect((await request(app).get('/api/v1/public/procurement-updates?bogus=1')).status).toBe(422);
  });

  it('archives and removes it from public listings', async () => {
    const arch = await request(app)
      .post(`/api/v1/admin/procurement-updates/${created.updateId}/archive`)
      .set('Authorization', `Bearer ${publisherToken}`)
      .send({});
    expect(arch.status).toBe(200);
    const pub = await request(app).get('/api/v1/public/procurement-updates');
    const ids = (pub.body.data as Array<{ id: string }>).map((d) => d.id);
    expect(ids).not.toContain(created.updateId);
  });
});
