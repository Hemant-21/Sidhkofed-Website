/**
 * Shared request-validation primitives for content modules (coding-standards §2).
 *
 * Every publishable **P** content module (institutions, programmes, events, news) validates the
 * same workflow fields and bilingual/date/url primitives. They live here ONCE so a module's
 * `*.validators.ts` only declares its model-specific fields and spreads `workflowShape`.
 *
 * Cross-record business rules (master activation, asset linkability, duplicate slug, state
 * transitions) stay in the service — these are shape/field checks only. The client may NEVER set
 * `publication_state`, `slug`, `created_by`/`updated_by`, or `published_at` (server-managed);
 * the strict schemas reject unknown keys.
 */
import { z } from 'zod';
import { ValidationError, type FieldErrors } from './errors';

/** Run a strict schema and translate Zod issues into the §1.4 field-error envelope. */
export function parseSchema<S extends z.ZodTypeAny>(schema: S, payload: unknown): z.infer<S> {
  const result = schema.safeParse(payload ?? {});
  if (result.success) return result.data;
  const fields: FieldErrors = {};
  for (const issue of result.error.issues) {
    const key = issue.path.length ? issue.path.join('.') : '_';
    (fields[key] ??= []).push(issue.message);
  }
  throw new ValidationError(fields);
}

export const HIGHLIGHT_VALUES = ['new', 'latest', 'important', 'urgent', 'featured'] as const;

/** A `YYYY-MM-DD` calendar date → UTC-midnight Date. */
export const dateOnly = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a YYYY-MM-DD date.')
  .refine((s) => !Number.isNaN(Date.parse(`${s}T00:00:00Z`)), 'Invalid calendar date.')
  .transform((s) => new Date(`${s}T00:00:00Z`));

/** An ISO-8601 timestamp → Date. */
export const isoTimestamp = z
  .string()
  .datetime({ message: 'Use an ISO-8601 UTC timestamp.' })
  .transform((s) => new Date(s));

export const uuid = z.string().uuid();
export const uuidArray = z.array(uuid).max(200);

/** An http/https URL (institutions website, digital services). */
export const httpUrl = z
  .string()
  .trim()
  .max(500)
  .refine((s) => /^https?:\/\//i.test(s), 'Must be an http(s) URL.');

/** An https-only URL (tender GeM links, digital services — API spec §6 requires HTTPS). */
export const httpsUrl = z
  .string()
  .trim()
  .max(500)
  .refine((s) => /^https:\/\//i.test(s), 'Must be a valid HTTPS URL.');

/** Bilingual text helpers — `*_en` required where the field is required; `*_hi` always optional. */
export const requiredText = (max = 255): z.ZodString => z.string().trim().min(1, 'This field is required.').max(max);
export const optionalText = (max = 20000): z.ZodType<string | null | undefined> =>
  z.string().trim().max(max).nullable().optional();

/**
 * The shared workflow fields accepted by every content create/update (API spec §3). They cannot
 * transition publication state — that is the action endpoint's job — but set scheduling,
 * highlight, ordering, and homepage flags.
 */
export const workflowShape = {
  public_visibility: z.boolean().optional(),
  publish_start_at: isoTimestamp.nullable().optional(),
  highlight_type: z.enum(HIGHLIGHT_VALUES).nullable().optional(),
  highlight_start_at: isoTimestamp.nullable().optional(),
  highlight_end_at: isoTimestamp.nullable().optional(),
  display_order: z.number().int().nullable().optional(),
  show_on_homepage: z.boolean().optional(),
};

/** `highlight_start_at` must not be after `highlight_end_at` when both are present. */
export function refineHighlightWindow(
  data: { highlight_start_at?: Date | null; highlight_end_at?: Date | null },
  ctx: z.RefinementCtx,
): void {
  const { highlight_start_at: s, highlight_end_at: e } = data;
  if (s && e && s.getTime() > e.getTime()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['highlight_end_at'],
      message: 'Must be on or after highlight_start_at.',
    });
  }
}

/** `end`/`period_end`/`endDate` must not precede `start`. Generic date-pair refinement. */
export function refineDateOrder(
  start: Date | null | undefined,
  end: Date | null | undefined,
  endPath: string,
  ctx: z.RefinementCtx,
): void {
  if (start && end && end.getTime() < start.getTime()) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: [endPath], message: 'Must be on or after the start date.' });
  }
}
