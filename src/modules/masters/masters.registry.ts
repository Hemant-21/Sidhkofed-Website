/**
 * Master registry (TASK 3–17) — the single declarative source of every master's behavior.
 * The generic repository/service/controller read everything from here; adding a master is a
 * new entry, not a new CRUD stack.
 *
 * Canonical keys/fields follow database-schema-design.md Part 4/13 and api-specification.md
 * §4. Cacheable set (TASK 21): commodities, districts, blocks, event-types, training-types,
 * reporting-periods.
 */
import { z } from 'zod';
import { ConflictError, ValidationError } from '@/shared/errors';
import { standardSchemas, parse, nameEn, nameHi, optionalSlug, isActive, displayOrder, dateString } from './base-master.validator';
import { baseMasterRepository as repo } from './base-master.repository';
import {
  serializeStandard,
  serializeCommodity,
  serializeDistrict,
  serializeBlock,
  serializeEventType,
  serializeProcurementUpdateType,
  serializeDocumentType,
  serializeFinancialYear,
  serializeReportingPeriod,
} from './masters.dto';
import type { MasterDefinition, MasterInput, MasterValidationContext } from './masters.types';

// ── Shared builders for name-based masters ──────────────────────────────────
function buildStandardCreate(input: MasterInput): Record<string, unknown> {
  const data: Record<string, unknown> = { nameEn: input.name_en, nameHi: input.name_hi ?? null };
  if (input.is_active !== undefined) data.isActive = input.is_active;
  if (input.display_order !== undefined) data.displayOrder = input.display_order;
  return data;
}
function buildStandardUpdate(input: MasterInput): Record<string, unknown> {
  const data: Record<string, unknown> = {};
  if (input.name_en !== undefined) data.nameEn = input.name_en;
  if (input.name_hi !== undefined) data.nameHi = input.name_hi;
  if (input.is_active !== undefined) data.isActive = input.is_active;
  if (input.display_order !== undefined) data.displayOrder = input.display_order;
  return data;
}
function standardDuplicateWhere(input: MasterInput): Record<string, unknown> | null {
  return typeof input.name_en === 'string' ? { nameEn: input.name_en } : null;
}

const STANDARD_ORDERING = ['name_en', 'display_order', 'created_at', 'updated_at'] as const;

/** Factory for the 10 plain name-only masters (and the base for light variants). */
function standardMaster(p: {
  key: string;
  model: string;
  module: string;
  label: string;
  cacheable?: boolean;
  isPublic?: boolean;
}): MasterDefinition {
  const { createSchema, updateSchema } = standardSchemas();
  return {
    key: p.key,
    model: p.model,
    module: p.module,
    label: p.label,
    identity: 'name_en',
    hasSlug: true,
    hasDisplayOrder: true,
    cacheable: p.cacheable ?? false,
    isPublic: p.isPublic ?? true,
    createSchema,
    updateSchema,
    buildCreateData: buildStandardCreate,
    buildUpdateData: buildStandardUpdate,
    duplicateWhere: standardDuplicateWhere,
    serialize: serializeStandard,
    searchFields: ['nameEn', 'nameHi'],
    orderingAllowList: STANDARD_ORDERING,
    defaultOrder: { field: 'name_en', direction: 'asc' },
  };
}

// ── Event Category — parents Event Type; a standard master, no FK of its own ─
const eventCategories: MasterDefinition = {
  ...standardMaster({ key: 'event-categories', model: 'eventCategory', module: 'event_categories', label: 'Event category', cacheable: true }),
  // Block archival while any event still references any child event type. Locks the
  // category row first so a concurrent type reassignment/reparenting can't slip past the count.
  guardDeactivate: async (id, tx) => {
    await tx.$queryRaw`SELECT id FROM "event_categories" WHERE id = ${id}::uuid FOR UPDATE`;
    const count = await tx.event.count({ where: { eventType: { eventCategoryId: id } } });
    if (count > 0) {
      throw new ConflictError(`This event category is used by ${count} event(s) via its event types. Reassign them before archiving.`);
    }
  },
};

// ── Event Type — belongs to an Event Category; orphan-proof; archive-guarded ─
const eventTypeSchemas = standardSchemas({ event_category_id: z.string().uuid() });
const eventTypeUpdateSchema = z
  .object({ name_en: nameEn, name_hi: nameHi, is_active: isActive, display_order: displayOrder, event_category_id: z.string().uuid() })
  .partial()
  .strict();
