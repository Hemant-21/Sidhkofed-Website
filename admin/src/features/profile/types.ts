/**
 * Profile module types. The profile page reads from `GET /auth/me` (AuthUser) and writes
 * via `PATCH /admin/users/:id` (profile fields only) and a dedicated password change.
 * No separate "profile" endpoint exists — the CMS reuses the admin users endpoint.
 * Types mirror the backend user DTO exactly (API spec §6 / auth.dto.ts).
 */

import type { AuthUser } from '@/types/auth';

/** Re-export for feature-local clarity. */
export type { AuthUser };

/** Fields editable via `PATCH /admin/users/:id` (profile subset). */
export interface UpdateProfilePayload {
  full_name?: string;
  preferred_language?: 'en' | 'hi';
}

/** Password change payload for `PATCH /admin/users/:id`. */
export interface ChangePasswordPayload {
  password: string;
}
