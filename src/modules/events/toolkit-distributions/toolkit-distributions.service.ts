/**
 * Toolkit distribution service — per-event (training-level) distribution summaries + item lines.
 * Summary figures only (CMS requirements §4.3): no beneficiary rows, stock ledger, inventory, or
 * acknowledgements. Owns: event/toolkit existence + linkability checks, item-membership validation,
 * the total_quantity auto-calculation, transactional writes, audit, toolkit-cache invalidation, and
 * the public cross-event aggregation. Cross-module work goes through services only.
 */
import { Prisma } from '@prisma/client';
import { NotFoundError, ConflictError, ValidationError } from '@/shared/errors';
import { cacheService } from '@/services/cache';
import { auditService, type AuditContext } from '@/modules/audit/audit.service';
import { eventService } from '../events.service';
import { toolkitService } from '@/modules/toolkits/toolkits.service';
import { toolkitItemService } from '@/modules/toolkits/items/items.service';
import { distributionRepository, type DistributionSummaryRow } from './toolkit-distributions.repository';
import { computeTotalQuantity } from './toolkit-distributions.calc';
import {
  toDistributionSummaryDto,
  type DistributionSummaryDto,
  type PublicDistributionSummaryDto,
  type PublicDistributionItemSummary,
} from './toolkit-distributions.dto';
import type { DistributionCreateInput, DistributionUpdateInput, DistributionItemInput } from './toolkit-distributions.validators';

const ENTITY = 'toolkit_distribution_summary';

async function invalidateToolkitCache(): Promise<void> {
  await cacheService.delByPrefix('toolkits:public:');
}

function requireUser(ctx: AuditContext): string {
  if (!ctx.userId) throw new ValidationError({ _: ['An authenticated user is required.'] });
  return ctx.userId;
}

async function assertEventExists(eventId: string): Promise<void> {
  await eventService.getById(eventId); // throws NotFoundError when missing
}

function loaded(row: DistributionSummaryRow | null): DistributionSummaryRow {
  if (!row) throw new NotFoundError('Toolkit distribution summary not found.');
  return row;
}

/** Validate every item references an active item of the parent toolkit, and map to a row + total. */
async function buildItemRows(
  toolkitId: string,
  items: DistributionItemInput[],
): Promise<Array<Omit<Prisma.ToolkitDistributionItemUncheckedCreateInput, 'toolkitDistributionSummaryId'>>> {
  if (items.length === 0) return [];
  const activeIds = await toolkitItemService.activeItemIds(toolkitId);
  const errors: Record<string, string[]> = {};
  items.forEach((it, i) => {
    if (!activeIds.has(it.toolkit_item_id)) {
      errors[`items.${i}.toolkit_item_id`] = ['Not an active item of the selected toolkit.'];
    }
  });
  if (Object.keys(errors).length > 0) throw new ValidationError(errors);

  return items.map((it) => {
    const total = computeTotalQuantity({
      manualOverride: it.manual_override ?? false,
      totalQuantity: it.total_quantity ?? null,
      quantityPerUnit: it.quantity_per_unit ?? null,
      numberOfUnitsOrGroups: it.number_of_units_or_groups ?? null,
    });
    return {
      toolkitItemId: it.toolkit_item_id,
      distributionBasis: it.distribution_basis,
      quantityPerUnit: it.quantity_per_unit ?? null,
      numberOfUnitsOrGroups: it.number_of_units_or_groups ?? null,
      totalQuantity: total,
      manualOverride: it.manual_override ?? false,
    };
  });
}

export async function list(eventId: string): Promise<DistributionSummaryDto[]> {
  await assertEventExists(eventId);
  const rows = await distributionRepository.listByEvent(eventId);
  return rows.map(toDistributionSummaryDto);
}

export async function getById(eventId: string, id: string): Promise<DistributionSummaryDto> {
  await assertEventExists(eventId);
  return toDistributionSummaryDto(loaded(await distributionRepository.findByIdForEvent(id, eventId)));
}

