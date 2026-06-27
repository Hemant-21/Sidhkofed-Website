/**
 * Named permission keys for the enquiries module (API spec §8).
 *
 * Enquiries are NOT publishable content. RBAC: "Publisher and Super Admin may manage it;
 * editors have no default access." (API spec §8 RBAC matrix). The module does not use the
 * generic `content.*` permission set — it maps onto `enquiries.manage` for read/patch/archive
 * and `enquiries.export` for XLSX export, both seeded under the Publisher + Super Admin roles.
 */
export const ENQUIRY_PERMISSIONS = {
  manage: 'enquiries.manage',
  export: 'enquiries.export',
} as const;
