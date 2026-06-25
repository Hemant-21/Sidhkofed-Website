/**
 * Toolkit item request validators (API spec §6). Catalogue lines under a toolkit. Accepts only
 * model-backed fields; rejects unknown keys. `quantity` decimals must be non-negative; a `group`
 * basis requires a positive `default_group_size`. Cross-record rules (parent existence, duplicate
 * name) live in the service.
 */
import { z } from 'zod';
import { parseSchema, requiredText, optionalText } from '@/shared/validation';

const DISTRIBUTION_BASIS = ['individual', 'group'] as const;

const nonNegativeDecimal = z
  .number()
  .nonnegative('Must be zero or greater.')
  .max(999999999999.99, 'Value is too large.');

const baseShape = {
  name_en: requiredText(255),
  name_hi: z.string().trim().max(255).nullable().optional(),
  description_en: optionalText(),
  description_hi: optionalText(),
  unit: z.string().trim().max(50).nullable().optional(),
  distribution_basis: z.enum(DISTRIBUTION_BASIS).optional(),
  default_quantity_per_unit: nonNegativeDecimal.nullable().optional(),
  default_group_size: z.number().int().positive('Must be a positive integer.').nullable().optional(),
  quantity_summary: nonNegativeDecimal.nullable().optional(),
  is_active: z.boolean().optional(),
  display_order: z.number().int().min(0).optional(),
};

/** A `group` item needs a group size to make per-group quantities meaningful. */
function refineGroupSize(
  data: { distribution_basis?: string; default_group_size?: number | null },
  ctx: z.RefinementCtx,
): void {
  if (data.distribution_basis === 'group' && (data.default_group_size === null || data.default_group_size === undefined)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['default_group_size'],
      message: 'A group basis requires default_group_size.',
    });
  }
}

export const toolkitItemCreateSchema = z
  .object(baseShape)
  .strict()
  .superRefine((data, ctx) => refineGroupSize(data, ctx));
export type ToolkitItemCreateInput = z.infer<typeof toolkitItemCreateSchema>;
export const validateToolkitItemCreate = (p: unknown): ToolkitItemCreateInput => parseSchema(toolkitItemCreateSchema, p);

// No group-size refinement on update: a PATCH carries partial fields, so the basis↔group-size
// consistency must be checked against the MERGED state in the service.
export const toolkitItemUpdateSchema = z.object(baseShape).partial().strict();
export type ToolkitItemUpdateInput = z.infer<typeof toolkitItemUpdateSchema>;
export const validateToolkitItemUpdate = (p: unknown): ToolkitItemUpdateInput => parseSchema(toolkitItemUpdateSchema, p);
