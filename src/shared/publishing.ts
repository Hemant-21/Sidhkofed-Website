/**
 * Publishing-workflow helpers shared by every content resource that carries the mixin
 * (schema Part 10). Computes the column changes for a lifecycle action and the audit
 * event name. `published_at` is set on first publish only and never reset.
 */
import { ConflictError } from '@/shared/errors';

export type LifecycleAction = 'publish' | 'unpublish' | 'archive' | 'restore';

export type PublicationState = 'draft' | 'published' | 'unpublished' | 'archived';

export interface LifecycleState {
  publicationState: PublicationState;
  publishedAt: Date | null;
  archivedAt: Date | null;
}

export interface LifecycleChange {
  publicationState: PublicationState;
  publishedAt?: Date;
  archivedAt: Date | null;
}

/**
 * The publication-workflow state machine (Issue 4). Maps the CURRENT state to the actions it
 * permits and the state each produces. Anything not listed is an INVALID transition and is
 * rejected with 409 Conflict — replacing the previous unconditional transitions. Rules:
 *
 *   draft        → publish (→published) | archive (→archived)
 *   published    → unpublish (→unpublished) | archive (→archived)
 *   unpublished  → publish (→published) | archive (→archived)
 *   archived     → restore (→unpublished)            (restore never auto-republishes)
 *
 * Re-publishing an already-published record, restoring a non-archived one, archiving an archived
 * one, or unpublishing something never published are all rejected.
 */
export const LIFECYCLE_TRANSITIONS: Record<PublicationState, Partial<Record<LifecycleAction, PublicationState>>> = {
  draft: { publish: 'published', archive: 'archived' },
  published: { unpublish: 'unpublished', archive: 'archived' },
  unpublished: { publish: 'published', archive: 'archived' },
  archived: { restore: 'unpublished' },
};

/** True when `action` is permitted from `state`. */
export function canTransition(state: PublicationState, action: LifecycleAction): boolean {
  return LIFECYCLE_TRANSITIONS[state]?.[action] !== undefined;
}

/**
 * Resolve the column changes for a lifecycle action from the current state, after validating the
 * transition against {@link LIFECYCLE_TRANSITIONS}. Throws {@link ConflictError} (409) on an
 * invalid transition.
 * - publish   → published, set publishedAt if first time, clear archive
 * - unpublish → unpublished
 * - archive   → archived + archivedAt=now
 * - restore   → unpublished + archivedAt cleared (safe: never auto-exposes; re-publish explicitly)
 */
export function applyLifecycle(current: LifecycleState, action: LifecycleAction): LifecycleChange {
  if (!canTransition(current.publicationState, action)) {
    throw new ConflictError(`Cannot ${action} a ${current.publicationState} record.`);
  }
  switch (action) {
    case 'publish':
      return {
        publicationState: 'published',
        archivedAt: null,
        ...(current.publishedAt ? {} : { publishedAt: new Date() }),
      };
    case 'unpublish':
      return { publicationState: 'unpublished', archivedAt: current.archivedAt };
    case 'archive':
      return { publicationState: 'archived', archivedAt: new Date() };
    case 'restore':
      return { publicationState: 'unpublished', archivedAt: null };
  }
}

/** The audit event name for a lifecycle action. */
export function lifecycleEvent(action: LifecycleAction): 'PUBLISH' | 'UNPUBLISH' | 'ARCHIVE' | 'RESTORE' {
  return action.toUpperCase() as 'PUBLISH' | 'UNPUBLISH' | 'ARCHIVE' | 'RESTORE';
}
