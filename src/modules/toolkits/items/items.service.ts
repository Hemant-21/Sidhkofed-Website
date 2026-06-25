/**
 * Toolkit item service — CRUD for the ordered catalogue lines under a toolkit. Enforces parent
 * existence, case-insensitive duplicate-name prevention, basis↔group-size consistency (against the
 * merged state on update), delete-protection when an item is referenced by a distribution line, and
 * audit. Public toolkit detail embeds active items, so every mutation invalidates the toolkit cache.
 */
import { Prisma } from '@prisma/client';
import { NotFoundError, ConflictError, ValidationError, ProtectedRecordError } from '@/shared/errors';
import { cacheService } from '@/services/cache';
import { auditService, type AuditContext } from '@/modules/audit/audit.service';
import { toolkitService } from '../toolkits.service';
import { toolkitItemRepository } from './items.repository';
import { toToolkitItemDto, type ToolkitItemDto } from './items.dto';
import type { ToolkitItemCreateInput, ToolkitItemUpdateInput } from './items.validators';

const ENTITY = 'toolkit_item';

async function invalidateToolkitCache(): Promise<void> {
  await cacheService.delByPrefix('toolkits:public:');
}

async function assertToolkitExists(toolkitId: string): Promise<void> {
  await toolkitService.getRowById(toolkitId); // throws 404 when missing
}

function dec(v: number | null | undefined): Prisma.Decimal | null | undefined {
  if (v === undefined) return undefined;
  if (v === null) return null;
  return new Prisma.Decimal(v);
}

export async function list(toolkitId: string): Promise<ToolkitItemDto[]> {
  await assertToolkitExists(toolkitId);
  const rows = await toolkitItemRepository.listByToolkit(toolkitId);
  return rows.map(toToolkitItemDto);
}

export async function getById(toolkitId: string, itemId: string): Promise<ToolkitItemDto> {
  await assertToolkitExists(toolkitId);
  const row = await toolkitItemRepository.findByIdForToolkit(itemId, toolkitId);
  if (!row) throw new NotFoundError('Toolkit item not found.');
  return toToolkitItemDto(row);
}

export async function create(toolkitId: string, input: ToolkitItemCreateInput, ctx: AuditContext): Promise<ToolkitItemDto> {
  await assertToolkitExists(toolkitId);
  if (await toolkitItemRepository.nameExists(toolkitId, input.name_en, undefined)) {
    throw new ConflictError(`A toolkit item named "${input.name_en}" already exists in this toolkit.`);
  }
  const created = await toolkitItemRepository.create({
    toolkitId,
    nameEn: input.name_en,
    nameHi: input.name_hi ?? null,
    descriptionEn: input.description_en ?? null,
    descriptionHi: input.description_hi ?? null,
    unit: input.unit ?? null,
    distributionBasis: input.distribution_basis ?? 'individual',
    defaultQuantityPerUnit: dec(input.default_quantity_per_unit) ?? null,
    defaultGroupSize: input.default_group_size ?? null,
    quantitySummary: dec(input.quantity_summary) ?? null,
    isActive: input.is_active ?? true,
    displayOrder: input.display_order ?? 0,
  });
  await auditService.create(ctx, ENTITY, created.id, { toolkit_id: toolkitId, name_en: created.nameEn });
  await invalidateToolkitCache();
  return toToolkitItemDto(created);
}

export async function update(
  toolkitId: string,
  itemId: string,
  input: ToolkitItemUpdateInput,
  ctx: AuditContext,
): Promise<ToolkitItemDto> {
  await assertToolkitExists(toolkitId);
  const existing = await toolkitItemRepository.findByIdForToolkit(itemId, toolkitId);
  if (!existing) throw new NotFoundError('Toolkit item not found.');

  // basis↔group-size consistency against the merged state.
  const mergedBasis = input.distribution_basis ?? existing.distributionBasis;
  const mergedGroupSize = input.default_group_size !== undefined ? input.default_group_size : existing.defaultGroupSize;
  if (mergedBasis === 'group' && (mergedGroupSize === null || mergedGroupSize === undefined)) {
    throw new ValidationError({ default_group_size: ['A group basis requires default_group_size.'] });
  }

  if (input.name_en !== undefined && (await toolkitItemRepository.nameExists(toolkitId, input.name_en, itemId))) {
    throw new ConflictError(`A toolkit item named "${input.name_en}" already exists in this toolkit.`);
  }

  const updated = await toolkitItemRepository.update(itemId, {
    nameEn: input.name_en,
    nameHi: input.name_hi,
    descriptionEn: input.description_en,
    descriptionHi: input.description_hi,
    unit: input.unit,
    distributionBasis: input.distribution_basis,
    defaultQuantityPerUnit: dec(input.default_quantity_per_unit),
    defaultGroupSize: input.default_group_size,
    quantitySummary: dec(input.quantity_summary),
    isActive: input.is_active,
    displayOrder: input.display_order,
  });
  await auditService.update(ctx, ENTITY, itemId, undefined, { name_en: updated.nameEn });
  await invalidateToolkitCache();
  return toToolkitItemDto(updated);
}

export async function remove(toolkitId: string, itemId: string, ctx: AuditContext): Promise<void> {
  await assertToolkitExists(toolkitId);
  const existing = await toolkitItemRepository.findByIdForToolkit(itemId, toolkitId);
  if (!existing) throw new NotFoundError('Toolkit item not found.');
  // Delete-protection is the DB FK contract: toolkit_distribution_items.toolkit_item_id is
  // ON DELETE RESTRICT, so a referenced item raises P2003 — surfaced as a protected_record (409).
  try {
    await toolkitItemRepository.remove(itemId);
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2003') {
      throw new ProtectedRecordError('This toolkit item is used in a distribution summary and cannot be deleted.');
    }
    throw err;
  }
  await auditService.delete(ctx, ENTITY, itemId, { toolkit_id: toolkitId, name_en: existing.nameEn });
  await invalidateToolkitCache();
}

/** Active toolkit-item ids for a toolkit (cross-module reference validation for distributions). */
export async function activeItemIds(toolkitId: string): Promise<Set<string>> {
  return toolkitItemRepository.activeItemIds(toolkitId);
}

export const toolkitItemService = { list, getById, create, update, remove, activeItemIds };
