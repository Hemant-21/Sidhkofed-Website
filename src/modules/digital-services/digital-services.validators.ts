/**
 * Digital Service request validators (shape/field only; business rules live in the service). Accepts
 * ONLY model-backed fields + allowed workflow fields; rejects unknown keys.
 *
 * `external_url` is required and must be a valid HTTPS URL (API spec §6 — approved external systems,
 * opened by the client in a new tab). `icon_media_id` is an optional Media Library reference.
 */
import { z } from 'zod';
import {
  parseSchema,
  workflowShape,
  refineHighlightWindow,
  uuid,
  httpsUrl,
  requiredText,
  optionalText,
} from '@/shared/validation';

const createShape = {
  title_en: requiredText(255),
  title_hi: z.string().trim().max(255).nullable().optional(),
  description_en: optionalText(),
  description_hi: optionalText(),
  external_url: httpsUrl,
  icon_media_id: uuid.nullable().optional(),
  ...workflowShape,
};

export const digitalServiceCreateSchema = z
  .object(createShape)
  .strict()
  .superRefine((data, ctx) => {
    refineHighlightWindow(data, ctx);
  });
export type DigitalServiceCreateInput = z.infer<typeof digitalServiceCreateSchema>;
export const validateDigitalServiceCreate = (p: unknown): DigitalServiceCreateInput =>
  parseSchema(digitalServiceCreateSchema, p);

// PATCH is partial — external_url stays HTTPS-validated when present, but is not required.
export const digitalServiceUpdateSchema = z
  .object({ ...createShape, external_url: httpsUrl.optional() })
  .partial()
  .strict()
  .superRefine((data, ctx) => {
    refineHighlightWindow(data, ctx);
  });
export type DigitalServiceUpdateInput = z.infer<typeof digitalServiceUpdateSchema>;
export const validateDigitalServiceUpdate = (p: unknown): DigitalServiceUpdateInput =>
  parseSchema(digitalServiceUpdateSchema, p);
