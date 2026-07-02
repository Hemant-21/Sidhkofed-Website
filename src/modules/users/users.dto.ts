/**
 * User DTOs + mappers. snake_case fields, matching the project's response conventions. The admin
 * Users surface returns the same shape for list and detail (users carry no heavy relationships):
 * identity, preferred language, account status, assigned role keys, and timestamps. The password
 * hash NEVER crosses the HTTP boundary.
 *
 * Self-service profile responses reuse the auth module's `AuthUserDto` (id/email/full_name/
 * preferred_language/is_active/roles/permissions) so `PATCH /admin/profile` returns exactly the
 * object the frontend already consumes from `GET /auth/me` — one identity contract, no drift.
 */
import type { UserRow } from './users.repository';

const iso = (d: Date | null): string | null => (d ? d.toISOString() : null);

export interface UserDto {
  id: string;
  email: string;
  full_name: string;
  preferred_language: 'en' | 'hi';
  is_active: boolean;
  roles: string[];
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

/** Role keys assigned to a user, in a stable (sorted) order. */
export function userRoleKeys(row: UserRow): string[] {
  return row.userRoles.map((ur) => ur.role.key).sort();
}

export function toUserDto(row: UserRow): UserDto {
  return {
    id: row.id,
    email: row.email,
    full_name: row.fullName,
    preferred_language: row.preferredLanguage,
    is_active: row.isActive,
    roles: userRoleKeys(row),
    last_login_at: iso(row.lastLoginAt),
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
  };
}
