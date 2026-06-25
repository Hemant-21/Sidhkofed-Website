/**
 * Named permission keys for the toolkits module (API spec §1.2/§8). Toolkits are a publishable
 * **P** content resource and enforce their own module-specific permissions; the nested catalogue
 * items carry `toolkit_items.*` CRUD keys (no publish lifecycle of their own — they follow the
 * parent toolkit). Seeded by the RBAC catalog. Super Admin bypasses.
 */
export const TOOLKIT_PERMISSIONS = {
  view: 'toolkits.view',
  create: 'toolkits.create',
  update: 'toolkits.update',
  publish: 'toolkits.publish',
  unpublish: 'toolkits.unpublish',
  archive: 'toolkits.archive',
  restore: 'toolkits.restore',
} as const;

export const TOOLKIT_ITEM_PERMISSIONS = {
  view: 'toolkit_items.view',
  create: 'toolkit_items.create',
  update: 'toolkit_items.update',
  delete: 'toolkit_items.delete',
} as const;
