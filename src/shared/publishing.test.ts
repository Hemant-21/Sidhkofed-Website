/**
 * Unit tests — publication-workflow state machine (Issue 4). Proves the explicit transition
 * validation: every (state × action) pair either produces the documented next state or is rejected
 * with a 409 ConflictError. Replaces the previous unconditional transitions.
 */
import { describe, it, expect } from 'vitest';
import {
  applyLifecycle,
  canTransition,
  LIFECYCLE_TRANSITIONS,
  type LifecycleAction,
  type PublicationState,
} from './publishing';
import { ConflictError } from './errors';

const STATES: PublicationState[] = ['draft', 'published', 'unpublished', 'archived'];
const ACTIONS: LifecycleAction[] = ['publish', 'unpublish', 'archive', 'restore'];

/** The expected transition matrix (mirrors the documented state machine). */
const VALID: Record<PublicationState, Partial<Record<LifecycleAction, PublicationState>>> = {
  draft: { publish: 'published', archive: 'archived' },
  published: { unpublish: 'unpublished', archive: 'archived' },
  unpublished: { publish: 'published', archive: 'archived' },
  archived: { restore: 'unpublished' },
};

const state = (publicationState: PublicationState, publishedAt: Date | null = null) => ({
  publicationState,
  publishedAt,
  archivedAt: publicationState === 'archived' ? new Date() : null,
});

describe('publication-workflow state machine — every state × action', () => {
  for (const from of STATES) {
    for (const action of ACTIONS) {
      const expected = VALID[from][action];
      if (expected) {
        it(`allows ${action} from ${from} → ${expected}`, () => {
          expect(canTransition(from, action)).toBe(true);
          const change = applyLifecycle(state(from), action);
          expect(change.publicationState).toBe(expected);
        });
      } else {
        it(`rejects ${action} from ${from} with 409`, () => {
          expect(canTransition(from, action)).toBe(false);
          expect(() => applyLifecycle(state(from), action)).toThrow(ConflictError);
        });
      }
    }
  }
});

describe('publication-workflow column changes', () => {
  it('sets published_at on first publish only', () => {
    expect(applyLifecycle(state('draft'), 'publish').publishedAt).toBeInstanceOf(Date);
  });

  it('never resets published_at when re-publishing from unpublished', () => {
    const original = new Date('2026-01-01T00:00:00Z');
    expect(applyLifecycle(state('unpublished', original), 'publish').publishedAt).toBeUndefined();
  });

  it('publish clears archivedAt', () => {
    expect(applyLifecycle(state('unpublished'), 'publish').archivedAt).toBeNull();
  });

  it('archive stamps archivedAt', () => {
    expect(applyLifecycle(state('published'), 'archive').archivedAt).toBeInstanceOf(Date);
  });

  it('restore clears archivedAt and lands in unpublished (never auto-republishes)', () => {
    const change = applyLifecycle(state('archived'), 'restore');
    expect(change.publicationState).toBe('unpublished');
    expect(change.archivedAt).toBeNull();
  });

  it('the exported transition table matches the documented matrix', () => {
    expect(LIFECYCLE_TRANSITIONS).toEqual(VALID);
  });
});
