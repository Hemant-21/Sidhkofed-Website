/**
 * Integration tests — public media visibility honours scheduled publishing (remediation).
 *
 * GUARDED: skipped unless `RUN_INTEGRATION=1` with a reachable DATABASE_URL / REDIS_URL and all
 * migrations applied. Proves a document scheduled for the FUTURE does not leak its file through
 * `GET /public/media/:id/file` (403), and that a due/published document does serve (200).
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
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let storage: any;
const created: {
  userId?: string;
  typeId?: string;
  scheduledMediaId?: string;
  dueMediaId?: string;
  docIds: string[];
  storageKeys: string[];
} = { docIds: [], storageKeys: [] };

// Minimal, valid PDF bytes so the local storage driver streams a real file (not ENOENT).
const PDF_BYTES = Buffer.from('%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n');

describe.skipIf(!RUN)('public media visibility — scheduled publishing (integration)', () => {
  let adminToken: string;

  /**
   * Create a media asset AND write its backing file to storage, so a publicly-served asset has
   * real bytes to stream (local driver) — otherwise `GET /public/media/:id/file` 500s on ENOENT.
   */
  async function makeMedia(suffix: string): Promise<string> {
    const storageKey = `it/vis-${suffix}-${STAMP}.pdf`;
    await storage.put({ key: storageKey, body: PDF_BYTES, contentType: 'application/pdf' });
    created.storageKeys.push(storageKey);
    const m = await prisma.mediaAsset.create({
      data: {
        storageKey,
        url: `/api/v1/public/media/vis-${suffix}-${STAMP}/file`,
        fileName: 'doc.pdf',
        mimeType: 'application/pdf',
        fileSizeBytes: BigInt(PDF_BYTES.byteLength),
      },
    });
    return m.id;
  }

  async function createPublishedDocument(fileAssetId: string, publishStartAt: string | null): Promise<string> {
    const res = await request(app)
      .post('/api/v1/admin/documents')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title_en: `Visibility Doc ${fileAssetId.slice(0, 6)}`,
        document_type_id: created.typeId,
        file_asset_id: fileAssetId,
        is_public: true,
        ...(publishStartAt ? { publish_start_at: publishStartAt } : {}),
      });
    const id = res.body.data.id as string;
    created.docIds.push(id);
    await request(app).post(`/api/v1/admin/documents/${id}/publish`).set('Authorization', `Bearer ${adminToken}`).send({});
    return id;
  }

  beforeAll(async () => {
    const { createApp } = await import('@/app');
    const db = await import('@/db/prisma');
    const { connectRedis } = await import('@/services/redis');
    const { hashPassword } = await import('@/modules/auth/password');
    const { ROLE_KEYS } = await import('@/modules/auth/auth.permissions');
    const storageMod = await import('@/services/storage');

    app = createApp();
    prisma = db.prisma;
    storage = storageMod.storage;
    await db.connectDatabase();
    await connectRedis();

    const role = await prisma.role.findUnique({ where: { key: ROLE_KEYS.superAdmin } });
    const email = `it-vis-admin-${STAMP}@sidhkofed.test`;
    const user = await prisma.user.upsert({
      where: { email },
      update: { passwordHash: await hashPassword(PASSWORD), isActive: true },
      create: { email, fullName: 'IT Vis Admin', passwordHash: await hashPassword(PASSWORD), isActive: true },
    });
    created.userId = user.id;
    if (role) {
      await prisma.userRole.upsert({
        where: { userId_roleId: { userId: user.id, roleId: role.id } },
        update: {},
        create: { userId: user.id, roleId: role.id },
      });
    }
    const docType = await prisma.documentType.upsert({
      where: { slug: `it-vis-type-${STAMP}` },
      update: {},
      create: { nameEn: `IT Vis Type ${STAMP}`, slug: `it-vis-type-${STAMP}`, isActive: true },
    });
    created.typeId = docType.id;

    const login = await request(app).post('/api/v1/auth/login').send({ email, password: PASSWORD });
    adminToken = login.body.data.access_token as string;

    created.scheduledMediaId = await makeMedia('scheduled');
    created.dueMediaId = await makeMedia('due');
  });

  afterAll(async () => {
    if (!prisma) return;
    for (const id of created.docIds) {
      await prisma.documentCommodity.deleteMany({ where: { documentId: id } }).catch(() => undefined);
      await prisma.document.delete({ where: { id } }).catch(() => undefined);
    }
    for (const m of [created.scheduledMediaId, created.dueMediaId]) {
      if (!m) continue;
      await prisma.mediaUsage.deleteMany({ where: { mediaId: m } }).catch(() => undefined);
      await prisma.mediaAsset.delete({ where: { id: m } }).catch(() => undefined);
    }
    for (const key of created.storageKeys) {
      await storage?.delete(key).catch(() => undefined);
    }
    if (created.typeId) await prisma.documentType.delete({ where: { id: created.typeId } }).catch(() => undefined);
    if (created.userId) {
      await prisma.userRole.deleteMany({ where: { userId: created.userId } }).catch(() => undefined);
      await prisma.auditLog.deleteMany({ where: { userId: created.userId } }).catch(() => undefined);
      await prisma.user.delete({ where: { id: created.userId } }).catch(() => undefined);
    }
    await prisma.$disconnect();
  });

  it('returns 403 for media of a FUTURE-scheduled (published but not yet due) document', async () => {
    const future = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString();
    await createPublishedDocument(created.scheduledMediaId as string, future);
    const res = await request(app).get(`/api/v1/public/media/${created.scheduledMediaId}/file`);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('permission_denied');
  });

  it('serves media (200/302) for a published, due document', async () => {
    await createPublishedDocument(created.dueMediaId as string, null);
    const res = await request(app).get(`/api/v1/public/media/${created.dueMediaId}/file`).redirects(0);
    expect([200, 302]).toContain(res.status);
  });
});
