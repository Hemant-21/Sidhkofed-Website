/**
 * Profile API. Profile reads come from `GET /auth/me` via authService; writes go to
 * `PATCH /admin/users/:id` (the standard user-management endpoint). The user's own ID
 * is sourced from the auth context at call time.
 */

import { get, patch } from '@/lib/api/http';
import type { AuthUser } from '@/types/auth';
import type { ChangePasswordPayload, UpdateProfilePayload } from './types';

/** Read the current user's full profile (matches AuthUserDto). */
export async function fetchMe(): Promise<AuthUser> {
  return get<AuthUser>('/auth/me');
}

/** Update profile fields (name, preferred_language) for a given user ID. */
export async function updateProfile(id: string, payload: UpdateProfilePayload): Promise<AuthUser> {
  return patch<AuthUser, UpdateProfilePayload>(`/admin/users/${encodeURIComponent(id)}`, payload);
}

/** Change the current user's password. */
export async function changePassword(id: string, payload: ChangePasswordPayload): Promise<AuthUser> {
  return patch<AuthUser, ChangePasswordPayload>(`/admin/users/${encodeURIComponent(id)}`, payload);
}
