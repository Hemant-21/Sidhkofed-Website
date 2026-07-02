/**
 * Unit tests — institution service RBAC restriction (Issue 3) and duplicate-name prevention
 * (Issue 4). The repository and cross-module services are mocked, so these run DB-free in the
 * normal `npm test` suite and assert the authorization/conflict wiring directly.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { ResolvedAuthorization } from '@/modules/auth/auth.types';

const { repo, cache, audit, mediaUsage } = vi.hoisted(() => ({
  repo: {
    nameExists: vi.fn(),
    findById: vi.fn(),
    update: vi.fn(),
    create: vi.fn(),
    validateReferences: vi.fn(),
    transaction: vi.fn(),
  },
  cache: { delByPrefix: vi.fn(), getJson: vi.fn(), setJson: vi.fn() },
  audit: { create: vi.fn(), update: vi.fn(), log: vi.fn() },
  mediaUsage: { registerUsage: vi.fn(), removeUsage: vi.fn() },
}));

vi.mock('./institutions.repository', () => ({ institutionRepository: repo }));
vi.mock('@/services/cache', () => ({ cacheService: cache }));
vi.mock('@/modules/audit/audit.service', () => ({ auditService: audit }));
vi.mock('@/modules/media/media.service', () => ({ mediaService: { getById: vi.fn() } }));
vi.mock('@/modules/media/media-usage.service', () => ({ mediaUsageService: mediaUsage }));

import { institutionService } from './institutions.service';
import { PermissionError, ConflictError } from '@/shared/errors';

const NOW = new Date('2026-06-25T00:00:00.000Z');

/** A complete InstitutionRow stand-in (only the fields the DTO mapper reads matter). */
function makeRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'inst-1',
    slug: 'jslps',
    nameEn: 'JSLPS',
    nameHi: null,
    institutionType: { id: 't1', slug: 'partner', nameEn: 'Partner', nameHi: null },
    district: null,
    logoMedia: null,
    websiteUrl: null,
    publicationState: 'published',
    publicVisibility: true,
    showOnHomepage: false,
    highlightType: null,
    displayOrder: null,
    descriptionEn: null,
    descriptionHi: null,
    addressEn: null,
    addressHi: null,
    contactEmail: null,
    contactPhone: null,
    publishStartAt: null,
    highlightStartAt: null,
    highlightEndAt: null,
    publishedAt: NOW,
    archivedAt: null,
    logoMediaId: null,
    createdById: 'u-creator',
    updatedById: 'u-creator',
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

const authz = (over: Partial<ResolvedAuthorization>): ResolvedAuthorization =>
  ({ isSuperAdmin: false, roles: [], permissions: [], ...over } as ResolvedAuthorization);

const editor = authz({ permissions: ['content.create', 'content.update'] });
const publisher = authz({ permissions: ['content.update', 'content.publish'] });
const superAdmin = authz({ isSuperAdmin: true });

const ctx = (a: ResolvedAuthorization) => ({ userId: 'u-1', authz: a });

beforeEach(() => {
  vi.clearAllMocks();
  repo.validateReferences.mockResolvedValue({});
  repo.nameExists.mockResolvedValue(false);
  repo.transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => fn({}));
  repo.update.mockImplementation(async (_id: string, _data: unknown) => makeRow());
});

describe('institutionService.update — Content Editor restriction (Issue 3)', () => {
  it('rejects a Content Editor editing a PUBLISHED institution (403)', async () => {
    repo.findById.mockResolvedValue(makeRow({ publicationState: 'published' }));
    await expect(institutionService.update('inst-1', { name_hi: 'x' }, ctx(editor))).rejects.toBeInstanceOf(PermissionError);
    expect(repo.update).not.toHaveBeenCalled();
  });

  it('allows a Content Editor editing a DRAFT institution', async () => {
    repo.findById.mockResolvedValue(makeRow({ publicationState: 'draft' }));
    await expect(institutionService.update('inst-1', { name_hi: 'x' }, ctx(editor))).resolves.toBeDefined();
    expect(repo.update).toHaveBeenCalledOnce();
  });

  it('allows a Publisher editing a PUBLISHED institution', async () => {
    repo.findById.mockResolvedValue(makeRow({ publicationState: 'published' }));
    await expect(institutionService.update('inst-1', { name_hi: 'x' }, ctx(publisher))).resolves.toBeDefined();
    expect(repo.update).toHaveBeenCalledOnce();
  });

  it('lets a Super Admin bypass the restriction on PUBLISHED content', async () => {
    repo.findById.mockResolvedValue(makeRow({ publicationState: 'published' }));
    await expect(institutionService.update('inst-1', { name_hi: 'x' }, ctx(superAdmin))).resolves.toBeDefined();
    expect(repo.update).toHaveBeenCalledOnce();
  });
});

describe('institutionService — duplicate-name prevention (Issue 4)', () => {
  it('rejects a create whose name already exists (409)', async () => {
    repo.nameExists.mockResolvedValue(true);
    await expect(
      institutionService.create({ institution_type_id: 't1', name_en: '  JSLPS  ' } as never, ctx(editor)),
    ).rejects.toBeInstanceOf(ConflictError);
    expect(repo.nameExists).toHaveBeenCalledWith('  JSLPS  ', undefined);
  });

  it('rejects an update that renames onto an existing name (409), excluding self', async () => {
    repo.findById.mockResolvedValue(makeRow({ publicationState: 'draft' }));
    repo.nameExists.mockResolvedValue(true);
    await expect(institutionService.update('inst-1', { name_en: 'Duplicate' }, ctx(editor))).rejects.toBeInstanceOf(
      ConflictError,
    );
    expect(repo.nameExists).toHaveBeenCalledWith('Duplicate', 'inst-1');
  });

  it('does not run the duplicate check when the name is not being changed', async () => {
    repo.findById.mockResolvedValue(makeRow({ publicationState: 'draft' }));
    await institutionService.update('inst-1', { website_url: 'https://x.org' }, ctx(editor));
    expect(repo.nameExists).not.toHaveBeenCalled();
  });
});
