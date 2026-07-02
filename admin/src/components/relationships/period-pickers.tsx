'use client';

/**
 * Reporting-period & financial-year option hooks (Phase 15.8). These are bounded reference
 * lists (codex §6 "Financial Year / Reporting Period" master), so — like {@link useMasterOptions} —
 * the dropdown loads them eagerly and maps to the shared {@link SelectOption} shape consumed by
 * `<SelectField>` and the list filter bars.
 *
 * They are deliberately NOT served through `useMasterOptions`, because those two masters diverge
 * from the standard `name_en` + `display_order` master shape (masters.registry.ts):
 *   - `financial-years` has NO `name_en`/`slug`/`display_order`; its identity is `label` and its
 *     ordering allow-list is `label,start_date,end_date,created_at`. The standard hook would send
 *     `ordering=display_order` (→ 422) and read a non-existent `name_en`.
 *   - `reporting-periods` has `name_en`/`slug` but NO `display_order`; ordering allow-list is
 *     `name_en,start_date,end_date,created_at`.
 *
 * Each hook orders by an allow-listed field and maps the correct label column, so the picker shows
 * meaningful options and the backend never rejects the request. Deactivated values are kept but
 * disabled so an already-linked historical value still renders while staying unselectable for new
 * entries (codex §6).
 */

import { useQuery } from '@tanstack/react-query';
import { MASTERS } from '@/constants/api-endpoints';
import { getList } from '@/lib/api/http';
import { PAGE_SIZE_MAX } from '@/constants/app';
import type { SelectOption } from '@/components/ui/select';
import type { OptionsResult } from './use-options';

/** `financial-years` master row (masters.dto.ts → serializeFinancialYear). */
interface FinancialYearRecord {
  id: string;
  label: string;
  start_date: string | null;
  end_date: string | null;
  is_active?: boolean;
}

/** `reporting-periods` master row (masters.dto.ts → serializeReportingPeriod). */
interface ReportingPeriodRecord {
  id: string;
  slug: string;
  name_en: string;
  name_hi: string | null;
  period_type: string;
  financial_year: { id: string; label: string } | null;
  calendar_year: number | null;
  start_date: string | null;
  end_date: string | null;
  is_active?: boolean;
}

/** Human label for a reporting-period's granularity (period_type), e.g. "Financial year". */
const PERIOD_TYPE_LABEL: Record<string, string> = {
  month: 'Month',
  financial_year: 'Financial year',
  calendar_year: 'Calendar year',
  cumulative: 'Cumulative',
};

export function periodTypeLabel(periodType: string): string {
  return PERIOD_TYPE_LABEL[periodType] ?? periodType;
}

/**
 * Active financial-year options (most-recent first). Maps the FY `label` (e.g. `2025-2026`) to the
 * option label; ids are the option values. Deactivated FYs are kept but disabled.
 */
export function useFinancialYearOptions(opts: { enabled?: boolean } = {}): OptionsResult {
  const { enabled = true } = opts;
  const query = useQuery({
    queryKey: ['master', 'financial-years', { ordering: 'label-desc' }],
    queryFn: () =>
      getList<FinancialYearRecord>(MASTERS.admin('financial-years'), {
        page_size: PAGE_SIZE_MAX,
        ordering: '-label', // newest financial year first (allow-listed field)
      }),
    enabled,
    staleTime: 5 * 60_000,
  });

  const options: SelectOption[] = (query.data?.items ?? []).map((fy) => ({
    value: fy.id,
    label: fy.label,
    disabled: fy.is_active === false,
  }));

  return { options, isLoading: query.isLoading, isError: query.isError, refetch: query.refetch };
}

/**
 * Active reporting-period options. The label combines the period name and its granularity (and the
 * financial-year label when present) so an editor can tell two same-named periods apart, e.g.
 * "Q1 — Month · 2025-2026". Ordered by `name_en` (an allow-listed field). Deactivated periods are
 * kept but disabled.
 */
export function useReportingPeriodOptions(opts: { enabled?: boolean } = {}): OptionsResult {
  const { enabled = true } = opts;
  const query = useQuery({
    queryKey: ['master', 'reporting-periods', { ordering: 'name_en' }],
    queryFn: () =>
      getList<ReportingPeriodRecord>(MASTERS.admin('reporting-periods'), {
        page_size: PAGE_SIZE_MAX,
        ordering: 'name_en',
      }),
    enabled,
    staleTime: 5 * 60_000,
  });

  const options: SelectOption[] = (query.data?.items ?? []).map((rp) => {
    const parts = [periodTypeLabel(rp.period_type)];
    if (rp.financial_year) parts.push(rp.financial_year.label);
    else if (rp.calendar_year) parts.push(String(rp.calendar_year));
    return {
      value: rp.id,
      label: `${rp.name_en} — ${parts.join(' · ')}`,
      disabled: rp.is_active === false,
    };
  });

  return { options, isLoading: query.isLoading, isError: query.isError, refetch: query.refetch };
}
