/**
 * Institutional Membership request validators (shape/field only; business rules live in the
 * service). Accepts ONLY model-backed fields + allowed workflow fields; rejects unknown keys.
 *
 * Required (API spec §6): `institution_id`, `membership_level` (sidhkofed|district_union),
 * `membership_type` (primary|nominal). `district_union_id` is required when
 * `membership_level=district_union` — enforced here as a pure cross-field shape rule; the service
 * additionally validates that every referenced id exists / is an active master. The client may
 * NEVER set publication_state, slug, created_by/updated_by, or published_at (server-managed).
 */
import { z } from 'zod';
import {
  parseSchema,
  workflowShape,
  refineHighlightWindow,
  uuid,
  dateOnly,
  optionalText,
} from '@/shared/validation';
import { MEMBERSHIP_LEVELS, MEMBERSHIP_TYPES, MEMBERSHIP_STATUSES } from './memberships.types';

/** Require `district_union_id` whenever the membership level is `district_union` (API spec §6). */
function refineDistrictUnion(
  data: { membership_level?: string; district_union_id?: string | null },
  ctx: z.RefinementCtx,
): void {
  if (data.membership_level === 'district_union' && !data.district_union_id) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['district_union_id'],
      message: 'Required when membership_level is district_union.',
    });
  }
}

const baseShape = {
  institution_id: uuid,
  membership_level: z.enum(MEMBERSHIP_LEVELS),
  membership_type: z.enum(MEMBERSHIP_TYPES),
  membership_number: z.string().trim().min(1).max(120).nullable().optional(),
  district_id: uuid.nullable().optional(),
  district_union_id: uuid.nullable().optional(),
  reporting_period_id: uuid.nullable().optional(),
  status: z.enum(MEMBERSHIP_STATUSES).optional(),
  join_date: dateOnly.nullable().optional(),
  primary_member_count: z.number().int().min(0).optional(),
  nominal_member_count: z.number().int().min(0).optional(),
  notes_en: optionalText(),
  notes_hi: optionalText(),
  ...workflowShape,
};

export const membershipCreateSchema = z
  .object(baseShape)
  .strict()
  .superRefine((data, ctx) => {
    refineHighlightWindow(data, ctx);
    refineDistrictUnion(data, ctx);
  });
export type MembershipCreateInput = z.infer<typeof membershipCreateSchema>;
export const validateMembershipCreate = (p: unknown): MembershipCreateInput =>
  parseSchema(membershipCreateSchema, p);

// PATCH is partial; the DU rule is only enforced when `membership_level` is being set to
// `district_union` in the same request (the service re-checks the persisted level on partial edits).
export const membershipUpdateSchema = z
  .object(baseShape)
  .partial()
  .strict()
  .superRefine((data, ctx) => {
    refineHighlightWindow(data, ctx);
    if (data.membership_level !== undefined) refineDistrictUnion(data, ctx);
  });
export type MembershipUpdateInput = z.infer<typeof membershipUpdateSchema>;
export const validateMembershipUpdate = (p: unknown): MembershipUpdateInput =>
  parseSchema(membershipUpdateSchema, p);

// ── Bulk upload (API spec §6) ──────────────────────────────────────────────────
// `POST /admin/memberships/bulk-upload` validates every row before ONE transaction creates the
// records. Each row carries the same membership fields as a create (minus workflow fields, which
// default). The endpoint accepts a JSON `{ rows: [...] }` payload; a CSV/XLSX file adapter that
// parses an uploaded sheet into these rows is a thin, dependency-gated layer added later (see the
// module README / Assumptions). The validation + transactional-create core is fully implemented.
const bulkRowShape = {
  institution_id: uuid,
  membership_level: z.enum(MEMBERSHIP_LEVELS),
  membership_type: z.enum(MEMBERSHIP_TYPES),
  membership_number: z.string().trim().min(1).max(120).nullable().optional(),
  district_id: uuid.nullable().optional(),
  district_union_id: uuid.nullable().optional(),
  reporting_period_id: uuid.nullable().optional(),
  status: z.enum(MEMBERSHIP_STATUSES).optional(),
  join_date: dateOnly.nullable().optional(),
  primary_member_count: z.number().int().min(0).optional(),
  nominal_member_count: z.number().int().min(0).optional(),
  notes_en: optionalText(),
  notes_hi: optionalText(),
};

export const membershipBulkRowSchema = z
  .object(bulkRowShape)
  .strict()
  .superRefine((data, ctx) => refineDistrictUnion(data, ctx));
export type MembershipBulkRowInput = z.infer<typeof membershipBulkRowSchema>;

export const membershipBulkUploadSchema = z
  .object({ rows: z.array(z.unknown()).min(1, 'At least one row is required.').max(5000) })
  .strict();
export const validateMembershipBulkUpload = (p: unknown): { rows: unknown[] } =>
  parseSchema(membershipBulkUploadSchema, p);
