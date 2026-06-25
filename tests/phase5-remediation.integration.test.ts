/**
 * Integration tests — Phase 5 remediation, over the real app + Prisma + Redis (HTTP).
 *
 * Proves, end-to-end:
 *   Issue 1  visibility propagation — a future-scheduled / unpublished linked Document, Gallery,
 *            or News is NOT exposed on the public event detail (while published ones are).
 *   Issue 2  public media consistency — an Event cover serves publicly; a future-scheduled News
 *            cover 403s (never an emitted URL that later 403s).
 *   Issue 3  duplicate-news prevention — a second publish-as-news returns 409.
 *   Issue 4  workflow state machine — invalid lifecycle transitions return 409.
 *   Issue 5  completion / cancellation rules — completing a cancelled event (and cancelling a
 *            completed one) returns 409.
 *
 * GUARDED: skipped unless `RUN_INTEGRATION=1` with a reachable DATABASE_URL / REDIS_URL and all
 * migrations applied (incl. 20260625160000_phase5_remediation).
 *
 *   RUN_INTEGRATION=1 DATABASE_URL=... REDIS_URL=... npm run test:integration
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';

const RUN = process.env.RUN_INTEGRATION === '1';
const STAMP = Date.now();
const PASSWORD = 'Integration#Pass123';
const FUTURE = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let app: Express;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let prisma: any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let storage: any;

const created: {
  users: string[];
  eventTypeId?: string;
  docTypeId?: string;
  storageKeys: string[];
  mediaIds: string[];
  docIds: string[];
  galleryIds: string[];
  eventIds: string[];
  newsIds: string[];
} = { users: [], storageKeys: [], mediaIds: [], docIds: [], galleryIds: [], eventIds: [], newsIds: [] };

const PDF_BYTES = Buffer.from('%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n');
const PNG_BYTES = Buffer.from('89504e470d0a1a0a0000000d49484452', 'hex');

async function login(email: string): Promise<string> {
  const res = await request(app).post('/api/v1/auth/login').send({ email, password: PASSWORD });
  return res.body.data.access_token as string;
}

describe.skipIf(!RUN)('phase 5 remediation (integration)', () => {
  let token: string;
  let pubDocId: string;
  let futureDocId: string;
  let pubGalleryId: string;
  let futureGalleryId: string;
  let eventCoverMediaId: string;

  async function makeMedia(suffix: string, bytes: Buffer, mime: string): Promise<string> {
    const ext = mime === 'application/pdf' ? 'pdf' : 'png';
    const storageKey = `it/p5-${suffix}-${STAMP}.${ext}`;
    await storage.put({ key: storageKey, body: bytes, contentType: mime });
    created.storageKeys.push(storageKey);
    const m = await prisma.mediaAsset.create({
      data: {
        storageKey,
        url: `/api/v1/public/media/p5-${suffix}-${STAMP}/file`,
        fileName: `f.${ext}`,
        mimeType: mime,
        fileSizeBytes: BigInt(bytes.byteLength),
      },
    });
    created.mediaIds.push(m.id);
    return m.id;
  }

  /** Create + publish a document via the admin API, with an optional future publish window. */
  async function makePublishedDocument(suffix: string, publishStartAt: string | null): Promise<string> {
    const fileAssetId = await makeMedia(`doc-${suffix}`, PDF_BYTES, 'application/pdf');
    const res = await request(app)
      .post('/api/v1/admin/documents')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title_en: `P5 Doc ${suffix} ${STAMP}`,
        document_type_id: created.docTypeId,
        file_asset_id: fileAssetId,
        is_public: true,
        ...(publishStartAt ? { publish_start_at: publishStartAt } : {}),
      });
    const id = res.body.data.id as string;
    created.docIds.push(id);
    await request(app).post(`/api/v1/admin/documents/${id}/publish`).set('Authorization', `Bearer ${token}`).send({});
    return id;
  }

  /** Create a published gallery directly (no public gallery endpoint); optional future window. */
  async function makePublishedGallery(suffix: string, publishStartAt: string | null): Promise<string> {
    const g = await prisma.gallery.create({
      data: {
        titleEn: `P5 Gallery ${suffix} ${STAMP}`,
        slug: `p5-gallery-${suffix}-${STAMP}`,
        publicationState: 'published',
        publicVisibility: true,
        publishedAt: new Date(),
        publishStartAt: publishStartAt ? new Date(publishStartAt) : null,
      },
    });
    created.galleryIds.push(g.id);
    return g.id;
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

    const role = await prisma.role.findUnique({ where: { key: ROLE_KEYS.publisher } });
    const email = `it-p5-${STAMP}@sidhkofed.test`;
    const user = await prisma.user.upsert({
      where: { email },
      update: { passwordHash: await hashPassword(PASSWORD), isActive: true },
      create: { email, fullName: 'IT P5', passwordHash: await hashPassword(PASSWORD), isActive: true },
    });
    created.users.push(user.id);
    if (role) {
      await prisma.userRole.upsert({
        where: { userId_roleId: { userId: user.id, roleId: role.id } },
        update: {},
        create: { userId: user.id, roleId: role.id },
      });
    }
    token = await login(email);

    const eventType = await prisma.eventType.upsert({
      where: { slug: `it-p5-type-${STAMP}` },
      update: {},
      create: { nameEn: `IT P5 Type ${STAMP}`, slug: `it-p5-type-${STAMP}`, isActive: true },
    });
    created.eventTypeId = eventType.id;

    const docType = await prisma.documentType.upsert({
      where: { slug: `it-p5-doctype-${STAMP}` },
      update: {},
      create: { nameEn: `IT P5 DocType ${STAMP}`, slug: `it-p5-doctype-${STAMP}`, isActive: true },
    });
    created.docTypeId = docType.id;

    pubDocId = await makePublishedDocument('pub', null);
    futureDocId = await makePublishedDocument('future', FUTURE);
    pubGalleryId = await makePublishedGallery('pub', null);
    futureGalleryId = await makePublishedGallery('future', FUTURE);
    eventCoverMediaId = await makeMedia('event-cover', PNG_BYTES, 'image/png');
  });

  afterAll(async () => {
    if (!prisma) return;
    for (const id of created.newsIds) await prisma.eventNews.delete({ where: { id } }).catch(() => undefined);
    for (const id of created.eventIds) {
      await prisma.eventNews.deleteMany({ where: { eventId: id } }).catch(() => undefined);
      await prisma.event.delete({ where: { id } }).catch(() => undefined);
    }
    for (const id of created.galleryIds) await prisma.gallery.delete({ where: { id } }).catch(() => undefined);
    for (const id of created.docIds) await prisma.document.delete({ where: { id } }).catch(() => undefined);
    for (const id of created.mediaIds) {
      await prisma.mediaUsage.deleteMany({ where: { mediaId: id } }).catch(() => undefined);
      await prisma.mediaAsset.delete({ where: { id } }).catch(() => undefined);
    }
    for (const key of created.storageKeys) await storage.delete?.(key).catch(() => undefined);
    if (created.docTypeId) await prisma.documentType.delete({ where: { id: created.docTypeId } }).catch(() => undefined);
    if (created.eventTypeId) await prisma.eventType.delete({ where: { id: created.eventTypeId } }).catch(() => undefined);
    for (const id of created.users) {
      await prisma.userRole.deleteMany({ where: { userId: id } }).catch(() => undefined);
      await prisma.auditLog.deleteMany({ where: { userId: id } }).catch(() => undefined);
      await prisma.user.delete({ where: { id } }).catch(() => undefined);
    }
    await prisma.$disconnect();
  });

  /** Create a completed (past-dated), published event linking the given resources. */
  async function createPublishedEvent(opts: { documentIds?: string[]; galleryIds?: string[]; coverMediaId?: string }): Promise<{ id: string; slug: string }> {
    const res = await request(app)
      .post('/api/v1/admin/events')
      .set('Authorization', `Bearer ${token}`)
      .send({
        event_type_id: created.eventTypeId,
        title_en: `P5 Event ${created.eventIds.length} ${STAMP}`,
        date_mode: 'range',
        start_date: '2020-01-01',
        end_date: '2020-01-02',
        ...(opts.documentIds ? { document_ids: opts.documentIds } : {}),
        ...(opts.galleryIds ? { gallery_ids: opts.galleryIds } : {}),
        ...(opts.coverMediaId ? { cover_media_id: opts.coverMediaId } : {}),
      });
    expect(res.status).toBe(201);
    const id = res.body.data.id as string;
    created.eventIds.push(id);
    const pub = await request(app).post(`/api/v1/admin/events/${id}/publish`).set('Authorization', `Bearer ${token}`).send({});
    expect(pub.status).toBe(200);
    return { id, slug: res.body.data.slug as string };
  }

  // ── Issue 1 ──────────────────────────────────────────────────────────────────
  it('Issue 1: public event detail exposes published linked documents/galleries but hides future-scheduled ones', async () => {
    const { slug } = await createPublishedEvent({
      documentIds: [pubDocId, futureDocId],
      galleryIds: [pubGalleryId, futureGalleryId],
    });
    const res = await request(app).get(`/api/v1/public/events/${slug}`);
    expect(res.status).toBe(200);
    const docIds = (res.body.data.documents as Array<{ id: string }>).map((d) => d.id);
    const galleryIds = (res.body.data.galleries as Array<{ id: string }>).map((g) => g.id);
    expect(docIds).toContain(pubDocId);
    expect(docIds).not.toContain(futureDocId); // future-scheduled linked document is NOT exposed
    expect(galleryIds).toContain(pubGalleryId);
    expect(galleryIds).not.toContain(futureGalleryId); // future-scheduled linked gallery is NOT exposed
  });

  it('Issue 1: a future-scheduled linked news item is not exposed on the public event detail', async () => {
    // Build a completed event, publish-as-news with a FUTURE window, publish the news.
    const { id, slug } = await createPublishedEvent({});
    await request(app).post(`/api/v1/admin/events/${id}/complete`).set('Authorization', `Bearer ${token}`)
      .send({ outcome_summary_en: 'done', completed_date: '2020-01-03' });
    const news = await request(app).post(`/api/v1/admin/events/${id}/publish-as-news`).set('Authorization', `Bearer ${token}`)
      .send({ title_en: `P5 Future News ${STAMP}`, publish_start_at: FUTURE });
    expect(news.status).toBe(201);
    const newsId = news.body.data.id as string;
    created.newsIds.push(newsId);
    await request(app).post(`/api/v1/admin/news/${newsId}/publish`).set('Authorization', `Bearer ${token}`).send({});

    const res = await request(app).get(`/api/v1/public/events/${slug}`);
    const newsIds = (res.body.data.news as Array<{ id: string }>).map((n) => n.id);
    expect(newsIds).not.toContain(newsId);
  });

  // ── Issue 3 ──────────────────────────────────────────────────────────────────
  it('Issue 3: a second publish-as-news for the same event returns 409', async () => {
    const { id } = await createPublishedEvent({});
    await request(app).post(`/api/v1/admin/events/${id}/complete`).set('Authorization', `Bearer ${token}`)
      .send({ outcome_summary_en: 'done', completed_date: '2020-01-03' });
    const first = await request(app).post(`/api/v1/admin/events/${id}/publish-as-news`).set('Authorization', `Bearer ${token}`)
      .send({ title_en: `P5 Dup News A ${STAMP}` });
    expect(first.status).toBe(201);
    created.newsIds.push(first.body.data.id);
    const second = await request(app).post(`/api/v1/admin/events/${id}/publish-as-news`).set('Authorization', `Bearer ${token}`)
      .send({ title_en: `P5 Dup News B ${STAMP}` });
    expect(second.status).toBe(409);
  });

  // ── Issue 4 ──────────────────────────────────────────────────────────────────
  it('Issue 4: invalid workflow transitions return 409', async () => {
    const { id } = await createPublishedEvent({}); // now published
    // publish again (published → publish) is invalid
    const republish = await request(app).post(`/api/v1/admin/events/${id}/publish`).set('Authorization', `Bearer ${token}`).send({});
    expect(republish.status).toBe(409);
    // restore from a non-archived state is invalid
    const restore = await request(app).post(`/api/v1/admin/events/${id}/restore`).set('Authorization', `Bearer ${token}`).send({});
    expect(restore.status).toBe(409);
    // valid: unpublish (published → unpublished)
    expect((await request(app).post(`/api/v1/admin/events/${id}/unpublish`).set('Authorization', `Bearer ${token}`).send({})).status).toBe(200);
    // unpublish again (unpublished → unpublish) is invalid
    expect((await request(app).post(`/api/v1/admin/events/${id}/unpublish`).set('Authorization', `Bearer ${token}`).send({})).status).toBe(409);
    // valid: archive then restore
    expect((await request(app).post(`/api/v1/admin/events/${id}/archive`).set('Authorization', `Bearer ${token}`).send({})).status).toBe(200);
    expect((await request(app).post(`/api/v1/admin/events/${id}/restore`).set('Authorization', `Bearer ${token}`).send({})).status).toBe(200);
  });

  // ── Issue 5 ──────────────────────────────────────────────────────────────────
  it('Issue 5: a cancelled event cannot be completed (409)', async () => {
    const { id } = await createPublishedEvent({});
    expect((await request(app).post(`/api/v1/admin/events/${id}/cancel`).set('Authorization', `Bearer ${token}`)
      .send({ cancellation_reason: 'x' })).status).toBe(200);
    const complete = await request(app).post(`/api/v1/admin/events/${id}/complete`).set('Authorization', `Bearer ${token}`)
      .send({ outcome_summary_en: 'nope', completed_date: '2020-01-03' });
    expect(complete.status).toBe(409);
  });

  it('Issue 5: a completed event cannot be cancelled (409)', async () => {
    const { id } = await createPublishedEvent({});
    expect((await request(app).post(`/api/v1/admin/events/${id}/complete`).set('Authorization', `Bearer ${token}`)
      .send({ outcome_summary_en: 'done', completed_date: '2020-01-03' })).status).toBe(200);
    const cancel = await request(app).post(`/api/v1/admin/events/${id}/cancel`).set('Authorization', `Bearer ${token}`)
      .send({ cancellation_reason: 'too late' });
    expect(cancel.status).toBe(409);
  });

  // ── Issue 2 ──────────────────────────────────────────────────────────────────
  it('Issue 2: an Event cover image is served publicly once the event is published', async () => {
    await createPublishedEvent({ coverMediaId: eventCoverMediaId });
    const res = await request(app).get(`/api/v1/public/media/${eventCoverMediaId}/file`);
    expect(res.status).toBe(200);
  });

  it('Issue 2: a News cover scheduled for the future is NOT served publicly (403)', async () => {
    const newsCoverId = await makeMedia('news-cover', PNG_BYTES, 'image/png');
    const { id } = await createPublishedEvent({});
    await request(app).post(`/api/v1/admin/events/${id}/complete`).set('Authorization', `Bearer ${token}`)
      .send({ outcome_summary_en: 'done', completed_date: '2020-01-03' });
    const news = await request(app).post(`/api/v1/admin/events/${id}/publish-as-news`).set('Authorization', `Bearer ${token}`)
      .send({ title_en: `P5 News Cover ${STAMP}`, cover_media_id: newsCoverId, publish_start_at: FUTURE });
    expect(news.status).toBe(201);
    created.newsIds.push(news.body.data.id);
    await request(app).post(`/api/v1/admin/news/${news.body.data.id}/publish`).set('Authorization', `Bearer ${token}`).send({});
    const res = await request(app).get(`/api/v1/public/media/${newsCoverId}/file`);
    expect(res.status).toBe(403); // future-scheduled news cover never serves
  });
});
