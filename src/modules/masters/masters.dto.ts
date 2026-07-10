/**
 * Master serializers (row → snake_case API DTO). Each `MasterDefinition` references one of
 * these. They expose only API fields; relations are emitted as compact references
 * (master ref / media ref) per the API spec §1.4 reference shapes.
 */
import type { MediaAsset } from '@prisma/client';
import { toMediaDto } from '@/modules/media/media.dto';
import type { MasterRow } from './masters.types';

function str(v: unknown): string {
  return v as string;
}
function nullableStr(v: unknown): string | null {
  return (v ?? null) as string | null;
}
function nullableNum(v: unknown): number | null {
  return (v ?? null) as number | null;
}
function bool(v: unknown): boolean {
  return Boolean(v);
}
function iso(v: unknown): string {
  return v instanceof Date ? v.toISOString() : String(v);
}
function dateOnly(v: unknown): string {
  return v instanceof Date ? v.toISOString().slice(0, 10) : String(v).slice(0, 10);
}

/** Compact master reference `{ id, slug, name_en, name_hi }` (API spec §1.4). */
export function masterRef(row: MasterRow | null | undefined): Record<string, unknown> | null {
  if (!row) return null;
  return {
    id: str(row.id),
    slug: nullableStr(row.slug),
    name_en: nullableStr(row.nameEn),
    name_hi: nullableStr(row.nameHi),
  };
}

/** The shared `name_en`-based master fields. */
export function serializeStandard(row: MasterRow): Record<string, unknown> {
  return {
    id: str(row.id),
    slug: nullableStr(row.slug),
    name_en: str(row.nameEn),
    name_hi: nullableStr(row.nameHi),
    is_active: bool(row.isActive),
    display_order: nullableNum(row.displayOrder),
    created_at: iso(row.createdAt),
    updated_at: iso(row.updatedAt),
  };
}

export function serializeCommodity(row: MasterRow): Record<string, unknown> {
  return {
    ...serializeStandard(row),
    description_en: nullableStr(row.descriptionEn),
    description_hi: nullableStr(row.descriptionHi),
    category: nullableStr(row.category),
    icon_media_id: nullableStr(row.iconMediaId),
    icon_media: row.iconMedia ? toMediaDto(row.iconMedia as MediaAsset) : null,
  };
}

export function serializeDistrict(row: MasterRow): Record<string, unknown> {
  return { ...serializeStandard(row), state: nullableStr(row.state) };
}

export function serializeBlock(row: MasterRow): Record<string, unknown> {
  return {
    ...serializeStandard(row),
    district_id: str(row.districtId),
    district: masterRef(row.district as MasterRow | undefined),
  };
}

export function serializeFinancialYear(row: MasterRow): Record<string, unknown> {
  return {
    id: str(row.id),
    label: str(row.label),
    start_date: dateOnly(row.startDate),
    end_date: dateOnly(row.endDate),
    is_active: bool(row.isActive),
    created_at: iso(row.createdAt),
    updated_at: iso(row.updatedAt),
  };
}

export function serializeReportingPeriod(row: MasterRow): Record<string, unknown> {
  return {
    id: str(row.id),
    slug: str(row.slug),
    name_en: str(row.nameEn),
    name_hi: nullableStr(row.nameHi),
    period_type: str(row.periodType),
    financial_year_id: nullableStr(row.financialYearId),
    financial_year: row.financialYear
      ? { id: str((row.financialYear as MasterRow).id), label: str((row.financialYear as MasterRow).label) }
      : null,
    calendar_year: nullableNum(row.calendarYear),
    start_date: dateOnly(row.startDate),
    end_date: dateOnly(row.endDate),
    is_active: bool(row.isActive),
    created_at: iso(row.createdAt),
    updated_at: iso(row.updatedAt),
  };
}
