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
    businessKeyExists: vi.fn(),
    membershipNumberExists: vi.fn(),
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
  repo.businessKeyExists.mockResolvedValue(false);
  repo.membershipNumberExists.mockResolvedValue(false);
  repo.institutionName.mockResolvedValue('JSLPS');
  repo.update.mockImplementation(async () => makeRow());
  repo.create.mockImplementation(async () => makeRow());
});

/** A Prisma P2002 unique-violation error, optionally targeting a specific constraint/columns. */
const p2002 = (target: string[]): Error =>
  Object.assign(new Error('Unique constraint failed'), { code: 'P2002', meta: { target } });

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

// ── Issue 1: duplicate prevention ───────────────────────────────────────────────
describe('membershipService — duplicate prevention (create/update)', () => {
  it('rejects a duplicate create on the business key (409) and does not insert', async () => {
    repo.businessKeyExists.mockResolvedValue(true);
    await expect(membershipService.create(baseCreate as never, ctx(editor))).rejects.toBeInstanceOf(
      ConflictError,
    );
    expect(repo.create).not.toHaveBeenCalled();
  });

  it('rejects a create whose membership number is already taken (409)', async () => {
    repo.membershipNumberExists.mockResolvedValue(true);
    await expect(
      membershipService.create({ ...baseCreate, membership_number: 'MEM-001' } as never, ctx(editor)),
    ).rejects.toBeInstanceOf(ConflictError);
    expect(repo.create).not.toHaveBeenCalled();
  });

  it('rejects a duplicate update on the business key, excluding the record itself (409)', async () => {
    repo.findById.mockResolvedValue(makeRow({ publicationState: 'draft' }));
    repo.businessKeyExists.mockResolvedValue(true);
    await expect(
      membershipService.update('m-1', { membership_type: 'nominal' }, ctx(editor)),
    ).rejects.toBeInstanceOf(ConflictError);
    // The duplicate check excludes the row being edited.
    expect(repo.businessKeyExists).toHaveBeenCalledWith(expect.anything(), 'm-1');
    expect(repo.update).not.toHaveBeenCalled();
  });

  it('does not re-check the business key when no key field is touched', async () => {
    repo.findById.mockResolvedValue(makeRow({ publicationState: 'draft' }));
    await membershipService.update('m-1', { display_order: 5 }, ctx(editor));
    expect(repo.businessKeyExists).not.toHaveBeenCalled();
  });

  // Dashboard count integrity: a duplicate must never be persisted, so reports #10–#13 cannot
  // double-count an institution.
  it('guarantees count integrity — a duplicate business key never reaches the database', async () => {
    repo.businessKeyExists.mockResolvedValue(true);
    await expect(membershipService.create(baseCreate as never, ctx(editor))).rejects.toBeInstanceOf(
      ConflictError,
    );
    expect(repo.create).not.toHaveBeenCalled();
    expect(repo.update).not.toHaveBeenCalled();
  });
});

describe('membershipService — race-condition mapping (P2002 → 409)', () => {
  it('maps a concurrent business-key violation on create to 409', async () => {
    repo.create.mockRejectedValueOnce(p2002(['institutional_memberships_business_key']));
    await expect(
      membershipService.create(baseCreate as never, ctx(editor)),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it('maps a concurrent membership-number violation on create to 409', async () => {
    repo.create.mockRejectedValueOnce(p2002(['membership_number']));
    await expect(
      membershipService.create({ ...baseCreate, membership_number: 'MEM-001' } as never, ctx(editor)),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it('maps a concurrent violation on update to 409', async () => {
    repo.findById.mockResolvedValue(makeRow({ publicationState: 'draft' }));
    repo.update.mockRejectedValueOnce(p2002(['institutional_memberships_business_key']));
    await expect(
      membershipService.update('m-1', { membership_type: 'nominal' }, ctx(editor)),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it('re-throws non-P2002 errors untouched', async () => {
    repo.create.mockRejectedValueOnce(new Error('some other failure'));
    await expect(membershipService.create(baseCreate as never, ctx(editor))).rejects.toThrow(
      'some other failure',
    );
  });
});

describe('membershipService.bulkUpload — duplicate detection', () => {
  beforeEach(() => {
    repo.transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => fn({}));
  });

  it('reports a row that duplicates an existing database record', async () => {
    repo.businessKeyExists.mockResolvedValue(true);
    const rows = [{ institution_id: INST, membership_level: 'sidhkofed', membership_type: 'primary' }];
    const result = await membershipService.bulkUpload(rows, ctx(editor));
    expect(result.created_count).toBe(0);
    expect(result.skipped_count).toBe(1);
    expect(result.errors[0].fields._).toBeDefined();
    expect(repo.create).not.toHaveBeenCalled();
  });

  it('rejects a duplicate appearing twice within the same batch (second row only)', async () => {
    const row = { institution_id: INST, membership_level: 'sidhkofed', membership_type: 'primary' };
    const result = await membershipService.bulkUpload([row, { ...row }], ctx(editor));
    expect(result.created_count).toBe(1); // first occurrence imported
    expect(result.skipped_count).toBe(1); // second occurrence rejected
    expect(result.errors.map((e) => e.row)).toEqual([1]);
    expect(repo.create).toHaveBeenCalledTimes(1);
  });

  it('rejects a duplicate membership number within the same batch', async () => {
    const rows = [
      { institution_id: INST, membership_level: 'sidhkofed', membership_type: 'primary', membership_number: 'MEM-1' },
      { institution_id: INST, membership_level: 'sidhkofed', membership_type: 'nominal', membership_number: 'MEM-1' },
    ];
    const result = await membershipService.bulkUpload(rows, ctx(editor));
    expect(result.created_count).toBe(1);
    expect(result.skipped_count).toBe(1);
    expect(result.errors[0].fields.membership_number).toBeDefined();
  });

  it('maps a concurrent unique violation inside the transaction to 409', async () => {
    repo.transaction.mockRejectedValueOnce(p2002(['institutional_memberships_business_key']));
    const rows = [{ institution_id: INST, membership_level: 'sidhkofed', membership_type: 'primary' }];
    await expect(membershipService.bulkUpload(rows, ctx(editor))).rejects.toBeInstanceOf(
      ConflictError,
    );
  });
});
