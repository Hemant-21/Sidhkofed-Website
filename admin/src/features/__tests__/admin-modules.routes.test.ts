/**
 * Route-level tests for the Administration / Engagement modules added in the Phase-16 readiness
 * remediation (memberships, dashboard-data, masters, users, audit-log, settings).
 *
 * Verifies:
 *  - every navigation item points at a path declared in ROUTES (no dangling menu items),
 *  - each newly added module route resolves to a page module that default-exports a component,
 *  - administration menu items that must be Super-Admin-only carry the role restriction.
 *
 * These are import/config assertions (no DOM render), so they are fast and deterministic and fail
 * loudly if a route file or its feature export is removed/renamed.
 */
import { describe, it, expect } from 'vitest';
import { NAVIGATION } from '@/config/navigation';
import { ROUTES } from '@/constants/routes';
import { ROLE_KEYS } from '@/constants/permissions';

// Page modules for the six remediated routes. Importing them proves the route exists, the feature
// barrel resolves, and the module compiles/loads.
import MembershipsRoute from '@/app/(admin)/memberships/page';
import NewMembershipRoute from '@/app/(admin)/memberships/new/page';
import MembershipDetailRoute from '@/app/(admin)/memberships/[id]/page';
import EditMembershipRoute from '@/app/(admin)/memberships/[id]/edit/page';
import DashboardDataRoute from '@/app/(admin)/dashboard-data/page';
import MastersRoute from '@/app/(admin)/masters/page';
import UsersRoute from '@/app/(admin)/users/page';
import NewUserRoute from '@/app/(admin)/users/new/page';
import EditUserRoute from '@/app/(admin)/users/[id]/edit/page';
import AuditLogRoute from '@/app/(admin)/audit-log/page';
import SettingsRoute from '@/app/(admin)/settings/page';

describe('navigation reachability', () => {
  const routeValues = new Set(Object.values(ROUTES));

  it('every navigation href is a declared route (no dangling menu items)', () => {
    for (const section of NAVIGATION) {
      for (const item of section.items) {
        expect(routeValues.has(item.href), `nav item "${item.key}" → ${item.href}`).toBe(true);
      }
    }
  });

  it('exposes the six remediated module routes', () => {
    for (const key of ['memberships', 'dashboardData', 'masters', 'users', 'auditLog', 'settings'] as const) {
      expect(ROUTES[key]).toBeTruthy();
    }
  });
});

describe('module route pages exist and export a component', () => {
  it.each([
    ['memberships', MembershipsRoute],
    ['memberships/new', NewMembershipRoute],
    ['memberships/[id]', MembershipDetailRoute],
    ['memberships/[id]/edit', EditMembershipRoute],
    ['dashboard-data', DashboardDataRoute],
    ['masters', MastersRoute],
    ['users', UsersRoute],
    ['users/new', NewUserRoute],
    ['users/[id]/edit', EditUserRoute],
    ['audit-log', AuditLogRoute],
    ['settings', SettingsRoute],
  ])('route %s default-exports a component', (_name, mod) => {
    expect(typeof mod).toBe('function');
  });
});

describe('RBAC affordances in navigation', () => {
  const adminItems = NAVIGATION.find((s) => s.key === 'administration')?.items ?? [];

  it.each(['users', 'audit-log', 'settings'])('admin item "%s" is restricted to Super Admin', (key) => {
    const item = adminItems.find((i) => i.key === key);
    expect(item?.roles).toContain(ROLE_KEYS.superAdmin);
  });
});
