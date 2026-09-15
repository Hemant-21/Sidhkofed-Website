/**
 * FAQ request validators (shape/field only; business rules live in the service). Accepts ONLY
 * model-backed fields + allowed workflow fields; rejects unknown keys.
 *
 * `page_assignments` replaces `faq_category_id`/`show_on_homepage`: an optional array of
 * `{ page_key, display_order }`, each `page_key` restricted to the registered set
 * (faqs.pages.registry.ts). Omitting the key on PATCH leaves existing assignments untouched;
 * sending an explicit `[]` clears them all (the service tells these apart via `'page_assignments'
 * in input`, not `!== undefined`). Duplicate `page_key`s within one payload are rejected.
 * `question_en`/`answer_en` are required on create (API spec §6). `show_on_homepage` is NOT part
 * of this shape even though `workflowShape` defines it for other content modules — homepage
 * placement is now just an ordinary `page_key: 'home'` assignment.
 */
import { z } from 'zod';
import {
  parseSchema,
  workflowShape,
  refineHighlightWindow,
  requiredText,
  optionalText,
} from '@/shared/validation';
import { FAQ_PAGE_KEYS } from './faqs.pages.registry';

const pageAssignmentSchema = z.object({
  page_key: z.enum(FAQ_PAGE_KEYS, { errorMap: () => ({ message: 'Unknown page key.' }) }),
  display_order: z.number().int(),
});

const pageAssignmentsSchema = z
  .array(pageAssignmentSchema)
  .max(FAQ_PAGE_KEYS.length)
  .superRefine((assignments, ctx) => {
    const seen = new Set<string>();
    for (const a of assignments) {
      if (seen.has(a.page_key)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Duplicate page key: ${a.page_key}.` });
        return;
      }
      seen.add(a.page_key);
    }
  });

const baseShape = {
  page_assignments: pageAssignmentsSchema.optional(),
  question_en: requiredText(500),
  question_hi: z.string().trim().max(500).nullable().optional(),
  answer_en: z.string().trim().min(1, 'This field is required.').max(20000),
  answer_hi: optionalText(),
  public_visibility: workflowShape.public_visibility,
  publish_start_at: workflowShape.publish_start_at,
  highlight_type: workflowShape.highlight_type,
  highlight_start_at: workflowShape.highlight_start_at,
  highlight_end_at: workflowShape.highlight_end_at,
  display_order: workflowShape.display_order,
};

const faqCreateSchema = z
  .object(baseShape)
  .strict()
  .superRefine((data, ctx) => {
    refineHighlightWindow(data, ctx);
  });
export type FaqCreateInput = z.infer<typeof faqCreateSchema>;
export const validateFaqCreate = (p: unknown): FaqCreateInput => parseSchema(faqCreateSchema, p);

const faqUpdateSchema = z
  .object(baseShape)
  .partial()
  .strict()
  .superRefine((data, ctx) => {
    refineHighlightWindow(data, ctx);
  });
export type FaqUpdateInput = z.infer<typeof faqUpdateSchema>;
export const validateFaqUpdate = (p: unknown): FaqUpdateInput => parseSchema(faqUpdateSchema, p);

const reorderSchema = z.object({
  order: z.array(z.object({ id: z.string().uuid(), display_order: z.number().int() })).min(1),
});
export type FaqPageReorderInput = z.infer<typeof reorderSchema>;
export const validateFaqPageReorder = (p: unknown): FaqPageReorderInput => parseSchema(reorderSchema, p);
