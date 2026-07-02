/**
 * Institution request validators (shape/field only; business rules live in the service).
 * Accepts ONLY model-backed fields + allowed workflow fields; rejects unknown keys.
 */
import { z } from 'zod';
import {
  parseSchema,
  workflowShape,
  refineHighlightWindow,
  uuid,
  httpUrl,
  requiredText,
  optionalText,
} from '@/shared/validation';

const baseShape = {
  institution_type_id: uuid,
  name_en: requiredText(255),
  name_hi: z.string().trim().max(255).nullable().optional(),
  description_en: optionalText(),
  description_hi: optionalText(),
  address_en: optionalText(2000),
  address_hi: optionalText(2000),
  website_url: httpUrl.nullable().optional(),
  logo_media_id: uuid.nullable().optional(),
  district_id: uuid.nullable().optional(),
  contact_email: z.string().trim().email('Must be a valid email.').max(255).nullable().optional(),
  contact_phone: z.string().trim().max(30).nullable().optional(),
  ...workflowShape,
};

export const institutionCreateSchema = z
  .object(baseShape)
  .strict()
  .superRefine((data, ctx) => refineHighlightWindow(data, ctx));
export type InstitutionCreateInput = z.infer<typeof institutionCreateSchema>;
export const validateInstitutionCreate = (p: unknown): InstitutionCreateInput => parseSchema(institutionCreateSchema, p);

export const institutionUpdateSchema = z
  .object(baseShape)
  .partial()
  .strict()
  .superRefine((data, ctx) => refineHighlightWindow(data, ctx));
export type InstitutionUpdateInput = z.infer<typeof institutionUpdateSchema>;
export const validateInstitutionUpdate = (p: unknown): InstitutionUpdateInput => parseSchema(institutionUpdateSchema, p);
