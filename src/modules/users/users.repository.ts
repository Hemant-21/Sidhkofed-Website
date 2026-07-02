/**
 * User repository — the ONLY Prisma caller for the users module (coding-standards §6). Encapsulates
 * the list filter builder, the ordering allow-list, role-junction (re)assignment, the
 * last-active-Super-Admin count guard the service needs, and password/status mutations. Returns
 * entities (with role keys resolved), never DTOs.
 */
import type { Prisma, PrismaClient } from '@prisma/client';
import { prisma } from '@/db/prisma';
import { SUPER_ADMIN_ROLE } from '@/modules/auth/permission.service';
import type { UserFilters, UserOrderingField } from './users.types';

type Db = PrismaClient | Prisma.TransactionClient;

/** Detail/list include — assigned roles resolved (key needed for DTO + RBAC guards). */
const userInclude = { userRoles: { include: { role: true } } } satisfies Prisma.UserInclude;

export type UserRow = Prisma.UserGetPayload<{ include: typeof userInclude }>;

const ORDER_COLUMN: Record<UserOrderingField, keyof Prisma.UserOrderByWithRelationInput> = {
  created_at: 'createdAt',
  full_name: 'fullName',
  email: 'email',
  last_login_at: 'lastLoginAt',
};

export function buildWhere(f: UserFilters): Prisma.UserWhereInput {
  const where: Prisma.UserWhereInput = {};
  if (f.isActive !== undefined) where.isActive = f.isActive;
  if (f.role) where.userRoles = { some: { role: { key: f.role } } };
  if (f.search) {
    where.OR = [
      { email: { contains: f.search, mode: 'insensitive' } },
      { fullName: { contains: f.search, mode: 'insensitive' } },
    ];
  }
  return where;
}

export async function list(
  f: UserFilters,
  skip: number,
  take: number,
  ordering: { field: UserOrderingField; direction: 'asc' | 'desc' },
): Promise<{ rows: UserRow[]; total: number }> {
  const where = buildWhere(f);
  const [rows, total] = await Promise.all([
    prisma.user.findMany({
      where,
      include: userInclude,
      orderBy: { [ORDER_COLUMN[ordering.field]]: ordering.direction },
      skip,
      take,
    }),
    prisma.user.count({ where }),
  ]);
  return { rows, total };
}

export async function findById(id: string, db: Db = prisma): Promise<UserRow | null> {
  return db.user.findUnique({ where: { id }, include: userInclude });
}

/** Existence check for duplicate-email prevention. Optionally exclude one id (rename path). */
export async function emailExists(email: string, excludeId?: string): Promise<boolean> {
  const row = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  return row !== null && row.id !== excludeId;
}

/** Self password-change verification needs the hash; nothing else does. */
export async function findPasswordHashById(id: string, db: Db = prisma): Promise<string | null> {
  const row = await db.user.findUnique({ where: { id }, select: { passwordHash: true } });
  return row?.passwordHash ?? null;
}

/** Resolve role keys → ids. Returns only the rows that exist (caller validates completeness). */
export async function findRoleIdsByKeys(keys: string[], db: Db = prisma): Promise<Map<string, string>> {
  const rows = await db.role.findMany({ where: { key: { in: keys } }, select: { id: true, key: true } });
  return new Map(rows.map((r) => [r.key, r.id]));
}

/**
 * Count active Super Admins, optionally excluding one user — drives the last-active-Super-Admin
 * lockout guard (cannot deactivate or demote the final active Super Admin).
 */
export async function countActiveSuperAdmins(excludeUserId?: string, db: Db = prisma): Promise<number> {
  return db.user.count({
    where: {
      isActive: true,
      ...(excludeUserId ? { id: { not: excludeUserId } } : {}),
      userRoles: { some: { role: { key: SUPER_ADMIN_ROLE } } },
    },
  });
}

export async function create(
  data: { email: string; passwordHash: string; fullName: string; preferredLanguage: 'en' | 'hi'; isActive: boolean },
  roleIds: string[],
  db: Db = prisma,
): Promise<UserRow> {
  return db.user.create({
    data: { ...data, userRoles: { create: roleIds.map((roleId) => ({ roleId })) } },
    include: userInclude,
  });
}

export async function updateProfile(
  id: string,
  data: { email?: string; fullName?: string; preferredLanguage?: 'en' | 'hi' },
  db: Db = prisma,
): Promise<UserRow> {
  return db.user.update({ where: { id }, data, include: userInclude });
}

/** Replace a user's role assignments wholesale (delete + recreate) inside a transaction. */
export async function setRoles(id: string, roleIds: string[], db: Db = prisma): Promise<void> {
  await db.userRole.deleteMany({ where: { userId: id } });
  if (roleIds.length > 0) {
    await db.userRole.createMany({ data: roleIds.map((roleId) => ({ userId: id, roleId })) });
  }
}

export async function updatePassword(id: string, passwordHash: string, db: Db = prisma): Promise<void> {
  await db.user.update({ where: { id }, data: { passwordHash } });
}

export async function setStatus(id: string, isActive: boolean, db: Db = prisma): Promise<UserRow> {
  return db.user.update({ where: { id }, data: { isActive }, include: userInclude });
}

export function transaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  return prisma.$transaction(fn);
}

export const userRepository = {
  buildWhere,
  list,
  findById,
  emailExists,
  findPasswordHashById,
  findRoleIdsByKeys,
  countActiveSuperAdmins,
  create,
  updateProfile,
  setRoles,
  updatePassword,
  setStatus,
  transaction,
};
