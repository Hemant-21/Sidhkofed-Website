/**
 * Publishing-workflow helpers shared by every content resource that carries the mixin
 * (schema Part 10). Computes the column changes for a lifecycle action and the audit
 * event name. `published_at` is set on first publish only and never reset.
 */
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
 * Resolve the column changes for a lifecycle action from the current state.
 * - publish   → published, set publishedAt if first time, clear archive
 * - unpublish → unpublished
 * - archive   → archived + archivedAt=now
 * - restore   → unpublished + archivedAt cleared (safe: never auto-exposes; re-publish explicitly)
 */
export function applyLifecycle(current: LifecycleState, action: LifecycleAction): LifecycleChange {
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
    default:
      return { publicationState: current.publicationState, archivedAt: current.archivedAt };
  }
}

/** The audit event name for a lifecycle action. */
export function lifecycleEvent(action: LifecycleAction): 'PUBLISH' | 'UNPUBLISH' | 'ARCHIVE' | 'RESTORE' {
  return action.toUpperCase() as 'PUBLISH' | 'UNPUBLISH' | 'ARCHIVE' | 'RESTORE';
}
