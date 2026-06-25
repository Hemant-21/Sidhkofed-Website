/**
 * Integration tests — institution CRUD, lifecycle, RBAC, logo media-usage, and public APIs over
 * HTTP against the real app, Prisma and Redis.
 *
 * GUARDED: skipped unless `RUN_INTEGRATION=1` with a reachable DATABASE_URL / REDIS_URL and the
 * events_programmes_institutions migration applied. Self-seeds disposable users + an institution
 * type + an image media asset; cleans them up afterwards.
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
const created: { users: string[]; institutionTypeId?: string; logoId?: string; institutionId?: string } = { users: [] };

async function login(email: string): Promise<string> {
  const res = await request(app).post('/api/v1/auth/login').send({ email, password: PASSWORD });
  return res.body.data.access_token as string;
}

describe.skipIf(!RUN)('institutions (integration)', () => {
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
      const email = `it-inst-${suffix}-${STAMP}@sidhkofed.test`;
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

    const type = await prisma.institutionType.upsert({
      where: { slug: `it-partner-${STAMP}` },
      update: {},
      create: { nameEn: `IT Partner ${STAMP}`, slug: `it-partner-${STAMP}`, isActive: true },
    });
    created.institutionTypeId = type.id;

    const logo = await prisma.mediaAsset.create({
      data: {
        storageKey: `it/logo-${STAMP}.png`,
        url: `/api/v1/public/media/it-logo-${STAMP}/file`,
        fileName: 'logo.png',
        mimeType: 'image/png',
        fileSizeBytes: BigInt(2048),
        width: 256,
        height: 256,
      },
    });
    created.logoId = logo.id;

    editorToken = await login(editorEmail);
    publisherToken = await login(publisherEmail);
  });

  afterAll(async () => {
    if (!prisma) return;
    if (created.institutionId) await prisma.institution.delete({ where: { id: created.institutionId } }).catch(() => undefined);
    if (created.logoId) await prisma.mediaUsage.deleteMany({ where: { mediaId: created.logoId } }).catch(() => undefined);
    if (created.logoId) await prisma.mediaAsset.delete({ where: { id: created.logoId } }).catch(() => undefined);
    if (created.institutionTypeId) await prisma.institutionType.delete({ where: { id: created.institutionTypeId } }).catch(() => undefined);
    for (const id of created.users) {
      await prisma.userRole.deleteMany({ where: { userId: id } }).catch(() => undefined);
      await prisma.auditLog.deleteMany({ where: { userId: id } }).catch(() => undefined);
      await prisma.user.delete({ where: { id } }).catch(() => undefined);
    }
    await prisma.$disconnect();
  });

  it('lets a Content Editor create a draft institution and registers logo media usage', async () => {
    const res = await request(app)
      .post('/api/v1/admin/institutions')
      .set('Authorization', `Bearer ${editorToken}`)
      .send({
        institution_type_id: created.institutionTypeId,
        name_en: `JSLPS ${STAMP}`,
        website_url: 'https://example.org',
        logo_media_id: created.logoId,
        contact_email: 'partner@example.org',
      });
    expect(res.status).toBe(201);
    expect(res.body.data.publication_state).toBe('draft');
    created.institutionId = res.body.data.id;

    const usages = await prisma.mediaUsage.count({ where: { mediaId: created.logoId, entityType: 'institution' } });
    expect(usages).toBe(1);
  });

  it('rejects a non-http website url with 422', async () => {
    const res = await request(app)
      .post('/api/v1/admin/institutions')
      .set('Authorization', `Bearer ${editorToken}`)
      .send({ institution_type_id: created.institutionTypeId, name_en: 'Bad', website_url: 'ftp://nope' });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('validation_error');
  });

  it('forbids a Content Editor from publishing (RBAC 403)', async () => {
    const res = await request(app)
      .post(`/api/v1/admin/institutions/${created.institutionId}/publish`)
      .set('Authorization', `Bearer ${editorToken}`)
      .send({});
    expect(res.status).toBe(403);
  });

  it('is hidden from the public list while a draft', async () => {
    const res = await request(app).get('/api/v1/public/institutions');
    const ids = (res.body.data as Array<{ id: string }>).map((d) => d.id);
    expect(ids).not.toContain(created.institutionId);
  });

  it('lets a Publisher publish, then exposes it publicly by slug (no created_by)', async () => {
    const pub = await request(app)
      .post(`/api/v1/admin/institutions/${created.institutionId}/publish`)
      .set('Authorization', `Bearer ${publisherToken}`)
      .send({});
    expect(pub.status).toBe(200);
    expect(pub.body.data.publication_state).toBe('published');

    const slug = pub.body.data.slug as string;
    const res = await request(app).get(`/api/v1/public/institutions/${slug}`);
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(created.institutionId);
    expect(res.body.data).not.toHaveProperty('created_by');
  });

  it('requires authentication for the admin list', async () => {
    const res = await request(app).get('/api/v1/admin/institutions');
    expect(res.status).toBe(401);
  });

  // ── Issue 1 — published-institution logo is downloadable via the public media endpoint ──
  it('serves the logo of a PUBLISHED institution and 403s for draft/archived/future ones', async () => {
    // The institution created above is published at this point in the flow.
    const fileUrl = `/api/v1/public/media/${created.logoId}/file`;
    const published = await request(app).get(fileUrl);
    expect(published.status).toBe(200);

    // Draft: unpublish hides the logo again.
    await request(app)
      .post(`/api/v1/admin/institutions/${created.institutionId}/unpublish`)
      .set('Authorization', `Bearer ${publisherToken}`)
      .send({});
    expect((await request(app).get(fileUrl)).status).toBe(403);

    // Future-scheduled: published but publish_start_at in the future → still hidden.
    await request(app)
      .post(`/api/v1/admin/institutions/${created.institutionId}/publish`)
      .set('Authorization', `Bearer ${publisherToken}`)
      .send({});
    await request(app)
      .patch(`/api/v1/admin/institutions/${created.institutionId}`)
      .set('Authorization', `Bearer ${publisherToken}`)
      .send({ publish_start_at: new Date(Date.now() + 86_400_000).toISOString() });
    expect((await request(app).get(fileUrl)).status).toBe(403);

    // Clear the schedule → visible again; then archive → hidden.
    await request(app)
      .patch(`/api/v1/admin/institutions/${created.institutionId}`)
      .set('Authorization', `Bearer ${publisherToken}`)
      .send({ publish_start_at: null });
    expect((await request(app).get(fileUrl)).status).toBe(200);

    await request(app)
      .post(`/api/v1/admin/institutions/${created.institutionId}/archive`)
      .set('Authorization', `Bearer ${publisherToken}`)
      .send({});
    expect((await request(app).get(fileUrl)).status).toBe(403);

    // Restore + republish so later assertions/cleanup see a published record.
    await request(app)
      .post(`/api/v1/admin/institutions/${created.institutionId}/restore`)
      .set('Authorization', `Bearer ${publisherToken}`)
      .send({});
    await request(app)
      .post(`/api/v1/admin/institutions/${created.institutionId}/publish`)
      .set('Authorization', `Bearer ${publisherToken}`)
      .send({});
  });

  // ── Issue 3 — Content Editor may edit drafts only; published requires a Publisher ──
  it('lets a Content Editor PATCH a draft but rejects PATCH of a published institution (403)', async () => {
    const draft = await request(app)
      .post('/api/v1/admin/institutions')
      .set('Authorization', `Bearer ${editorToken}`)
      .send({ institution_type_id: created.institutionTypeId, name_en: `RBAC Draft ${STAMP}` });
    expect(draft.status).toBe(201);
    const draftId = draft.body.data.id as string;

    const editDraft = await request(app)
      .patch(`/api/v1/admin/institutions/${draftId}`)
      .set('Authorization', `Bearer ${editorToken}`)
      .send({ name_hi: 'मसौदा' });
    expect(editDraft.status).toBe(200);

    await request(app)
      .post(`/api/v1/admin/institutions/${draftId}/publish`)
      .set('Authorization', `Bearer ${publisherToken}`)
      .send({});

    const editorOnPublished = await request(app)
      .patch(`/api/v1/admin/institutions/${draftId}`)
      .set('Authorization', `Bearer ${editorToken}`)
      .send({ name_hi: 'प्रकाशित' });
    expect(editorOnPublished.status).toBe(403);

    const publisherOnPublished = await request(app)
      .patch(`/api/v1/admin/institutions/${draftId}`)
      .set('Authorization', `Bearer ${publisherToken}`)
      .send({ name_hi: 'प्रकाशित' });
    expect(publisherOnPublished.status).toBe(200);

    await prisma.institution.delete({ where: { id: draftId } }).catch(() => undefined);
  });

  // ── Issue 4 — duplicate institution names are rejected (case-insensitive, trimmed) ──
  it('rejects duplicate institution names on create and update with 409', async () => {
    const name = `Dup Inst ${STAMP}`;
    const first = await request(app)
      .post('/api/v1/admin/institutions')
      .set('Authorization', `Bearer ${editorToken}`)
      .send({ institution_type_id: created.institutionTypeId, name_en: name });
    expect(first.status).toBe(201);
    const firstId = first.body.data.id as string;

    // Exact + different case + surrounding whitespace all collide → 409.
    for (const candidate of [name, name.toUpperCase(), `   ${name}   `]) {
      const dup = await request(app)
        .post('/api/v1/admin/institutions')
        .set('Authorization', `Bearer ${editorToken}`)
        .send({ institution_type_id: created.institutionTypeId, name_en: candidate });
      expect(dup.status).toBe(409);
    }

    // A second institution cannot be renamed onto the existing name.
    const second = await request(app)
      .post('/api/v1/admin/institutions')
      .set('Authorization', `Bearer ${editorToken}`)
      .send({ institution_type_id: created.institutionTypeId, name_en: `Other Inst ${STAMP}` });
    const secondId = second.body.data.id as string;
    const rename = await request(app)
      .patch(`/api/v1/admin/institutions/${secondId}`)
      .set('Authorization', `Bearer ${editorToken}`)
      .send({ name_en: name.toLowerCase() });
    expect(rename.status).toBe(409);

    await prisma.institution.delete({ where: { id: firstId } }).catch(() => undefined);
    await prisma.institution.delete({ where: { id: secondId } }).catch(() => undefined);
  });

  // ── Issue 5 — unknown query filters are rejected with 422 ──
  it('rejects unknown list filters with 422 on both admin and public surfaces', async () => {
    const admin = await request(app)
      .get('/api/v1/admin/institutions?bogus=1')
      .set('Authorization', `Bearer ${publisherToken}`);
    expect(admin.status).toBe(422);

    const pub = await request(app).get('/api/v1/public/institutions?bogus=1');
    expect(pub.status).toBe(422);

    const valid = await request(app).get('/api/v1/public/institutions?show_on_homepage=true');
    expect(valid.status).toBe(200);
  });

  it('archives and removes it from public listings', async () => {
    const arch = await request(app)
      .post(`/api/v1/admin/institutions/${created.institutionId}/archive`)
      .set('Authorization', `Bearer ${publisherToken}`)
      .send({});
    expect(arch.status).toBe(200);
    const pub = await request(app).get('/api/v1/public/institutions');
    const ids = (pub.body.data as Array<{ id: string }>).map((d) => d.id);
    expect(ids).not.toContain(created.institutionId);
  });
});
