/**
 * Role gate for Enquiries (API spec §8 / enquiries.routes.ts).
 *
 * Unlike most content modules, the enquiries admin router is authorized by ROLE, not by a
 * permission-string grant: `enquiryAdminRouter.use(authorize([super_admin, publisher]))`. The
 * backend does define `enquiries.manage` / `enquiries.export` keys (enquiries.permissions.ts), but
 * they are NOT seeded into any role's permission set — the route guard checks role membership
 * directly (see enquiries.rbac.test.ts). Content Editors have no default access.
 *
 * This mirrors the same role-gate pattern already used for `EVENT_ACTION_ROLES`
 * (features/events/permissions.ts) rather than a `<Can permission="…">` check, which would
 * resolve to false for every role since the permission strings are never actually granted.
 */
import { ROLE_KEYS } from '@/constants/permissions';

export const ENQUIRY_ROLES: string[] = [ROLE_KEYS.superAdmin, ROLE_KEYS.publisher];
