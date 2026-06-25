/**
 * Integration tests — event CRUD with the controlled dynamic-field engine + relationships,
 * derived status, completion (incl. duplicate-completion guard), cancellation, publish-as-news →
 * derived news, RBAC, and public APIs over HTTP against the real app, Prisma and Redis.
 *
 * GUARDED: skipped unless `RUN_INTEGRATION=1` with a reachable DATABASE_URL / REDIS_URL and the
 * events_programmes_institutions migration applied. Self-seeds disposable users + an event type +
 * a required numeric field definition + a commodity + a district.
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
const created: {
  users: string[];
  eventTypeId?: string;
  fieldDefId?: string;
  commodityId?: string;
  districtId?: string;
  eventId?: string; // completed flow
  cancelEventId?: string;
  newsId?: string;
} = { users: [] };

async function login(email: string): Promise<string> {
  const res = await request(app).post('/api/v1/auth/login').send({ email, password: PASSWORD });
  return res.body.data.access_token as string;
}

describe.skipIf(!RUN)('events + news (integration)', () => {
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
      const email = `it-evt-${suffix}-${STAMP}@sidhkofed.test`;
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

    const eventType = await prisma.eventType.upsert({
      where: { slug: `it-training-${STAMP}` },
      update: {},
      create: { nameEn: `IT Training ${STAMP}`, slug: `it-training-${STAMP}`, isActive: true },
    });
    created.eventTypeId = eventType.id;

    // A REQUIRED numeric dynamic field for this event type.
    const fieldDef = await prisma.eventFieldDefinition.create({
      data: {
        eventTypeId: eventType.id,
        fieldKey: 'participant_count',
        labelEn: 'Participants',
        dataType: 'number',
        isRequired: true,
        displayOrder: 0,
        isActive: true,
      },
    });
    created.fieldDefId = fieldDef.id;

    const commodity = await prisma.commodity.upsert({
      where: { slug: `it-evt-lac-${STAMP}` },
      update: {},
      create: { nameEn: `IT Evt Lac ${STAMP}`, slug: `it-evt-lac-${STAMP}`, isActive: true },
    });
    created.commodityId = commodity.id;

    const district = await prisma.district.upsert({
      where: { slug: `it-gumla-${STAMP}` },
      update: {},
      create: { nameEn: `IT Gumla ${STAMP}`, slug: `it-gumla-${STAMP}`, isActive: true },
    });
    created.districtId = district.id;

    editorToken = await login(editorEmail);
    publisherToken = await login(publisherEmail);
  });

  afterAll(async () => {
    if (!prisma) return;
    if (created.newsId) await prisma.eventNews.delete({ where: { id: created.newsId } }).catch(() => undefined);
    for (const id of [created.eventId, created.cancelEventId]) {
      if (id) {
        await prisma.eventNews.deleteMany({ where: { eventId: id } }).catch(() => undefined);
        await prisma.event.delete({ where: { id } }).catch(() => undefined); // cascades junctions
      }
    }
    if (created.fieldDefId) await prisma.eventFieldDefinition.delete({ where: { id: created.fieldDefId } }).catch(() => undefined);
    if (created.commodityId) await prisma.commodity.delete({ where: { id: created.commodityId } }).catch(() => undefined);
    if (created.districtId) await prisma.district.delete({ where: { id: created.districtId } }).catch(() => undefined);
    if (created.eventTypeId) await prisma.eventType.delete({ where: { id: created.eventTypeId } }).catch(() => undefined);
    for (const id of created.users) {
      await prisma.userRole.deleteMany({ where: { userId: id } }).catch(() => undefined);
      await prisma.auditLog.deleteMany({ where: { userId: id } }).catch(() => undefined);
      await prisma.user.delete({ where: { id } }).catch(() => undefined);
    }
    await prisma.$disconnect();
  });

  it('rejects an event missing a REQUIRED dynamic field with 422', async () => {
    const res = await request(app)
      .post('/api/v1/admin/events')
      .set('Authorization', `Bearer ${editorToken}`)
      .send({
        event_type_id: created.eventTypeId,
        title_en: `No participants ${STAMP}`,
        date_mode: 'single',
        start_date: '2020-01-01',
      });
    expect(res.status).toBe(422);
    expect(res.body.error.fields).toHaveProperty('dynamic_values.participant_count');
  });

  it('creates a completed (past-dated) event with valid dynamic values + commodity link', async () => {
    const res = await request(app)
      .post('/api/v1/admin/events')
      .set('Authorization', `Bearer ${editorToken}`)
      .send({
        event_type_id: created.eventTypeId,
        title_en: `Lac training ${STAMP}`,
        date_mode: 'range',
        start_date: '2020-01-01',
        end_date: '2020-01-02',
        district_id: created.districtId,
        commodity_ids: [created.commodityId],
        dynamic_values: { participant_count: 45 },
      });
    expect(res.status).toBe(201);
    expect(res.body.data.event_status).toBe('completed'); // derived from past dates
    expect(res.body.data.dynamic_values.participant_count).toBe(45);
    expect(res.body.data.commodities.map((c: { id: string }) => c.id)).toContain(created.commodityId);
    created.eventId = res.body.data.id;
  });

  it('forbids a Content Editor from publishing (RBAC 403)', async () => {
    const res = await request(app)
      .post(`/api/v1/admin/events/${created.eventId}/publish`)
      .set('Authorization', `Bearer ${editorToken}`)
      .send({});
    expect(res.status).toBe(403);
  });

  it('publishes the event and exposes it publicly with dynamic_values + relationships', async () => {
    const pub = await request(app)
      .post(`/api/v1/admin/events/${created.eventId}/publish`)
      .set('Authorization', `Bearer ${publisherToken}`)
      .send({});
    expect(pub.status).toBe(200);
    const slug = pub.body.data.slug as string;
    const res = await request(app).get(`/api/v1/public/events/${slug}`);
    expect(res.status).toBe(200);
    expect(res.body.data.dynamic_values.participant_count).toBe(45);
    expect(res.body.data.commodities.map((c: { id: string }) => c.id)).toContain(created.commodityId);
    expect(res.body.data).not.toHaveProperty('created_by');
  });

  it('completes the event with outcome fields', async () => {
    const res = await request(app)
      .post(`/api/v1/admin/events/${created.eventId}/complete`)
      .set('Authorization', `Bearer ${publisherToken}`)
      .send({ outcome_summary_en: 'Great training.', final_participant_count: 45, completed_date: '2020-01-03' });
    expect(res.status).toBe(200);
    expect(res.body.data.event_status).toBe('completed');
    expect(res.body.data.completed_date).toBe('2020-01-03');
    expect(res.body.data.outcome_summary_en).toBe('Great training.');
  });

  it('blocks duplicate completion with 409', async () => {
    const res = await request(app)
      .post(`/api/v1/admin/events/${created.eventId}/complete`)
      .set('Authorization', `Bearer ${publisherToken}`)
      .send({ outcome_summary_en: 'Again' });
    expect(res.status).toBe(409);
  });

  it('publishes the completed event as news, then exposes it on the public news list', async () => {
    const news = await request(app)
      .post(`/api/v1/admin/events/${created.eventId}/publish-as-news`)
      .set('Authorization', `Bearer ${publisherToken}`)
      .send({ title_en: `Lac training news ${STAMP}`, summary_en: 'A great training was held.' });
    expect(news.status).toBe(201);
    expect(news.body.data.publication_state).toBe('draft');
    expect(news.body.data.source_event.id).toBe(created.eventId);
    created.newsId = news.body.data.id;

    const pub = await request(app)
      .post(`/api/v1/admin/news/${created.newsId}/publish`)
      .set('Authorization', `Bearer ${publisherToken}`)
      .send({});
    expect(pub.status).toBe(200);

    const list = await request(app).get('/api/v1/public/news');
    const ids = (list.body.data as Array<{ id: string }>).map((n) => n.id);
    expect(ids).toContain(created.newsId);
  });

  it('rejects publish-as-news for a non-completed event with 409', async () => {
    const create = await request(app)
      .post('/api/v1/admin/events')
      .set('Authorization', `Bearer ${publisherToken}`)
      .send({
        event_type_id: created.eventTypeId,
        title_en: `Future event ${STAMP}`,
        date_mode: 'single',
        start_date: '2099-01-01',
        dynamic_values: { participant_count: 10 },
      });
    expect(create.status).toBe(201);
    expect(create.body.data.event_status).toBe('scheduled');
    created.cancelEventId = create.body.data.id;

    const news = await request(app)
      .post(`/api/v1/admin/events/${created.cancelEventId}/publish-as-news`)
      .set('Authorization', `Bearer ${publisherToken}`)
      .send({});
    expect(news.status).toBe(409);
  });

  it('cancels an event (manual override) and records the reason', async () => {
    const res = await request(app)
      .post(`/api/v1/admin/events/${created.cancelEventId}/cancel`)
      .set('Authorization', `Bearer ${publisherToken}`)
      .send({ cancellation_reason: 'Postponed indefinitely.' });
    expect(res.status).toBe(200);
    expect(res.body.data.event_status).toBe('cancelled');
    expect(res.body.data.status_override).toBe(true);
    expect(res.body.data.cancellation_reason).toBe('Postponed indefinitely.');
  });
});
