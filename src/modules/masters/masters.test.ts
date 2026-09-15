/**
 * Unit tests for the generic master framework (TASK 24): registry completeness, validators,
 * service CRUD + duplicate/activation/audit, referential rules (blocks, financial years,
 * reporting periods), and the public cache path. The repository, audit, and cache are mocked
 * so these run without a database.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

const { repo, audit, cache, dbPrisma } = vi.hoisted(() => ({
  repo: {
    findById: vi.fn(),
    findByIdentity: vi.fn(),
    slugExists: vi.fn(),
    findFirstWhere: vi.fn(),
    findRefById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateGuarded: vi.fn(),
    list: vi.fn(),
    findAll: vi.fn(),
  },
  audit: { log: vi.fn() },
  cache: { getJson: vi.fn(), setJson: vi.fn(), del: vi.fn(), delByPrefix: vi.fn() },
  // Only masters with `requiresTransaction: true` (document-types) ever reach this — every
  // other master's create/update/setActive never calls `prisma.$transaction`.
  dbPrisma: { $transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn({ $queryRaw: vi.fn().mockResolvedValue([]) })) },
}));

vi.mock('./base-master.repository', () => ({ baseMasterRepository: repo }));
vi.mock('@/modules/audit/audit.service', () => ({ auditService: audit }));
vi.mock('@/services/cache', () => ({ cacheService: cache }));
vi.mock('@/db/prisma', () => ({ prisma: dbPrisma }));

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
    expect(MASTER_DEFINITIONS).toHaveLength(15);
    const keys = MASTER_DEFINITIONS.map((d) => d.key);
    const models = MASTER_DEFINITIONS.map((d) => d.model);
    expect(new Set(keys).size).toBe(15);
    expect(new Set(models).size).toBe(15);
  });

  it('exposes every master publicly', () => {
    expect(PUBLIC_MASTER_KEYS).toContain('commodities');
    expect(getMaster('event-types')).toBeTruthy();
    expect(getMaster('event-categories')).toBeTruthy();
    expect(getMaster('tags')).toBeNull();
    expect(getMaster('nope')).toBeNull();
  });

  it('marks exactly the eleven cacheable masters', () => {
    const cacheable = MASTER_DEFINITIONS.filter((d) => d.cacheable).map((d) => d.key).sort();
    expect(cacheable).toEqual(
      [
        'blocks', 'commodities', 'districts', 'event-categories', 'event-types', 'reporting-periods',
        'document-types', 'knowledge-categories', 'communication-types',
        'procurement-update-categories', 'procurement-update-types',
      ].sort(),
    );
  });
});

describe('validators', () => {
  it('rejects an empty name_en and unknown fields (strict)', () => {
    const def = getMaster('event-categories')!;
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
    const def = getMaster('event-categories')!;
    repo.create.mockResolvedValue(nameRow());
    const dto = await baseMasterService.create(def, { name_en: 'Training' }, ctx);

    expect(repo.create).toHaveBeenCalledWith(def, expect.objectContaining({ nameEn: 'Training', slug: 'training' }), undefined);
    expect(audit.log).toHaveBeenCalledWith('MASTER_CREATE', ctx, expect.objectContaining({ module: 'event_categories' }));
    expect(cache.delByPrefix).toHaveBeenCalledWith('masters:public:event-categories');
    expect(dto).toMatchObject({ name_en: 'Training', slug: 'training', is_active: true });
  });

  it('rejects a duplicate name with a 409 conflict', async () => {
    const def = getMaster('event-categories')!;
    repo.findFirstWhere.mockResolvedValue({ id: 'other' });
    await expect(baseMasterService.create(def, { name_en: 'Training' }, ctx)).rejects.toBeInstanceOf(ConflictError);
    expect(repo.create).not.toHaveBeenCalled();
  });

  it('does not invalidate cache for a non-cacheable master', async () => {
    const def = getMaster('institution-types')!;
    repo.create.mockResolvedValue(nameRow({ slug: 'ngo', nameEn: 'NGO' }));
    await baseMasterService.create(def, { name_en: 'NGO' }, ctx);
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
    repo.updateGuarded.mockResolvedValue(nameRow({ isActive: false }));
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

  it('event-types: rejects an unknown parent event category (orphan protection)', async () => {
    const def = getMaster('event-types')!;
    repo.findRefById.mockResolvedValue(null);
    await expect(baseMasterService.create(def, { name_en: 'Seminar', event_category_id: UUID }, ctx)).rejects.toBeInstanceOf(ValidationError);
  });

  it('event-types: rejects attaching to an inactive event category', async () => {
    const def = getMaster('event-types')!;
    repo.findRefById.mockResolvedValue({ id: UUID, isActive: false });
    await expect(baseMasterService.create(def, { name_en: 'Seminar', event_category_id: UUID }, ctx)).rejects.toBeInstanceOf(ValidationError);
  });

  it('event-types: accepts a valid active event category', async () => {
    const def = getMaster('event-types')!;
    repo.findRefById.mockResolvedValue({ id: UUID, isActive: true });
    repo.create.mockResolvedValue(nameRow({
      slug: 'seminar', nameEn: 'Seminar', eventCategoryId: UUID,
      eventCategory: { id: UUID, slug: 'trainings', nameEn: 'Trainings', nameHi: null },
    }));
    const dto = await baseMasterService.create(def, { name_en: 'Seminar', event_category_id: UUID }, ctx);
    expect(dto).toMatchObject({ event_category_id: UUID });
  });

  it('procurement-update-types: rejects an unknown parent procurement update category (orphan protection)', async () => {
    const def = getMaster('procurement-update-types')!;
    repo.findRefById.mockResolvedValue(null);
    await expect(
      baseMasterService.create(def, { name_en: 'Bonus Rate', procurement_update_category_id: UUID }, ctx),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it('procurement-update-types: rejects attaching to an inactive procurement update category', async () => {
    const def = getMaster('procurement-update-types')!;
    repo.findRefById.mockResolvedValue({ id: UUID, isActive: false });
    await expect(
      baseMasterService.create(def, { name_en: 'Bonus Rate', procurement_update_category_id: UUID }, ctx),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it('procurement-update-types: accepts a valid active procurement update category', async () => {
    const def = getMaster('procurement-update-types')!;
    repo.findRefById.mockResolvedValue({ id: UUID, isActive: true });
    repo.create.mockResolvedValue(nameRow({
      slug: 'bonus-rate', nameEn: 'Bonus Rate', procurementUpdateCategoryId: UUID,
      procurementUpdateCategory: { id: UUID, slug: 'rates-trade', nameEn: 'Rates & Trade', nameHi: null },
    }));
    const dto = await baseMasterService.create(def, { name_en: 'Bonus Rate', procurement_update_category_id: UUID }, ctx);
    expect(dto).toMatchObject({ procurement_update_category_id: UUID });
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

describe('document-types: parent-family XOR, active-parent validation, guardDeactivate', () => {
  it('rejects create with neither a knowledge category nor a communication type', async () => {
    const def = getMaster('document-types')!;
    await expect(baseMasterService.create(def, { name_en: 'Memo' }, ctx)).rejects.toBeInstanceOf(ValidationError);
  });

  it('rejects create with both a knowledge category and a communication type', async () => {
    const def = getMaster('document-types')!;
    await expect(
      baseMasterService.create(def, { name_en: 'Memo', knowledge_category_id: UUID, communication_type_id: UUID }, ctx),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it('rejects attaching to an inactive knowledge category', async () => {
    const def = getMaster('document-types')!;
    repo.findRefById.mockResolvedValue({ id: UUID, isActive: false });
    await expect(
      baseMasterService.create(def, { name_en: 'Memo', knowledge_category_id: UUID }, ctx),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it('accepts a valid active knowledge category parent, running inside a transaction', async () => {
    const def = getMaster('document-types')!;
    repo.findRefById.mockResolvedValue({ id: UUID, isActive: true });
    repo.create.mockResolvedValue(
      nameRow({
        slug: 'memo', nameEn: 'Memo', knowledgeCategoryId: UUID, communicationTypeId: null,
        knowledgeCategory: { id: UUID, slug: 'acts-and-rules', nameEn: 'Acts and Rules', nameHi: null },
        communicationType: null,
      }),
    );
    const dto = await baseMasterService.create(def, { name_en: 'Memo', knowledge_category_id: UUID }, ctx);
    expect(dto).toMatchObject({ knowledge_category_id: UUID, document_section: 'publications' });
    expect(dbPrisma.$transaction).toHaveBeenCalled();
    expect(repo.create).toHaveBeenCalledWith(def, expect.objectContaining({ knowledgeCategoryId: UUID, communicationTypeId: null }), expect.anything());
  });

  it('switching parent family clears the opposite parent in the same update', async () => {
    const def = getMaster('document-types')!;
    repo.findById.mockResolvedValue(
      nameRow({ slug: 'memo', nameEn: 'Memo', knowledgeCategoryId: UUID, communicationTypeId: null, isActive: true }),
    );
    const CT_UUID = '22222222-2222-4222-8222-222222222222';
    repo.findRefById.mockResolvedValue({ id: CT_UUID, isActive: true });
    repo.update.mockResolvedValue(nameRow({ slug: 'memo', nameEn: 'Memo', knowledgeCategoryId: null, communicationTypeId: CT_UUID }));
    // A family switch must send both fields together (the new parent + an explicit null for
    // the old one) — the client can't just send the new field, since `validate` merges against
    // the still-set existing parent and would otherwise see both as non-null.
    await baseMasterService.update(def, 'm1', { knowledge_category_id: null, communication_type_id: CT_UUID }, ctx);
    expect(repo.update).toHaveBeenCalledWith(
      def,
      'm1',
      expect.objectContaining({ communicationTypeId: CT_UUID, knowledgeCategoryId: null }),
      expect.anything(),
    );
  });

  it('guardDeactivate blocks archival while documents still reference the type', async () => {
    const def = getMaster('document-types')!;
    const tx = { $queryRaw: vi.fn().mockResolvedValue([]), document: { count: vi.fn().mockResolvedValue(3) } };
    await expect(def.guardDeactivate!('m1', tx as never)).rejects.toBeInstanceOf(ConflictError);
  });

  it('guardDeactivate allows archival when no document references the type', async () => {
    const def = getMaster('document-types')!;
    const tx = { $queryRaw: vi.fn().mockResolvedValue([]), document: { count: vi.fn().mockResolvedValue(0) } };
    await expect(def.guardDeactivate!('m1', tx as never)).resolves.toBeUndefined();
  });

  it('re-validates the (possibly now-inactive) parent on reactivation even without resending it', async () => {
    const def = getMaster('document-types')!;
    repo.findById.mockResolvedValue(nameRow({ knowledgeCategoryId: UUID, communicationTypeId: null, isActive: false }));
    repo.findRefById.mockResolvedValue({ id: UUID, isActive: false }); // parent went inactive meanwhile
    await expect(baseMasterService.setActive(def, 'm1', true, ctx)).rejects.toBeInstanceOf(ValidationError);
  });
});

describe('knowledge-categories / communication-types: guardDeactivate against Document Type usage', () => {
  it('knowledge-categories: blocks archival while a document type still parents to it', async () => {
    const def = getMaster('knowledge-categories')!;
    const tx = { $queryRaw: vi.fn().mockResolvedValue([]), documentType: { count: vi.fn().mockResolvedValue(1) } };
    await expect(def.guardDeactivate!('m1', tx as never)).rejects.toBeInstanceOf(ConflictError);
  });

  it('communication-types: blocks archival while a legacy official communication still references it', async () => {
    const def = getMaster('communication-types')!;
    const tx = {
      $queryRaw: vi.fn().mockResolvedValue([]),
      documentType: { count: vi.fn().mockResolvedValue(0) },
      officialCommunication: { count: vi.fn().mockResolvedValue(2) },
    };
    await expect(def.guardDeactivate!('m1', tx as never)).rejects.toBeInstanceOf(ConflictError);
  });

  it('communication-types: allows archival when nothing references it', async () => {
    const def = getMaster('communication-types')!;
    const tx = {
      $queryRaw: vi.fn().mockResolvedValue([]),
      documentType: { count: vi.fn().mockResolvedValue(0) },
      officialCommunication: { count: vi.fn().mockResolvedValue(0) },
    };
    await expect(def.guardDeactivate!('m1', tx as never)).resolves.toBeUndefined();
  });
});

describe('procurement-update-categories / procurement-update-types: guardDeactivate against usage', () => {
  it('procurement-update-categories: blocks archival while a procurement update type still parents to it', async () => {
    const def = getMaster('procurement-update-categories')!;
    const tx = { $queryRaw: vi.fn().mockResolvedValue([]), procurementUpdateType: { count: vi.fn().mockResolvedValue(1) } };
    await expect(def.guardDeactivate!('m1', tx as never)).rejects.toBeInstanceOf(ConflictError);
  });

  it('procurement-update-categories: allows archival when no type parents to it', async () => {
    const def = getMaster('procurement-update-categories')!;
    const tx = { $queryRaw: vi.fn().mockResolvedValue([]), procurementUpdateType: { count: vi.fn().mockResolvedValue(0) } };
    await expect(def.guardDeactivate!('m1', tx as never)).resolves.toBeUndefined();
  });

  it('procurement-update-types: blocks archival while a procurement update (any state) still references it', async () => {
    const def = getMaster('procurement-update-types')!;
    const tx = { $queryRaw: vi.fn().mockResolvedValue([]), procurementUpdate: { count: vi.fn().mockResolvedValue(2) } };
    await expect(def.guardDeactivate!('m1', tx as never)).rejects.toBeInstanceOf(ConflictError);
  });

  it('procurement-update-types: allows archival when no procurement update references it', async () => {
    const def = getMaster('procurement-update-types')!;
    const tx = { $queryRaw: vi.fn().mockResolvedValue([]), procurementUpdate: { count: vi.fn().mockResolvedValue(0) } };
    await expect(def.guardDeactivate!('m1', tx as never)).resolves.toBeUndefined();
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
