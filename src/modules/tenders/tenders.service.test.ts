/**
 * Unit tests — tender service: Content-Editor edit restriction, reference validation, and the rule
 * that an expired tender stays published until a Publisher unpublishes/archives it (no auto-expiry).
 * Repository + cross-module services are mocked, so these run DB-free.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { ResolvedAuthorization } from '@/modules/auth/auth.types';

const { repo, cache, audit } = vi.hoisted(() => ({
  repo: {
    slugExists: vi.fn(),
    tenderNumberExists: vi.fn(),
    findById: vi.fn(),
    update: vi.fn(),
    create: vi.fn(),
    validateReferences: vi.fn(),
  },
  cache: { delByPrefix: vi.fn(), getJson: vi.fn(), setJson: vi.fn() },
  audit: { create: vi.fn(), update: vi.fn(), log: vi.fn() },
}));

vi.mock('./tenders.repository', () => ({ tenderRepository: repo }));
vi.mock('@/services/cache', () => ({ cacheService: cache }));
vi.mock('@/modules/audit/audit.service', () => ({ auditService: audit }));

import { tenderService } from './tenders.service';
import { PermissionError, ValidationError, ConflictError } from '@/shared/errors';

const NOW = new Date('2026-06-25T00:00:00.000Z');
const TYPE = '44444444-4444-4444-8444-444444444444';

function makeRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 't-1',
    slug: 'tender-1',
    titleEn: 'Tender 1',
    titleHi: null,
    summaryEn: null,
    summaryHi: null,
    tenderType: { id: TYPE, slug: 'goods', nameEn: 'Goods', nameHi: null },
    tenderNumber: null,
    publishDate: null,
    submissionDeadline: new Date('2026-01-01T00:00:00.000Z'), // deadline passed
    openingDate: null,
    tenderStatus: 'closed',
    gemUrl: null,
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
  ({ isSuperAdmin: false, roles: [], permissions: [], ...over } as ResolvedAuthorization);
const editor = authz({ permissions: ['content.create', 'content.update'] });
const publisher = authz({ permissions: ['content.update', 'content.publish'] });
const ctx = (a: ResolvedAuthorization) => ({ userId: 'u-1', authz: a });

beforeEach(() => {
  vi.clearAllMocks();
  repo.validateReferences.mockResolvedValue({});
  repo.slugExists.mockResolvedValue(false);
  repo.tenderNumberExists.mockResolvedValue(false);
  repo.update.mockImplementation(async () => makeRow());
  repo.create.mockImplementation(async () => makeRow());
});

const TYPE_ARG = { title_en: 'X', tender_type_id: TYPE } as never;
const uniqueViolation = () =>
  Object.assign(new Error('Unique constraint failed'), { code: 'P2002', meta: { target: ['tender_number'] } });

describe('tenderService — tender number uniqueness (Issue 2)', () => {
  it('rejects a create with a duplicate tender number (409)', async () => {
    repo.tenderNumberExists.mockResolvedValue(true);
    await expect(
      tenderService.create({ ...TYPE_ARG, tender_number: 'TND/2026/001' } as never, ctx(editor)),
    ).rejects.toBeInstanceOf(ConflictError);
    expect(repo.create).not.toHaveBeenCalled();
  });

  it('rejects an update that sets an existing tender number (409)', async () => {
    repo.findById.mockResolvedValue(makeRow({ tenderNumber: 'TND/2026/000' }));
    repo.tenderNumberExists.mockResolvedValue(true);
    await expect(
      tenderService.update('t-1', { tender_number: 'TND/2026/001' }, ctx(publisher)),
    ).rejects.toBeInstanceOf(ConflictError);
    expect(repo.update).not.toHaveBeenCalled();
  });

  it('excludes the record itself — re-submitting the same number is not a conflict', async () => {
    repo.findById.mockResolvedValue(makeRow({ tenderNumber: 'TND/2026/001' }));
    await tenderService.update('t-1', { tender_number: 'TND/2026/001' }, ctx(publisher));
    expect(repo.tenderNumberExists).not.toHaveBeenCalled();
    expect(repo.update).toHaveBeenCalled();
  });

  it('treats tender numbers as case-insensitive — a case-variant of an existing number conflicts (409)', async () => {
    // The repository's existence check is case-insensitive (citext); here it reports a match.
    repo.tenderNumberExists.mockResolvedValue(true);
    await expect(
      tenderService.create({ ...TYPE_ARG, tender_number: 'tnd/2026/001' } as never, ctx(editor)),
    ).rejects.toBeInstanceOf(ConflictError);
    expect(repo.create).not.toHaveBeenCalled();
  });

  it('lets a record re-save its own number in a different case (self excluded)', async () => {
    repo.findById.mockResolvedValue(makeRow({ tenderNumber: 'TND/2026/001' }));
    repo.tenderNumberExists.mockResolvedValue(false);
    await tenderService.update('t-1', { tender_number: 'tnd/2026/001' }, ctx(publisher));
    expect(repo.tenderNumberExists).toHaveBeenCalledWith('tnd/2026/001', 't-1');
    expect(repo.update).toHaveBeenCalled();
  });

  it('allows a create with a NULL tender number (no uniqueness check)', async () => {
    await tenderService.create({ ...TYPE_ARG, tender_number: null } as never, ctx(editor));
    expect(repo.tenderNumberExists).not.toHaveBeenCalled();
    expect(repo.create).toHaveBeenCalled();
  });

  it('maps a concurrent unique violation on create (P2002) to 409', async () => {
    repo.tenderNumberExists.mockResolvedValue(false); // pre-check passes, race loses at the DB
    repo.create.mockRejectedValue(uniqueViolation());
    await expect(
      tenderService.create({ ...TYPE_ARG, tender_number: 'TND/2026/001' } as never, ctx(editor)),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it('maps a concurrent unique violation on update (P2002) to 409', async () => {
    repo.findById.mockResolvedValue(makeRow({ tenderNumber: null }));
    repo.tenderNumberExists.mockResolvedValue(false);
    repo.update.mockRejectedValue(uniqueViolation());
    await expect(
      tenderService.update('t-1', { tender_number: 'TND/2026/001' }, ctx(publisher)),
    ).rejects.toBeInstanceOf(ConflictError);
  });
});

describe('tenderService.update — Content Editor restriction', () => {
  it('rejects a Content Editor editing a PUBLISHED tender (403)', async () => {
    repo.findById.mockResolvedValue(makeRow({ publicationState: 'published' }));
    await expect(tenderService.update('t-1', { title_hi: 'x' }, ctx(editor))).rejects.toBeInstanceOf(PermissionError);
  });
  it('allows a Publisher editing a PUBLISHED tender', async () => {
    repo.findById.mockResolvedValue(makeRow({ publicationState: 'published' }));
    await expect(tenderService.update('t-1', { title_hi: 'x' }, ctx(publisher))).resolves.toBeDefined();
  });
});

describe('tenderService — reference validation', () => {
  it('rejects a create with an inactive tender type (422)', async () => {
    repo.validateReferences.mockResolvedValue({ tender_type_id: ['Tender type is inactive.'] });
    await expect(
      tenderService.create({ title_en: 'X', tender_type_id: TYPE } as never, ctx(editor)),
    ).rejects.toBeInstanceOf(ValidationError);
    expect(repo.create).not.toHaveBeenCalled();
  });
});

describe('tenderService — expired tender stays public (no auto-expiry)', () => {
  it('editing a past-deadline published tender does not change publication state', async () => {
    repo.findById.mockResolvedValue(makeRow({ publicationState: 'published' }));
    const calls: Record<string, unknown>[] = [];
    repo.update.mockImplementation(async (_id: string, data: Record<string, unknown>) => {
      calls.push(data);
      return makeRow();
    });
    await tenderService.update('t-1', { summary_en: 'edited' }, ctx(publisher));
    expect(calls[0]).not.toHaveProperty('publicationState');
    expect(calls[0]).not.toHaveProperty('archivedAt');
  });
});
