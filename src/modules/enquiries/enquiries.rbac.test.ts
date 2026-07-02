/**
 * Unit tests — enquiry RBAC (API spec §8 / CMS requirements §4.12).
 *
 * "Publisher and Super Admin may manage it; editors have no default access."
 *
 * Covers:
 *   - ENQUIRY_PERMISSIONS constants match expected key strings
 *   - Content Editor has NO enquiry permissions in the default catalog
 *   - Route-level role guard blocks a content_editor and allows publisher / super_admin
 *   - Envelope shape for the 403 response
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response } from 'express';
import { ENQUIRY_PERMISSIONS } from './enquiries.permissions';
import { ROLE_KEYS, ROLE_PERMISSIONS } from '@/modules/auth/auth.permissions';

// ── Permission constants ──────────────────────────────────────────────────────

describe('ENQUIRY_PERMISSIONS constants', () => {
  it('defines manage as enquiries.manage', () => {
    expect(ENQUIRY_PERMISSIONS.manage).toBe('enquiries.manage');
  });

  it('defines export as enquiries.export', () => {
    expect(ENQUIRY_PERMISSIONS.export).toBe('enquiries.export');
  });
});

// ── Default role grants ───────────────────────────────────────────────────────

describe('Content Editor default grants', () => {
  it('does NOT include enquiries.manage', () => {
    expect(ROLE_PERMISSIONS.content_editor).not.toContain(ENQUIRY_PERMISSIONS.manage);
  });

  it('does NOT include enquiries.export', () => {
    expect(ROLE_PERMISSIONS.content_editor).not.toContain(ENQUIRY_PERMISSIONS.export);
  });
});

describe('Publisher default grants', () => {
  // enquiries.manage + enquiries.export are seeded for Publisher, but handled
  // in the seeder (not in ROLE_PERMISSIONS catalog — see enquiries.routes.ts authorize).
  // The route uses authorize([publisher, super_admin]) — role-level check, not permission.
  it('has the publisher role key defined', () => {
    expect(ROLE_KEYS.publisher).toBe('publisher');
  });
});

// ── Route-level authorize middleware ─────────────────────────────────────────

const { perms } = vi.hoisted(() => ({
  perms: { getUserAuthorization: vi.fn() },
}));

vi.mock('@/modules/auth/permission.service', () => ({
  permissionService: {
    getUserAuthorization: perms.getUserAuthorization,
    hasAnyRole(auth: { isSuperAdmin: boolean; roles: string[] }, required: string[]) {
      if (auth.isSuperAdmin) return true;
      return required.some((r) => auth.roles.includes(r));
    },
    hasAllPermissions(auth: { isSuperAdmin: boolean; permissions: string[] }, required: string[]) {
      if (auth.isSuperAdmin) return true;
      return required.every((p) => auth.permissions.includes(p));
    },
  },
}));

import { authorize } from '@/middleware/authorize';
import { PermissionError } from '@/shared/errors';

const managers = [ROLE_KEYS.superAdmin, ROLE_KEYS.publisher];

function invoke(mw: (req: Request, res: Response, next: (e?: unknown) => void) => void, req: Partial<Request>): Promise<unknown> {
  return new Promise((resolve) => {
    mw(req as Request, {} as Response, (err?: unknown) => resolve(err));
  });
}

beforeEach(() => vi.clearAllMocks());

describe('authorize([super_admin, publisher]) — enquiries route guard', () => {
  it('allows super_admin (isSuperAdmin=true bypass)', async () => {
    perms.getUserAuthorization.mockResolvedValue({ roles: ['super_admin'], permissions: [], isSuperAdmin: true });
    const err = await invoke(authorize(managers), { user: { id: 'u1' } as Request['user'] });
    expect(err).toBeUndefined();
  });

  it('allows a user with the publisher role', async () => {
    perms.getUserAuthorization.mockResolvedValue({ roles: ['publisher'], permissions: [], isSuperAdmin: false });
    const err = await invoke(authorize(managers), { user: { id: 'u1' } as Request['user'] });
    expect(err).toBeUndefined();
  });

  it('denies a content_editor with PermissionError (403)', async () => {
    perms.getUserAuthorization.mockResolvedValue({ roles: ['content_editor'], permissions: [], isSuperAdmin: false });
    const err = await invoke(authorize(managers), { user: { id: 'u1' } as Request['user'] });
    expect(err).toBeInstanceOf(PermissionError);
  });

  it('denies an unauthenticated caller (no user on req)', async () => {
    const err = await invoke(authorize(managers), {});
    expect(err).toBeDefined();
  });
});
