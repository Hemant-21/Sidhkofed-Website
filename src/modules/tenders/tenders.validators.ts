/**
 * Tender request validators (shape/field only; business rules live in the service). Accepts ONLY
 * model-backed fields + allowed workflow fields; rejects unknown keys.
 *
 * `gem_url` must be a valid HTTPS URL (external GeM link, opens in a new tab). `opening_date` may not
 * precede `publish_date`. An expired tender is NOT auto-unpublished — it stays public until a
 * Publisher manually unpublishes/archives it (CMS requirements §4.7).
 */
import { z } from 'zod';
import {
  parseSchema,
  workflowShape,
  refineHighlightWindow,
  refineDateOrder,
  uuid,
  dateOnly,
  isoTimestamp,
  httpsUrl,
  requiredText,
  optionalText,
} from '@/shared/validation';
import { TENDER_STATUSES } from './tenders.types';

const baseShape = {
  title_en: requiredText(255),
  title_hi: z.string().trim().max(255).nullable().optional(),
  summary_en: optionalText(),
  summary_hi: optionalText(),
  tender_type_id: uuid,
  tender_number: z.string().trim().max(120).nullable().optional(),
  publish_date: dateOnly.nullable().optional(),
  submission_deadline: isoTimestamp.nullable().optional(),
  opening_date: isoTimestamp.nullable().optional(),
  tender_status: z.enum(TENDER_STATUSES).nullable().optional(),
  gem_url: httpsUrl.nullable().optional(),
  ...workflowShape,
};

/** opening_date must not precede publish_date when both are present. */
function refineDates(
  data: { publish_date?: Date | null; opening_date?: Date | null },
  ctx: z.RefinementCtx,
): void {
  refineDateOrder(data.publish_date, data.opening_date, 'opening_date', ctx);
}

export const tenderCreateSchema = z
  .object(baseShape)
  .strict()
  .superRefine((data, ctx) => {
    refineHighlightWindow(data, ctx);
    refineDates(data, ctx);
  });
export type TenderCreateInput = z.infer<typeof tenderCreateSchema>;
export const validateTenderCreate = (p: unknown): TenderCreateInput => parseSchema(tenderCreateSchema, p);

export const tenderUpdateSchema = z
  .object(baseShape)
  .partial()
  .strict()
  .superRefine((data, ctx) => {
    refineHighlightWindow(data, ctx);
    refineDates(data, ctx);
  });
export type TenderUpdateInput = z.infer<typeof tenderUpdateSchema>;
export const validateTenderUpdate = (p: unknown): TenderUpdateInput => parseSchema(tenderUpdateSchema, p);
