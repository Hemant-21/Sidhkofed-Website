/**
 * Zod schemas + cross-field validation for Website Metric configuration payloads.
 *
 * A Website Metric configuration is only ever valid when it points at a REAL, PUBLIC-ELIGIBLE
 * measure of a real Operational Report (Stage 1's registry — `operational-reports.registry.ts` —
 * is the single source of truth this file defers to; eligibility is never re-derived here). Reject
 * anything else at validation time, before it ever reaches the repository:
 *   - `reportKey` must be a known `ReportKey` (`isReportKey`).
 *   - `measureKey` must exist on that report's `measures[]` AND have `publicEligible === true`.
 *   - `filterConfig` keys must be a subset of the MEASURE's `supportedFilters` (not just the
 *     report's — a measure may support a narrower filter set than its parent report).
 *   - `periodConfig.mode` must be one of the measure's `supportedPeriodModes`.
 *   - `placementKey` must be in the `ALLOWED_PLACEMENTS` registry (`website-metrics.types.ts`).
 */
import { z } from 'zod';
import { parseSchema, uuid } from '@/shared/validation';
import { ValidationError } from '@/shared/errors';
import { getReportDefinition, isReportKey } from '../operational-reports/operational-reports.registry';
import type { MeasureDefinition, ReportKey } from '../operational-reports/operational-reports.types';
import { ALLOWED_PLACEMENTS, type PlacementKey, type WebsiteMetricConfig } from './website-metrics.types';

const periodModeSchema = z.enum(['fixed_range', 'financial_year', 'current_financial_year']);

const periodConfigSchema = z
  .object({
    mode: periodModeSchema,
    startDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a YYYY-MM-DD date.')
      .optional(),
    endDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a YYYY-MM-DD date.')
      .optional(),
    financialYearLabel: z.string().trim().min(1).max(80).optional(),
  })
  .strict();

const filterValue = z.string().trim().min(1).max(120);
const filterConfigSchema = z.record(z.string(), z.array(filterValue).max(50));

const placementKeySchema = z.enum(ALLOWED_PLACEMENTS);

const labelEnSchema = z.string().trim().min(1, 'This field is required.').max(255);
const labelHiSchema = z.string().trim().max(255).nullable().optional();
const displayOrderSchema = z.number().int().min(0).max(100000);

const createBodySchema = z
  .object({
    reportKey: z.string().trim().min(1),
    measureKey: z.string().trim().min(1),
    filterConfig: filterConfigSchema.optional(),
    periodConfig: periodConfigSchema,
    labelEn: labelEnSchema,
    labelHi: labelHiSchema,
    placementKey: placementKeySchema,
    displayOrder: displayOrderSchema.optional(),
  })
  .strict();

const updateBodySchema = z
  .object({
    reportKey: z.string().trim().min(1).optional(),
    measureKey: z.string().trim().min(1).optional(),
    filterConfig: filterConfigSchema.optional(),
    periodConfig: periodConfigSchema.optional(),
    labelEn: labelEnSchema.optional(),
    labelHi: labelHiSchema,
    placementKey: placementKeySchema.optional(),
    displayOrder: displayOrderSchema.optional(),
  })
  .strict();

export interface WebsiteMetricCreateInput {
  reportKey: string;
  measureKey: string;
  filterConfig: Record<string, string[]>;
  periodConfig: z.infer<typeof periodConfigSchema>;
  labelEn: string;
  labelHi?: string | null;
  placementKey: PlacementKey;
  displayOrder?: number;
}

export interface WebsiteMetricUpdateInput {
  reportKey?: string;
  measureKey?: string;
  filterConfig?: Record<string, string[]>;
  periodConfig?: z.infer<typeof periodConfigSchema>;
  labelEn?: string;
  labelHi?: string | null;
  placementKey?: PlacementKey;
  displayOrder?: number;
}

export function validateCreateBody(payload: unknown): WebsiteMetricCreateInput {
  const parsed = parseSchema(createBodySchema, payload);
  const filterConfig = parsed.filterConfig ?? {};
  assertMeasureConfig(parsed.reportKey, parsed.measureKey, filterConfig, parsed.periodConfig);
  return { ...parsed, filterConfig };
}

export function validateUpdateBody(payload: unknown): WebsiteMetricUpdateInput {
  return parseSchema(updateBodySchema, payload);
}

/**
 * Filter VALUES are free-form strings for `eventStatus` (an enum) but must be UUIDs for every other
 * supported filter key (master-data ids) — mirrors `operational-reports.validators.ts` exactly, since
 * these filter values flow straight into the same `operationalReportsService.generate` call.
 */
const NON_UUID_FILTER_KEYS = new Set(['eventStatus']);

/**
 * The core cross-field eligibility check shared by create and update (a config patch that touches
 * reportKey/measureKey/filterConfig/periodConfig is re-validated against the MERGED, effective
 * config — never just the patched fields in isolation). Throws a field-scoped `ValidationError`
 * naming exactly what is wrong; never silently drops or coerces an invalid config.
 */
export function assertMeasureConfig(
  reportKey: string,
  measureKey: string,
  filterConfig: Record<string, string[]>,
  periodConfig: { mode: string },
): MeasureDefinition {
  if (!isReportKey(reportKey)) {
    throw new ValidationError({ reportKey: [`Unknown report key "${reportKey}".`] });
  }
  const def = getReportDefinition(reportKey as ReportKey)!;
  const measure = def.measures.find((m) => m.key === measureKey);
  if (!measure) {
    throw new ValidationError({
      measureKey: [`Unknown measure "${measureKey}" for report "${reportKey}".`],
    });
  }
  if (!measure.publicEligible) {
    throw new ValidationError({
      measureKey: [
        `Measure "${measureKey}" of report "${reportKey}" is not public-eligible and may not be configured as a Website Metric.`,
      ],
    });
  }

  const fieldErrors: Record<string, string[]> = {};
  for (const [key, values] of Object.entries(filterConfig)) {
    if (!measure.supportedFilters.includes(key)) {
      (fieldErrors[`filterConfig.${key}`] ??= []).push(
        `Filter "${key}" is not supported by measure "${measureKey}".`,
      );
      continue;
    }
    if (!NON_UUID_FILTER_KEYS.has(key)) {
      for (const v of values) {
        if (!uuid.safeParse(v).success) {
          (fieldErrors[`filterConfig.${key}`] ??= []).push(`"${v}" is not a valid id.`);
        }
      }
    }
  }
  if (!measure.supportedPeriodModes.includes(periodConfig.mode as never)) {
    (fieldErrors['periodConfig.mode'] ??= []).push(
      `Period mode "${periodConfig.mode}" is not supported by measure "${measureKey}".`,
    );
  }
  if (Object.keys(fieldErrors).length > 0) {
    throw new ValidationError(fieldErrors);
  }

  return measure;
}

export type { WebsiteMetricConfig };
