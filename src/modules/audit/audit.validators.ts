/**
 * Audit query validators. Parses + validates list filters; rejects unknown action
 * values with a 422 (allow-list = the approved DB enum).
 */
import { z } from 'zod';
import { ValidationError, type FieldErrors } from '@/shared/errors';

const AUDIT_DB_ACTIONS = [
  'create', 'update', 'publish', 'unpublish', 'archive', 'restore',
  'media_replace', 'config_change', 'master_change', 'login',
] as const;

const isoDate = z
  .string()
  .refine((v) => !Number.isNaN(Date.parse(v)), { message: 'Invalid date.' })
  .transform((v) => new Date(v));

export const auditQuerySchema = z.object({
  module: z.string().trim().min(1).max(60).optional(),
  record_id: z.string().uuid().optional(),
  user_id: z.string().uuid().optional(),
  action: z.enum(AUDIT_DB_ACTIONS).optional(),
  date_from: isoDate.optional(),
  date_to: isoDate.optional(),
});

export type AuditQuery = z.infer<typeof auditQuerySchema>;

export function validateAuditQuery(raw: unknown): AuditQuery {
  const result = auditQuerySchema.safeParse(raw ?? {});
  if (result.success) return result.data;
  const fields: FieldErrors = {};
  for (const issue of result.error.issues) {
    const key = issue.path.length ? issue.path.join('.') : '_';
    (fields[key] ??= []).push(issue.message);
  }
  throw new ValidationError(fields);
}
