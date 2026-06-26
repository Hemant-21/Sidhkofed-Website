/**
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
