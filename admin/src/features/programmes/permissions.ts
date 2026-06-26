/**
 * Permission keys for Programmes. Unlike the generic content modules (documents/institutions/
 * events), the backend authorizes programmes with MODULE-SPECIFIC keys (`programmes.create`,
 * `programmes.publish`, …) — see programmes.routes.ts + auth.permissions.ts, which seed them and
 * grant them to Content Editor (view/create/update) and Publisher (view/update + lifecycle).
 *
 * These keys only mirror the backend seed; the backend remains the security boundary. They drive
 * permission-aware affordances via <Can>/usePermissions.
 */

import { modulePermissions } from '@/constants/permissions';

export const PROGRAMME_PERMS = modulePermissions('programmes');
