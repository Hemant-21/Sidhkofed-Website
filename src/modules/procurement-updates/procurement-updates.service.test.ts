/**
 * Unit tests — procurement-update service: Content-Editor edit restriction, master/reference
 * validation (incl. block/district consistency wiring), rate Decimal conversion, and lifecycle
 * audit. Repository + cross-module services are mocked, so these run DB-free.
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
  },
  cache: { delByPrefix: vi.fn(), getJson: vi.fn(), setJson: vi.fn() },
  audit: { create: vi.fn(), update: vi.fn(), log: vi.fn() },
}));

vi.mock('./procurement-updates.repository', () => ({ procurementUpdateRepository: repo }));
vi.mock('@/services/cache', () => ({ cacheService: cache }));
vi.mock('@/modules/audit/audit.service', () => ({ auditService: audit }));

import { procurementUpdateService } from './procurement-updates.service';
import { PermissionError, ValidationError } from '@/shared/errors';

const NOW = new Date('2026-06-25T00:00:00.000Z');
const TYPE = '44444444-4444-4444-8444-444444444444';

function makeRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'pu-1',
    slug: 'honey-rate-1',
    titleEn: 'Honey rate',
    titleHi: null,
    summaryEn: null,
    summaryHi: null,
    descriptionEn: null,
    descriptionHi: null,
    procurementUpdateType: { id: TYPE, slug: 'rate', nameEn: 'Procurement Rate', nameHi: null },
    commodity: null,
    rate: null,
    unit: null,
    effectiveDate: null,
    periodStart: null,
    periodEnd: null,
    district: null,
    block: null,
    locationText: null,
    programmeScheme: null,
    document: null,
    status: null,
    publicationState: 'published',
    publicVisibility: true,
    showOnHomepage: false,
    highlightType: null,
    displayOrder: null,
    districtId: null,
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
  repo.update.mockImplementation(async () => makeRow());
  repo.create.mockImplementation(async () => makeRow());
});

describe('procurementUpdateService.update — Content Editor restriction', () => {
  it('rejects a Content Editor editing a PUBLISHED record (403)', async () => {
    repo.findById.mockResolvedValue(makeRow({ publicationState: 'published' }));
    await expect(
      procurementUpdateService.update('pu-1', { title_hi: 'x' }, ctx(editor)),
    ).rejects.toBeInstanceOf(PermissionError);
  });
});

describe('procurementUpdateService — reference validation', () => {
  it('rejects a create with an inactive commodity (422)', async () => {
    repo.validateReferences.mockResolvedValue({ commodity_id: ['Commodity is inactive.'] });
    await expect(
      procurementUpdateService.create(
        { title_en: 'X', procurement_update_type_id: TYPE, commodity_id: TYPE } as never,
        ctx(editor),
      ),
    ).rejects.toBeInstanceOf(ValidationError);
    expect(repo.create).not.toHaveBeenCalled();
  });

  it('validates a block against the EXISTING district when only the block changes on PATCH', async () => {
    repo.findById.mockResolvedValue(makeRow({ publicationState: 'draft', districtId: 'dist-1' }));
    const block = '55555555-5555-4555-8555-555555555555';
    await procurementUpdateService.update('pu-1', { block_id: block }, ctx(editor));
    expect(repo.validateReferences).toHaveBeenCalledWith(expect.objectContaining({ blockId: block, districtId: 'dist-1' }));
  });
});

describe('procurementUpdateService — rate Decimal conversion', () => {
  it('passes a Decimal rate to the repository on create', async () => {
    let captured: Record<string, unknown> = {};
    repo.create.mockImplementation(async (data: Record<string, unknown>) => {
      captured = data;
      return makeRow();
    });
    await procurementUpdateService.create(
      { title_en: 'X', procurement_update_type_id: TYPE, rate: 250.5 } as never,
      ctx(editor),
    );
    expect(captured.rate).toBeDefined();
    expect(Number(captured.rate)).toBe(250.5);
  });
});

describe('procurementUpdateService — lifecycle audit', () => {
  it('archive records an audit entry and transitions to archived', async () => {
    repo.findById.mockResolvedValue(makeRow({ publicationState: 'published' }));
    repo.update.mockResolvedValue(makeRow({ publicationState: 'archived' }));
    await procurementUpdateService.lifecycle('pu-1', 'archive', ctx(publisher));
    expect(audit.log).toHaveBeenCalledWith(
      'ARCHIVE',
      expect.anything(),
      expect.objectContaining({ module: 'procurement_update', newState: 'archived' }),
    );
  });
});
