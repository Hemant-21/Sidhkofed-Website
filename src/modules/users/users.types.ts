/**
 * Users module shared types — the framework-free filter/ordering contract used by the controller,
 * service, and repository (mirrors institutions.types.ts / documents.types.ts). Users are an
 * administration resource (not a publishable content **P** resource), so there is no publication
 * state or visibility predicate here — only identity, role assignment, and account status.
 */

/** Entity key used for the audit module name. */
export const USER_ENTITY = 'users';

/** Admin list filters. All optional; the repository only reads known keys. */
export interface UserFilters {
  /** Active/disabled account flag. */
  isActive?: boolean;
  /** Role key (super_admin / content_editor / publisher). */
  role?: string;
  /** Keyword search across email + full name. */
  search?: string;
}

/** Allowed ordering fields for user lists. */
export const USER_ORDERING_FIELDS = ['created_at', 'full_name', 'email', 'last_login_at'] as const;

export type UserOrderingField = (typeof USER_ORDERING_FIELDS)[number];
