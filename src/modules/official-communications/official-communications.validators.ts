/**
 * Official Communication request validators (shape/field only; business rules live in the service).
 * Accepts ONLY model-backed fields + allowed workflow fields; rejects unknown keys.
 *
 * Date chronology is validated here (issue ≤ effective ≤ expiry). NOTE: an expiry date is
 * INFORMATIONAL ONLY — it is never used to auto-unpublish/auto-archive the record (CMS requirements
 * §4.6); that rule is honoured by the service simply not acting on it.
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

const baseShape = {
  title_en: requiredText(255),
  title_hi: z.string().trim().max(255).nullable().optional(),
  summary_en: optionalText(),
  summary_hi: optionalText(),
  body_en: optionalText(),
  body_hi: optionalText(),
  communication_type_id: uuid,
  reference_number: z.string().trim().max(120).nullable().optional(),
  issue_date: dateOnly.nullable().optional(),
  effective_date: dateOnly.nullable().optional(),
  expiry_date: dateOnly.nullable().optional(),
  issuing_authority: z.string().trim().max(255).nullable().optional(),
  document_id: uuid.nullable().optional(),
  ...workflowShape,
};

/** issue ≤ effective ≤ expiry (and issue ≤ expiry when effective is absent), when present. */
function refineDates(
  data: { issue_date?: Date | null; effective_date?: Date | null; expiry_date?: Date | null },
  ctx: z.RefinementCtx,
): void {
  refineDateOrder(data.issue_date, data.effective_date, 'effective_date', ctx);
  refineDateOrder(data.effective_date ?? data.issue_date, data.expiry_date, 'expiry_date', ctx);
}

export const officialCommunicationCreateSchema = z
  .object(baseShape)
  .strict()
  .superRefine((data, ctx) => {
    refineHighlightWindow(data, ctx);
    refineDates(data, ctx);
  });
export type OfficialCommunicationCreateInput = z.infer<typeof officialCommunicationCreateSchema>;
export const validateOfficialCommunicationCreate = (p: unknown): OfficialCommunicationCreateInput =>
  parseSchema(officialCommunicationCreateSchema, p);

export const officialCommunicationUpdateSchema = z
  .object(baseShape)
  .partial()
  .strict()
  .superRefine((data, ctx) => {
    refineHighlightWindow(data, ctx);
    refineDates(data, ctx);
  });
export type OfficialCommunicationUpdateInput = z.infer<typeof officialCommunicationUpdateSchema>;
export const validateOfficialCommunicationUpdate = (p: unknown): OfficialCommunicationUpdateInput =>
  parseSchema(officialCommunicationUpdateSchema, p);