const eventTypes: MasterDefinition = {
  key: 'event-types',
  model: 'eventType',
  module: 'event_types',
  label: 'Event type',
  identity: 'name_en',
  hasSlug: true,
  hasDisplayOrder: true,
  cacheable: true,
  isPublic: true,
  include: { eventCategory: true },
  createSchema: eventTypeSchemas.createSchema,
  updateSchema: eventTypeUpdateSchema,
  buildCreateData: (input) => {
    const data = buildStandardCreate(input);
    data.eventCategoryId = input.event_category_id;
    return data;
  },
  buildUpdateData: (input) => {
    const data = buildStandardUpdate(input);
    if (input.event_category_id !== undefined) data.eventCategoryId = input.event_category_id;
    return data;
  },
  duplicateWhere: standardDuplicateWhere,
  // Prevent orphan/inactive-parent types: the category must exist and be active whenever
  // it is being set (on create, or on reassignment/reactivation via PATCH).
  validate: async (ctx: MasterValidationContext) => {
    const eventCategoryId = ctx.input.event_category_id;
    if (typeof eventCategoryId !== 'string') return;
    const category = await repo.findRefById('eventCategory', eventCategoryId);
    if (!category) throw new ValidationError({ event_category_id: ['Event category not found.'] });
    if (category.isActive === false) {
      throw new ValidationError({ event_category_id: ['Cannot attach an event type to an inactive event category.'] });
    }
  },
  // Block archival while any event (any publication/lifecycle state) still references this
  // type. Locks the type row first so a concurrent event assignment can't slip past the count.
  guardDeactivate: async (id, tx) => {
    await tx.$queryRaw`SELECT id FROM "event_types" WHERE id = ${id}::uuid FOR UPDATE`;
    const count = await tx.event.count({ where: { eventTypeId: id } });
    if (count > 0) {
      throw new ConflictError(`This event type is used by ${count} event(s). Reassign them to another type before archiving.`);
    }
  },
  serialize: serializeEventType,
  searchFields: ['nameEn', 'nameHi'],
  orderingAllowList: STANDARD_ORDERING,
  defaultOrder: { field: 'name_en', direction: 'asc' },
  resolveFilter: (query) => {
    if (typeof query.event_category_id === 'string') {
      return { where: { eventCategoryId: query.event_category_id }, cacheSuffix: `:event_category_id=${query.event_category_id}` };
    }
    if (typeof query.event_category === 'string') {
      return { where: { eventCategory: { slug: query.event_category } }, cacheSuffix: `:event_category=${query.event_category}` };
    }
    return { where: {}, cacheSuffix: '' };
  },
};

// ── The other plain masters (TASK 6,9,10,11,12,13,14,15) ────────────────────
const institutionTypes = standardMaster({ key: 'institution-types', model: 'institutionType', module: 'institution_types', label: 'Institution type' });

// ── Knowledge Category — parents Document Type (family: knowledge); Publications ────
const knowledgeCategories: MasterDefinition = {
  ...standardMaster({ key: 'knowledge-categories', model: 'knowledgeCategory', module: 'knowledge_categories', label: 'Knowledge category', cacheable: true }),
  // Block archival while any Document Type still parents to this category (the family that
  // ultimately gates Publications). Locks the category row first so a concurrent Document
  // Type create/reparent can't slip past the count.
  guardDeactivate: async (id, tx) => {
    await tx.$queryRaw`SELECT id FROM "knowledge_categories" WHERE id = ${id}::uuid FOR UPDATE`;
    const count = await tx.documentType.count({ where: { knowledgeCategoryId: id } });
    if (count > 0) {
      throw new ConflictError(`This knowledge category is used by ${count} document type(s). Reassign them before archiving.`);
    }
  },
};

