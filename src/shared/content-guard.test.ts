/** Unit tests — content-editor edit restriction (draft-only edits for non-publishers). */
import { describe, it, expect } from 'vitest';
import { assertEditableByActor } from './content-guard';
import { PermissionError } from './errors';
import type { ResolvedAuthorization } from '@/modules/auth/auth.types';

const editor: ResolvedAuthorization = {
  roles: ['content_editor'],
  permissions: ['toolkits.create', 'toolkits.update'],
  isSuperAdmin: false,
};
const publisher: ResolvedAuthorization = {
  roles: ['publisher'],
  permissions: ['toolkits.update', 'toolkits.publish'],
  isSuperAdmin: false,
};
const superAdmin: ResolvedAuthorization = { roles: ['super_admin'], permissions: [], isSuperAdmin: true };

const PUBLISH = 'toolkits.publish';

describe('assertEditableByActor', () => {
  it('allows any actor to edit a draft', () => {
    expect(() => assertEditableByActor(editor, 'draft', PUBLISH)).not.toThrow();
    expect(() => assertEditableByActor(publisher, 'draft', PUBLISH)).not.toThrow();
  });

  it('blocks a content editor from editing non-draft content', () => {
    for (const state of ['published', 'unpublished', 'archived']) {
      expect(() => assertEditableByActor(editor, state, PUBLISH)).toThrow(PermissionError);
    }
  });

  it('allows a publisher (holds the publish permission) to edit published content', () => {
    expect(() => assertEditableByActor(publisher, 'published', PUBLISH)).not.toThrow();
    expect(() => assertEditableByActor(publisher, 'archived', PUBLISH)).not.toThrow();
  });

  it('always allows super admin', () => {
    expect(() => assertEditableByActor(superAdmin, 'published', PUBLISH)).not.toThrow();
  });

  it('is a no-op when authz is absent (non-HTTP callers: seeds/tests)', () => {
    expect(() => assertEditableByActor(undefined, 'published', PUBLISH)).not.toThrow();
  });
});
