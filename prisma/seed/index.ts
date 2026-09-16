/**
 * Idempotent Phase 2 seeder (TASK 13 / development-rules §1).
 *
 * Seeds, by natural key (safe to re-run):
 *   - the 3 system roles (super_admin, content_editor, publisher),
 *   - the permission catalog,
 *   - the default role→permission grants (super_admin gets ALL),
 *   - one default Super Admin user from SEED_SUPERADMIN_* env vars.
 *
 * Run with `npm run db:seed` (after migrations create the identity tables).
 */
import { PrismaClient } from '@prisma/client';
import { seedConfig } from '../../src/config';
import { hashPassword } from '@/modules/auth/password';
import { ROLES, PERMISSIONS, ROLE_PERMISSIONS, ROLE_KEYS } from '@/modules/auth/auth.permissions';
import { seedMasters } from './masters';
import { seedMemberships } from './memberships';
import { seedContactDefaults } from './contact-defaults';
import { seedLeadershipDefaults } from './leadership-defaults';

const prisma = new PrismaClient();

async function seedRoles(): Promise<Map<string, string>> {
  const idByKey = new Map<string, string>();
  for (const role of ROLES) {
    const row = await prisma.role.upsert({
      where: { key: role.key },
      update: { nameEn: role.nameEn, description: role.description, isSystem: true },
      create: { key: role.key, nameEn: role.nameEn, description: role.description, isSystem: true },
    });
    idByKey.set(role.key, row.id);
  }
  console.log(`  ✓ roles: ${ROLES.length}`);
  return idByKey;
}

async function seedPermissions(): Promise<Map<string, string>> {
  const idByKey = new Map<string, string>();
  for (const perm of PERMISSIONS) {
    const row = await prisma.permission.upsert({
      where: { key: perm.key },
      update: { module: perm.module, action: perm.action, description: perm.description },
      create: {
        key: perm.key,
        module: perm.module,
        action: perm.action,
        description: perm.description,
      },
    });
    idByKey.set(perm.key, row.id);
  }
  console.log(`  ✓ permissions: ${PERMISSIONS.length}`);
  return idByKey;
}

/** Connect a role to a set of permission keys (idempotent via the composite unique). */
async function grant(
  roleId: string,
  permissionKeys: string[],
  permIds: Map<string, string>,
): Promise<void> {
  for (const key of permissionKeys) {
    const permissionId = permIds.get(key);
    if (!permissionId) continue;
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId, permissionId } },
      update: {},
      create: { roleId, permissionId },
    });
  }
}

async function seedRolePermissions(
  roleIds: Map<string, string>,
  permIds: Map<string, string>,
): Promise<void> {
  // Super Admin → every permission (also treated as wildcard in code).
  const superAdminId = roleIds.get(ROLE_KEYS.superAdmin);
  if (superAdminId) {
    await grant(superAdminId, [...permIds.keys()], permIds);
  }
  // Other roles → their default grants.
  for (const [roleKey, keys] of Object.entries(ROLE_PERMISSIONS)) {
    const roleId = roleIds.get(roleKey);
    if (roleId) await grant(roleId, keys, permIds);
  }
  console.log('  ✓ role→permission grants applied');
}

async function seedSuperAdminUser(roleIds: Map<string, string>): Promise<string> {
  const { superAdminEmail, superAdminPassword, superAdminName } = seedConfig;
  if (!superAdminEmail || !superAdminPassword || !superAdminName) {
    throw new Error(
      'SEED_SUPERADMIN_EMAIL, SEED_SUPERADMIN_PASSWORD and SEED_SUPERADMIN_NAME must be set to seed the default Super Admin.',
    );
  }
  const email = superAdminEmail.toLowerCase();
  const passwordHash = await hashPassword(superAdminPassword);

  // Idempotent: create the account once; never overwrite an existing password on re-run.
  const user = await prisma.user.upsert({
    where: { email },
    update: { fullName: superAdminName, isActive: true },
    create: { email, fullName: superAdminName, passwordHash, isActive: true },
  });

  const superAdminRoleId = roleIds.get(ROLE_KEYS.superAdmin);
  if (superAdminRoleId) {
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: user.id, roleId: superAdminRoleId } },
      update: {},
      create: { userId: user.id, roleId: superAdminRoleId },
    });
  }
  console.log(`  ✓ super admin user: ${email}`);
  return user.id;
}

/**
 * Identity/RBAC + master/membership data only — no super-admin-dependent content. Exported so
 * `fixtures.ts` can seed the baseline before layering its own deterministic content fixtures on
 * top, without duplicating this logic. Returns the super admin user's id.
 */
export async function seedBaseline(_db?: PrismaClient): Promise<string> {
  console.log('Seeding identity & RBAC (idempotent)…');
  const roleIds = await seedRoles();
  const permIds = await seedPermissions();
  await seedRolePermissions(roleIds, permIds);
  const userId = await seedSuperAdminUser(roleIds);
  await seedMasters(prisma);
  await seedMemberships(prisma);
  await seedContactDefaults(prisma);
  await seedLeadershipDefaults(prisma);
  console.log('Seed complete.');
  return userId;
}

async function main(): Promise<void> {
  await seedBaseline();
}

// Only auto-run when executed directly (`node dist/prisma/seed/index.js` / `npm run db:seed`), not
// when imported by `fixtures.ts` — importing must not implicitly trigger a second seed run.
if (require.main === module) {
  main()
    .catch((err) => {
      console.error('Seed failed:', err);
      process.exitCode = 1;
    })
    .finally(() => {
      void prisma.$disconnect();
    });
}
