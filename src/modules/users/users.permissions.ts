/**
 * Named permission key for the Users administration module.
 *
 * User management is an administration grant (CMS requirements §7 "manage users"). It reuses the
 * SEEDED `users.manage` permission already in the RBAC catalog (auth.permissions.ts), so no
 * re-seed is required (development-rules §3). By default only Super Admin holds it
 * (super_admin is an allow-all wildcard); Content Editor and Publisher do NOT, so they are
 * blocked from every `/admin/users/*` route. Self-service profile routes are gated by
 * authentication only — any signed-in user may edit their OWN profile/password.
 */
export const USER_PERMISSIONS = {
  manage: 'users.manage',
} as const;