// ── Communication Type — parents Document Type (family: communication) AND is still
// referenced directly by legacy OfficialCommunication records; Notifications ──────────
const communicationTypes: MasterDefinition = {
  ...standardMaster({ key: 'communication-types', model: 'communicationType', module: 'communication_types', label: 'Communication type', cacheable: true }),
  guardDeactivate: async (id, tx) => {
    await tx.$queryRaw`SELECT id FROM "communication_types" WHERE id = ${id}::uuid FOR UPDATE`;
    const [documentTypeCount, communicationCount] = await Promise.all([
      tx.documentType.count({ where: { communicationTypeId: id } }),
      tx.officialCommunication.count({ where: { communicationTypeId: id } }),
    ]);
    const count = documentTypeCount + communicationCount;
    if (count > 0) {
      throw new ConflictError(
        `This communication type is used by ${documentTypeCount} document type(s) and ${communicationCount} official communication(s). Reassign them before archiving.`,
      );
    }
  },
};

// ── Document Type — belongs to exactly one parent family: a Knowledge Category
// (-> Publications) or a Communication Type (-> Notifications). Enforced by a DB CHECK
// constraint (migration `document_type_parents`); `validate` mirrors the same rule at the
// API layer and additionally rejects/reassigns against an inactive parent. ──────────────
const documentTypeSchemas = standardSchemas({
  knowledge_category_id: z.string().uuid().nullable().optional(),
  communication_type_id: z.string().uuid().nullable().optional(),
});
const documentTypes: MasterDefinition = {
  key: 'document-types',
  model: 'documentType',
  module: 'document_types',
  label: 'Document type',
  identity: 'name_en',
  hasSlug: true,
  hasDisplayOrder: true,
  cacheable: true,
  isPublic: true,
  include: { knowledgeCategory: true, communicationType: true },
  createSchema: documentTypeSchemas.createSchema,
  updateSchema: documentTypeSchemas.updateSchema,
  buildCreateData: (input) => {
    const data = buildStandardCreate(input);
    data.knowledgeCategoryId = input.knowledge_category_id ?? null;
    data.communicationTypeId = input.communication_type_id ?? null;
    return data;
  },
  buildUpdateData: (input) => {
    const data = buildStandardUpdate(input);
    // Setting one parent family field clears the other in the same update, unless the
    // caller explicitly set both (which `validate` below rejects as a conflict).
    if (input.knowledge_category_id !== undefined) {
      data.knowledgeCategoryId = input.knowledge_category_id;
      if (input.communication_type_id === undefined) data.communicationTypeId = null;
    }
    if (input.communication_type_id !== undefined) {
      data.communicationTypeId = input.communication_type_id;
      if (input.knowledge_category_id === undefined) data.knowledgeCategoryId = null;
    }
    return data;
  },
  duplicateWhere: standardDuplicateWhere,
  requiresTransaction: true,
  // Exactly one parent family, and it must exist and be active. Re-checked on create, on
  // reassignment (either parent field present), and on activation (is_active: true) even
  // when the parent fields aren't resent, since the stored parent may have gone inactive
  // since this type was last saved.
  validate: async (ctx: MasterValidationContext) => {
    const existing = ctx.existing;
    const knowledgeCategoryId =
      ctx.input.knowledge_category_id !== undefined
        ? (ctx.input.knowledge_category_id as string | null)
        : ((existing?.knowledgeCategoryId as string | null | undefined) ?? null);
    const communicationTypeId =
      ctx.input.communication_type_id !== undefined
        ? (ctx.input.communication_type_id as string | null)
        : ((existing?.communicationTypeId as string | null | undefined) ?? null);

    const parentFieldsProvided = ctx.input.knowledge_category_id !== undefined || ctx.input.communication_type_id !== undefined;
    const activating = ctx.input.is_active === true;
    if (ctx.mode === 'update' && !parentFieldsProvided && !activating) return;

    if (knowledgeCategoryId && communicationTypeId) {
      throw new ValidationError({
        knowledge_category_id: ['A document type cannot have both a knowledge category and a communication type.'],
      });
    }
    if (!knowledgeCategoryId && !communicationTypeId) {
      throw new ValidationError({
        knowledge_category_id: ['A document type must have exactly one parent: a knowledge category or a communication type.'],
      });
    }

    if (knowledgeCategoryId) {
      if (ctx.tx) await ctx.tx.$queryRaw`SELECT id FROM "knowledge_categories" WHERE id = ${knowledgeCategoryId}::uuid FOR UPDATE`;
      const parent = await repo.findRefById('knowledgeCategory', knowledgeCategoryId, ctx.tx);
      if (!parent) throw new ValidationError({ knowledge_category_id: ['Knowledge category not found.'] });
      if (parent.isActive === false) {
        throw new ValidationError({ knowledge_category_id: ['Cannot attach a document type to an inactive knowledge category.'] });
      }
    } else if (communicationTypeId) {
      if (ctx.tx) await ctx.tx.$queryRaw`SELECT id FROM "communication_types" WHERE id = ${communicationTypeId}::uuid FOR UPDATE`;
      const parent = await repo.findRefById('communicationType', communicationTypeId, ctx.tx);
      if (!parent) throw new ValidationError({ communication_type_id: ['Communication type not found.'] });
      if (parent.isActive === false) {
        throw new ValidationError({ communication_type_id: ['Cannot attach a document type to an inactive communication type.'] });
      }
    }
  },
  // Block archival while any Document (any publication/lifecycle state, including drafts
  // and archived) still references this type. Locks the type row first so a concurrent
  // document create/retype can't slip past the count.
  guardDeactivate: async (id, tx) => {
    await tx.$queryRaw`SELECT id FROM "document_types" WHERE id = ${id}::uuid FOR UPDATE`;
    const count = await tx.document.count({ where: { documentTypeId: id } });
    if (count > 0) {
      throw new ConflictError(`This document type is used by ${count} document(s). Reassign them before archiving.`);
    }
  },
  serialize: serializeDocumentType,
  searchFields: ['nameEn', 'nameHi'],
  orderingAllowList: STANDARD_ORDERING,
  defaultOrder: { field: 'name_en', direction: 'asc' },
  resolveFilter: (query) => {
    const where: Record<string, unknown> = {};
    const parts: string[] = [];
    if (typeof query.knowledge_category_id === 'string') {
      where.knowledgeCategoryId = query.knowledge_category_id;
      parts.push(`knowledge_category_id=${query.knowledge_category_id}`);
    } else if (typeof query.knowledge_category === 'string') {
      where.knowledgeCategory = { slug: query.knowledge_category };
      parts.push(`knowledge_category=${query.knowledge_category}`);
    }
    if (typeof query.communication_type_id === 'string') {
      where.communicationTypeId = query.communication_type_id;
      parts.push(`communication_type_id=${query.communication_type_id}`);
    } else if (typeof query.communication_type === 'string') {
      where.communicationType = { slug: query.communication_type };
      parts.push(`communication_type=${query.communication_type}`);
    }
    const hasKnowledgeCategoryFilter = typeof query.knowledge_category_id === 'string' || typeof query.knowledge_category === 'string';
    const hasCommunicationTypeFilter = typeof query.communication_type_id === 'string' || typeof query.communication_type === 'string';
    if (query.document_section === 'publications' && !hasKnowledgeCategoryFilter) {
      where.knowledgeCategoryId = { not: null };
      parts.push('document_section=publications');
    } else if (query.document_section === 'notifications' && !hasCommunicationTypeFilter) {
      where.communicationTypeId = { not: null };
      parts.push('document_section=notifications');
    }
    return { where, cacheSuffix: parts.length ? `:${parts.join('&')}` : '' };
  },
};

