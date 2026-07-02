/**
 * Dashboard request validators (shape/field only; business rules live in the services). Accepts
 * ONLY model-backed fields + allowed workflow fields; rejects unknown keys (strict). The client may
 * NEVER set publication_state, slug, created_by/updated_by, published_at, processed_at, status, or
 * row_count (server-managed).
 *
 * The dashboard is FIXED: a report's `report_key` must be one of the predefined fixed keys
 * (requirements §13) — there is no arbitrary report creation, no SQL, no formulas, no layout builder
 * (`layout_config` is a bounded presentation object only).
 */
import { z } from 'zod';
import {
  parseSchema,
  workflowShape,
  refineHighlightWindow,
  uuid,
  optionalText,
} from '@/shared/validation';
import { DATASET_SOURCES, FIXED_REPORT_KEYS } from './dashboard.types';

const reportKey = z
  .string()
  .trim()
  .min(1)
  .max(80)
  .refine(
    (k) => FIXED_REPORT_KEYS.has(k),
    'Unknown report key. Reports are a fixed, predefined set.',
  );

/**
 * `layout_config` is an APPROVED fixed presentation descriptor, never a user-defined report builder
 * (API spec §6). Accept a bounded JSON object only (no arbitrary top-level arrays/strings, no SQL/
 * formula fields by contract); the service stores it verbatim for the fixed layout to render.
 */
const layoutConfig = z.record(z.string(), z.unknown()).nullable().optional();

const value = z.number().finite().nullable().optional();
const valueText = z.string().trim().min(1).max(255).nullable().optional();
const unit = z.string().trim().min(1).max(50).nullable().optional();

/** Exactly one of `value` (numeric) / `value_text` (string) must carry the figure (API spec §6). */
function refineExactlyOneValue(
  data: { value?: number | null; value_text?: string | null },
  ctx: z.RefinementCtx,
): void {
  const hasValue = data.value !== undefined && data.value !== null;
  const hasText = data.value_text !== undefined && data.value_text !== null;
  if (hasValue === hasText) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['value'],
      message: 'Provide exactly one of value or value_text.',
    });
  }
}

// ── Reports ──────────────────────────────────────────────────────────────────────
const reportBaseShape = {
  title_en: z.string().trim().min(1, 'This field is required.').max(255),
  title_hi: optionalText(255),
  description_en: optionalText(),
  description_hi: optionalText(),
  layout_config: layoutConfig,
  is_active: z.boolean().optional(),
  ...workflowShape,
};

export const reportCreateSchema = z
  .object({ report_key: reportKey, ...reportBaseShape })
  .strict()
  .superRefine((data, ctx) => refineHighlightWindow(data, ctx));
export type ReportCreateInput = z.infer<typeof reportCreateSchema>;
export const validateReportCreate = (p: unknown): ReportCreateInput =>
  parseSchema(reportCreateSchema, p);

// PATCH is partial and NEVER changes report_key (it is the stable, code-referenced identity).
export const reportUpdateSchema = z
  .object(reportBaseShape)
  .partial()
  .strict()
  .superRefine((data, ctx) => refineHighlightWindow(data, ctx));
export type ReportUpdateInput = z.infer<typeof reportUpdateSchema>;
export const validateReportUpdate = (p: unknown): ReportUpdateInput =>
  parseSchema(reportUpdateSchema, p);

// ── Metrics ────────────────────────────────────────────────────────────────────
const metricBaseShape = {
  metric_key: z.string().trim().min(1, 'This field is required.').max(80),
  label_en: z.string().trim().min(1, 'This field is required.').max(150),
  label_hi: optionalText(150),
  value,
  value_text: valueText,
  unit,
  financial_year_id: uuid.nullable().optional(),
  reporting_period_id: uuid.nullable().optional(),
  source: z.enum(DATASET_SOURCES).optional(),
  dataset_id: uuid.nullable().optional(),
  display_order: z.number().int().min(0).optional(),
};

export const metricCreateSchema = z
  .object(metricBaseShape)
  .strict()
  .superRefine((data, ctx) => refineExactlyOneValue(data, ctx));
export type MetricCreateInput = z.infer<typeof metricCreateSchema>;
export const validateMetricCreate = (p: unknown): MetricCreateInput =>
  parseSchema(metricCreateSchema, p);

// PATCH is partial; if either value field is touched, the exactly-one rule is re-validated against
// the request (the service re-checks the effective persisted state for a one-field edit).
export const metricUpdateSchema = z
  .object(metricBaseShape)
  .partial()
  .strict()
  .superRefine((data, ctx) => {
    if (data.value !== undefined || data.value_text !== undefined) refineExactlyOneValue(data, ctx);
  });
export type MetricUpdateInput = z.infer<typeof metricUpdateSchema>;
export const validateMetricUpdate = (p: unknown): MetricUpdateInput =>
  parseSchema(metricUpdateSchema, p);

// ── Datasets (manual create + Excel/CSV import) ─────────────────────────────────
// Each row becomes (or refreshes) one durable metric. The endpoint accepts a JSON `rows` payload;
// a CSV/XLSX file adapter that parses an uploaded sheet into these rows is a thin, dependency-gated
// layer (matching the established memberships bulk-upload convention — see module Assumptions). The
// validation + transactional, all-or-nothing import core is fully implemented here + in the service.
const datasetRowShape = {
  metric_key: z.string().trim().min(1).max(80),
  label_en: z.string().trim().min(1).max(150),
  label_hi: optionalText(150),
  value,
  value_text: valueText,
  unit,
  display_order: z.number().int().min(0).optional(),
};

export const datasetRowSchema = z
  .object(datasetRowShape)
  .strict()
  .superRefine((data, ctx) => refineExactlyOneValue(data, ctx));
export type DatasetRowInput = z.infer<typeof datasetRowSchema>;

const datasetBaseShape = {
  financial_year_id: uuid.nullable().optional(),
  reporting_period_id: uuid.nullable().optional(),
  source_file_asset_id: uuid.nullable().optional(),
  /** When true, validate + report errors WITHOUT persisting (import preview). */
  preview: z.boolean().optional(),
  rows: z.array(z.unknown()).min(1, 'At least one row is required.').max(5000),
};

/** Manual create: `source` defaults to `manual`; `cms_derived`/`manual` accepted, not `excel`. */
export const datasetCreateSchema = z
  .object({
    source: z.enum(['cms_derived', 'manual']).optional(),
    ...datasetBaseShape,
  })
  .strict();
export type DatasetCreateInput = z.infer<typeof datasetCreateSchema>;
export const validateDatasetCreate = (p: unknown): DatasetCreateInput =>
  parseSchema(datasetCreateSchema, p);

/**
 * Excel/CSV upload (multipart) — `source` is fixed to `excel`; the rows come from the parsed sheet,
 * not the JSON body. These are the multipart TEXT fields that accompany the file part; they arrive as
 * strings, so `preview` is parsed from `"true"`/`"false"`. The financial year / reporting period are
 * validated as masters by the service, exactly like the manual route.
 */
export const datasetUploadFieldsSchema = z
  .object({
    financial_year_id: uuid.optional(),
    reporting_period_id: uuid.optional(),
    preview: z.enum(['true', 'false']).optional(),
  })
  .strict();
export type DatasetUploadFieldsInput = z.infer<typeof datasetUploadFieldsSchema>;
export const validateDatasetUploadFields = (p: unknown): DatasetUploadFieldsInput =>
  parseSchema(datasetUploadFieldsSchema, p);
