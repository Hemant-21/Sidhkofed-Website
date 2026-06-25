/**
 * Document request validators (TASK 15). Shape/field validation only; cross-record business
 * rules (master activation, knowledge-centre category requirement against merged state, asset
 * linkability, duplicate slug) live in the service (coding-standards §5).
 *
 * Accepts ONLY model-backed fields + related-ID arrays + allowed workflow fields. Never
 * `publication_state`, `slug`, `created_by`/`updated_by`, `published_at` (server-managed,
 * coding-standards §2).
 */
import { z } from 'zod';
import { ValidationError, type FieldErrors } from '@/shared/errors';

function parse<S extends z.ZodTypeAny>(schema: S, payload: unknown): z.infer<S> {
  const result = schema.safeParse(payload ?? {});
  if (result.success) return result.data;
  const fields: FieldErrors = {};
  for (const issue of result.error.issues) {
    const key = issue.path.length ? issue.path.join('.') : '_';
    (fields[key] ??= []).push(issue.message);
  }
  throw new ValidationError(fields);
}

const HIGHLIGHT = ['new', 'latest', 'important', 'urgent', 'featured'] as const;

/** A `YYYY-MM-DD` calendar date → UTC-midnight Date. */
const dateOnly = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a YYYY-MM-DD date.')
  .refine((s) => !Number.isNaN(Date.parse(`${s}T00:00:00Z`)), 'Invalid calendar date.')
  .transform((s) => new Date(`${s}T00:00:00Z`));

/** An ISO-8601 timestamp → Date. */
const isoTimestamp = z
  .string()
  .datetime({ message: 'Use an ISO-8601 UTC timestamp.' })
  .transform((s) => new Date(s));

const uuid = z.string().uuid();
const uuidArray = z.array(uuid).max(200);

const baseDocumentShape = {
  title_en: z.string().trim().min(1, 'This field is required.').max(255),
  title_hi: z.string().trim().max(255).nullable().optional(),
  description_en: z.string().trim().max(20000).nullable().optional(),
  description_hi: z.string().trim().max(20000).nullable().optional(),
  document_type_id: uuid,
  file_asset_id: uuid,
  publication_date: dateOnly.nullable().optional(),
  language: z.enum(['en', 'hi']).optional(),
  is_public: z.boolean().optional(),
  show_in_knowledge_centre: z.boolean().optional(),
  knowledge_category_id: uuid.nullable().optional(),
  financial_year_id: uuid.nullable().optional(),
  commodity_ids: uuidArray.optional(),
  district_ids: uuidArray.optional(),
  tag_ids: uuidArray.optional(),
  // Workflow fields (accepted but cannot transition publication state — that is the action
  // endpoint's job, API spec §3).
  public_visibility: z.boolean().optional(),
  publish_start_at: isoTimestamp.nullable().optional(),
  highlight_type: z.enum(HIGHLIGHT).nullable().optional(),
  highlight_start_at: isoTimestamp.nullable().optional(),
  highlight_end_at: isoTimestamp.nullable().optional(),
  display_order: z.number().int().nullable().optional(),
  show_on_homepage: z.boolean().optional(),
};

/** highlight_start_at must not be after highlight_end_at when both are present. */
function refineHighlightWindow(
  data: { highlight_start_at?: Date | null; highlight_end_at?: Date | null },
  ctx: z.RefinementCtx,
): void {
  const { highlight_start_at: s, highlight_end_at: e } = data;
  if (s && e && s.getTime() > e.getTime()) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['highlight_end_at'], message: 'Must be on or after highlight_start_at.' });
  }
}

export const documentCreateSchema = z
  .object(baseDocumentShape)
  .strict()
  .superRefine((data, ctx) => {
    refineHighlightWindow(data, ctx);
    // Knowledge-Centre tag requires a category (API spec §6). Authoritative check is in the
    // service (it sees merged state on update); this gives the editor immediate create feedback.
    if (data.show_in_knowledge_centre === true && !data.knowledge_category_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['knowledge_category_id'],
        message: 'A knowledge category is required when show_in_knowledge_centre is true.',
      });
    }
  });
export type DocumentCreateInput = z.infer<typeof documentCreateSchema>;
export const validateDocumentCreate = (p: unknown): DocumentCreateInput => parse(documentCreateSchema, p);

export const documentUpdateSchema = z
  .object(baseDocumentShape)
  .partial()
  .strict()
  .superRefine((data, ctx) => refineHighlightWindow(data, ctx));
export type DocumentUpdateInput = z.infer<typeof documentUpdateSchema>;
export const validateDocumentUpdate = (p: unknown): DocumentUpdateInput => parse(documentUpdateSchema, p);

/** Body of POST /admin/documents/{id}/replace-file. */
export const replaceFileSchema = z.object({ file_asset_id: uuid }).strict();
export type ReplaceFileInput = z.infer<typeof replaceFileSchema>;
export const validateReplaceFile = (p: unknown): ReplaceFileInput => parse(replaceFileSchema, p);