const tenderTypes = standardMaster({ key: 'tender-types', model: 'tenderType', module: 'tender_types', label: 'Tender type' });

// ── Procurement Update Category — parents Procurement Update Type; a standard master, no FK of its own ─
const procurementUpdateCategories: MasterDefinition = {
  ...standardMaster({ key: 'procurement-update-categories', model: 'procurementUpdateCategory', module: 'procurement_update_categories', label: 'Procurement update category', cacheable: true }),
  // Block archival while any procurement update type still parents to this category. Locks the
  // category row first so a concurrent type reassignment/reparenting can't slip past the count.
  guardDeactivate: async (id, tx) => {
    await tx.$queryRaw`SELECT id FROM "procurement_update_categories" WHERE id = ${id}::uuid FOR UPDATE`;
    const count = await tx.procurementUpdateType.count({ where: { procurementUpdateCategoryId: id } });
    if (count > 0) {
      throw new ConflictError(`This procurement update category is used by ${count} procurement update type(s). Reassign them before archiving.`);
    }
  },
};

// ── Procurement Update Type — belongs to a Procurement Update Category; orphan-proof; archive-guarded ─
const procurementUpdateTypeSchemas = standardSchemas({ procurement_update_category_id: z.string().uuid() });
const procurementUpdateTypeUpdateSchema = z
  .object({ name_en: nameEn, name_hi: nameHi, is_active: isActive, display_order: displayOrder, procurement_update_category_id: z.string().uuid() })
  .partial()
  .strict();
