/**
 * Zod schemas for the Operational Reports `generate`/`export` request body. Filters are validated
 * per-report against `OPERATIONAL_REPORTS[key].supportedFilters` — an unsupported filter key is
 * rejected rather than silently ignored, so a caller never gets a report that quietly dropped a
 * constraint it asked for.
 */
import { z } from 'zod';
import { parseSchema, uuid } from '@/shared/validation';
import { ValidationError } from '@/shared/errors';
import { getReportDefinition } from './operational-reports.registry';
import type { ReportKey } from './operational-reports.types';

const periodModeSchema = z.enum(['fixed_range', 'financial_year', 'current_financial_year']);

const periodInputSchema = z.object({
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
});

const filterValue = z.string().trim().min(1).max(120);

const generateBodySchema = z
  .object({
    periodMode: periodModeSchema.optional(),
    periodInput: periodInputSchema,
    filters: z.record(z.string(), z.array(filterValue).max(50)).optional(),
    page: z.number().int().min(1).optional(),
    pageSize: z.number().int().min(1).max(500).optional(),
  })
  .strict();

export interface GenerateReportBody {
  periodInput: z.infer<typeof periodInputSchema>;
  filters: Record<string, string[]>;
  page: number;
  pageSize: number;
}

/**
 * The `/export` body accepts the same `periodInput`/`filters` shape as `/generate` but has no
 * `page`/`pageSize` — export always pulls the full result set (bounded by the service's row-count
 * limit), never one page of it.
 */
const exportBodySchema = z
  .object({
    periodMode: periodModeSchema.optional(),
    periodInput: periodInputSchema,
    filters: z.record(z.string(), z.array(filterValue).max(50)).optional(),
  })
  .strict();

export interface ExportReportBody {
  periodInput: z.infer<typeof periodInputSchema>;
  filters: Record<string, string[]>;
}

/**
 * Filter VALUES are free-form strings for `eventStatus` (an enum) but must be UUIDs for every other
 * supported filter key (master-data ids). Validate accordingly per key.
 */
const NON_UUID_FILTER_KEYS = new Set(['eventStatus']);

function validateFilters(
  def: NonNullable<ReturnType<typeof getReportDefinition>>,
  reportKey: string,
  filters: Record<string, string[]>,
): void {
  const fieldErrors: Record<string, string[]> = {};
  for (const [key, values] of Object.entries(filters)) {
    if (!def.supportedFilters.includes(key)) {
      (fieldErrors[`filters.${key}`] ??= []).push(
        `Filter "${key}" is not supported by report "${reportKey}".`,
      );
      continue;
    }
    if (!NON_UUID_FILTER_KEYS.has(key)) {
      for (const v of values) {
        if (!uuid.safeParse(v).success) {
          (fieldErrors[`filters.${key}`] ??= []).push(`"${v}" is not a valid id.`);
        }
      }
    }
  }
  if (Object.keys(fieldErrors).length > 0) {
    throw new ValidationError(fieldErrors);
  }
}

export function validateGenerateBody(reportKey: string, payload: unknown): GenerateReportBody {
  const def = getReportDefinition(reportKey);
  if (!def) {
    throw new ValidationError({ reportKey: [`Unknown report key "${reportKey}".`] });
  }
  const parsed = parseSchema(generateBodySchema, payload);
  const filters = parsed.filters ?? {};
  validateFilters(def, reportKey, filters);

  return {
    periodInput: parsed.periodInput,
    filters,
    page: parsed.page ?? 1,
    pageSize: parsed.pageSize ?? 50,
  };
}

export function validateExportBody(reportKey: string, payload: unknown): ExportReportBody {
  const def = getReportDefinition(reportKey);
  if (!def) {
    throw new ValidationError({ reportKey: [`Unknown report key "${reportKey}".`] });
  }
  const parsed = parseSchema(exportBodySchema, payload);
  const filters = parsed.filters ?? {};
  validateFilters(def, reportKey, filters);

  return {
    periodInput: parsed.periodInput,
    filters,
  };
}

export function assertPeriodModeSupported(reportKey: ReportKey, mode: string): void {
  const def = getReportDefinition(reportKey);
  if (!def) throw new ValidationError({ reportKey: [`Unknown report key "${reportKey}".`] });
  const supported = def.measures.some((m) => m.supportedPeriodModes.includes(mode as never));
  if (!supported) {
    throw new ValidationError({
      'periodInput.mode': [`Period mode "${mode}" is not supported by any measure of "${reportKey}".`],
    });
  }
}
