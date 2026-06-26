/**
 * User Management types — mirror the backend user DTO (API spec §6).
 * `GET|POST /admin/users`, `GET|PATCH /admin/users/{id}`. Super Admin only.
 * No password hash is ever returned. Deactivate, never delete users with history.
 */

/** The resource segment for admin user endpoints. */
export const USERS_RESOURCE = 'users';

/** A user as returned by the admin list/detail endpoints. */
export interface AdminUser {
  id: string;
  email: string;
  full_name: string;
  preferred_language: 'en' | 'hi';
  is_active: boolean;
  roles: string[];
  permissions: string[];
  created_at: string;
  updated_at: string;
  last_login_at: string | null;
}

/** Create user payload (`POST /admin/users`). */
export interface CreateUserPayload {
  email: string;
  full_name: string;
  password: string;
  preferred_language?: 'en' | 'hi';
  role_ids: string[];
}

/** Update user payload (`PATCH /admin/users/:id`). All fields optional. */
export interface UpdateUserPayload {
  full_name?: string;
  preferred_language?: 'en' | 'hi';
  is_active?: boolean;
  role_ids?: string[];
  password?: string;
}

/** A compact role reference returned within the user. */
export interface RoleRef {
  id: string;
  key: string;
  name: string;
}

/** Filter keys accepted by the admin users list. */
export const USER_FILTER_KEYS = ['search', 'is_active', 'role'] as const;