const procurementUpdateTypes: MasterDefinition = {
  key: 'procurement-update-types',
  model: 'procurementUpdateType',
  module: 'procurement_update_types',
  label: 'Procurement update type',
  identity: 'name_en',
  hasSlug: true,
  hasDisplayOrder: true,
  cacheable: true,
  isPublic: true,
  include: { procurementUpdateCategory: true },
  createSchema: procurementUpdateTypeSchemas.createSchema,
  updateSchema: procurementUpdateTypeUpdateSchema,
  buildCreateData: (input) => {
    const data = buildStandardCreate(input);
    data.procurementUpdateCategoryId = input.procurement_update_category_id;
    return data;
  },
  buildUpdateData: (input) => {
    const data = buildStandardUpdate(input);
    if (input.procurement_update_category_id !== undefined) data.procurementUpdateCategoryId = input.procurement_update_category_id;
    return data;
  },
  duplicateWhere: standardDuplicateWhere,
  // Prevent orphan/inactive-parent types: the category must exist and be active whenever
  // it is being set (on create, or on reassignment/reactivation via PATCH).
  validate: async (ctx: MasterValidationContext) => {
    const procurementUpdateCategoryId = ctx.input.procurement_update_category_id;
    if (typeof procurementUpdateCategoryId !== 'string') return;
    const category = await repo.findRefById('procurementUpdateCategory', procurementUpdateCategoryId);
    if (!category) throw new ValidationError({ procurement_update_category_id: ['Procurement update category not found.'] });
    if (category.isActive === false) {
      throw new ValidationError({ procurement_update_category_id: ['Cannot attach a procurement update type to an inactive procurement update category.'] });
    }
  },
  // Block archival while any procurement update (any publication/lifecycle state) still
  // references this type. Locks the type row first so a concurrent update assignment can't
  // slip past the count.
  guardDeactivate: async (id, tx) => {
    await tx.$queryRaw`SELECT id FROM "procurement_update_types" WHERE id = ${id}::uuid FOR UPDATE`;
    const count = await tx.procurementUpdate.count({ where: { procurementUpdateTypeId: id } });
    if (count > 0) {
      throw new ConflictError(`This procurement update type is used by ${count} procurement update(s). Reassign them to another type before archiving.`);
    }
  },
  serialize: serializeProcurementUpdateType,
  searchFields: ['nameEn', 'nameHi'],
  orderingAllowList: STANDARD_ORDERING,
  defaultOrder: { field: 'name_en', direction: 'asc' },
  resolveFilter: (query) => {
    if (typeof query.procurement_update_category_id === 'string') {
      return { where: { procurementUpdateCategoryId: query.procurement_update_category_id }, cacheSuffix: `:procurement_update_category_id=${query.procurement_update_category_id}` };
    }
    if (typeof query.procurement_update_category === 'string') {
      return { where: { procurementUpdateCategory: { slug: query.procurement_update_category } }, cacheSuffix: `:procurement_update_category=${query.procurement_update_category}` };
    }
    return { where: {}, cacheSuffix: '' };
  },
};

const enquiryTypes = standardMaster({ key: 'enquiry-types', model: 'enquiryType', module: 'enquiry_types', label: 'Enquiry type' });

