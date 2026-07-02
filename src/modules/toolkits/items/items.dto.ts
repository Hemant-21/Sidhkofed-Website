/**
 * Toolkit item DTOs + mapper (API spec §6). Catalogue-level definition lines, ordered by
 * `display_order`. Decimals are transported as JSON numbers (DECIMAL(14,2) fits a double exactly).
 */
import type { ToolkitItem } from '@prisma/client';

const dec = (d: { toString(): string } | null): number | null => (d === null ? null : Number(d));

export interface ToolkitItemDto {
  id: string;
  toolkit_id: string;
  name_en: string;
  name_hi: string | null;
  description_en: string | null;
  description_hi: string | null;
  unit: string | null;
  distribution_basis: string;
  default_quantity_per_unit: number | null;
  default_group_size: number | null;
  quantity_summary: number | null;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export function toToolkitItemDto(i: ToolkitItem): ToolkitItemDto {
  return {
    id: i.id,
    toolkit_id: i.toolkitId,
    name_en: i.nameEn,
    name_hi: i.nameHi,
    description_en: i.descriptionEn,
    description_hi: i.descriptionHi,
    unit: i.unit,
    distribution_basis: i.distributionBasis,
    default_quantity_per_unit: dec(i.defaultQuantityPerUnit),
    default_group_size: i.defaultGroupSize,
    quantity_summary: dec(i.quantitySummary),
    is_active: i.isActive,
    display_order: i.displayOrder,
    created_at: i.createdAt.toISOString(),
    updated_at: i.updatedAt.toISOString(),
  };
}

/** Public, trimmed item shape for the toolkit detail (no audit/timestamps). */
export interface PublicToolkitItemDto {
  id: string;
  name_en: string;
  name_hi: string | null;
  description_en: string | null;
  unit: string | null;
  distribution_basis: string;
  default_quantity_per_unit: number | null;
  default_group_size: number | null;
  display_order: number;
}

export function toPublicToolkitItemDto(i: ToolkitItem): PublicToolkitItemDto {
  return {
    id: i.id,
    name_en: i.nameEn,
    name_hi: i.nameHi,
    description_en: i.descriptionEn,
    unit: i.unit,
    distribution_basis: i.distributionBasis,
    default_quantity_per_unit: dec(i.defaultQuantityPerUnit),
    default_group_size: i.defaultGroupSize,
    display_order: i.displayOrder,
  };
}
