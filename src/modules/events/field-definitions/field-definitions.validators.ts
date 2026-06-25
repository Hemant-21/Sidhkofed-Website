/**
 * Event field-definition validators (API spec §6). Accepts ONLY
 * `field_key,label_en,label_hi,data_type,is_required,options,display_order,is_active`.
 * `options` is required for `select` and forbidden otherwise. `field_key` is a machine key
 * (lower snake_case) used inside `events.dynamic_values`.
 */
import { z } from 'zod';
import { parseSchema } from '@/shared/validation';

const DATA_TYPES = ['text', 'textarea', 'number', 'date', 'boolean', 'select'] as const;

const fieldKey = z
  .string()
  .trim()
  .min(1)
  .max(60)
  .regex(/^[a-z][a-z0-9_]*$/, 'Use a lower snake_case key (letters, digits, underscore).');

const baseShape = {
  field_key: fieldKey,
  label_en: z.string().trim().min(1).max(150),
  label_hi: z.string().trim().max(150).nullable().optional(),
  data_type: z.enum(DATA_TYPES),
  is_required: z.boolean().optional(),
  options: z.array(z.string().trim().min(1).max(150)).min(1).max(100).optional(),
  display_order: z.number().int().min(0).optional(),
  is_active: z.boolean().optional(),
};

/** `options` is required for select, forbidden otherwise. */
function refineOptions(data: { data_type?: string; options?: string[] }, ctx: z.RefinementCtx): void {
  if (data.data_type === 'select') {
    if (!data.options || data.options.length === 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['options'], message: 'options is required for a select field.' });
    }
  } else if (data.options !== undefined) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['options'], message: 'options is only allowed for a select field.' });
  }
}

export const fieldDefinitionCreateSchema = z.object(baseShape).strict().superRefine(refineOptions);
export type FieldDefinitionCreateInput = z.infer<typeof fieldDefinitionCreateSchema>;
export const validateFieldDefinitionCreate = (p: unknown): FieldDefinitionCreateInput =>
  parseSchema(fieldDefinitionCreateSchema, p);

// PATCH: partial, but if data_type/options are present together they must still be consistent.
export const fieldDefinitionUpdateSchema = z
  .object(baseShape)
  .partial()
  .strict()
  .superRefine((data, ctx) => {
    if (data.data_type !== undefined) refineOptions(data, ctx);
    else if (data.options !== undefined && data.options.length === 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['options'], message: 'options cannot be empty.' });
    }
  });
export type FieldDefinitionUpdateInput = z.infer<typeof fieldDefinitionUpdateSchema>;
export const validateFieldDefinitionUpdate = (p: unknown): FieldDefinitionUpdateInput =>
  parseSchema(fieldDefinitionUpdateSchema, p);
