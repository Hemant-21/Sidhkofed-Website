/**
 * Authentication & authorization types. These mirror the backend `AuthUserDto`
 * (src/modules/auth/auth.dto.ts) and the `/auth/login|refresh|me` contracts
 * exactly. `roles`/`permissions` are flat string arrays — the backend is the
 * single source of truth; the frontend never defines permissions itself.
 */

import type { Language } from './common';

/** A permission key, e.g. `events.create`, `documents.archive` (`module.action`). */
export type Permission = string;

/** A role key, e.g. `super_admin`, `content_editor`, `publisher`. */
export type Role = string;

/** The authenticated user (matches backend AuthUserDto). */
export interface AuthUser {
  id: string;
  email: string;
  full_name: string;
  preferred_language: Language;
  is_active: boolean;
  roles: Role[];
  permissions: Permission[];
}

/** `POST /auth/login` & `POST /auth/refresh` success payload (`data`). */
export interface AuthSession {
  access_token: string;
  expires_in: number;
  token_type: 'Bearer';
  user: AuthUser;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

/** Phases of the client auth lifecycle. */
export type AuthStatus =
  | 'idle' // not yet attempted session restore
  | 'restoring' // calling /auth/refresh on boot
  | 'authenticated'
  | 'unauthenticated';
