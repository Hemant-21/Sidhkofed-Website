/**
<<<<<<< HEAD
 * Users module types — mirror of the backend Users DTO + validators (users.dto.ts /
 * users.validators.ts). Administration resource (not publishable content): identity, preferred
 * language, account status, and assigned role keys. The password hash never crosses the boundary.
 */

export type Language = 'en' | 'hi';

/** Assignable role keys (the three seeded system roles). */
export const ASSIGNABLE_ROLES = ['super_admin', 'content_editor', 'publisher'] as const;
export type AssignableRole = (typeof ASSIGNABLE_ROLES)[number];

export const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin',
  content_editor: 'Content Editor',
  publisher: 'Publisher',
};

export interface User {
  id: string;
  email: string;
  full_name: string;
  preferred_language: Language;
  is_active: boolean;
  roles: string[];
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

/** `POST /admin/users` body. */
export interface UserCreateInput {
  email: string;
  full_name: string;
  password: string;
  preferred_language?: Language;
  roles: string[];
  is_active?: boolean;
}

/** `PATCH /admin/users/:id` body (partial). */
export interface UserUpdateInput {
  email?: string;
  full_name?: string;
  preferred_language?: Language;
  roles?: string[];
}
=======
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
>>>>>>> d476bcebf175f0a60e2572959456e7339f1461f3
