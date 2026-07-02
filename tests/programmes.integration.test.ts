/**
 * Integration tests — programme CRUD with commodity + permitted-training-type junctions,
 * lifecycle, RBAC, and public APIs over HTTP against the real app, Prisma and Redis.
 *
 * GUARDED: skipped unless `RUN_INTEGRATION=1` with a reachable DATABASE_URL / REDIS_URL and the
 * events_programmes_institutions migration applied.
 *
 *   RUN_INTEGRATION=1 DATABASE_URL=... REDIS_URL=... npm run test:integration
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';

const RUN = process.env.RUN_INTEGRATION === '1';
const STAMP = Date.now();
const PASSWORD = 'Integration#Pass123';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let app: Express;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let prisma: any;
const created: { users: string[]; commodityId?: string; trainingTypeId?: string; programmeId?: string } = { users: [] };

async function login(email: string): Promise<string> {
  const res = await request(app).post('/api/v1/auth/login').send({ email, password: PASSWORD });
  return res.body.data.access_token as string;
}

describe.skipIf(!RUN)('programmes (integration)', () => {
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
      const email = `it-prog-${suffix}-${STAMP}@sidhkofed.test`;
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

    const commodity = await prisma.commodity.upsert({
      where: { slug: `it-lac-${STAMP}` },
      update: {},
      create: { nameEn: `IT Lac ${STAMP}`, slug: `it-lac-${STAMP}`, isActive: true },
    });
    created.commodityId = commodity.id;

    const tt = await prisma.trainingType.upsert({
      where: { slug: `it-skill-${STAMP}` },
      update: {},
      create: { nameEn: `IT Skill ${STAMP}`, slug: `it-skill-${STAMP}`, isActive: true },
    });
    created.trainingTypeId = tt.id;

    editorToken = await login(editorEmail);
    publisherToken = await login(publisherEmail);
  });

  afterAll(async () => {
    if (!prisma) return;
    if (created.programmeId) {
      await prisma.programmeCommodity.deleteMany({ where: { programmeSchemeId: created.programmeId } }).catch(() => undefined);
      await prisma.programmePermittedTrainingType.deleteMany({ where: { programmeSchemeId: created.programmeId } }).catch(() => undefined);
      await prisma.programmeScheme.delete({ where: { id: created.programmeId } }).catch(() => undefined);
    }
    if (created.commodityId) await prisma.commodity.delete({ where: { id: created.commodityId } }).catch(() => undefined);
    if (created.trainingTypeId) await prisma.trainingType.delete({ where: { id: created.trainingTypeId } }).catch(() => undefined);
    for (const id of created.users) {
      await prisma.userRole.deleteMany({ where: { userId: id } }).catch(() => undefined);
      await prisma.auditLog.deleteMany({ where: { userId: id } }).catch(() => undefined);
      await prisma.user.delete({ where: { id } }).catch(() => undefined);
    }
    await prisma.$disconnect();
  });

  it('rejects an end_date before start_date with 422', async () => {
    const res = await request(app)
      .post('/api/v1/admin/programmes')
      .set('Authorization', `Bearer ${editorToken}`)
      .send({ title_en: 'Bad dates', start_date: '2026-07-15', end_date: '2026-07-01' });
    expect(res.status).toBe(422);
  });

  it('lets a Content Editor create a draft programme with commodity + permitted training-type links', async () => {
    const res = await request(app)
      .post('/api/v1/admin/programmes')
      .set('Authorization', `Bearer ${editorToken}`)
      .send({
        title_en: `MFP Value Chain ${STAMP}`,
        short_code: `MFP-${STAMP}`,
        start_date: '2026-04-01',
        end_date: '2027-03-31',
        commodity_ids: [created.commodityId],
        permitted_training_type_ids: [created.trainingTypeId],
      });
    expect(res.status).toBe(201);
    expect(res.body.data.publication_state).toBe('draft');
    expect(res.body.data.commodities.map((c: { id: string }) => c.id)).toContain(created.commodityId);
    expect(res.body.data.permitted_training_types.map((t: { id: string }) => t.id)).toContain(created.trainingTypeId);
    created.programmeId = res.body.data.id;
  });

  it('forbids a Content Editor from publishing (RBAC 403)', async () => {
    const res = await request(app)
      .post(`/api/v1/admin/programmes/${created.programmeId}/publish`)
      .set('Authorization', `Bearer ${editorToken}`)
      .send({});
    expect(res.status).toBe(403);
  });

  it('lets a Publisher publish and exposes it publicly by slug', async () => {
    const pub = await request(app)
      .post(`/api/v1/admin/programmes/${created.programmeId}/publish`)
      .set('Authorization', `Bearer ${publisherToken}`)
      .send({});
    expect(pub.status).toBe(200);
    const slug = pub.body.data.slug as string;
    const res = await request(app).get(`/api/v1/public/programmes/${slug}`);
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(created.programmeId);
    expect(res.body.data).not.toHaveProperty('created_by');
  });

  it('filters the public programme list by commodity', async () => {
    const res = await request(app).get(`/api/v1/public/programmes?commodity=it-lac-${STAMP}`);
    expect(res.status).toBe(200);
    const ids = (res.body.data as Array<{ id: string }>).map((p) => p.id);
    expect(ids).toContain(created.programmeId);
  });

  // ── Issue 9: case-insensitive duplicate-name prevention (codex §4.2) ──────────
  it('rejects a duplicate programme name (case-insensitive) with 409', async () => {
    const res = await request(app)
      .post('/api/v1/admin/programmes')
      .set('Authorization', `Bearer ${editorToken}`)
      .send({ title_en: `mfp value chain ${STAMP}`.toUpperCase() });
    expect(res.status).toBe(409);
  });

  // ── Issue 6: Content Editors may not modify published content; Publishers may ──
  it('forbids a Content Editor from editing the now-published programme (403)', async () => {
    const res = await request(app)
      .patch(`/api/v1/admin/programmes/${created.programmeId}`)
      .set('Authorization', `Bearer ${editorToken}`)
      .send({ summary_en: 'editor edit attempt' });
    expect(res.status).toBe(403);
  });

  it('lets a Publisher edit the published programme (200)', async () => {
    const res = await request(app)
      .patch(`/api/v1/admin/programmes/${created.programmeId}`)
      .set('Authorization', `Bearer ${publisherToken}`)
      .send({ summary_en: 'publisher edit' });
    expect(res.status).toBe(200);
    expect(res.body.data.summary_en).toBe('publisher edit');
  });

  // ── Issue 8: unknown query parameters are rejected with 422 ──────────────────
  it('rejects an unknown query parameter with 422', async () => {
    const res = await request(app).get('/api/v1/public/programmes?bogus=1');
    expect(res.status).toBe(422);
  });
});
