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

/** Resolve a model delegate against a transaction client instead of the default `prisma`. */
function delegateForTx(model: string, tx: Prisma.TransactionClient): MasterDelegate {
  const d = (tx as unknown as Record<string, MasterDelegate>)[model];
  if (!d) throw new Error(`Unknown master model "${model}".`);
  return d;
}

function delegateOrTx(def: MasterDefinition, tx?: Prisma.TransactionClient): MasterDelegate {
  return tx ? delegateForTx(def.model, tx) : delegate(def);
}

/** Camel-case column backing the unique human identity (`name_en` → `nameEn`, or `label`). */
function identityColumn(def: MasterDefinition): string {
  return def.identity === 'label' ? 'label' : 'nameEn';
}

function withInclude(def: MasterDefinition, args: Record<string, unknown>): Record<string, unknown> {
  return def.include ? { ...args, include: def.include } : args;
}

async function findById(def: MasterDefinition, id: string): Promise<MasterRow | null> {
  return delegate(def).findUnique(withInclude(def, { where: { id } }));
}

/** Look up by the unique identity column (duplicate detection). */
async function findByIdentity(def: MasterDefinition, value: string): Promise<MasterRow | null> {
  return delegate(def).findUnique({ where: { [identityColumn(def)]: value } });
}

async function slugExists(def: MasterDefinition, slug: string): Promise<boolean> {
  return (await delegate(def).count({ where: { slug } })) > 0;
}

/** First row matching an arbitrary camelCase `where` (duplicate pre-check). */
async function findFirstWhere(
  def: MasterDefinition,
  where: Record<string, unknown>,
): Promise<MasterRow | null> {
  return delegate(def).findFirst({ where });
}

async function create(
  def: MasterDefinition,
  data: Record<string, unknown>,
  tx?: Prisma.TransactionClient,
): Promise<MasterRow> {
  return delegateOrTx(def, tx).create(withInclude(def, { data }));
}

async function update(
  def: MasterDefinition,
  id: string,
  data: Record<string, unknown>,
  tx?: Prisma.TransactionClient,
): Promise<MasterRow> {
  return delegateOrTx(def, tx).update(withInclude(def, { where: { id }, data }));
}

/**
 * Update inside a transaction, running `def.guardDeactivate` first when provided. Used for
 * `is_active: false` writes so the in-use check and the update are atomic.
 */
async function updateGuarded(
  def: MasterDefinition,
  id: string,
  data: Record<string, unknown>,
): Promise<MasterRow> {
  return prisma.$transaction(async (tx) => {
    if (def.guardDeactivate) await def.guardDeactivate(id, tx);
    const txDelegate = (tx as unknown as Record<string, MasterDelegate>)[def.model];
    if (!txDelegate) throw new Error(`Unknown master model "${def.model}".`);
    return txDelegate.update(withInclude(def, { where: { id }, data }));
  });
}

/** Fetch any master row by id from an arbitrary model (referential checks across masters). */
async function findRefById(model: string, id: string, tx?: Prisma.TransactionClient): Promise<MasterRow | null> {
  const d = tx ? delegateForTx(model, tx) : delegateFor(model);
  return d.findUnique({ where: { id } });
}

interface ListResult {
  rows: MasterRow[];
  total: number;
}

async function list(
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
async function findAll(
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
  updateGuarded,
  list,
  findAll,
};
