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
import { assertEditableByActor } from '@/shared/content-guard';
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

/**
 * Canonical Training event-type identifier. Toolkit distribution is a training-level summary
 * (CMS requirements §4.1/§4.3) and may only attach to Training events. Events are classified by
 * their event-type *slug* throughout the codebase (e.g. events list `?event_type=training`); the
 * slug is the stable, seed-derived key ('Training' → `training`). We match on it rather than a
 * hardcoded UUID so the rule survives reseeding and stays consistent with the rest of the module.
 */
const TRAINING_EVENT_TYPE_SLUG = 'training';

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

/**
 * Load the parent event once (404 when missing) and enforce, in order:
 *   1. The event is a Training event — toolkit distribution is a training-level summary and must
 *      not attach to Meeting / Conference / MoU / Procurement / any other event type. Rejected with
 *      409 Conflict, matching this service's existing business-rule convention (duplicate summary).
 *   2. A Content Editor may only mutate distributions while the event is a draft; a published/
 *      archived event requires a Publisher (shared `content.publish` lifecycle grant). API spec §1.2.
 *
 * A single `eventService.getById` lookup backs both checks (no duplicate event reads).
 */
async function assertEventEditable(eventId: string, ctx: AuditContext): Promise<void> {
  const event = await eventService.getById(eventId); // throws NotFoundError when missing
  if (event.event_type.slug !== TRAINING_EVENT_TYPE_SLUG) {
    throw new ConflictError('Toolkit distribution can only be recorded on a Training event.');
  }
  assertEditableByActor(ctx.authz, event.publication_state, 'content.publish');
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
  await assertEventEditable(eventId, ctx);
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
  await assertEventEditable(eventId, ctx);
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
  await assertEventEditable(eventId, ctx);
  const existing = loaded(await distributionRepository.findByIdForEvent(id, eventId));
  await distributionRepository.removeSummary(id);
  await auditService.delete(ctx, ENTITY, id, { event_id: eventId, toolkit_id: existing.toolkitId });
  await invalidateToolkitCache();
}

/**
 * Public cross-event aggregation for a toolkit (summary figures only). Computed entirely in the
 * database — two grouped aggregates (per-model summary counts/participants, and per-item summed
 * totals) plus one metadata lookup — so the full distribution history is never loaded into memory
 * (Issue 11). The caller supplies the already-resolved public toolkit reference; the API shape is
 * unchanged.
 */
export async function aggregateForToolkit(toolkit: {
  id: string;
  slug: string;
  titleEn: string;
  titleHi: string | null;
}): Promise<PublicDistributionSummaryDto> {
  const [modelGroups, itemTotals] = await Promise.all([
    distributionRepository.aggregateSummaryModels(toolkit.id),
    distributionRepository.aggregateItemTotals(toolkit.id),
  ]);

  const breakdown: Record<string, number> = {};
  let eventsCount = 0;
  let participants = 0;
  for (const g of modelGroups) {
    breakdown[g.distributionModel] = g.summaryCount;
    eventsCount += g.summaryCount;
    participants += g.participantsCovered;
  }

  // Resolve canonical item metadata for the aggregated items (bounded by distinct item count).
  const totalByItem = new Map(itemTotals.map((t) => [t.toolkitItemId, t.totalQuantity]));
  const metadata = await distributionRepository.itemMetadata([...totalByItem.keys()]);

  let grandTotal = new Prisma.Decimal(0);
  const items: PublicDistributionItemSummary[] = metadata.map((m) => {
    const total = totalByItem.get(m.id) ?? new Prisma.Decimal(0);
    grandTotal = grandTotal.plus(total);
    return {
      id: m.id,
      name_en: m.nameEn,
      name_hi: m.nameHi,
      unit: m.unit,
      distribution_basis: m.distributionBasis,
      total_quantity: Number(total),
    };
  });

  return {
    toolkit: { id: toolkit.id, slug: toolkit.slug, title_en: toolkit.titleEn, title_hi: toolkit.titleHi },
    distribution_model_breakdown: breakdown,
    total_participants_covered: participants,
    events_count: eventsCount,
    items,
    total_quantity: Number(grandTotal),
  };
}

export const toolkitDistributionService = { list, getById, create, update, remove, aggregateForToolkit };
