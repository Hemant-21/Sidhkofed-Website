/**
 * Pure form ↔ API mapping for the user form (unit-testable; no React). Create sends the full body
 * (incl. password); edit sends only identity + roles (never the password — that is the dedicated
 * reset endpoint). Server-managed fields are never produced.
 */

import type { Language, User, UserCreateInput, UserUpdateInput } from './types';

export interface UserFormValues {
  email: string;
  full_name: string;
  password: string;
  preferred_language: Language;
  roles: string[];
  is_active: boolean;
}

export function emptyUserForm(): UserFormValues {
  return {
    email: '',
    full_name: '',
    password: '',
    preferred_language: 'en',
    roles: [],
    is_active: true,
  };
}

export function userToForm(u: User): UserFormValues {
  return {
    email: u.email,
    full_name: u.full_name,
    password: '',
    preferred_language: u.preferred_language,
    roles: u.roles,
    is_active: u.is_active,
  };
}

export function buildCreatePayload(v: UserFormValues): UserCreateInput {
  return {
    email: v.email.trim(),
    full_name: v.full_name.trim(),
    password: v.password,
    preferred_language: v.preferred_language,
    roles: v.roles,
    is_active: v.is_active,
  };
}

export function buildUpdatePayload(v: UserFormValues): UserUpdateInput {
  return {
    email: v.email.trim(),
    full_name: v.full_name.trim(),
    preferred_language: v.preferred_language,
    roles: v.roles,
  };
}
