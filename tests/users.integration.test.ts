/**
 * Integration tests — Users administration + self-service profile over HTTP against the real app,
 * Prisma and Redis. Exercises the full RBAC surface the Admin Frontend depends on: list/detail/
 * create/update/password/status under `users.manage`, and `/admin/profile*` for any signed-in user.
 *
 * GUARDED: skipped unless `RUN_INTEGRATION=1` with a reachable DATABASE_URL / REDIS_URL and the
 * identity/RBAC schema seeded. Self-seeds disposable Super Admin / Content Editor / Publisher users
 * and cleans up everything it creates afterwards.
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
const created: { users: string[] } = { users: [] };

async function login(email: string, password = PASSWORD): Promise<string> {
  const res = await request(app).post('/api/v1/auth/login').send({ email, password });
  return res.body.data?.access_token as string;
}

describe.skipIf(!RUN)('users (integration)', () => {
  let superToken: string;
  let editorToken: string;
  let editorId: string;
  // A dedicated self-service user whose password is never rotated by the admin tests, so the
  // profile password-change assertions are independent of test ordering.
  let profileToken: string;
  let profileEmail: string;

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

    async function userWithRole(suffix: string, roleKey: string): Promise<{ email: string; id: string }> {
      const role = await prisma.role.findUnique({ where: { key: roleKey } });
      const email = `it-users-${suffix}-${STAMP}@sidhkofed.test`;
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
      return { email, id: user.id };
    }

    const superUser = await userWithRole('super', ROLE_KEYS.superAdmin);
    const editor = await userWithRole('editor', ROLE_KEYS.contentEditor);
    const profileUser = await userWithRole('profile', ROLE_KEYS.publisher);
    editorId = editor.id;
    profileEmail = profileUser.email;
    superToken = await login(superUser.email);
    editorToken = await login(editor.email);
    profileToken = await login(profileEmail);
  });

  afterAll(async () => {
    if (!prisma) return;
    // Remove any users created via the API during the run (by email stamp), plus the seeded fixtures.
    const apiUsers = await prisma.user.findMany({
      where: { email: { contains: `apicreate-${STAMP}` } },
      select: { id: true },
    });
    for (const id of [...apiUsers.map((u: { id: string }) => u.id), ...created.users]) {
      await prisma.userRole.deleteMany({ where: { userId: id } }).catch(() => undefined);
      await prisma.auditLog.deleteMany({ where: { userId: id } }).catch(() => undefined);
      await prisma.user.delete({ where: { id } }).catch(() => undefined);
    }
    await prisma.$disconnect();
  });

  it('requires authentication for the admin user list (401)', async () => {
    const res = await request(app).get('/api/v1/admin/users');
    expect(res.status).toBe(401);
  });

  it('forbids a Content Editor from listing users (403 — lacks users.manage)', async () => {
    const res = await request(app).get('/api/v1/admin/users').set('Authorization', `Bearer ${editorToken}`);
    expect(res.status).toBe(403);
  });

  it('lets a Super Admin create, fetch, and list a user', async () => {
    const email = `apicreate-${STAMP}@sidhkofed.test`;
    const create = await request(app)
      .post('/api/v1/admin/users')
      .set('Authorization', `Bearer ${superToken}`)
      .send({ email, full_name: 'API User', password: 'secret123', roles: ['publisher'] });
    expect(create.status).toBe(201);
    expect(create.body.data.email).toBe(email);
    expect(create.body.data.roles).toEqual(['publisher']);
    expect(create.body.data).not.toHaveProperty('password_hash');
    const id = create.body.data.id as string;

    const detail = await request(app).get(`/api/v1/admin/users/${id}`).set('Authorization', `Bearer ${superToken}`);
    expect(detail.status).toBe(200);
    expect(detail.body.data.id).toBe(id);

    const list = await request(app).get('/api/v1/admin/users').set('Authorization', `Bearer ${superToken}`);
    expect(list.status).toBe(200);
    expect(Array.isArray(list.body.data)).toBe(true);

    // The new publisher can sign in with the password set at creation.
    expect(await login(email, 'secret123')).toBeTruthy();
  });

  it('rejects a duplicate email with 409', async () => {
    const email = `apicreate-${STAMP}@sidhkofed.test`;
    const res = await request(app)
      .post('/api/v1/admin/users')
      .set('Authorization', `Bearer ${superToken}`)
      .send({ email, full_name: 'Dup', password: 'secret123', roles: ['publisher'] });
    expect(res.status).toBe(409);
  });

  it('rejects an invalid payload with 422', async () => {
    const res = await request(app)
      .post('/api/v1/admin/users')
      .set('Authorization', `Bearer ${superToken}`)
      .send({ email: 'nope', full_name: '', password: 'short', roles: [] });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('validation_error');
  });

  it('404s for a non-existent user id', async () => {
    const res = await request(app)
      .get('/api/v1/admin/users/00000000-0000-4000-8000-000000000000')
      .set('Authorization', `Bearer ${superToken}`);
    expect(res.status).toBe(404);
  });

  it('updates a user role, resets a password, and toggles status', async () => {
    const update = await request(app)
      .patch(`/api/v1/admin/users/${editorId}`)
      .set('Authorization', `Bearer ${superToken}`)
      .send({ full_name: 'IT Editor Renamed', roles: ['content_editor', 'publisher'] });
    expect(update.status).toBe(200);
    expect(update.body.data.roles).toEqual(['content_editor', 'publisher']);

    const pwd = await request(app)
      .patch(`/api/v1/admin/users/${editorId}/password`)
      .set('Authorization', `Bearer ${superToken}`)
      .send({ password: 'rotated123' });
    expect(pwd.status).toBe(200);
    expect(await login('it-users-editor-' + STAMP + '@sidhkofed.test', 'rotated123')).toBeTruthy();

    const status = await request(app)
      .patch(`/api/v1/admin/users/${editorId}/status`)
      .set('Authorization', `Bearer ${superToken}`)
      .send({ is_active: false });
    expect(status.status).toBe(200);
    expect(status.body.data.is_active).toBe(false);

    // Re-activate so cleanup/other assertions are unaffected.
    await request(app)
      .patch(`/api/v1/admin/users/${editorId}/status`)
      .set('Authorization', `Bearer ${superToken}`)
      .send({ is_active: true });
  });

  it('prevents an actor from changing their own roles (403)', async () => {
    const me = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${superToken}`);
    const selfId = me.body.data.id as string;
    const res = await request(app)
      .patch(`/api/v1/admin/users/${selfId}`)
      .set('Authorization', `Bearer ${superToken}`)
      .send({ roles: ['content_editor'] });
    expect(res.status).toBe(403);
  });

  it('prevents an actor from deactivating their own account (403)', async () => {
    const me = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${superToken}`);
    const selfId = me.body.data.id as string;
    const res = await request(app)
      .patch(`/api/v1/admin/users/${selfId}/status`)
      .set('Authorization', `Bearer ${superToken}`)
      .send({ is_active: false });
    expect(res.status).toBe(403);
  });

  it('lets any signed-in user edit their own profile and change their own password', async () => {
    const profile = await request(app)
      .patch('/api/v1/admin/profile')
      .set('Authorization', `Bearer ${profileToken}`)
      .send({ full_name: 'Self Renamed', preferred_language: 'hi' });
    expect(profile.status).toBe(200);
    expect(profile.body.data.full_name).toBe('Self Renamed');
    expect(profile.body.data.preferred_language).toBe('hi');
    expect(profile.body.data).toHaveProperty('permissions');

    const wrong = await request(app)
      .patch('/api/v1/admin/profile/password')
      .set('Authorization', `Bearer ${profileToken}`)
      .send({ current_password: 'incorrect', new_password: 'newpass123' });
    expect(wrong.status).toBe(422);

    const ok = await request(app)
      .patch('/api/v1/admin/profile/password')
      .set('Authorization', `Bearer ${profileToken}`)
      .send({ current_password: PASSWORD, new_password: 'newpass123' });
    expect(ok.status).toBe(200);
    // The new password works on a fresh login.
    expect(await login(profileEmail, 'newpass123')).toBeTruthy();
  });
});
