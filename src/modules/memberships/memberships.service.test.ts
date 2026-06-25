/**
 * Unit tests — membership service: reference/master-activation validation, the District-Union
 * requirement (re-evaluated against effective state on PATCH), Content-Editor edit restriction,
 * lifecycle transitions, and bulk upload (validate-all → one transaction, skip+report invalid
 * rows). Repository + cross-module services are mocked (DB-free).
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { ResolvedAuthorization } from '@/modules/auth/auth.types';

const { repo, cache, audit } = vi.hoisted(() => ({
  repo: {
    slugExists: vi.fn(),
    findById: vi.fn(),
    update: vi.fn(),
    create: vi.fn(),
    validateReferences: vi.fn(),
    institutionName: vi.fn(),
    transaction: vi.fn(),
  },
  cache: { delByPrefix: vi.fn(), getJson: vi.fn(), setJson: vi.fn() },
  audit: { create: vi.fn(), update: vi.fn(), log: vi.fn() },
}));

vi.mock('./memberships.repository', () => ({ membershipRepository: repo }));
vi.mock('@/services/cache', () => ({ cacheService: cache }));
vi.mock('@/modules/audit/audit.service', () => ({ auditService: audit }));

import { membershipService } from './memberships.service';
import { PermissionError, ValidationError, ConflictError } from '@/shared/errors';

const NOW = new Date('2026-06-26T00:00:00.000Z');
const INST = '11111111-1111-4111-8111-111111111111';
const DU = '22222222-2222-4222-8222-222222222222';

function makeRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'm-1',
    slug: 'jslps-sidhkofed-primary',
    institutionId: INST,
    institution: { id: INST, slug: 'jslps', nameEn: 'JSLPS', nameHi: null },
    membershipLevel: 'sidhkofed',
    membershipType: 'primary',
    membershipNumber: null,
    districtId: null,
    district: null,
    districtUnionId: null,
    districtUnion: null,
    reportingPeriodId: null,
    reportingPeriod: null,
    status: 'active',
    joinDate: null,
    notesEn: null,
    notesHi: null,
    publicationState: 'published',
    publicVisibility: true,
    showOnHomepage: false,
    highlightType: null,
    displayOrder: null,
    publishStartAt: null,
    highlightStartAt: null,
    highlightEndAt: null,
    publishedAt: NOW,
    archivedAt: null,
    createdById: 'u-1',
    updatedById: 'u-1',
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

const authz = (over: Partial<ResolvedAuthorization>): ResolvedAuthorization =>
  ({ isSuperAdmin: false, roles: [], permissions: [], ...over }) as ResolvedAuthorization;
const editor = authz({ permissions: ['content.create', 'content.update'] });
const publisher = authz({ permissions: ['content.update', 'content.publish'] });
const ctx = (a?: ResolvedAuthorization) => ({ userId: 'u-1', authz: a });

beforeEach(() => {
  vi.clearAllMocks();
  repo.validateReferences.mockResolvedValue({});
  repo.slugExists.mockResolvedValue(false);
  repo.institutionName.mockResolvedValue('JSLPS');
  repo.update.mockImplementation(async () => makeRow());
  repo.create.mockImplementation(async () => makeRow());
});

const baseCreate = {
  institution_id: INST,
  membership_level: 'sidhkofed',
  membership_type: 'primary',
};

describe('membershipService.create — reference validation', () => {
  it('rejects a create referencing an inactive district (422)', async () => {
    repo.validateReferences.mockResolvedValue({ district_id: ['District is inactive.'] });
    await expect(membershipService.create(baseCreate as never, ctx(editor))).rejects.toBeInstanceOf(
      ValidationError,
    );
    expect(repo.create).not.toHaveBeenCalled();
  });
  it('rejects a create referencing a missing reporting period (422)', async () => {
    repo.validateReferences.mockResolvedValue({
      reporting_period_id: ['Reporting period not found.'],
    });
    await expect(membershipService.create(baseCreate as never, ctx(editor))).rejects.toBeInstanceOf(
      ValidationError,
    );
  });
  it('creates a valid membership and writes an audit entry', async () => {
    await membershipService.create(baseCreate as never, ctx(editor));
    expect(repo.create).toHaveBeenCalledTimes(1);
    expect(audit.create).toHaveBeenCalledTimes(1);
    expect(cache.delByPrefix).toHaveBeenCalled();
  });
});

describe('membershipService.update — Content Editor restriction', () => {
  it('rejects a Content Editor editing a PUBLISHED membership (403)', async () => {
    repo.findById.mockResolvedValue(makeRow({ publicationState: 'published' }));
    await expect(
      membershipService.update('m-1', { status: 'inactive' }, ctx(editor)),
    ).rejects.toBeInstanceOf(PermissionError);
  });
  it('allows a Publisher editing a PUBLISHED membership', async () => {
    repo.findById.mockResolvedValue(makeRow({ publicationState: 'published' }));
    await expect(
      membershipService.update('m-1', { status: 'inactive' }, ctx(publisher)),
    ).resolves.toBeDefined();
  });
});

describe('membershipService.update — effective District-Union rule', () => {
  it('rejects switching level to district_union without a DU org (422)', async () => {
    repo.findById.mockResolvedValue(makeRow({ publicationState: 'draft', districtUnionId: null }));
    await expect(
      membershipService.update('m-1', { membership_level: 'district_union' }, ctx(editor)),
    ).rejects.toBeInstanceOf(ValidationError);
  });
  it('allows switching to district_union when a persisted DU org already exists', async () => {
    repo.findById.mockResolvedValue(makeRow({ publicationState: 'draft', districtUnionId: DU }));
    await expect(
      membershipService.update('m-1', { membership_level: 'district_union' }, ctx(editor)),
    ).resolves.toBeDefined();
  });
});

describe('membershipService.lifecycle', () => {
  it('rejects an invalid transition (publish an already-published record → 409)', async () => {
    repo.findById.mockResolvedValue(makeRow({ publicationState: 'published' }));
    await expect(
      membershipService.lifecycle('m-1', 'publish', ctx(publisher)),
    ).rejects.toBeInstanceOf(ConflictError);
  });
  it('archives a published membership and logs the lifecycle audit', async () => {
    repo.findById.mockResolvedValue(makeRow({ publicationState: 'published' }));
    await membershipService.lifecycle('m-1', 'archive', ctx(publisher));
    expect(audit.log).toHaveBeenCalledWith(
      'ARCHIVE',
      expect.anything(),
      expect.objectContaining({ module: 'institutional_membership' }),
    );
  });
});

describe('membershipService.bulkUpload', () => {
  it('creates valid rows in one transaction and reports invalid/inactive-reference rows', async () => {
    // Row 1 valid; row 2 invalid shape (bad enum); row 3 references inactive district.
    repo.transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => fn({}));
    repo.validateReferences.mockImplementation(async (refs: { districtId?: string | null }) =>
      refs.districtId === 'inactive' ? { district_id: ['District is inactive.'] } : {},
    );
    const rows = [
      { institution_id: INST, membership_level: 'sidhkofed', membership_type: 'primary' },
      { institution_id: INST, membership_level: 'sidhkofed', membership_type: 'gold' },
      {
        institution_id: INST,
        membership_level: 'sidhkofed',
        membership_type: 'primary',
        district_id: 'inactive',
      },
    ];
    const result = await membershipService.bulkUpload(rows, ctx(editor));
    expect(result.created_count).toBe(1);
    expect(result.skipped_count).toBe(2);
    expect(result.errors.map((e) => e.row).sort()).toEqual([1, 2]);
    expect(repo.create).toHaveBeenCalledTimes(1);
  });
  it('does not open a transaction when every row is invalid', async () => {
    const rows = [
      { institution_id: INST, membership_level: 'district_union', membership_type: 'primary' },
    ]; // missing DU
    const result = await membershipService.bulkUpload(rows, ctx(editor));
    expect(result.created_count).toBe(0);
    expect(result.skipped_count).toBe(1);
    expect(repo.transaction).not.toHaveBeenCalled();
  });
});
