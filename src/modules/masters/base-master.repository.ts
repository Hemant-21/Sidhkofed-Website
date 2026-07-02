/**
 * BaseMasterRepository (TASK 3) — the ONLY Prisma caller for every master. Generic over the
 * `MasterDefinition`: it resolves the Prisma model delegate by name and applies the shared
 * CRUD/list shape. No per-master code lives here.
 */
import type { Prisma } from '@prisma/client';
import { prisma } from '@/db/prisma';
import type { MasterDefinition, MasterDelegate, MasterRow } from './masters.types';

/** Resolve the typed-but-structural Prisma delegate for a master (e.g. `prisma.eventType`). */
function delegateFor(model: string): MasterDelegate {
  const d = (prisma as unknown as Record<string, MasterDelegate>)[model];
  if (!d) throw new Error(`Unknown master model "${model}".`);
  return d;
}

function delegate(def: MasterDefinition): MasterDelegate {
  return delegateFor(def.model);
}

/** Camel-case column backing the unique human identity (`name_en` → `nameEn`, or `label`). */
function identityColumn(def: MasterDefinition): string {
  return def.identity === 'label' ? 'label' : 'nameEn';
}

function withInclude(def: MasterDefinition, args: Record<string, unknown>): Record<string, unknown> {
  return def.include ? { ...args, include: def.include } : args;
}

export async function findById(def: MasterDefinition, id: string): Promise<MasterRow | null> {
  return delegate(def).findUnique(withInclude(def, { where: { id } }));
}

/** Look up by the unique identity column (duplicate detection). */
export async function findByIdentity(def: MasterDefinition, value: string): Promise<MasterRow | null> {
  return delegate(def).findUnique({ where: { [identityColumn(def)]: value } });
}

export async function slugExists(def: MasterDefinition, slug: string): Promise<boolean> {
  return (await delegate(def).count({ where: { slug } })) > 0;
}

/** First row matching an arbitrary camelCase `where` (duplicate pre-check). */
export async function findFirstWhere(
  def: MasterDefinition,
  where: Record<string, unknown>,
): Promise<MasterRow | null> {
  return delegate(def).findFirst({ where });
}

export async function create(def: MasterDefinition, data: Record<string, unknown>): Promise<MasterRow> {
  return delegate(def).create(withInclude(def, { data }));
}

export async function update(
  def: MasterDefinition,
  id: string,
  data: Record<string, unknown>,
): Promise<MasterRow> {
  return delegate(def).update(withInclude(def, { where: { id }, data }));
}

/** Fetch any master row by id from an arbitrary model (referential checks across masters). */
export async function findRefById(model: string, id: string): Promise<MasterRow | null> {
  return delegateFor(model).findUnique({ where: { id } });
}

export interface ListResult {
  rows: MasterRow[];
  total: number;
}

export async function list(
  def: MasterDefinition,
  where: Record<string, unknown>,
  orderBy: Prisma.SortOrder | Record<string, unknown> | Array<Record<string, unknown>>,
  skip: number,
  take: number,
): Promise<ListResult> {
  const [rows, total] = await Promise.all([
    delegate(def).findMany(withInclude(def, { where, orderBy, skip, take })),
    delegate(def).count({ where }),
  ]);
  return { rows, total };
}

/** All matching rows, unpaginated — used to build the cached public active list. */
export async function findAll(
  def: MasterDefinition,
  where: Record<string, unknown>,
  orderBy: Record<string, unknown> | Array<Record<string, unknown>>,
): Promise<MasterRow[]> {
  return delegate(def).findMany(withInclude(def, { where, orderBy }));
}

export const baseMasterRepository = {
  findById,
  findByIdentity,
  slugExists,
  findFirstWhere,
  findRefById,
  create,
  update,
  list,
  findAll,
};
