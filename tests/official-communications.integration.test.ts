/**
 * Integration tests — official communication CRUD, lifecycle, RBAC, public visibility and the
 * "expiry never auto-unpublishes" rule, over HTTP against the real app, Prisma and Redis.
 *
 * GUARDED: skipped unless `RUN_INTEGRATION=1` with a reachable DATABASE_URL / REDIS_URL and the
 * phase9 migration applied. Self-seeds disposable users + a communication type; cleans up afterwards.
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
const created: { users: string[]; communicationTypeId?: string; communicationId?: string } = { users: [] };

async function login(email: string): Promise<string> {
  const res = await request(app).post('/api/v1/auth/login').send({ email, password: PASSWORD });
  return res.body.data.access_token as string;
}

describe.skipIf(!RUN)('official-communications (integration)', () => {
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
      const email = `it-comm-${suffix}-${STAMP}@sidhkofed.test`;
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

    const type = await prisma.communicationType.upsert({
      where: { slug: `it-notice-${STAMP}` },
      update: {},
      create: { nameEn: `IT Notice ${STAMP}`, slug: `it-notice-${STAMP}`, isActive: true },
    });
    created.communicationTypeId = type.id;

    editorToken = await login(editorEmail);
    publisherToken = await login(publisherEmail);
  });

  afterAll(async () => {
    if (!prisma) return;
    await prisma.officialCommunication
      .deleteMany({ where: { communicationTypeId: created.communicationTypeId } })
      .catch(() => undefined);
    if (created.communicationTypeId)
      await prisma.communicationType.delete({ where: { id: created.communicationTypeId } }).catch(() => undefined);
    for (const id of created.users) {
      await prisma.userRole.deleteMany({ where: { userId: id } }).catch(() => undefined);
      await prisma.auditLog.deleteMany({ where: { userId: id } }).catch(() => undefined);
      await prisma.user.delete({ where: { id } }).catch(() => undefined);
    }
    await prisma.$disconnect();
  });

  it('lets a Content Editor create a draft communication with chronological dates', async () => {
    const res = await request(app)
      .post('/api/v1/admin/official-communications')
      .set('Authorization', `Bearer ${editorToken}`)
      .send({
        communication_type_id: created.communicationTypeId,
        title_en: `Office Order ${STAMP}`,
        reference_number: `OO/${STAMP}`,
        issuing_authority: 'Registrar',
        issue_date: '2026-01-01',
        effective_date: '2026-01-05',
        expiry_date: '2026-03-01',
      });
    expect(res.status).toBe(201);
    expect(res.body.data.publication_state).toBe('draft');
    created.communicationId = res.body.data.id;
  });

  it('rejects effective_date before issue_date with 422', async () => {
    const res = await request(app)
      .post('/api/v1/admin/official-communications')
      .set('Authorization', `Bearer ${editorToken}`)
      .send({
        communication_type_id: created.communicationTypeId,
        title_en: 'Bad dates',
        issue_date: '2026-02-01',
        effective_date: '2026-01-01',
      });
    expect(res.status).toBe(422);
  });

  it('forbids a Content Editor from publishing (RBAC 403)', async () => {
    const res = await request(app)
      .post(`/api/v1/admin/official-communications/${created.communicationId}/publish`)
      .set('Authorization', `Bearer ${editorToken}`)
      .send({});
    expect(res.status).toBe(403);
  });

  it('lets a Publisher publish, then exposes it publicly by slug', async () => {
    const pub = await request(app)
      .post(`/api/v1/admin/official-communications/${created.communicationId}/publish`)
      .set('Authorization', `Bearer ${publisherToken}`)
      .send({});
    expect(pub.status).toBe(200);
    const slug = pub.body.data.slug as string;
    const res = await request(app).get(`/api/v1/public/official-communications/${slug}`);
    expect(res.status).toBe(200);
    expect(res.body.data.reference_number).toBe(`OO/${STAMP}`);
    expect(res.body.data).not.toHaveProperty('created_by');
  });

  it('keeps a past-expiry communication public (expiry never auto-unpublishes)', async () => {
    await request(app)
      .patch(`/api/v1/admin/official-communications/${created.communicationId}`)
      .set('Authorization', `Bearer ${publisherToken}`)
      .send({ expiry_date: '2020-01-01' });
    const res = await request(app).get('/api/v1/public/official-communications');
    const ids = (res.body.data as Array<{ id: string }>).map((d) => d.id);
    expect(ids).toContain(created.communicationId);
  });

  it('archives and removes it from public listings', async () => {
    const arch = await request(app)
      .post(`/api/v1/admin/official-communications/${created.communicationId}/archive`)
      .set('Authorization', `Bearer ${publisherToken}`)
      .send({});
    expect(arch.status).toBe(200);
    const pub = await request(app).get('/api/v1/public/official-communications');
    const ids = (pub.body.data as Array<{ id: string }>).map((d) => d.id);
    expect(ids).not.toContain(created.communicationId);
  });
});
