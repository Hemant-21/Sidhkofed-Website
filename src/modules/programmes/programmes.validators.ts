/**
 * Programme request validators (shape/field only). Accepts ONLY model-backed fields + relation-ID
 * arrays + workflow fields; rejects unknown keys. End date cannot precede start (refined here;
 * also revalidated in the service against the merged state on update).
 */
import { z } from 'zod';
import {
  parseSchema,
  workflowShape,
  refineHighlightWindow,
  refineDateOrder,
  uuid,
  uuidArray,
  dateOnly,
  requiredText,
  optionalText,
} from '@/shared/validation';

const baseShape = {
  title_en: requiredText(255),
  title_hi: z.string().trim().max(255).nullable().optional(),
  short_code: z.string().trim().max(60).nullable().optional(),
  summary_en: optionalText(),
  summary_hi: optionalText(),
  description_en: optionalText(),
  description_hi: optionalText(),
  objectives_en: optionalText(),
  objectives_hi: optionalText(),
  eligibility_en: optionalText(),
  eligibility_hi: optionalText(),
  benefits_en: optionalText(),
  benefits_hi: optionalText(),
  application_process_en: optionalText(),
  application_process_hi: optionalText(),
  funding_source: z.string().trim().max(255).nullable().optional(),
  start_date: dateOnly.nullable().optional(),
  end_date: dateOnly.nullable().optional(),
  cover_media_id: uuid.nullable().optional(),
  commodity_ids: uuidArray.optional(),
  permitted_training_type_ids: uuidArray.optional(),
  ...workflowShape,
};

export const programmeCreateSchema = z
  .object(baseShape)
  .strict()
  .superRefine((data, ctx) => {
    refineHighlightWindow(data, ctx);
    refineDateOrder(data.start_date, data.end_date, 'end_date', ctx);
  });
export type ProgrammeCreateInput = z.infer<typeof programmeCreateSchema>;
export const validateProgrammeCreate = (p: unknown): ProgrammeCreateInput => parseSchema(programmeCreateSchema, p);

export const programmeUpdateSchema = z
  .object(baseShape)
  .partial()
  .strict()
  .superRefine((data, ctx) => {
    refineHighlightWindow(data, ctx);
    refineDateOrder(data.start_date, data.end_date, 'end_date', ctx);
  });
export type ProgrammeUpdateInput = z.infer<typeof programmeUpdateSchema>;
export const validateProgrammeUpdate = (p: unknown): ProgrammeUpdateInput => parseSchema(programmeUpdateSchema, p);
