/**
 * User service — all business logic for the Users administration module. No HTTP, no Prisma here
 * (repository owns Prisma; controllers own HTTP). Owns: user CRUD + role assignment, duplicate-email
 * prevention, role-existence validation, password reset/change, account status, audit logging,
 * permission-cache invalidation, and the safety guards that prevent privilege escalation and
 * account lockout:
 *   - a user may not change their OWN roles or their OWN account status (no self-escalation/lockout);
 *   - the LAST active Super Admin cannot be demoted or deactivated (no system lockout).
 *
 * Cross-module dependencies go through SERVICES only (auditService / permissionService) and the
 * auth module's password + mapper helpers — never another module's repository.
 */
import { NotFoundError, ValidationError, ConflictError, PermissionError } from '@/shared/errors';
import { auditService, type AuditContext } from '@/modules/audit/audit.service';
import { permissionService, SUPER_ADMIN_ROLE } from '@/modules/auth/permission.service';
import { hashPassword, verifyPassword } from '@/modules/auth/password';
import { toAuthUserDto } from '@/modules/auth/auth.mapper';
import type { AuthUserDto } from '@/modules/auth/auth.dto';
import { userRepository, type UserRow } from './users.repository';
import { toUserDto, userRoleKeys, type UserDto } from './users.dto';
import { USER_ENTITY, type UserFilters, type UserOrderingField } from './users.types';
import type {
  UserCreateInput,
  UserUpdateInput,
  UserPasswordInput,
  UserStatusInput,
  ProfileUpdateInput,
  ProfilePasswordInput,
} from './users.validators';

function loaded(row: UserRow | null): UserRow {
  if (!row) throw new NotFoundError('User not found.');
  return row;
}

function requireUser(ctx: AuditContext): string {
  if (!ctx.userId) throw new ValidationError({ _: ['An authenticated user is required.'] });
  return ctx.userId;
}

/** Resolve role keys → ids, rejecting any unknown key with a field error (no silent drop). */
async function resolveRoleIds(keys: string[]): Promise<string[]> {
  const unique = [...new Set(keys)];
  const idByKey = await userRepository.findRoleIdsByKeys(unique);
  const missing = unique.filter((k) => !idByKey.has(k));
  if (missing.length > 0) {
    throw new ValidationError({ roles: [`Unknown role(s): ${missing.join(', ')}.`] });
  }
  return unique.map((k) => idByKey.get(k) as string);
}

/** Build the self-service profile payload (id/email/full_name/.../roles/permissions) — the exact
 * shape the frontend already consumes from `GET /auth/me`. */
async function toProfile(row: UserRow): Promise<AuthUserDto> {
  const authz = await permissionService.getUserAuthorization(row.id);
  return toAuthUserDto(
    { id: row.id, email: row.email, fullName: row.fullName, preferredLanguage: row.preferredLanguage, isActive: row.isActive },
    authz,
  );
}

export interface ListResult<T> {
  items: T[];
  total: number;
}

// ── Reads ───────────────────────────────────────────────────────────────────────
export async function list(
  filters: UserFilters,
  ordering: { field: UserOrderingField; direction: 'asc' | 'desc' },
  skip: number,
  take: number,
): Promise<ListResult<UserDto>> {
  const { rows, total } = await userRepository.list(filters, skip, take, ordering);
  return { items: rows.map(toUserDto), total };
}

export async function getById(id: string): Promise<UserDto> {
  return toUserDto(loaded(await userRepository.findById(id)));
}

// ── Create ────────────────────────────────────────────────────────────────────
export async function create(input: UserCreateInput, ctx: AuditContext): Promise<UserDto> {
  requireUser(ctx);
  if (await userRepository.emailExists(input.email)) {
    throw new ConflictError(`A user with email "${input.email}" already exists.`);
  }
  const roleIds = await resolveRoleIds(input.roles);
  const passwordHash = await hashPassword(input.password);

  const created = await userRepository.transaction((tx) =>
    userRepository.create(
      {
        email: input.email,
        passwordHash,
        fullName: input.full_name,
        preferredLanguage: input.preferred_language ?? 'en',
        isActive: input.is_active ?? true,
      },
      roleIds,
      tx,
    ),
  );

  await auditService.create(ctx, USER_ENTITY, created.id, {
    email: created.email,
    full_name: created.fullName,
    roles: userRoleKeys(created),
    is_active: created.isActive,
  });
  return toUserDto(created);
}

