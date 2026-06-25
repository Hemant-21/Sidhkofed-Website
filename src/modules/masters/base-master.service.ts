/**
 * BaseMasterService (TASK 3) — the single business pipeline shared by all 16 masters.
 * Owns: validation orchestration, duplicate prevention, stable slug generation, audit
 * logging (CREATE/UPDATE/ACTIVATE/DEACTIVATE with old/new values — TASK 20), and Redis
 * cache invalidation (TASK 21). Nothing master-specific lives here; per-master behavior is
 * read from the `MasterDefinition`.
 */
import { ConflictError, NotFoundError, ValidationError, type AppError } from '@/shared/errors';
import { resolveOrdering } from '@/shared/listing';
import { uniqueSlug, slugify } from '@/utils/slug';
import { auditService, type AuditContext } from '@/modules/audit/audit.service';
import { cacheService } from '@/services/cache';
import { baseMasterRepository as repo } from './base-master.repository';
import { parse } from './base-master.validator';
import type { MasterDefinition, MasterInput, MasterRow } from './masters.types';

const CACHE_PREFIX = 'masters:public';

function cacheKeyBase(def: MasterDefinition): string {
  return `${CACHE_PREFIX}:${def.key}`;
}

/** Drop the whole public cache family for a master after any write. */
async function invalidate(def: MasterDefinition): Promise<void> {
  if (def.cacheable) await cacheService.delByPrefix(cacheKeyBase(def));
}

/** snake_case API field → camelCase Prisma column. */
function apiToColumn(field: string): string {
  return field.replace(/_([a-z])/g, (_m, c: string) => c.toUpperCase());
}

function identityColumn(def: MasterDefinition): string {
  return def.identity === 'label' ? 'label' : 'nameEn';
}

/** Default ordering: display_order (when present) then the identity column, ascending. */
function defaultOrderBy(def: MasterDefinition): Array<Record<string, 'asc' | 'desc'>> {
  const order: Array<Record<string, 'asc' | 'desc'>> = [];
  if (def.hasDisplayOrder) order.push({ displayOrder: 'asc' });
  order.push({ [identityColumn(def)]: 'asc' });
  return order;
}

function resolveOrderBy(
  def: MasterDefinition,
  ordering: unknown,
): Record<string, 'asc' | 'desc'> | Array<Record<string, 'asc' | 'desc'>> {
  if (ordering === undefined || ordering === null || ordering === '') return defaultOrderBy(def);
  const ob = resolveOrdering(ordering, def.orderingAllowList, def.defaultOrder);
  return { [apiToColumn(ob.field)]: ob.direction };
}

/** Translate Prisma constraint errors into the §1.4 contract. */
function asAppError(err: unknown, def: MasterDefinition): unknown {
  if (err && typeof err === 'object' && 'code' in err) {
    const code = (err as { code?: string }).code;
    if (code === 'P2002') {
      return new ConflictError(`A ${def.label} with this name or slug already exists.`);
    }
    if (code === 'P2003') {
      return new ValidationError({ _: ['A referenced record does not exist.'] });
    }
  }
  return err;
}

async function ensureSlug(def: MasterDefinition, input: MasterInput): Promise<string | undefined> {
  if (!def.hasSlug) return undefined;
  const provided = input.slug;
  if (typeof provided === 'string' && provided.trim().length > 0) {
    const candidate = slugify(provided);
    if (await repo.slugExists(def, candidate)) {
      throw new ConflictError(`A ${def.label} with the slug "${candidate}" already exists.`);
    }
    return candidate;
  }
  const source = String(input[def.identity] ?? '');
  return uniqueSlug(source, (c) => repo.slugExists(def, c));
}

async function assertUnique(def: MasterDefinition, input: MasterInput, excludeId?: string): Promise<void> {
  const where = def.duplicateWhere(input);
  if (!where) return;
  const existing = await repo.findFirstWhere(def, where);
  if (existing && existing.id !== excludeId) {
    throw new ConflictError(`A ${def.label} with these details already exists.`);
  }
}

function loaded(def: MasterDefinition, row: MasterRow | null): MasterRow {
  if (!row) throw new NotFoundError(`${def.label} not found.`);
  return row;
}

