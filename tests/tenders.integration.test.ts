/**
 * Integration tests — tender CRUD, lifecycle, RBAC, public visibility and the "expired tender stays
 * public until manually unpublished/archived" rule, over HTTP against the real app, Prisma and Redis.
 *
 * GUARDED: skipped unless `RUN_INTEGRATION=1` with a reachable DATABASE_URL / REDIS_URL and the
 * phase9 migration applied. Self-seeds disposable users + a tender type; cleans them up afterwards.
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
const created: { users: string[]; tenderTypeId?: string; tenderId?: string } = { users: [] };

async function login(email: string): Promise<string> {
  const res = await request(app).post('/api/v1/auth/login').send({ email, password: PASSWORD });
  return res.body.data.access_token as string;
}

describe.skipIf(!RUN)('tenders (integration)', () => {
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
      const email = `it-tender-${suffix}-${STAMP}@sidhkofed.test`;
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

    const type = await prisma.tenderType.upsert({
      where: { slug: `it-goods-${STAMP}` },
      update: {},
      create: { nameEn: `IT Goods ${STAMP}`, slug: `it-goods-${STAMP}`, isActive: true },
    });
    created.tenderTypeId = type.id;

    editorToken = await login(editorEmail);
    publisherToken = await login(publisherEmail);
  });

  afterAll(async () => {
    if (!prisma) return;
    if (created.tenderId) await prisma.tender.delete({ where: { id: created.tenderId } }).catch(() => undefined);
    await prisma.tender.deleteMany({ where: { tenderTypeId: created.tenderTypeId } }).catch(() => undefined);
    if (created.tenderTypeId) await prisma.tenderType.delete({ where: { id: created.tenderTypeId } }).catch(() => undefined);
    for (const id of created.users) {
      await prisma.userRole.deleteMany({ where: { userId: id } }).catch(() => undefined);
      await prisma.auditLog.deleteMany({ where: { userId: id } }).catch(() => undefined);
      await prisma.user.delete({ where: { id } }).catch(() => undefined);
    }
    await prisma.$disconnect();
  });

  it('lets a Content Editor create a draft tender (with an HTTPS GeM url)', async () => {
    const res = await request(app)
      .post('/api/v1/admin/tenders')
      .set('Authorization', `Bearer ${editorToken}`)
      .send({
        tender_type_id: created.tenderTypeId,
        title_en: `Supply of equipment ${STAMP}`,
        tender_number: `T/${STAMP}`,
        publish_date: '2026-01-10',
        submission_deadline: '2026-02-10T12:00:00.000Z',
        gem_url: 'https://gem.gov.in/tender/123',
        tender_status: 'open',
      });
    expect(res.status).toBe(201);
    expect(res.body.data.publication_state).toBe('draft');
    created.tenderId = res.body.data.id;
  });

  it('rejects a case-variant duplicate tender number with 409 (citext, case-insensitive)', async () => {
    // The first test created a tender with tender_number `T/${STAMP}`; a lowercase variant must collide.
    const res = await request(app)
      .post('/api/v1/admin/tenders')
      .set('Authorization', `Bearer ${editorToken}`)
      .send({ tender_type_id: created.tenderTypeId, title_en: `Dup ${STAMP}`, tender_number: `t/${STAMP}` });
    expect(res.status).toBe(409);
  });

  it('allows multiple tenders with no tender number (NULLs stay distinct)', async () => {
    const a = await request(app)
      .post('/api/v1/admin/tenders')
      .set('Authorization', `Bearer ${editorToken}`)
      .send({ tender_type_id: created.tenderTypeId, title_en: `No number A ${STAMP}` });
    const b = await request(app)
      .post('/api/v1/admin/tenders')
      .set('Authorization', `Bearer ${editorToken}`)
      .send({ tender_type_id: created.tenderTypeId, title_en: `No number B ${STAMP}` });
    expect(a.status).toBe(201);
    expect(b.status).toBe(201);
  });

  it('rejects a non-HTTPS gem_url with 422', async () => {
    const res = await request(app)
      .post('/api/v1/admin/tenders')
      .set('Authorization', `Bearer ${editorToken}`)
      .send({ tender_type_id: created.tenderTypeId, title_en: 'Bad', gem_url: 'http://gem.gov.in/x' });
    expect(res.status).toBe(422);
  });

  it('forbids a Content Editor from publishing (RBAC 403)', async () => {
    const res = await request(app)
      .post(`/api/v1/admin/tenders/${created.tenderId}/publish`)
      .set('Authorization', `Bearer ${editorToken}`)
      .send({});
    expect(res.status).toBe(403);
  });

  it('is hidden from the public list while a draft', async () => {
    const res = await request(app).get('/api/v1/public/tenders');
    const ids = (res.body.data as Array<{ id: string }>).map((d) => d.id);
    expect(ids).not.toContain(created.tenderId);
  });

  it('lets a Publisher publish, then exposes it publicly by slug (no created_by)', async () => {
    const pub = await request(app)
      .post(`/api/v1/admin/tenders/${created.tenderId}/publish`)
      .set('Authorization', `Bearer ${publisherToken}`)
      .send({});
    expect(pub.status).toBe(200);
    const slug = pub.body.data.slug as string;
    const res = await request(app).get(`/api/v1/public/tenders/${slug}`);
    expect(res.status).toBe(200);
    expect(res.body.data.gem_url).toContain('https://');
    expect(res.body.data).not.toHaveProperty('created_by');
  });

  it('keeps a past-deadline tender public (expiry is informational, never auto-unpublished)', async () => {
    // Move the deadline into the past; the tender must remain published & publicly listed.
    await request(app)
      .patch(`/api/v1/admin/tenders/${created.tenderId}`)
      .set('Authorization', `Bearer ${publisherToken}`)
      .send({ submission_deadline: '2020-01-01T00:00:00.000Z' });
    const res = await request(app).get('/api/v1/public/tenders');
    const ids = (res.body.data as Array<{ id: string }>).map((d) => d.id);
    expect(ids).toContain(created.tenderId);
  });

  it('rejects unknown list filters with 422 (admin + public)', async () => {
    const admin = await request(app).get('/api/v1/admin/tenders?bogus=1').set('Authorization', `Bearer ${publisherToken}`);
    expect(admin.status).toBe(422);
    expect((await request(app).get('/api/v1/public/tenders?bogus=1')).status).toBe(422);
  });

  it('archives and removes it from public listings', async () => {
    const arch = await request(app)
      .post(`/api/v1/admin/tenders/${created.tenderId}/archive`)
      .set('Authorization', `Bearer ${publisherToken}`)
      .send({});
    expect(arch.status).toBe(200);
    const pub = await request(app).get('/api/v1/public/tenders');
    const ids = (pub.body.data as Array<{ id: string }>).map((d) => d.id);
    expect(ids).not.toContain(created.tenderId);
  });
});
