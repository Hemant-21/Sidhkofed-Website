/**
 * Integration tests — document CRUD, lifecycle, RBAC, and public APIs over HTTP against the
 * real app, Prisma and Redis (TASK 19: Integration + RBAC + API tests).
 *
 * GUARDED: skipped unless `RUN_INTEGRATION=1` with a reachable DATABASE_URL / REDIS_URL and the
 * documents migration applied. Self-seeds disposable users (Super Admin, Content Editor,
 * Publisher), a document type, and a document-like media asset; cleans them up afterwards.
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
const created: { users: string[]; documentTypeId?: string; mediaId?: string; documentId?: string } = { users: [] };

async function login(email: string): Promise<string> {
  const res = await request(app).post('/api/v1/auth/login').send({ email, password: PASSWORD });
  return res.body.data.access_token as string;
}

describe.skipIf(!RUN)('documents (integration)', () => {
  let adminToken: string;
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
      const email = `it-doc-${suffix}-${STAMP}@sidhkofed.test`;
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

    const adminEmail = await userWithRole('admin', ROLE_KEYS.superAdmin);
    const editorEmail = await userWithRole('editor', ROLE_KEYS.contentEditor);
    const publisherEmail = await userWithRole('publisher', ROLE_KEYS.publisher);

    const docType = await prisma.documentType.upsert({
      where: { slug: `it-report-${STAMP}` },
      update: {},
      create: { nameEn: `IT Report ${STAMP}`, slug: `it-report-${STAMP}`, isActive: true },
    });
    created.documentTypeId = docType.id;

    const media = await prisma.mediaAsset.create({
      data: {
        storageKey: `it/doc-${STAMP}.pdf`,
        url: `/api/v1/public/media/it-${STAMP}/file`,
        fileName: 'report.pdf',
        mimeType: 'application/pdf',
        fileSizeBytes: BigInt(1024),
      },
    });
    created.mediaId = media.id;

    adminToken = await login(adminEmail);
    editorToken = await login(editorEmail);
    publisherToken = await login(publisherEmail);
  });

  afterAll(async () => {
    if (!prisma) return;
    if (created.documentId) {
      await prisma.documentCommodity.deleteMany({ where: { documentId: created.documentId } }).catch(() => undefined);
      await prisma.document.delete({ where: { id: created.documentId } }).catch(() => undefined);
    }
    if (created.mediaId) await prisma.mediaUsage.deleteMany({ where: { mediaId: created.mediaId } }).catch(() => undefined);
    if (created.mediaId) await prisma.mediaAsset.delete({ where: { id: created.mediaId } }).catch(() => undefined);
    if (created.documentTypeId) await prisma.documentType.delete({ where: { id: created.documentTypeId } }).catch(() => undefined);
    for (const id of created.users) {
      await prisma.userRole.deleteMany({ where: { userId: id } }).catch(() => undefined);
      await prisma.auditLog.deleteMany({ where: { userId: id } }).catch(() => undefined);
      await prisma.user.delete({ where: { id } }).catch(() => undefined);
    }
    await prisma.$disconnect();
  });

  it('lets a Content Editor create a draft document and registers media usage', async () => {
    const res = await request(app)
      .post('/api/v1/admin/documents')
      .set('Authorization', `Bearer ${editorToken}`)
      .send({
        title_en: `Annual Report ${STAMP}`,
        document_type_id: created.documentTypeId,
        file_asset_id: created.mediaId,
        publication_date: '2026-05-01',
        is_public: true,
      });
    expect(res.status).toBe(201);
    expect(res.body.data.publication_state).toBe('draft');
    expect(res.body.data.slug).toBeTruthy();
    created.documentId = res.body.data.id;

    const usages = await prisma.mediaUsage.count({ where: { mediaId: created.mediaId, entityType: 'document' } });
    expect(usages).toBe(1);
  });

  it('forbids a Content Editor from publishing (RBAC 403)', async () => {
    const res = await request(app)
      .post(`/api/v1/admin/documents/${created.documentId}/publish`)
      .set('Authorization', `Bearer ${editorToken}`)
      .send({});
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('permission_denied');
  });

  it('is hidden from the public list while still a draft', async () => {
    const res = await request(app).get('/api/v1/public/documents');
    const ids = (res.body.data as Array<{ id: string }>).map((d) => d.id);
    expect(ids).not.toContain(created.documentId);
  });

  it('lets a Publisher publish the document', async () => {
    const res = await request(app)
      .post(`/api/v1/admin/documents/${created.documentId}/publish`)
      .set('Authorization', `Bearer ${publisherToken}`)
      .send({});
    expect(res.status).toBe(200);
    expect(res.body.data.publication_state).toBe('published');
  });

  it('exposes the published document publicly by slug (no auth)', async () => {
    const detail = await request(app).get(`/api/v1/admin/documents/${created.documentId}`).set('Authorization', `Bearer ${adminToken}`);
    const slug = detail.body.data.slug as string;
    const res = await request(app).get(`/api/v1/public/documents/${slug}`);
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(created.documentId);
    expect(res.body.data).not.toHaveProperty('created_by');
  });

  it('requires authentication for the admin list', async () => {
    const res = await request(app).get('/api/v1/admin/documents');
    expect(res.status).toBe(401);
  });

  it('archives the document and removes it from public listings', async () => {
    const arch = await request(app)
      .post(`/api/v1/admin/documents/${created.documentId}/archive`)
      .set('Authorization', `Bearer ${publisherToken}`)
      .send({});
    expect(arch.status).toBe(200);
    const pub = await request(app).get('/api/v1/public/documents');
    const ids = (pub.body.data as Array<{ id: string }>).map((d) => d.id);
    expect(ids).not.toContain(created.documentId);
  });
});