// ── Admin operations ────────────────────────────────────────────────────────
export async function create(
  def: MasterDefinition,
  body: unknown,
  ctx: AuditContext,
): Promise<Record<string, unknown>> {
  const input = parse(def.createSchema, body) as MasterInput;
  if (def.validate) await def.validate({ mode: 'create', input, def });
  await assertUnique(def, input);

  const data = def.buildCreateData(input);
  const slug = await ensureSlug(def, input);
  if (slug) data.slug = slug;

  let row: MasterRow;
  try {
    row = await repo.create(def, data);
  } catch (err) {
    throw asAppError(err, def) as AppError;
  }

  await auditService.log('MASTER_CREATE', ctx, {
    module: def.module,
    recordId: row.id as string,
    newState: 'active',
    newValues: def.serialize(row),
    summary: `Created ${def.label}`,
  });
  await invalidate(def);
  return def.serialize(row);
}

export async function update(
  def: MasterDefinition,
  id: string,
  body: unknown,
  ctx: AuditContext,
): Promise<Record<string, unknown>> {
  const existing = loaded(def, await repo.findById(def, id));
  const input = parse(def.updateSchema, body) as MasterInput;
  if (def.validate) await def.validate({ mode: 'update', input, existing, def });
  await assertUnique(def, input, id);

  let row: MasterRow;
  try {
    row = await repo.update(def, id, def.buildUpdateData(input));
  } catch (err) {
    throw asAppError(err, def) as AppError;
  }

  await auditService.log('MASTER_UPDATE', ctx, {
    module: def.module,
    recordId: id,
    oldValues: def.serialize(existing),
    newValues: def.serialize(row),
    summary: `Updated ${def.label}`,
  });
  await invalidate(def);
  return def.serialize(row);
}

export async function setActive(
  def: MasterDefinition,
  id: string,
  active: boolean,
  ctx: AuditContext,
): Promise<Record<string, unknown>> {
  const existing = loaded(def, await repo.findById(def, id));
  const wasActive = Boolean(existing.isActive);
  const row = await repo.update(def, id, { isActive: active });

  await auditService.log(active ? 'MASTER_ACTIVATE' : 'MASTER_DEACTIVATE', ctx, {
    module: def.module,
    recordId: id,
    previousState: wasActive ? 'active' : 'inactive',
    newState: active ? 'active' : 'inactive',
    summary: `${active ? 'Activated' : 'Deactivated'} ${def.label}`,
  });
  await invalidate(def);
  return def.serialize(row);
}

export async function getById(def: MasterDefinition, id: string): Promise<Record<string, unknown>> {
  return def.serialize(loaded(def, await repo.findById(def, id)));
}

export interface ListPage {
  skip: number;
  take: number;
}

export async function adminList(
  def: MasterDefinition,
  query: Record<string, unknown>,
  page: ListPage,
): Promise<{ items: Array<Record<string, unknown>>; total: number }> {
  const where: Record<string, unknown> = {};

  if (query.is_active === 'true' || query.is_active === 'false') {
    where.isActive = query.is_active === 'true';
  }
  const search = typeof query.search === 'string' ? query.search.trim() : '';
  if (search) {
    where.OR = def.searchFields.map((f) => ({ [f]: { contains: search, mode: 'insensitive' } }));
  }
  if (def.resolveFilter) Object.assign(where, def.resolveFilter(query).where);

  const orderBy = resolveOrderBy(def, query.ordering);
  const { rows, total } = await repo.list(def, where, orderBy, page.skip, page.take);
  return { items: rows.map((r) => def.serialize(r)), total };
}

// ── Public operations (active only, cached) ─────────────────────────────────
async function activeSerialized(
  def: MasterDefinition,
  filterWhere: Record<string, unknown>,
  cacheSuffix: string,
): Promise<Array<Record<string, unknown>>> {
  const key = `${cacheKeyBase(def)}${cacheSuffix}`;
  if (def.cacheable) {
    const cached = await cacheService.getJson<Array<Record<string, unknown>>>(key);
    if (cached) return cached;
  }
  const rows = await repo.findAll(def, { isActive: true, ...filterWhere }, defaultOrderBy(def));
  const serialized = rows.map((r) => def.serialize(r));
  if (def.cacheable) await cacheService.setJson(key, serialized);
  return serialized;
}

export async function publicList(
  def: MasterDefinition,
  query: Record<string, unknown>,
  page: ListPage,
): Promise<{ items: Array<Record<string, unknown>>; total: number }> {
  const filter = def.resolveFilter ? def.resolveFilter(query) : { where: {}, cacheSuffix: '' };
  const all = await activeSerialized(def, filter.where, filter.cacheSuffix);
  return { items: all.slice(page.skip, page.skip + page.take), total: all.length };
}

export const baseMasterService = {
  create,
  update,
  setActive,
  getById,
  adminList,
  publicList,
};
