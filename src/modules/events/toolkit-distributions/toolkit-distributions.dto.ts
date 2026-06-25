/**
 * Toolkit distribution DTOs + mappers (API spec §5/§6). Admin detail/item shapes for the
 * per-event endpoints, plus the public aggregation shape returned by
 * `GET /public/toolkits/{slug}/distribution-summary` — summary figures only, never beneficiary data.
 */
import type { DistributionSummaryRow } from './toolkit-distributions.repository';

const dec = (d: { toString(): string } | null): number | null => (d === null ? null : Number(d));
const iso = (d: Date | null): string | null => (d ? d.toISOString() : null);
const dateOnlyStr = (d: Date | null): string | null => (d ? d.toISOString().slice(0, 10) : null);

type ItemRow = DistributionSummaryRow['items'][number];

export interface DistributionItemDto {
  id: string;
  toolkit_item_id: string;
  name_en: string;
  name_hi: string | null;
  unit: string | null;
  distribution_basis: string;
  quantity_per_unit: number | null;
  number_of_units_or_groups: number | null;
  total_quantity: number | null;
  manual_override: boolean;
}

function toItemDto(i: ItemRow): DistributionItemDto {
  return {
    id: i.id,
    toolkit_item_id: i.toolkitItemId,
    name_en: i.toolkitItem.nameEn,
    name_hi: i.toolkitItem.nameHi,
    unit: i.toolkitItem.unit,
    distribution_basis: i.distributionBasis,
    quantity_per_unit: dec(i.quantityPerUnit),
    number_of_units_or_groups: i.numberOfUnitsOrGroups,
    total_quantity: dec(i.totalQuantity),
    manual_override: i.manualOverride,
  };
}

export interface DistributionSummaryDto {
  id: string;
  event_id: string;
  toolkit: { id: string; slug: string; title_en: string; title_hi: string | null };
  distribution_done: boolean;
  distribution_model: string;
  participants_covered: number | null;
  distribution_date: string | null;
  remarks_en: string | null;
  remarks_hi: string | null;
  items: DistributionItemDto[];
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export function toDistributionSummaryDto(s: DistributionSummaryRow): DistributionSummaryDto {
  return {
    id: s.id,
    event_id: s.eventId,
    toolkit: { id: s.toolkit.id, slug: s.toolkit.slug, title_en: s.toolkit.titleEn, title_hi: s.toolkit.titleHi },
    distribution_done: s.distributionDone,
    distribution_model: s.distributionModel,
    participants_covered: s.participantsCovered,
    distribution_date: dateOnlyStr(s.distributionDate),
    remarks_en: s.remarksEn,
    remarks_hi: s.remarksHi,
    items: s.items.map(toItemDto),
    created_by: s.createdById,
    updated_by: s.updatedById,
    created_at: s.createdAt.toISOString(),
    updated_at: iso(s.updatedAt) as string,
  };
}

// ── Public aggregation (API spec §5) ───────────────────────────────────────────
export interface PublicDistributionItemSummary {
  id: string; // toolkit_item_id
  name_en: string;
  name_hi: string | null;
  unit: string | null;
  distribution_basis: string;
  total_quantity: number | null;
}

export interface PublicDistributionSummaryDto {
  toolkit: { id: string; slug: string; title_en: string; title_hi: string | null };
  distribution_model_breakdown: Record<string, number>;
  total_participants_covered: number;
  events_count: number;
  items: PublicDistributionItemSummary[];
  total_quantity: number;
}
