/**
 * Integration tests — Digital Service icon public media visibility (Phase 10 remediation Issue 1).
 *
 * Proves that `GET /public/media/:id/file` honours the SAME public-visibility contract for a Digital
 * Service icon as for documents/institution logos: a PUBLISHED + visible + non-archived + due service
 * serves its icon (200/302), while a draft / hidden / archived / future-scheduled service returns 403.
 *
 * GUARDED: skipped unless `RUN_INTEGRATION=1` with a reachable DATABASE_URL / REDIS_URL and all
 * migrations applied.
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
const created: { userId?: string; serviceIds: string[]; mediaIds: string[]; storageKeys: string[] } = {
  serviceIds: [],
  mediaIds: [],
  storageKeys: [],
};

// Minimal 1×1 PNG so the local storage driver streams real image bytes.
const PNG_BYTES = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
);

describe.skipIf(!RUN)('Digital Service icon — public media visibility (integration)', () => {
  let adminToken: string;

  async function makeIcon(suffix: string): Promise<string> {
    const storageKey = `it/ds-icon-${suffix}-${STAMP}.png`;
    await storage.put({ key: storageKey, body: PNG_BYTES, contentType: 'image/png' });
    created.storageKeys.push(storageKey);
    const m = await prisma.mediaAsset.create({
      data: {
        storageKey,
        url: `/api/v1/public/media/ds-icon-${suffix}-${STAMP}/file`,
        fileName: 'icon.png',
        mimeType: 'image/png',
        fileSizeBytes: BigInt(PNG_BYTES.byteLength),
        width: 1,
        height: 1,
      },
    });
    created.mediaIds.push(m.id);
    return m.id;
  }

  /** Create a digital service with the given icon + workflow flags; optionally publish/archive. */
  async function makeService(
    iconId: string,
    opts: { publicVisibility?: boolean; publishStartAt?: string; publish?: boolean; archive?: boolean },
  ): Promise<string> {
    const res = await request(app)
      .post('/api/v1/admin/digital-services')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title_en: `IT Service ${iconId.slice(0, 6)}`,
        external_url: 'https://erp.example.gov.in',
        icon_media_id: iconId,
        public_visibility: opts.publicVisibility ?? true,
        ...(opts.publishStartAt ? { publish_start_at: opts.publishStartAt } : {}),
      });
    const id = res.body.data.id as string;
    created.serviceIds.push(id);
    if (opts.publish) {
      await request(app)
        .post(`/api/v1/admin/digital-services/${id}/publish`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});
    }
    if (opts.archive) {
      await request(app)
        .post(`/api/v1/admin/digital-services/${id}/archive`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});
    }
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
    const email = `it-ds-admin-${STAMP}@sidhkofed.test`;
    const user = await prisma.user.upsert({
      where: { email },
      update: { passwordHash: await hashPassword(PASSWORD), isActive: true },
      create: { email, fullName: 'IT DS Admin', passwordHash: await hashPassword(PASSWORD), isActive: true },
    });
    created.userId = user.id;
    if (role) {
      await prisma.userRole.upsert({
        where: { userId_roleId: { userId: user.id, roleId: role.id } },
        update: {},
        create: { userId: user.id, roleId: role.id },
      });
    }

    const login = await request(app).post('/api/v1/auth/login').send({ email, password: PASSWORD });
    adminToken = login.body.data.access_token as string;
  });

  afterAll(async () => {
    if (!prisma) return;
    for (const id of created.serviceIds) {
      await prisma.mediaUsage.deleteMany({ where: { entityType: 'digital_service', entityId: id } }).catch(() => undefined);
      await prisma.digitalService.delete({ where: { id } }).catch(() => undefined);
    }
    for (const m of created.mediaIds) {
      await prisma.mediaUsage.deleteMany({ where: { mediaId: m } }).catch(() => undefined);
      await prisma.mediaAsset.delete({ where: { id: m } }).catch(() => undefined);
    }
    for (const key of created.storageKeys) await storage?.delete(key).catch(() => undefined);
    if (created.userId) {
      await prisma.userRole.deleteMany({ where: { userId: created.userId } }).catch(() => undefined);
      await prisma.auditLog.deleteMany({ where: { userId: created.userId } }).catch(() => undefined);
      await prisma.user.delete({ where: { id: created.userId } }).catch(() => undefined);
    }
    await prisma.$disconnect();
  });

  it('serves the icon (200/302) for a PUBLISHED, visible, due Digital Service', async () => {
    const icon = await makeIcon('published');
    await makeService(icon, { publish: true });
    const res = await request(app).get(`/api/v1/public/media/${icon}/file`).redirects(0);
    expect([200, 302]).toContain(res.status);
  });

  it('returns 403 for a DRAFT (never published) Digital Service icon', async () => {
    const icon = await makeIcon('draft');
    await makeService(icon, { publish: false });
    const res = await request(app).get(`/api/v1/public/media/${icon}/file`);
    expect(res.status).toBe(403);
  });

  it('returns 403 for an ARCHIVED Digital Service icon', async () => {
    const icon = await makeIcon('archived');
    await makeService(icon, { publish: true, archive: true });
    const res = await request(app).get(`/api/v1/public/media/${icon}/file`);
    expect(res.status).toBe(403);
  });

  it('returns 403 for a HIDDEN (public_visibility=false) published Digital Service icon', async () => {
    const icon = await makeIcon('hidden');
    await makeService(icon, { publish: true, publicVisibility: false });
    const res = await request(app).get(`/api/v1/public/media/${icon}/file`);
    expect(res.status).toBe(403);
  });

  it('returns 403 for a FUTURE-scheduled (published but not yet due) Digital Service icon', async () => {
    const icon = await makeIcon('future');
    const future = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString();
    await makeService(icon, { publish: true, publishStartAt: future });
    const res = await request(app).get(`/api/v1/public/media/${icon}/file`);
    expect(res.status).toBe(403);
  });
});
