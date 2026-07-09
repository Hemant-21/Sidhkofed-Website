/**
 * Leadership request validators (shape/field only; business rules live in the service). Accepts
 * ONLY model-backed fields + allowed workflow fields; rejects unknown keys.
 *
 * `photo_media_id` is an optional Media Library reference to the leader's photo.
 */
import { z } from 'zod';
import {
  parseSchema,
  workflowShape,
  refineHighlightWindow,
  uuid,
  requiredText,
  optionalText,
} from '@/shared/validation';

const createShape = {
  name_en: requiredText(255),
  name_hi: z.string().trim().max(255).nullable().optional(),
  govt_role_en: requiredText(255),
  govt_role_hi: optionalText(),
  sidhkofed_role_en: requiredText(255),
  sidhkofed_role_hi: optionalText(),
  photo_media_id: uuid.nullable().optional(),
  ...workflowShape,
};

export const leadershipCreateSchema = z
  .object(createShape)
  .strict()
  .superRefine((data, ctx) => {
    refineHighlightWindow(data, ctx);
  });
export type LeadershipCreateInput = z.infer<typeof leadershipCreateSchema>;
export const validateLeadershipCreate = (p: unknown): LeadershipCreateInput =>
  parseSchema(leadershipCreateSchema, p);

// PATCH is partial — every field stays validated when present, but none are required.
export const leadershipUpdateSchema = z
  .object(createShape)
  .partial()
  .strict()
  .superRefine((data, ctx) => {
    refineHighlightWindow(data, ctx);
  });
export type LeadershipUpdateInput = z.infer<typeof leadershipUpdateSchema>;
export const validateLeadershipUpdate = (p: unknown): LeadershipUpdateInput =>
  parseSchema(leadershipUpdateSchema, p);
