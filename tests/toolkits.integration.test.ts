/**
 * Integration tests — toolkit lifecycle, module-specific RBAC, the content-editor published-edit
 * restriction, and the public-visibility rule that a published toolkit must NOT expose a
 * draft/unpublished linked programme (Issue 7). Runs over the real app, Prisma and Redis.
 *
 * GUARDED: skipped unless `RUN_INTEGRATION=1` with a reachable DATABASE_URL / REDIS_URL and the
 * toolkits migration applied.
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
const created: { users: string[]; commodityId?: string; programmeId?: string; toolkitId?: string } = { users: [] };

async function login(email: string): Promise<string> {
  const res = await request(app).post('/api/v1/auth/login').send({ email, password: PASSWORD });
  return res.body.data.access_token as string;
}

describe.skipIf(!RUN)('toolkits (integration)', () => {
  let editorToken: string;
  let publisherToken: string;
  let toolkitSlug: string;

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
      const email = `it-kit-${suffix}-${STAMP}@sidhkofed.test`;
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

    editorToken = await login(await userWithRole('editor', ROLE_KEYS.contentEditor));
    publisherToken = await login(await userWithRole('publisher', ROLE_KEYS.publisher));

    const commodity = await prisma.commodity.upsert({
      where: { slug: `it-kitlac-${STAMP}` },
      update: {},
      create: { nameEn: `IT KitLac ${STAMP}`, slug: `it-kitlac-${STAMP}`, isActive: true },
    });
    created.commodityId = commodity.id;

    // A DRAFT programme — must never surface through the published toolkit until itself published.
    const programme = await prisma.programmeScheme.create({
      data: {
        titleEn: `IT Kit Programme ${STAMP}`,
        slug: `it-kit-programme-${STAMP}`,
        publicationState: 'draft',
        publicVisibility: true,
      },
    });
    created.programmeId = programme.id;
  });

  afterAll(async () => {
    if (!prisma) return;
    if (created.toolkitId) await prisma.toolkit.delete({ where: { id: created.toolkitId } }).catch(() => undefined);
    if (created.programmeId) await prisma.programmeScheme.delete({ where: { id: created.programmeId } }).catch(() => undefined);
    if (created.commodityId) await prisma.commodity.delete({ where: { id: created.commodityId } }).catch(() => undefined);
    for (const id of created.users) {
      await prisma.userRole.deleteMany({ where: { userId: id } }).catch(() => undefined);
      await prisma.auditLog.deleteMany({ where: { userId: id } }).catch(() => undefined);
      await prisma.user.delete({ where: { id } }).catch(() => undefined);
    }
    await prisma.$disconnect();
  });

  it('lets a Content Editor create a draft toolkit linked to a (draft) programme + commodity', async () => {
    const res = await request(app)
      .post('/api/v1/admin/toolkits')
      .set('Authorization', `Bearer ${editorToken}`)
      .send({ title_en: `IT Toolkit ${STAMP}`, programme_scheme_id: created.programmeId, commodity_id: created.commodityId });
    expect(res.status).toBe(201);
    expect(res.body.data.publication_state).toBe('draft');
    created.toolkitId = res.body.data.id;
    toolkitSlug = res.body.data.slug;
  });

  it('forbids a Content Editor from publishing a toolkit (module RBAC 403)', async () => {
    const res = await request(app)
      .post(`/api/v1/admin/toolkits/${created.toolkitId}/publish`)
      .set('Authorization', `Bearer ${editorToken}`)
      .send({});
    expect(res.status).toBe(403);
  });

  it('lets a Publisher publish the toolkit', async () => {
    const res = await request(app)
      .post(`/api/v1/admin/toolkits/${created.toolkitId}/publish`)
      .set('Authorization', `Bearer ${publisherToken}`)
      .send({});
    expect(res.status).toBe(200);
  });

  it('public toolkit detail HIDES the still-draft linked programme (Issue 7)', async () => {
    const res = await request(app).get(`/api/v1/public/toolkits/${toolkitSlug}`);
    expect(res.status).toBe(200);
    expect(res.body.data.programme).toBeNull();
  });

  it('forbids a Content Editor from editing the published toolkit (Issue 6 → 403)', async () => {
    const res = await request(app)
      .patch(`/api/v1/admin/toolkits/${created.toolkitId}`)
      .set('Authorization', `Bearer ${editorToken}`)
      .send({ summary_en: 'editor edit attempt' });
    expect(res.status).toBe(403);
  });

  it('exposes the linked programme publicly once the programme itself is published', async () => {
    await prisma.programmeScheme.update({
      where: { id: created.programmeId },
      data: { publicationState: 'published', publishedAt: new Date() },
    });
    // Bust the public toolkit cache by re-publishing (lifecycle invalidates the cache).
    await request(app)
      .post(`/api/v1/admin/toolkits/${created.toolkitId}/unpublish`)
      .set('Authorization', `Bearer ${publisherToken}`)
      .send({});
    await request(app)
      .post(`/api/v1/admin/toolkits/${created.toolkitId}/publish`)
      .set('Authorization', `Bearer ${publisherToken}`)
      .send({});
    const res = await request(app).get(`/api/v1/public/toolkits/${toolkitSlug}`);
    expect(res.status).toBe(200);
    expect(res.body.data.programme).toMatchObject({ id: created.programmeId });
  });

  it('rejects an unknown query parameter on the public toolkit list with 422 (Issue 8)', async () => {
    const res = await request(app).get('/api/v1/public/toolkits?bogus=1');
    expect(res.status).toBe(422);
  });
});