// ── Commodity (TASK 7) — adds description + icon media ───────────────────────
const commodityExtra = {
  description_en: z.string().trim().nullable().optional(),
  description_hi: z.string().trim().nullable().optional(),
  category: z.string().trim().max(150).nullable().optional(),
  icon_media_id: z.string().uuid().nullable().optional(),
};
const commoditySchemas = standardSchemas(commodityExtra);
const commodities: MasterDefinition = {
  key: 'commodities',
  model: 'commodity',
  module: 'commodities',
  label: 'Commodity',
  identity: 'name_en',
  hasSlug: true,
  hasDisplayOrder: true,
  cacheable: true,
  isPublic: true,
  include: { iconMedia: true },
  createSchema: commoditySchemas.createSchema,
  updateSchema: commoditySchemas.updateSchema,
  buildCreateData: (input) => {
    const data = buildStandardCreate(input);
    if (input.description_en !== undefined) data.descriptionEn = input.description_en;
    if (input.description_hi !== undefined) data.descriptionHi = input.description_hi;
    if (input.category !== undefined) data.category = input.category;
    if (input.icon_media_id !== undefined) data.iconMediaId = input.icon_media_id;
    return data;
  },
  buildUpdateData: (input) => {
    const data = buildStandardUpdate(input);
    if (input.description_en !== undefined) data.descriptionEn = input.description_en;
    if (input.description_hi !== undefined) data.descriptionHi = input.description_hi;
    if (input.category !== undefined) data.category = input.category;
    if (input.icon_media_id !== undefined) data.iconMediaId = input.icon_media_id;
    return data;
  },
  duplicateWhere: standardDuplicateWhere,
  serialize: serializeCommodity,
  searchFields: ['nameEn', 'nameHi'],
  orderingAllowList: STANDARD_ORDERING,
  defaultOrder: { field: 'name_en', direction: 'asc' },
};

// ── District (TASK 8) — adds state ──────────────────────────────────────────
const districtSchemas = standardSchemas({ state: z.string().trim().max(100).optional() });
const districts: MasterDefinition = {
  ...standardMaster({ key: 'districts', model: 'district', module: 'districts', label: 'District', cacheable: true }),
  createSchema: districtSchemas.createSchema,
  updateSchema: districtSchemas.updateSchema,
  buildCreateData: (input) => {
    const data = buildStandardCreate(input);
    if (input.state !== undefined) data.state = input.state;
    return data;
  },
  buildUpdateData: (input) => {
    const data = buildStandardUpdate(input);
    if (input.state !== undefined) data.state = input.state;
    return data;
  },
  serialize: serializeDistrict,
};

// ── Block (TASK 8) — belongs to a district; composite-unique name; orphan-proof ─
const blockSchemas = standardSchemas({ district_id: z.string().uuid() });
const blockUpdateSchema = z
  .object({ name_en: nameEn, name_hi: nameHi, is_active: isActive, display_order: displayOrder, district_id: z.string().uuid() })
  .partial()
  .strict();
const blocks: MasterDefinition = {
  key: 'blocks',
  model: 'block',
  module: 'blocks',
  label: 'Block',
  identity: 'name_en',
  hasSlug: true,
  hasDisplayOrder: true,
  cacheable: true,
  isPublic: true,
  include: { district: true },
  createSchema: blockSchemas.createSchema,
  updateSchema: blockUpdateSchema,
  buildCreateData: (input) => {
    const data = buildStandardCreate(input);
    data.districtId = input.district_id;
    return data;
  },
  buildUpdateData: (input) => {
    const data = buildStandardUpdate(input);
    if (input.district_id !== undefined) data.districtId = input.district_id;
    return data;
  },
  duplicateWhere: (input) =>
    typeof input.name_en === 'string' && typeof input.district_id === 'string'
      ? { districtId: input.district_id, nameEn: input.name_en }
      : null,
  // Prevent orphan blocks: the parent district must exist and be active.
  validate: async (ctx: MasterValidationContext) => {
    const districtId = ctx.input.district_id;
    if (typeof districtId !== 'string') return; // not changing the parent on this PATCH
    const district = await repo.findRefById('district', districtId);
    if (!district) throw new ValidationError({ district_id: ['District not found.'] });
    if (ctx.mode === 'create' && district.isActive === false) {
      throw new ValidationError({ district_id: ['Cannot attach a block to an inactive district.'] });
    }
  },
  serialize: serializeBlock,
  searchFields: ['nameEn', 'nameHi'],
  orderingAllowList: STANDARD_ORDERING,
  defaultOrder: { field: 'name_en', direction: 'asc' },
  resolveFilter: (query) => {
    if (typeof query.district_id === 'string') {
      return { where: { districtId: query.district_id }, cacheSuffix: `:district_id=${query.district_id}` };
    }
    if (typeof query.district === 'string') {
      return { where: { district: { slug: query.district } }, cacheSuffix: `:district=${query.district}` };
    }
    return { where: {}, cacheSuffix: '' };
  },
};

