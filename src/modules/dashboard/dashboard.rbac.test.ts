/**
 * Unit tests — dashboard RBAC config (Issue 2). The report lifecycle uses dedicated `dashboard.*`
 * keys (not `content.*`), and the data surface is gated by `dashboard.manage_data`. Verifies the
 * permission catalog and the default role grants for Publisher, Content Editor and Super Admin
 * (Super Admin is the allow-all wildcard, intentionally absent from ROLE_PERMISSIONS).
 */
import { describe, it, expect } from 'vitest';
import { PERMISSIONS, ROLE_PERMISSIONS } from '@/modules/auth/auth.permissions';
import { DASHBOARD_PERMISSIONS } from './dashboard.permissions';

const keys = new Set(PERMISSIONS.map((p) => p.key));
const LIFECYCLE = [
  DASHBOARD_PERMISSIONS.publish,
  DASHBOARD_PERMISSIONS.unpublish,
  DASHBOARD_PERMISSIONS.archive,
  DASHBOARD_PERMISSIONS.restore,
];

describe('dashboard permission catalog', () => {
  it('seeds the dedicated lifecycle keys and the data grant', () => {
    for (const k of [...LIFECYCLE, DASHBOARD_PERMISSIONS.manageData]) {
      expect(keys.has(k)).toBe(true);
    }
  });
});

describe('default role grants', () => {
  it('grants the Publisher every dashboard lifecycle key plus the data grant', () => {
    const pub = ROLE_PERMISSIONS.publisher;
    for (const k of [...LIFECYCLE, DASHBOARD_PERMISSIONS.manageData]) {
      expect(pub).toContain(k);
    }
  });

  it('does NOT grant a Content Editor the dashboard data permission by default (explicit grant only)', () => {
    expect(ROLE_PERMISSIONS.content_editor).not.toContain(DASHBOARD_PERMISSIONS.manageData);
    for (const k of LIFECYCLE) expect(ROLE_PERMISSIONS.content_editor).not.toContain(k);
  });

  it('does not bind Super Admin in ROLE_PERMISSIONS (wildcard covers every permission)', () => {
    expect((ROLE_PERMISSIONS as Record<string, unknown>).super_admin).toBeUndefined();
  });
});
