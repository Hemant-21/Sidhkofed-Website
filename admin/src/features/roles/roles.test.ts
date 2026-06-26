import { describe, expect, it } from 'vitest';
import {
  ROLE_DEFINITIONS,
  PERMISSION_DEFINITIONS,
  ROLE_PERMISSION_MAP,
  MODULE_ORDER,
} from './types';

describe('ROLE_DEFINITIONS', () => {
  it('includes the three seeded roles', () => {
    const keys = ROLE_DEFINITIONS.map((r) => r.key);
    expect(keys).toContain('super_admin');
    expect(keys).toContain('publisher');
    expect(keys).toContain('content_editor');
  });

  it('marks super_admin as wildcard', () => {
    const superAdmin = ROLE_DEFINITIONS.find((r) => r.key === 'super_admin');
    expect(superAdmin?.isWildcard).toBe(true);
  });

  it('does not mark other roles as wildcard', () => {
    const others = ROLE_DEFINITIONS.filter((r) => r.key !== 'super_admin');
    expect(others.every((r) => !r.isWildcard)).toBe(true);
  });
});

describe('PERMISSION_DEFINITIONS', () => {
  it('has unique permission keys', () => {
    const keys = PERMISSION_DEFINITIONS.map((p) => p.key);
    const unique = new Set(keys);
    expect(unique.size).toBe(keys.length);
  });

  it('each key matches module.action format', () => {
    for (const p of PERMISSION_DEFINITIONS) {
      expect(p.key).toBe(`${p.module}.${p.action}`);
    }
  });

  it('covers all modules in MODULE_ORDER', () => {
    const definedModules = new Set(PERMISSION_DEFINITIONS.map((p) => p.module));
    for (const m of MODULE_ORDER) {
      expect(definedModules.has(m)).toBe(true);
    }
  });
});

describe('ROLE_PERMISSION_MAP', () => {
  it('content_editor can create and update but not publish', () => {
    const perms = ROLE_PERMISSION_MAP.content_editor;
    expect(perms.has('content.create')).toBe(true);
    expect(perms.has('content.update')).toBe(true);
    expect(perms.has('content.publish')).toBe(false);
    expect(perms.has('content.archive')).toBe(false);
  });

  it('publisher can publish, archive, restore but not create', () => {
    const perms = ROLE_PERMISSION_MAP.publisher;
    expect(perms.has('content.publish')).toBe(true);
    expect(perms.has('content.archive')).toBe(true);
    expect(perms.has('content.restore')).toBe(true);
    expect(perms.has('content.create')).toBe(false);
  });

  it('neither role has users.manage or settings.manage', () => {
    expect(ROLE_PERMISSION_MAP.content_editor.has('users.manage')).toBe(false);
    expect(ROLE_PERMISSION_MAP.publisher.has('users.manage')).toBe(false);
    expect(ROLE_PERMISSION_MAP.content_editor.has('settings.manage')).toBe(false);
    expect(ROLE_PERMISSION_MAP.publisher.has('settings.manage')).toBe(false);
  });

  it('publisher has dashboard permissions', () => {
    const perms = ROLE_PERMISSION_MAP.publisher;
    expect(perms.has('dashboard.publish')).toBe(true);
    expect(perms.has('dashboard.manage_data')).toBe(true);
  });

  it('content_editor does not have dashboard permissions', () => {
    const perms = ROLE_PERMISSION_MAP.content_editor;
    expect(perms.has('dashboard.publish')).toBe(false);
    expect(perms.has('dashboard.manage_data')).toBe(false);
  });

  it('all mapped permission keys exist in PERMISSION_DEFINITIONS', () => {
    const allKeys = new Set(PERMISSION_DEFINITIONS.map((p) => p.key));
    for (const [, perms] of Object.entries(ROLE_PERMISSION_MAP)) {
      for (const key of perms) {
        expect(allKeys.has(key), `Unknown permission key in map: ${key}`).toBe(true);
      }
    }
  });
});
