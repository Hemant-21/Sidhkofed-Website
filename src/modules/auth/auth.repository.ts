/**
 * Auth repository — the ONLY place Prisma is called for the auth module
 * (coding-standards §6). Returns entities/aggregates, never HTTP shapes.
 */
import { prisma } from '@/db/prisma';

/** A user row with the fields the service needs to authenticate and respond. */
export type UserRecord = {
  id: string;
  email: string;
  passwordHash: string;
  fullName: string;
  preferredLanguage: 'en' | 'hi';
  isActive: boolean;
};

/** Find an active-or-not user by normalized email (login path needs the hash). */
export async function findUserByEmail(email: string): Promise<UserRecord | null> {
  return prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      passwordHash: true,
      fullName: true,
      preferredLanguage: true,
      isActive: true,
    },
  });
}

/** Find a user by id (auth middleware / `me`); excludes the password hash. */
export async function findUserById(id: string): Promise<Omit<UserRecord, 'passwordHash'> | null> {
  return prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      fullName: true,
      preferredLanguage: true,
      isActive: true,
    },
  });
}

/** Record the successful-login timestamp. */
export async function touchLastLogin(id: string): Promise<void> {
  await prisma.user.update({ where: { id }, data: { lastLoginAt: new Date() } });
}

/**
 * Load a user's role keys and the flattened set of permission keys across all roles.
 * One query with nested includes; the service merges/dedupes permissions.
 */
export async function findRolesAndPermissions(
  userId: string,
): Promise<{ roleKeys: string[]; permissionKeys: string[] }> {
  const rows = await prisma.userRole.findMany({
    where: { userId },
    select: {
      role: {
        select: {
          key: true,
          rolePermissions: { select: { permission: { select: { key: true } } } },
        },
      },
    },
  });

  const roleKeys: string[] = [];
  const permissionKeys = new Set<string>();
  for (const row of rows) {
    roleKeys.push(row.role.key);
    for (const rp of row.role.rolePermissions) {
      permissionKeys.add(rp.permission.key);
    }
  }
  return { roleKeys, permissionKeys: [...permissionKeys] };
}

export const authRepository = {
  findUserByEmail,
  findUserById,
  touchLastLogin,
  findRolesAndPermissions,
};
