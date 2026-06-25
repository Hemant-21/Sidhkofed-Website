/**
 * Event request validators (shape/field only; business rules in the service). Accepts ONLY
 * model-backed fields + relation-ID arrays + workflow fields. Completion fields are NOT accepted
 * here — they go through the dedicated `complete` action (events.service.complete), which guards
 * against duplicate completion. `dynamic_values` is shape-checked as an object; deep validation
 * against the event type's active field definitions happens in the service.
 */
import { z } from 'zod';
import {
  parseSchema,
  workflowShape,
  refineHighlightWindow,
  uuid,
  uuidArray,
  dateOnly,
  requiredText,
  optionalText,
} from '@/shared/validation';

const DATE_MODES = ['single', 'range', 'multi_day'] as const;

const baseShape = {
  event_type_id: uuid,
  training_type_id: uuid.nullable().optional(),
  title_en: requiredText(255),
  title_hi: z.string().trim().max(255).nullable().optional(),
  summary_en: optionalText(),
  summary_hi: optionalText(),
  description_en: optionalText(),
  description_hi: optionalText(),
  date_mode: z.enum(DATE_MODES),
  start_date: dateOnly,
  end_date: dateOnly.nullable().optional(),
  location_text: z.string().trim().max(500).nullable().optional(),
  district_id: uuid.nullable().optional(),
  block_id: uuid.nullable().optional(),
  cover_media_id: uuid.nullable().optional(),
  commodity_ids: uuidArray.optional(),
  programme_ids: uuidArray.optional(),
  institution_ids: uuidArray.optional(),
  document_ids: uuidArray.optional(),
  gallery_ids: uuidArray.optional(),
  // Controlled dynamic values — object only; validated against field definitions in the service.
  dynamic_values: z.record(z.string(), z.unknown()).nullable().optional(),
  // Manual status override (CMS requirements §4.1) — only postponed/cancelled may be set manually.
  status_override: z.boolean().optional(),
  event_status: z.enum(['postponed', 'cancelled']).optional(),
  ...workflowShape,
};

/** date_mode range/multi_day requires end_date; end cannot precede start. */
function refineDates(
  data: { date_mode?: string; start_date?: Date; end_date?: Date | null },
  ctx: z.RefinementCtx,
): void {
  const needsEnd = data.date_mode === 'range' || data.date_mode === 'multi_day';
  if (needsEnd && !data.end_date) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['end_date'], message: 'end_date is required for a date range.' });
  }
  if (data.start_date && data.end_date && data.end_date.getTime() < data.start_date.getTime()) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['end_date'], message: 'Must be on or after start_date.' });
  }
}

/** Manual `event_status` is only meaningful with `status_override = true`. */
function refineOverride(
  data: { status_override?: boolean; event_status?: string },
  ctx: z.RefinementCtx,
): void {
  if (data.event_status && data.status_override !== true) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['status_override'],
      message: 'status_override must be true to set a manual event_status (postponed/cancelled).',
    });
  }
}

export const eventCreateSchema = z
  .object(baseShape)
  .strict()
  .superRefine((data, ctx) => {
    refineHighlightWindow(data, ctx);
    refineDates(data, ctx);
    refineOverride(data, ctx);
  });
export type EventCreateInput = z.infer<typeof eventCreateSchema>;
export const validateEventCreate = (p: unknown): EventCreateInput => parseSchema(eventCreateSchema, p);

export const eventUpdateSchema = z
  .object(baseShape)
  .partial()
  .strict()
  .superRefine((data, ctx) => {
    refineHighlightWindow(data, ctx);
    refineDates(data, ctx);
    refineOverride(data, ctx);
  });
export type EventUpdateInput = z.infer<typeof eventUpdateSchema>;
export const validateEventUpdate = (p: unknown): EventUpdateInput => parseSchema(eventUpdateSchema, p);

/** Body of POST /admin/events/{id}/complete — completion/outcome fields (CMS requirements §4.1). */
export const eventCompleteSchema = z
  .object({
    outcome_summary_en: optionalText(),
    outcome_summary_hi: optionalText(),
    key_highlights: optionalText(),
    final_participant_count: z.number().int().min(0).nullable().optional(),
    participant_male_count: z.number().int().min(0).nullable().optional(),
    participant_female_count: z.number().int().min(0).nullable().optional(),
    participant_other_count: z.number().int().min(0).nullable().optional(),
    completion_remarks_en: optionalText(),
    completion_remarks_hi: optionalText(),
    completed_date: dateOnly.nullable().optional(),
    gallery_ids: uuidArray.optional(),
    document_ids: uuidArray.optional(),
  })
  .strict();
export type EventCompleteInput = z.infer<typeof eventCompleteSchema>;
export const validateEventComplete = (p: unknown): EventCompleteInput => parseSchema(eventCompleteSchema, p);

/** Body of POST /admin/events/{id}/cancel — cancellation reason + optional revised date. */
export const eventCancelSchema = z
  .object({
    cancellation_reason: optionalText(2000),
    revised_start_date: dateOnly.nullable().optional(),
  })
  .strict();
export type EventCancelInput = z.infer<typeof eventCancelSchema>;
export const validateEventCancel = (p: unknown): EventCancelInput => parseSchema(eventCancelSchema, p);