export async function create(eventId: string, input: DistributionCreateInput, ctx: AuditContext): Promise<DistributionSummaryDto> {
  const userId = requireUser(ctx);
  await assertEventExists(eventId);
  await toolkitService.assertLinkable(input.toolkit_id);
  if (await distributionRepository.existsForEventToolkit(eventId, input.toolkit_id)) {
    throw new ConflictError('A distribution summary for this toolkit already exists on this event.');
  }
  const itemRows = await buildItemRows(input.toolkit_id, input.items ?? []);

  const created = await distributionRepository.transaction(async (tx) => {
    const summary = await distributionRepository.createSummary(
      {
        eventId,
        toolkitId: input.toolkit_id,
        distributionDone: input.distribution_done ?? false,
        distributionModel: input.distribution_model,
        participantsCovered: input.participants_covered ?? null,
        distributionDate: input.distribution_date ?? null,
        remarksEn: input.remarks_en ?? null,
        remarksHi: input.remarks_hi ?? null,
        createdById: userId,
        updatedById: userId,
      },
      tx,
    );
    await distributionRepository.replaceItems(summary.id, itemRows, tx);
    return summary;
  });

  await auditService.create(ctx, ENTITY, created.id, { event_id: eventId, toolkit_id: input.toolkit_id });
  await invalidateToolkitCache();
  return toDistributionSummaryDto(loaded(await distributionRepository.findById(created.id)));
}

export async function update(
  eventId: string,
  id: string,
  input: DistributionUpdateInput,
  ctx: AuditContext,
): Promise<DistributionSummaryDto> {
  const userId = requireUser(ctx);
  await assertEventExists(eventId);
  const existing = loaded(await distributionRepository.findByIdForEvent(id, eventId));

  const itemRows = input.items !== undefined ? await buildItemRows(existing.toolkitId, input.items) : undefined;

  await distributionRepository.transaction(async (tx) => {
    await distributionRepository.updateSummary(
      id,
      {
        distributionDone: input.distribution_done,
        distributionModel: input.distribution_model,
        participantsCovered: input.participants_covered,
        distributionDate: input.distribution_date,
        remarksEn: input.remarks_en,
        remarksHi: input.remarks_hi,
        updatedById: userId,
      },
      tx,
    );
    if (itemRows !== undefined) await distributionRepository.replaceItems(id, itemRows, tx);
  });

  await auditService.update(ctx, ENTITY, id, undefined, { event_id: eventId });
  await invalidateToolkitCache();
  return toDistributionSummaryDto(loaded(await distributionRepository.findById(id)));
}

export async function remove(eventId: string, id: string, ctx: AuditContext): Promise<void> {
  await assertEventExists(eventId);
  const existing = loaded(await distributionRepository.findByIdForEvent(id, eventId));
  await distributionRepository.removeSummary(id);
  await auditService.delete(ctx, ENTITY, id, { event_id: eventId, toolkit_id: existing.toolkitId });
  await invalidateToolkitCache();
}

/**
 * Public cross-event aggregation for a toolkit (summary figures only). Sums item totals and
 * participant counts across every summary whose event is publicly visible; the caller supplies the
 * already-resolved public toolkit reference.
 */
export async function aggregateForToolkit(toolkit: {
  id: string;
  slug: string;
  titleEn: string;
  titleHi: string | null;
}): Promise<PublicDistributionSummaryDto> {
  const rows = await distributionRepository.publishedSummariesForToolkit(toolkit.id);

  const breakdown: Record<string, number> = {};
  let participants = 0;
  let grandTotal = new Prisma.Decimal(0);
  const itemMap = new Map<string, { item: PublicDistributionItemSummary; total: Prisma.Decimal }>();

  for (const summary of rows) {
    breakdown[summary.distributionModel] = (breakdown[summary.distributionModel] ?? 0) + 1;
    participants += summary.participantsCovered ?? 0;
    for (const line of summary.items) {
      const lineTotal = line.totalQuantity ?? new Prisma.Decimal(0);
      grandTotal = grandTotal.plus(lineTotal);
      const existing = itemMap.get(line.toolkitItemId);
      if (existing) {
        existing.total = existing.total.plus(lineTotal);
      } else {
        itemMap.set(line.toolkitItemId, {
          item: {
            id: line.toolkitItemId,
            name_en: line.toolkitItem.nameEn,
            name_hi: line.toolkitItem.nameHi,
            unit: line.toolkitItem.unit,
            distribution_basis: line.distributionBasis,
            total_quantity: 0,
          },
          total: new Prisma.Decimal(lineTotal),
        });
      }
    }
  }

  const items = [...itemMap.values()].map(({ item, total }) => ({ ...item, total_quantity: Number(total) }));

  return {
    toolkit: { id: toolkit.id, slug: toolkit.slug, title_en: toolkit.titleEn, title_hi: toolkit.titleHi },
    distribution_model_breakdown: breakdown,
    total_participants_covered: participants,
    events_count: rows.length,
    items,
    total_quantity: Number(grandTotal),
  };
}

export const toolkitDistributionService = { list, getById, create, update, remove, aggregateForToolkit };
