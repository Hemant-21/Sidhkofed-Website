/**
 * Unit tests for the generic master framework (TASK 24): registry completeness, validators,
 * service CRUD + duplicate/activation/audit, referential rules (blocks, financial years,
 * reporting periods), and the public cache path. The repository, audit, and cache are mocked
 * so these run without a database.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

const { repo, audit, cache } = vi.hoisted(() => ({
  repo: {
    findById: vi.fn(),
    findByIdentity: vi.fn(),
    slugExists: vi.fn(),
    findFirstWhere: vi.fn(),
    findRefById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    list: vi.fn(),
    findAll: vi.fn(),
  },
  audit: { log: vi.fn() },
  cache: { getJson: vi.fn(), setJson: vi.fn(), del: vi.fn(), delByPrefix: vi.fn() },
}));

vi.mock('./base-master.repository', () => ({ baseMasterRepository: repo }));
vi.mock('@/modules/audit/audit.service', () => ({ auditService: audit }));
vi.mock('@/services/cache', () => ({ cacheService: cache }));

import { baseMasterService } from './base-master.service';
import { MASTER_DEFINITIONS, PUBLIC_MASTER_KEYS, getMaster, parse } from './masters.registry';
import { ConflictError, NotFoundError, ValidationError } from '@/shared/errors';

const ctx = { userId: 'u1', ipHash: null, userAgent: null };
const UUID = '11111111-1111-4111-8111-111111111111';

function nameRow(over: Record<string, unknown> = {}): Record<string, unknown> {
  const now = new Date();
  return {
    id: 'm1', slug: 'training', nameEn: 'Training', nameHi: null, isActive: true,
    displayOrder: 1, createdAt: now, updatedAt: now, ...over,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  repo.slugExists.mockResolvedValue(false);
  repo.findFirstWhere.mockResolvedValue(null);
});

describe('registry', () => {
  it('registers all 16 masters with unique keys and models', () => {
    expect(MASTER_DEFINITIONS).toHaveLength(16);
    const keys = MASTER_DEFINITIONS.map((d) => d.key);
    const models = MASTER_DEFINITIONS.map((d) => d.model);
    expect(new Set(keys).size).toBe(16);
    expect(new Set(models).size).toBe(16);
  });

  it('exposes every master publicly except tags', () => {
    expect(PUBLIC_MASTER_KEYS).not.toContain('tags');
    expect(PUBLIC_MASTER_KEYS).toContain('commodities');
    expect(getMaster('event-types')).toBeTruthy();
    expect(getMaster('nope')).toBeNull();
  });

  it('marks exactly the six cacheable masters', () => {
    const cacheable = MASTER_DEFINITIONS.filter((d) => d.cacheable).map((d) => d.key).sort();
    expect(cacheable).toEqual(
      ['blocks', 'commodities', 'districts', 'event-types', 'reporting-periods', 'training-types'].sort(),
    );
  });
});

describe('validators', () => {
  it('rejects an empty name_en and unknown fields (strict)', () => {
    const def = getMaster('event-types')!;
    expect(() => parse(def.createSchema, { name_en: '' })).toThrow(ValidationError);
    expect(() => parse(def.createSchema, { name_en: 'X', bogus: 1 })).toThrow(ValidationError);
    expect(parse(def.createSchema, { name_en: 'Training' })).toMatchObject({ name_en: 'Training' });
  });

  it('validates financial-year label format', () => {
    const def = getMaster('financial-years')!;
    expect(() => parse(def.createSchema, { label: 'bad', start_date: '2025-04-01', end_date: '2026-03-31' })).toThrow(ValidationError);
    expect(parse(def.createSchema, { label: '2025-2026', start_date: '2025-04-01', end_date: '2026-03-31' })).toMatchObject({ label: '2025-2026' });
  });

  it('requires a reporting-period period_type', () => {
    const def = getMaster('reporting-periods')!;
    expect(() => parse(def.createSchema, { name_en: 'Q1', start_date: '2025-04-01', end_date: '2025-06-30' })).toThrow(ValidationError);
  });
});

describe('baseMasterService.create', () => {
  it('generates a slug, audits MASTER_CREATE, and invalidates the cache', async () => {
    const def = getMaster('event-types')!;
    repo.create.mockResolvedValue(nameRow());
    const dto = await baseMasterService.create(def, { name_en: 'Training' }, ctx);

    expect(repo.create).toHaveBeenCalledWith(def, expect.objectContaining({ nameEn: 'Training', slug: 'training' }));
    expect(audit.log).toHaveBeenCalledWith('MASTER_CREATE', ctx, expect.objectContaining({ module: 'event_types' }));
    expect(cache.delByPrefix).toHaveBeenCalledWith('masters:public:event-types');
    expect(dto).toMatchObject({ name_en: 'Training', slug: 'training', is_active: true });
  });

  it('rejects a duplicate name with a 409 conflict', async () => {
    const def = getMaster('event-types')!;
    repo.findFirstWhere.mockResolvedValue({ id: 'other' });
    await expect(baseMasterService.create(def, { name_en: 'Training' }, ctx)).rejects.toBeInstanceOf(ConflictError);
    expect(repo.create).not.toHaveBeenCalled();
  });

  it('does not invalidate cache for a non-cacheable master', async () => {
    const def = getMaster('document-types')!;
    repo.create.mockResolvedValue(nameRow({ slug: 'notice', nameEn: 'Notice' }));
    await baseMasterService.create(def, { name_en: 'Notice' }, ctx);
    expect(cache.delByPrefix).not.toHaveBeenCalled();
  });
});

describe('baseMasterService.update / setActive', () => {
  it('throws NotFound for a missing record', async () => {
    const def = getMaster('event-types')!;
    repo.findById.mockResolvedValue(null);
    await expect(baseMasterService.update(def, 'x', { name_en: 'Y' }, ctx)).rejects.toBeInstanceOf(NotFoundError);
  });

  it('deactivate audits MASTER_DEACTIVATE with state transition', async () => {
    const def = getMaster('event-types')!;
    repo.findById.mockResolvedValue(nameRow({ isActive: true }));
    repo.update.mockResolvedValue(nameRow({ isActive: false }));
    await baseMasterService.setActive(def, 'm1', false, ctx);
    expect(audit.log).toHaveBeenCalledWith(
      'MASTER_DEACTIVATE',
      ctx,
      expect.objectContaining({ previousState: 'active', newState: 'inactive' }),
    );
  });
});

describe('referential validation', () => {
  it('blocks: rejects an unknown parent district (orphan protection)', async () => {
    const def = getMaster('blocks')!;
    repo.findRefById.mockResolvedValue(null);
    await expect(baseMasterService.create(def, { name_en: 'Sadar', district_id: UUID }, ctx)).rejects.toBeInstanceOf(ValidationError);
  });

  it('blocks: accepts a valid active district', async () => {
    const def = getMaster('blocks')!;
    repo.findRefById.mockResolvedValue({ id: UUID, isActive: true });
    repo.create.mockResolvedValue(nameRow({ slug: 'ranchi-sadar', nameEn: 'Sadar', districtId: UUID, district: { id: UUID, slug: 'ranchi', nameEn: 'Ranchi', nameHi: null } }));
    const dto = await baseMasterService.create(def, { name_en: 'Sadar', district_id: UUID }, ctx);
    expect(dto).toMatchObject({ district_id: UUID });
  });

  it('financial-years: rejects an overlapping year', async () => {
    const def = getMaster('financial-years')!;
    repo.findFirstWhere.mockResolvedValue({ id: 'fyX' }); // a clashing year
    await expect(
      baseMasterService.create(def, { label: '2025-2026', start_date: '2025-04-01', end_date: '2026-03-31' }, ctx),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it('financial-years: rejects end before start', async () => {
    const def = getMaster('financial-years')!;
    await expect(
      baseMasterService.create(def, { label: '2025-2026', start_date: '2026-04-01', end_date: '2025-03-31' }, ctx),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it('reporting-periods: month type requires a financial year', async () => {
    const def = getMaster('reporting-periods')!;
    await expect(
      baseMasterService.create(def, { name_en: 'April', period_type: 'month', start_date: '2025-04-01', end_date: '2025-04-30' }, ctx),
    ).rejects.toBeInstanceOf(ValidationError);
  });
});

describe('public list cache', () => {
  it('reads through to the repo on a miss and caches the active list', async () => {
    const def = getMaster('commodities')!;
    cache.getJson.mockResolvedValue(null);
    repo.findAll.mockResolvedValue([nameRow({ slug: 'lac', nameEn: 'Lac', iconMedia: null })]);
    const { items, total } = await baseMasterService.publicList(def, {}, { skip: 0, take: 20 });
    expect(repo.findAll).toHaveBeenCalledWith(def, expect.objectContaining({ isActive: true }), expect.anything());
    expect(cache.setJson).toHaveBeenCalled();
    expect(total).toBe(1);
    expect(items[0]).toMatchObject({ name_en: 'Lac' });
  });

  it('serves from cache on a hit without touching the repo', async () => {
    const def = getMaster('commodities')!;
    cache.getJson.mockResolvedValue([{ id: 'c1', name_en: 'Lac' }]);
    const { total } = await baseMasterService.publicList(def, {}, { skip: 0, take: 20 });
    expect(repo.findAll).not.toHaveBeenCalled();
    expect(total).toBe(1);
  });
});
