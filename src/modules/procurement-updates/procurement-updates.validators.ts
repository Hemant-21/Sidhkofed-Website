/**
 * Procurement Update request validators (shape/field only; business rules live in the service).
 * Accepts ONLY model-backed fields + allowed workflow fields; rejects unknown keys.
 *
 * Rate/date/location fields are CONDITIONAL — they are all optional, filled only where the update
 * type makes them relevant (CMS requirements §4.8). `status` is informational (e.g. active | closed |
 * upcoming). `period_end` may not precede `period_start`. This module is information-only: it stores
 * no transactions, inventory, or payment data.
 */
import { z } from 'zod';
import {
  parseSchema,
  workflowShape,
  refineHighlightWindow,
  refineDateOrder,
  uuid,
  dateOnly,
  requiredText,
  optionalText,
} from '@/shared/validation';

/** A non-negative monetary rate; DECIMAL(14,2) fits a JS double exactly. */
const nonNegativeRate = z.number().nonnegative('Must be zero or greater.').max(999999999999.99, 'Value is too large.');

const baseShape = {
  title_en: requiredText(255),
  title_hi: z.string().trim().max(255).nullable().optional(),
  summary_en: optionalText(),
  summary_hi: optionalText(),
  description_en: optionalText(),
  description_hi: optionalText(),
  procurement_update_type_id: uuid,
  commodity_id: uuid.nullable().optional(),
  rate: nonNegativeRate.nullable().optional(),
  unit: z.string().trim().max(50).nullable().optional(),
  quantity: nonNegativeRate.nullable().optional(),
  display_quantity_as_mt: z.boolean().optional(),
  effective_date: dateOnly.nullable().optional(),
  period_start: dateOnly.nullable().optional(),
  period_end: dateOnly.nullable().optional(),
  district_id: uuid.nullable().optional(),
  block_id: uuid.nullable().optional(),
  location_text: z.string().trim().max(255).nullable().optional(),
  programme_scheme_id: uuid.nullable().optional(),
  document_id: uuid.nullable().optional(),
  status: z.string().trim().max(40).nullable().optional(),
  ...workflowShape,
};

/** period_end must not precede period_start when both are present. */
function refineDates(
  data: { period_start?: Date | null; period_end?: Date | null },
  ctx: z.RefinementCtx,
): void {
  refineDateOrder(data.period_start, data.period_end, 'period_end', ctx);
}

export const procurementUpdateCreateSchema = z
  .object(baseShape)
  .strict()
  .superRefine((data, ctx) => {
    refineHighlightWindow(data, ctx);
    refineDates(data, ctx);
  });
export type ProcurementUpdateCreateInput = z.infer<typeof procurementUpdateCreateSchema>;
export const validateProcurementUpdateCreate = (p: unknown): ProcurementUpdateCreateInput =>
  parseSchema(procurementUpdateCreateSchema, p);

export const procurementUpdateUpdateSchema = z
  .object(baseShape)
  .partial()
  .strict()
  .superRefine((data, ctx) => {
    refineHighlightWindow(data, ctx);
    refineDates(data, ctx);
  });
export type ProcurementUpdateUpdateInput = z.infer<typeof procurementUpdateUpdateSchema>;
export const validateProcurementUpdateUpdate = (p: unknown): ProcurementUpdateUpdateInput =>
  parseSchema(procurementUpdateUpdateSchema, p);
