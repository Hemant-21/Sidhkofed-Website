/**
 * Integration tests — public media delivery returns CONTROLLED errors, never a 500 leak
 * (round-2 Issue 2). Proves `GET /public/media/:id/file`:
 *   - 200 for a published, publicly-linked asset whose storage object exists,
 *   - 404 (controlled) when the DB row exists but the storage object is MISSING,
 *   - 403 for an asset not linked to any published public content.
 *
 * Fixtures create media through the REAL storage path (storage.put), never fabricating a row whose
 * backing object is absent — the missing-object case is produced explicitly by deleting the object.
 *
 * GUARDED: skipped unless `RUN_INTEGRATION=1` with a reachable DATABASE_URL / REDIS_URL.
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
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let storage: any;
const created: {
  userId?: string;
  typeId?: string;
  presentMediaId?: string;
  missingMediaId?: string;
  unlinkedMediaId?: string;
  docIds: string[];
  storageKeys: string[];
} = { docIds: [], storageKeys: [] };

const PDF_BYTES = Buffer.from('%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n');

describe.skipIf(!RUN)('public media missing-object handling (integration)', () => {
  let adminToken: string;

  async function makeMedia(suffix: string, writeObject = true): Promise<{ id: string; key: string }> {
    const storageKey = `it/missing-${suffix}-${STAMP}.pdf`;
    if (writeObject) {
      await storage.put({ key: storageKey, body: PDF_BYTES, contentType: 'application/pdf' });
      created.storageKeys.push(storageKey);
    }
    const m = await prisma.mediaAsset.create({
      data: {
        storageKey,
        url: `/api/v1/public/media/missing-${suffix}-${STAMP}/file`,
        fileName: 'doc.pdf',
        mimeType: 'application/pdf',
        fileSizeBytes: BigInt(PDF_BYTES.byteLength),
      },
    });
    return { id: m.id, key: storageKey };
  }

  async function publishDocument(fileAssetId: string): Promise<void> {
    const res = await request(app)
      .post('/api/v1/admin/documents')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title_en: `Missing-Obj Doc ${fileAssetId.slice(0, 6)}`,
        document_type_id: created.typeId,
        file_asset_id: fileAssetId,
        is_public: true,
      });
    const id = res.body.data.id as string;
    created.docIds.push(id);
    await request(app).post(`/api/v1/admin/documents/${id}/publish`).set('Authorization', `Bearer ${adminToken}`).send({});
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
    const email = `it-missing-admin-${STAMP}@sidhkofed.test`;
    const user = await prisma.user.upsert({
      where: { email },
      update: { passwordHash: await hashPassword(PASSWORD), isActive: true },
      create: { email, fullName: 'IT Missing Admin', passwordHash: await hashPassword(PASSWORD), isActive: true },
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
      where: { slug: `it-missing-type-${STAMP}` },
      update: {},
      create: { nameEn: `IT Missing Type ${STAMP}`, slug: `it-missing-type-${STAMP}`, isActive: true },
    });
    created.typeId = docType.id;

    const login = await request(app).post('/api/v1/auth/login').send({ email, password: PASSWORD });
    adminToken = login.body.data.access_token as string;

    // (a) present object + published → should serve 200.
    const present = await makeMedia('present');
    created.presentMediaId = present.id;
    await publishDocument(present.id);

    // (b) object written then DELETED out-of-band + published → row exists, object missing → 404.
    const missing = await makeMedia('missing');
    created.missingMediaId = missing.id;
    await publishDocument(missing.id);
    await storage.delete(missing.key); // simulate the object vanishing from the store

    // (c) object present but NOT linked to any public content → 403.
    const unlinked = await makeMedia('unlinked');
    created.unlinkedMediaId = unlinked.id;
  });

  afterAll(async () => {
    if (!prisma) return;
    for (const id of created.docIds) {
      await prisma.documentCommodity.deleteMany({ where: { documentId: id } }).catch(() => undefined);
      await prisma.document.delete({ where: { id } }).catch(() => undefined);
    }
    for (const m of [created.presentMediaId, created.missingMediaId, created.unlinkedMediaId]) {
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

  it('serves 200/302 for a published asset whose storage object exists', async () => {
    const res = await request(app).get(`/api/v1/public/media/${created.presentMediaId}/file`).redirects(0);
    expect([200, 302]).toContain(res.status);
  });

  it('returns a controlled 404 (not 500) when the storage object is missing', async () => {
    const res = await request(app).get(`/api/v1/public/media/${created.missingMediaId}/file`);
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('not_found');
    // No filesystem detail or stack trace leaks in the message.
    expect(String(res.body.error.message)).not.toMatch(/ENOENT|NoSuchKey|\/|\\\\/);
  });

  it('returns 403 for an asset not linked to any published public content', async () => {
    const res = await request(app).get(`/api/v1/public/media/${created.unlinkedMediaId}/file`);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('permission_denied');
  });
});