// ── Update (admin; identity + roles) ───────────────────────────────────────────
export async function update(id: string, input: UserUpdateInput, ctx: AuditContext): Promise<UserDto> {
  const actorId = requireUser(ctx);
  const existing = loaded(await userRepository.findById(id));

  // Privilege-escalation guard: an actor may never change their OWN roles (no self-promotion or
  // accidental self-demotion). Identity fields on their own account go through /admin/profile.
  if (input.roles !== undefined && id === actorId) {
    throw new PermissionError('You cannot change your own roles.');
  }

  if (input.email !== undefined && input.email !== existing.email) {
    if (await userRepository.emailExists(input.email, id)) {
      throw new ConflictError(`A user with email "${input.email}" already exists.`);
    }
  }

  let nextRoleIds: string[] | undefined;
  if (input.roles !== undefined) {
    nextRoleIds = await resolveRoleIds(input.roles);
    // Lockout guard: cannot remove the last active Super Admin's super_admin role.
    const wasSuperAdmin = userRoleKeys(existing).includes(SUPER_ADMIN_ROLE);
    const willBeSuperAdmin = input.roles.includes(SUPER_ADMIN_ROLE);
    if (existing.isActive && wasSuperAdmin && !willBeSuperAdmin) {
      const others = await userRepository.countActiveSuperAdmins(id);
      if (others === 0) throw new ConflictError('Cannot remove the role of the last active Super Admin.');
    }
  }

  const before = { email: existing.email, full_name: existing.fullName, roles: userRoleKeys(existing) };

  const updated = await userRepository.transaction(async (tx) => {
    await userRepository.updateProfile(
      id,
      { email: input.email, fullName: input.full_name, preferredLanguage: input.preferred_language },
      tx,
    );
    if (nextRoleIds !== undefined) await userRepository.setRoles(id, nextRoleIds, tx);
    return loaded(await userRepository.findById(id, tx));
  });

  if (nextRoleIds !== undefined) await permissionService.invalidateUserAuthorization(id);
  await auditService.update(ctx, USER_ENTITY, id, before, {
    email: updated.email,
    full_name: updated.fullName,
    roles: userRoleKeys(updated),
  });
  return toUserDto(updated);
}

// ── Password reset (admin → another user) ──────────────────────────────────────
export async function resetPassword(id: string, input: UserPasswordInput, ctx: AuditContext): Promise<void> {
  requireUser(ctx);
  const existing = loaded(await userRepository.findById(id));
  const passwordHash = await hashPassword(input.password);
  await userRepository.updatePassword(id, passwordHash);
  await auditService.update(ctx, USER_ENTITY, existing.id, undefined, undefined, {
    summary: 'USER_PASSWORD_RESET',
  });
}

// ── Status (activate / deactivate) ─────────────────────────────────────────────
export async function setStatus(id: string, input: UserStatusInput, ctx: AuditContext): Promise<UserDto> {
  const actorId = requireUser(ctx);
  const existing = loaded(await userRepository.findById(id));

  // Lockout guard: an actor may never deactivate their OWN account.
  if (!input.is_active && id === actorId) {
    throw new PermissionError('You cannot deactivate your own account.');
  }
  // Lockout guard: cannot deactivate the last active Super Admin.
  if (!input.is_active && existing.isActive && userRoleKeys(existing).includes(SUPER_ADMIN_ROLE)) {
    const others = await userRepository.countActiveSuperAdmins(id);
    if (others === 0) throw new ConflictError('Cannot deactivate the last active Super Admin.');
  }

  if (existing.isActive === input.is_active) return toUserDto(existing); // no-op, idempotent

  const updated = await userRepository.setStatus(id, input.is_active);
  await permissionService.invalidateUserAuthorization(id);
  await auditService.update(ctx, USER_ENTITY, id, undefined, undefined, {
    summary: input.is_active ? 'USER_ACTIVATED' : 'USER_DEACTIVATED',
    previousState: existing.isActive ? 'active' : 'inactive',
    newState: input.is_active ? 'active' : 'inactive',
  });
  return toUserDto(updated);
}

// ── Self-service profile (own account only) ────────────────────────────────────
export async function updateOwnProfile(input: ProfileUpdateInput, ctx: AuditContext): Promise<AuthUserDto> {
  const actorId = requireUser(ctx);
  const existing = loaded(await userRepository.findById(actorId));
  const updated = await userRepository.updateProfile(actorId, {
    fullName: input.full_name,
    preferredLanguage: input.preferred_language,
  });
  await auditService.update(ctx, USER_ENTITY, actorId, { full_name: existing.fullName }, { full_name: updated.fullName }, {
    summary: 'PROFILE_UPDATE',
  });
  return toProfile(updated);
}

export async function changeOwnPassword(input: ProfilePasswordInput, ctx: AuditContext): Promise<void> {
  const actorId = requireUser(ctx);
  const currentHash = await userRepository.findPasswordHashById(actorId);
  if (!currentHash) throw new NotFoundError('User not found.');
  const ok = await verifyPassword(input.current_password, currentHash);
  if (!ok) throw new ValidationError({ current_password: ['Current password is incorrect.'] });
  const passwordHash = await hashPassword(input.new_password);
  await userRepository.updatePassword(actorId, passwordHash);
  await auditService.update(ctx, USER_ENTITY, actorId, undefined, undefined, { summary: 'PROFILE_PASSWORD_CHANGE' });
}

export const userService = {
  list,
  getById,
  create,
  update,
  resetPassword,
  setStatus,
  updateOwnProfile,
  changeOwnPassword,
};
