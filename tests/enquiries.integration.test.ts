/**
 * Integration tests — enquiry submission and admin management over HTTP (API spec §6 / CMS §4.12).
 *
 * GUARDED: skipped unless `RUN_INTEGRATION=1` and the test database + Redis are reachable.
 *
 *   RUN_INTEGRATION=1 DATABASE_URL=... REDIS_URL=... npm run test:integration
 *
 * Seeds:
 *   - A Publisher user (enquiries.manage access)
 *   - A Content Editor user (no enquiry access — RBAC verification)
 *   - An EnquiryType master record
 *   All are cleaned up in afterAll.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';

const RUN = process.env.RUN_INTEGRATION === '1';

const PUBLISHER_EMAIL = `it-publisher-enq-${Date.now()}@sidhkofed.test`;
const EDITOR_EMAIL    = `it-editor-enq-${Date.now()}@sidhkofed.test`;
const PASSWORD = 'Integration#Pass123';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let app: Express;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let prisma: any;
let publisherToken: string;
let publisherId: string | undefined;
let editorId: string | undefined;
let enquiryTypeId: string | undefined;
const createdEnquiryIds: string[] = [];

describe.skipIf(!RUN)('enquiries (integration)', () => {
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

    const pwHash = await hashPassword(PASSWORD);

    // Upsert roles.
    const [pubRole, editorRole] = await Promise.all([
      prisma.role.upsert({ where: { key: ROLE_KEYS.publisher }, update: {}, create: { key: ROLE_KEYS.publisher, nameEn: 'Publisher', isSystem: true } }),
      prisma.role.upsert({ where: { key: ROLE_KEYS.contentEditor }, update: {}, create: { key: ROLE_KEYS.contentEditor, nameEn: 'Content Editor', isSystem: true } }),
    ]);

    // Upsert users.
    const [publisher, editor] = await Promise.all([
      prisma.user.upsert({ where: { email: PUBLISHER_EMAIL }, update: { passwordHash: pwHash, isActive: true }, create: { email: PUBLISHER_EMAIL, fullName: 'IT Publisher', passwordHash: pwHash, isActive: true } }),
      prisma.user.upsert({ where: { email: EDITOR_EMAIL }, update: { passwordHash: pwHash, isActive: true }, create: { email: EDITOR_EMAIL, fullName: 'IT Editor', passwordHash: pwHash, isActive: true } }),
    ]);
    publisherId = publisher.id;
    editorId = editor.id;

    // Assign roles.
    await Promise.all([
      prisma.userRole.upsert({ where: { userId_roleId: { userId: publisher.id, roleId: pubRole.id } }, update: {}, create: { userId: publisher.id, roleId: pubRole.id } }),
      prisma.userRole.upsert({ where: { userId_roleId: { userId: editor.id, roleId: editorRole.id } }, update: {}, create: { userId: editor.id, roleId: editorRole.id } }),
    ]);

    // Create an EnquiryType master.
    const et = await prisma.enquiryType.upsert({ where: { slug: 'it-test-general' }, update: {}, create: { slug: 'it-test-general', nameEn: 'IT Test General', isActive: true } });
    enquiryTypeId = et.id;

    // Login as publisher.
    const loginRes = await request(app).post('/api/v1/auth/login').send({ email: PUBLISHER_EMAIL, password: PASSWORD });
    publisherToken = loginRes.body.data.access_token as string;
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.enquiry.deleteMany({ where: { id: { in: createdEnquiryIds } } });
      await prisma.auditLog.deleteMany({ where: { userId: { in: [publisherId, editorId].filter(Boolean) as string[] } } });
      if (publisherId) await prisma.user.delete({ where: { id: publisherId } }).catch(() => undefined);
      if (editorId)    await prisma.user.delete({ where: { id: editorId } }).catch(() => undefined);
      await prisma.$disconnect();
    }
  });

  // ── Public submission ─────────────────────────────────────────────────────

  it('POST /public/enquiries → 201 with {id, submitted_at}', async () => {
    const res = await request(app).post('/api/v1/public/enquiries').send({
      name: 'Ramesh Kumar',
      mobile: '+91 94300 12345',
      email: 'ramesh@integration.test',
      enquiry_type_id: enquiryTypeId,
      subject: 'Integration test enquiry',
      message: 'This is an integration test submission.',
    });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBeTruthy();
    expect(res.body.data.submitted_at).toBeTruthy();
    createdEnquiryIds.push(res.body.data.id);
  });

  it('POST /public/enquiries with honeypot filled → 422', async () => {
    const res = await request(app).post('/api/v1/public/enquiries').send({
      name: 'Bot',
      mobile: '+91 94300 00000',
      email: 'bot@example.com',
      enquiry_type_id: enquiryTypeId,
      subject: 'Spam',
      message: 'Spam message.',
      website: 'http://bot.example', // honeypot
    });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('validation_error');
  });

  it('POST /public/enquiries with invalid enquiry_type_id → 422', async () => {
    const res = await request(app).post('/api/v1/public/enquiries').send({
      name: 'Test',
      mobile: '+91 94300 11111',
      email: 'test@integration.test',
      enquiry_type_id: 'not-a-uuid',
      subject: 'Test',
      message: 'Test message.',
    });
    expect(res.status).toBe(422);
  });

  it('POST /public/enquiries with missing required fields → 422', async () => {
    const res = await request(app).post('/api/v1/public/enquiries').send({ name: 'Only name' });
    expect(res.status).toBe(422);
    expect(res.body.error.fields).toBeDefined();
  });

  // ── Admin list (publisher) ─────────────────────────────────────────────────

  it('GET /admin/enquiries → 200 paginated list for publisher', async () => {
    const res = await request(app)
      .get('/api/v1/admin/enquiries')
      .set('Authorization', `Bearer ${publisherToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.pagination).toBeDefined();
  });

  it('GET /admin/enquiries → 401 without token', async () => {
    const res = await request(app).get('/api/v1/admin/enquiries');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('authentication_required');
  });

  it('GET /admin/enquiries → 403 for content_editor', async () => {
    const loginRes = await request(app).post('/api/v1/auth/login').send({ email: EDITOR_EMAIL, password: PASSWORD });
    const editorToken = loginRes.body.data.access_token as string;
    const res = await request(app).get('/api/v1/admin/enquiries').set('Authorization', `Bearer ${editorToken}`);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('permission_denied');
  });

  // ── Admin detail + patch ───────────────────────────────────────────────────

  it('GET /admin/enquiries/:id → 200 for existing enquiry', async () => {
    const [enquiryId] = createdEnquiryIds;
    if (!enquiryId) return; // guard for independent test order
    const res = await request(app)
      .get(`/api/v1/admin/enquiries/${enquiryId}`)
      .set('Authorization', `Bearer ${publisherToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.message).toBeTruthy();
    expect(res.body.data.internal_notes).toBeNull();
  });

  it('PATCH /admin/enquiries/:id → 200 updates spam_state', async () => {
    const [enquiryId] = createdEnquiryIds;
    if (!enquiryId) return;
    const res = await request(app)
      .patch(`/api/v1/admin/enquiries/${enquiryId}`)
      .set('Authorization', `Bearer ${publisherToken}`)
      .send({ spam_state: 'suspected' });
    expect(res.status).toBe(200);
    expect(res.body.data.spam_state).toBe('suspected');
  });

  it('PATCH /admin/enquiries/:id with unknown field → 422', async () => {
    const [enquiryId] = createdEnquiryIds;
    if (!enquiryId) return;
    const res = await request(app)
      .patch(`/api/v1/admin/enquiries/${enquiryId}`)
      .set('Authorization', `Bearer ${publisherToken}`)
      .send({ name: 'Hacker', email: 'hacker@evil.com' });
    expect(res.status).toBe(422);
  });

  // ── Archive (idempotent) ───────────────────────────────────────────────────

  it('POST /admin/enquiries/:id/archive → 200 first time', async () => {
    const [enquiryId] = createdEnquiryIds;
    if (!enquiryId) return;
    const res = await request(app)
      .post(`/api/v1/admin/enquiries/${enquiryId}/archive`)
      .set('Authorization', `Bearer ${publisherToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.archived_at).not.toBeNull();
  });

  it('POST /admin/enquiries/:id/archive → 200 (idempotent — already archived)', async () => {
    const [enquiryId] = createdEnquiryIds;
    if (!enquiryId) return;
    const res = await request(app)
      .post(`/api/v1/admin/enquiries/${enquiryId}/archive`)
      .set('Authorization', `Bearer ${publisherToken}`);
    expect(res.status).toBe(200); // idempotent — NOT 409
    expect(res.body.data.archived_at).not.toBeNull();
  });

  // ── Export ─────────────────────────────────────────────────────────────────

  it('GET /admin/enquiries/export → 200 XLSX attachment', async () => {
    const res = await request(app)
      .get('/api/v1/admin/enquiries/export')
      .set('Authorization', `Bearer ${publisherToken}`);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('spreadsheetml');
    expect(res.headers['content-disposition']).toContain('attachment');
    expect(res.headers['content-disposition']).toContain('.xlsx');
    // Response body should be binary (non-empty buffer)
    expect(res.body).toBeTruthy();
  });
});