// ── Financial Year (TASK 16) — label/dates; no overlapping years ─────────────
const financialYearCreateSchema = z
  .object({
    label: z.string().trim().regex(/^\d{4}-\d{4}$/, 'Must be a financial year like 2025-2026.'),
    start_date: dateString,
    end_date: dateString,
    is_active: isActive,
  })
  .strict();
const financialYearUpdateSchema = financialYearCreateSchema.partial().strict();

function toDate(v: unknown): Date {
  return new Date(`${String(v)}T00:00:00.000Z`);
}

const financialYears: MasterDefinition = {
  key: 'financial-years',
  model: 'financialYear',
  module: 'financial_years',
  label: 'Financial year',
  identity: 'label',
  hasSlug: false,
  hasDisplayOrder: false,
  cacheable: false,
  isPublic: true,
  createSchema: financialYearCreateSchema,
  updateSchema: financialYearUpdateSchema,
  buildCreateData: (input) => {
    const data: Record<string, unknown> = {
      label: input.label,
      startDate: toDate(input.start_date),
      endDate: toDate(input.end_date),
    };
    if (input.is_active !== undefined) data.isActive = input.is_active;
    return data;
  },
  buildUpdateData: (input) => {
    const data: Record<string, unknown> = {};
    if (input.label !== undefined) data.label = input.label;
    if (input.start_date !== undefined) data.startDate = toDate(input.start_date);
    if (input.end_date !== undefined) data.endDate = toDate(input.end_date);
    if (input.is_active !== undefined) data.isActive = input.is_active;
    return data;
  },
  duplicateWhere: (input) => (typeof input.label === 'string' ? { label: input.label } : null),
  validate: async (ctx) => {
    const existing = ctx.existing;
    const startRaw = ctx.input.start_date ?? (existing?.startDate as Date | undefined);
    const endRaw = ctx.input.end_date ?? (existing?.endDate as Date | undefined);
    if (startRaw === undefined || endRaw === undefined) return;
    const start = startRaw instanceof Date ? startRaw : toDate(startRaw);
    const end = endRaw instanceof Date ? endRaw : toDate(endRaw);
    if (start > end) {
      throw new ValidationError({ end_date: ['Must be on or after start_date.'] });
    }
    // No overlapping financial years (TASK 16): another FY whose range intersects [start,end].
    const where: Record<string, unknown> = {
      startDate: { lte: end },
      endDate: { gte: start },
    };
    if (existing?.id) where.id = { not: existing.id };
    const clash = await repo.findFirstWhere(ctx.def, where);
    if (clash) {
      throw new ValidationError({ start_date: ['Overlaps an existing financial year.'] });
    }
  },
  serialize: serializeFinancialYear,
  searchFields: ['label'],
  orderingAllowList: ['label', 'start_date', 'end_date', 'created_at'],
  defaultOrder: { field: 'label', direction: 'asc' },
};

// ── Reporting Period (TASK 17) — month/FY/calendar/cumulative granularity ────
const reportingPeriodCreateSchema = z
  .object({
    name_en: nameEn,
    name_hi: nameHi,
    slug: optionalSlug,
    period_type: z.enum(['month', 'financial_year', 'calendar_year', 'cumulative']),
    financial_year_id: z.string().uuid().nullable().optional(),
    calendar_year: z.number().int().min(1900).max(2200).nullable().optional(),
    start_date: dateString,
    end_date: dateString,
    is_active: isActive,
  })
  .strict();
const reportingPeriodUpdateSchema = reportingPeriodCreateSchema.omit({ slug: true }).partial().strict();

