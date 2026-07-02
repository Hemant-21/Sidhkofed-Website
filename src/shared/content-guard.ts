/**
 * Content-editor edit restriction (API spec §1.2 / §8): "A Content Editor may not alter an
 * already-published record into a draft edit through a generic PATCH" and "Editor may change a
 * draft parent; a publisher manages published parent items". Content Editors may only mutate a
 * record (or a record whose parent is) in the `draft` state; any non-draft state requires the
 * actor to hold the module's publish permission (i.e. Publisher) or be Super Admin.
 *
 * Enforced in the service layer (after the route-level permission check) so the rule holds for
 * standalone records (Programme, Toolkit) and for nested resources guarded by their parent's
 * state (Toolkit Item → parent Toolkit; Toolkit Distribution → parent Event).
 */
import { PermissionError } from './errors';
import type { ResolvedAuthorization } from '@/modules/auth/auth.types';

/** A record is freely editable by a Content Editor only while it is a draft. */
function isDraft(publicationState: string): boolean {
  return publicationState === 'draft';
}

/**
 * Throw `PermissionError` (→ 403) when a non-publisher actor tries to modify a non-draft record.
 * `authz` is the resolved authorization of the actor; when absent (non-HTTP callers such as seeds
 * or unit tests) the guard is a no-op because the route layer already gates HTTP access.
 */
export function assertEditableByActor(
  authz: ResolvedAuthorization | undefined,
  publicationState: string,
  publishPermission: string,
): void {
  if (!authz || authz.isSuperAdmin) return;
  if (isDraft(publicationState)) return;
  if (!authz.permissions.includes(publishPermission)) {
    throw new PermissionError(
      'Content Editors may modify draft content only; published content requires a Publisher.',
    );
  }
}
