/**
 * Toolkit distribution-summary request validators (API spec §6). Per-event (training-level) summary
 * figures only — NO beneficiary rows, stock ledger, or acknowledgements. Accepts only model-backed
 * fields; rejects unknown keys. Cross-record rules (event/toolkit existence, item membership) live
 * in the service.
 */
import { z } from 'zod';
import { parseSchema, uuid, dateOnly, optionalText } from '@/shared/validation';

const DISTRIBUTION_MODEL = ['individual', 'group', 'mixed'] as const;
const DISTRIBUTION_BASIS = ['individual', 'group'] as const;

const nonNegativeDecimal = z
  .number()
  .nonnegative('Must be zero or greater.')
  .max(999999999999.99, 'Value is too large.');

const itemShape = z
  .object({
    toolkit_item_id: uuid,
    distribution_basis: z.enum(DISTRIBUTION_BASIS),
    quantity_per_unit: nonNegativeDecimal.nullable().optional(),
    number_of_units_or_groups: z.number().int().nonnegative('Must be zero or greater.').nullable().optional(),
    total_quantity: nonNegativeDecimal.nullable().optional(),
    manual_override: z.boolean().optional(),
  })
  .strict();
export type DistributionItemInput = z.infer<typeof itemShape>;

/** Items reference distinct toolkit items (the DB unique key is (summary, item)). */
function refineDistinctItems(items: DistributionItemInput[] | undefined, ctx: z.RefinementCtx): void {
  if (!items) return;
  const seen = new Set<string>();
  items.forEach((it, i) => {
    if (seen.has(it.toolkit_item_id)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['items', i, 'toolkit_item_id'],
        message: 'Duplicate toolkit item in the distribution.',
      });
    }
    seen.add(it.toolkit_item_id);
  });
}

const baseShape = {
  toolkit_id: uuid,
  distribution_model: z.enum(DISTRIBUTION_MODEL),
  distribution_done: z.boolean().optional(),
  participants_covered: z.number().int().nonnegative('Must be zero or greater.').nullable().optional(),
  distribution_date: dateOnly.nullable().optional(),
  remarks_en: optionalText(),
  remarks_hi: optionalText(),
  items: z.array(itemShape).max(200).optional(),
};

export const distributionCreateSchema = z
  .object(baseShape)
  .strict()
  .superRefine((data, ctx) => refineDistinctItems(data.items, ctx));
export type DistributionCreateInput = z.infer<typeof distributionCreateSchema>;
export const validateDistributionCreate = (p: unknown): DistributionCreateInput => parseSchema(distributionCreateSchema, p);

// PATCH: all fields partial; `toolkit_id` is immutable (the (event,toolkit) pair is the identity),
// so it is intentionally omitted from the update shape. When `items` is present it REPLACES the set.
const updateShape = {
  distribution_model: baseShape.distribution_model,
  distribution_done: baseShape.distribution_done,
  participants_covered: baseShape.participants_covered,
  distribution_date: baseShape.distribution_date,
  remarks_en: baseShape.remarks_en,
  remarks_hi: baseShape.remarks_hi,
  items: baseShape.items,
};
export const distributionUpdateSchema = z
  .object(updateShape)
  .partial()
  .strict()
  .superRefine((data, ctx) => refineDistinctItems(data.items, ctx));
export type DistributionUpdateInput = z.infer<typeof distributionUpdateSchema>;
export const validateDistributionUpdate = (p: unknown): DistributionUpdateInput => parseSchema(distributionUpdateSchema, p);