const reportingPeriods: MasterDefinition = {
  key: 'reporting-periods',
  model: 'reportingPeriod',
  module: 'reporting_periods',
  label: 'Reporting period',
  identity: 'name_en',
  hasSlug: true,
  hasDisplayOrder: false,
  cacheable: true,
  isPublic: true,
  include: { financialYear: true },
  createSchema: reportingPeriodCreateSchema,
  updateSchema: reportingPeriodUpdateSchema,
  buildCreateData: (input) => {
    const data: Record<string, unknown> = {
      nameEn: input.name_en,
      nameHi: input.name_hi ?? null,
      periodType: input.period_type,
      financialYearId: input.financial_year_id ?? null,
      calendarYear: input.calendar_year ?? null,
      startDate: toDate(input.start_date),
      endDate: toDate(input.end_date),
    };
    if (input.is_active !== undefined) data.isActive = input.is_active;
    return data;
  },
  buildUpdateData: (input) => {
    const data: Record<string, unknown> = {};
    if (input.name_en !== undefined) data.nameEn = input.name_en;
    if (input.name_hi !== undefined) data.nameHi = input.name_hi;
    if (input.period_type !== undefined) data.periodType = input.period_type;
    if (input.financial_year_id !== undefined) data.financialYearId = input.financial_year_id;
    if (input.calendar_year !== undefined) data.calendarYear = input.calendar_year;
    if (input.start_date !== undefined) data.startDate = toDate(input.start_date);
    if (input.end_date !== undefined) data.endDate = toDate(input.end_date);
    if (input.is_active !== undefined) data.isActive = input.is_active;
    return data;
  },
  duplicateWhere: (input) => (typeof input.name_en === 'string' ? { nameEn: input.name_en } : null),
  validate: async (ctx) => {
    const merged = {
      period_type: ctx.input.period_type ?? (ctx.existing?.periodType as string | undefined),
      financial_year_id:
        ctx.input.financial_year_id !== undefined
          ? ctx.input.financial_year_id
          : (ctx.existing?.financialYearId as string | null | undefined),
      calendar_year:
        ctx.input.calendar_year !== undefined
          ? ctx.input.calendar_year
          : (ctx.existing?.calendarYear as number | null | undefined),
    };
    const fields: Record<string, string[]> = {};
    if (merged.period_type === 'calendar_year' && merged.calendar_year == null) {
      fields.calendar_year = ['Required for a calendar_year reporting period.'];
    }
    if ((merged.period_type === 'month' || merged.period_type === 'financial_year') && !merged.financial_year_id) {
      fields.financial_year_id = [`Required for a ${merged.period_type} reporting period.`];
    }
    if (Object.keys(fields).length) throw new ValidationError(fields);

    // start <= end
    const startRaw = ctx.input.start_date ?? (ctx.existing?.startDate as Date | undefined);
    const endRaw = ctx.input.end_date ?? (ctx.existing?.endDate as Date | undefined);
    if (startRaw !== undefined && endRaw !== undefined) {
      const start = startRaw instanceof Date ? startRaw : toDate(startRaw);
      const end = endRaw instanceof Date ? endRaw : toDate(endRaw);
      if (start > end) throw new ValidationError({ end_date: ['Must be on or after start_date.'] });

      // Linked FY must exist, be active, and contain the period dates (API spec §4).
      if (typeof merged.financial_year_id === 'string') {
        const fy = await repo.findRefById('financialYear', merged.financial_year_id);
        if (!fy) throw new ValidationError({ financial_year_id: ['Financial year not found.'] });
        const fyStart = fy.startDate as Date;
        const fyEnd = fy.endDate as Date;
        if (start < fyStart || end > fyEnd) {
          throw new ValidationError({ start_date: ['Dates must fall within the linked financial year.'] });
        }
      }
    }
  },
  serialize: serializeReportingPeriod,
  searchFields: ['nameEn', 'nameHi'],
  orderingAllowList: ['name_en', 'start_date', 'end_date', 'created_at'],
  defaultOrder: { field: 'start_date', direction: 'asc' },
};

// ── The registry ────────────────────────────────────────────────────────────
export const MASTER_DEFINITIONS: MasterDefinition[] = [
  eventCategories,
  eventTypes,
  commodities,
  districts,
  blocks,
  institutionTypes,
  documentTypes,
  knowledgeCategories,
  communicationTypes,
  tenderTypes,
  procurementUpdateCategories,
  procurementUpdateTypes,
  enquiryTypes,
  financialYears,
  reportingPeriods,
];

const BY_KEY = new Map(MASTER_DEFINITIONS.map((d) => [d.key, d]));

/** Resolve a master definition by its route key, or null if unknown. */
export function getMaster(key: string): MasterDefinition | null {
  return BY_KEY.get(key) ?? null;
}

/** Master keys exposed under `/public/masters/{key}`. */
export const PUBLIC_MASTER_KEYS = MASTER_DEFINITIONS.filter((d) => d.isPublic).map((d) => d.key);

// `parse` re-exported for unit tests that exercise a definition's schema directly.
export { parse };
