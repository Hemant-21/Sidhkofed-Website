/** Unit tests — RBAC catalog: Phase-7 module-specific permissions are seeded and granted. */
import { describe, it, expect } from 'vitest';
import { PERMISSIONS, ROLE_PERMISSIONS } from './auth.permissions';

const keys = new Set(PERMISSIONS.map((p) => p.key));

describe('PERMISSIONS catalog', () => {
  it('includes module-specific keys for the four Phase-7 modules (API spec §1.2/§8)', () => {
    for (const k of [
      'programmes.create', 'programmes.update', 'programmes.publish', 'programmes.unpublish',
      'programmes.archive', 'programmes.restore', 'programmes.view',
      'toolkits.create', 'toolkits.update', 'toolkits.publish', 'toolkits.unpublish',
      'toolkits.archive', 'toolkits.restore', 'toolkits.view',
      'toolkit_items.create', 'toolkit_items.update', 'toolkit_items.delete', 'toolkit_items.view',
      'toolkit_distributions.create', 'toolkit_distributions.update', 'toolkit_distributions.delete', 'toolkit_distributions.view',
    ]) {
      expect(keys.has(k)).toBe(true);
    }
  });

  it('retains the generic content.* keys still used by other modules (backward compatible)', () => {
    for (const k of ['content.create', 'content.update', 'content.publish', 'content.archive']) {
      expect(keys.has(k)).toBe(true);
    }
  });

  it('every key maps to a `module.action` pair', () => {
    for (const p of PERMISSIONS) expect(p.key).toBe(`${p.module}.${p.action}`);
  });
});

describe('ROLE_PERMISSIONS defaults', () => {
  it('grants content editors create/update (not publish) on Phase-7 modules', () => {
    const editor = new Set(ROLE_PERMISSIONS.content_editor);
    expect(editor.has('programmes.create')).toBe(true);
    expect(editor.has('toolkits.update')).toBe(true);
    expect(editor.has('programmes.publish')).toBe(false);
    expect(editor.has('toolkits.publish')).toBe(false);
  });

  it('grants publishers the publish lifecycle on Phase-7 modules', () => {
    const pub = new Set(ROLE_PERMISSIONS.publisher);
    expect(pub.has('programmes.publish')).toBe(true);
    expect(pub.has('toolkits.archive')).toBe(true);
    expect(pub.has('programmes.create')).toBe(false); // create is an editor action
  });

  it('does not grant super_admin explicitly (it is seeded all + wildcard in code)', () => {
    expect(ROLE_PERMISSIONS).not.toHaveProperty('super_admin');
  });
});
