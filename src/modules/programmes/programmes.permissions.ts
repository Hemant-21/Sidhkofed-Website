/**
 * Named permission keys for the programmes module (API spec §1.2/§8). Programmes are a
 * publishable **P** content resource; each protected endpoint checks its own module-specific
 * permission (`programmes.create`, …), seeded by the RBAC catalog. Super Admin bypasses.
 */
export const PROGRAMME_PERMISSIONS = {
  view: 'programmes.view',
  create: 'programmes.create',
  update: 'programmes.update',
  publish: 'programmes.publish',
  unpublish: 'programmes.unpublish',
  archive: 'programmes.archive',
  restore: 'programmes.restore',
} as const;
