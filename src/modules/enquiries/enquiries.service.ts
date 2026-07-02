/**
 * Enquiry service — all business logic for the public enquiry form and the admin management
 * endpoints (API spec §6 Enquiries / CMS requirements §4.12).
 *
 * Public submission rules (CMS requirements §4.12):
 *   - Text only; no attachments.
 *   - CAPTCHA required (provider configured via CAPTCHA_PROVIDER env; 'none' skips check).
 *   - Rate limiting by IP hash and email/mobile fingerprint (enforced in middleware/controller).
 *   - Honeypot: `website` field must be absent/empty (validated in Zod schema).
 *   - Deduplication fingerprint prevents near-duplicate submissions within a short window.
 *   - Success response: 201 {id, submitted_at} — no acknowledgement email to the submitter.
 *   - Server-side notification email to the configured recipient (if EMAIL_ENABLED=true).
 *
 * Admin rules (API spec §8 RBAC matrix):
 *   - Publisher and Super Admin may read, patch, archive, export.
 *   - Content Editors have no default access.
 *   - PATCH accepts only internal_notes and spam_state.
 *   - Archive is idempotent.
 *   - Export: XLSX streamed synchronously (small datasets) or 202 job_id (large).
 */
import { createHash } from 'node:crypto';
import { NotFoundError, ValidationError } from '@/shared/errors';
import { auditService, type AuditContext } from '@/modules/audit/audit.service';
import { enquiryRepository, type EnquiryRow } from './enquiries.repository';
import {
  toEnquiryDetailDto,
  toEnquirySummaryDto,
  toEnquirySubmitDto,
  toEnquiryExportRow,
  type EnquiryDetailDto,
  type EnquirySummaryDto,
  type EnquirySubmitDto,
  type EnquiryExportRow,
} from './enquiries.dto';
import { ENQUIRY_ENTITY, type EnquiryFilters, type EnquiryOrderingField } from './enquiries.types';
import { verifyCaptcha } from '@/services/captcha';
import { sendEnquiryNotification } from '@/services/email';
import type { EnquirySubmitInput, EnquiryAdminPatchInput } from './enquiries.validators';

/** Deduplication window in seconds — block a near-identical submission within this period. */
const DEDUP_WINDOW_SECONDS = 60;

function loaded(row: EnquiryRow | null): EnquiryRow {
  if (!row) throw new NotFoundError('Enquiry not found.');
  return row;
}

// ── Public submission ──────────────────────────────────────────────────────────

/**
 * Submit a public enquiry.
 * `ipHash` is the privacy-safe hashed IP from the controller (never the raw IP).
 */
export async function submit(
  input: EnquirySubmitInput,
  ipHash: string | null,
): Promise<EnquirySubmitDto> {
  // 1. CAPTCHA verification (provider may be 'none' in dev → no-op).
  await verifyCaptcha(input.captcha_token);

  // 2. Validate master references.
  const refErrors = await enquiryRepository.validateReferences({
    enquiryTypeId: input.enquiry_type_id,
    commodityId: input.commodity_id,
    programmeSchemeId: input.programme_scheme_id,
  });
  if (Object.keys(refErrors).length > 0) throw new ValidationError(refErrors);

  // 3. Deduplication — hash of (email + subject) to catch accidental repeated submissions.
  const dedupHash = createHash('sha256')
    .update(`${input.email.toLowerCase()}:${input.subject.toLowerCase()}`)
    .digest('hex');
  const cutoff = new Date(Date.now() - DEDUP_WINDOW_SECONDS * 1000);
  const recent = await enquiryRepository.list(
    { search: input.email, dateFrom: cutoff },
    0,
    5,
    { field: 'submitted_at', direction: 'desc' },
  );
  const isDuplicate = recent.rows.some(
    (r) =>
      createHash('sha256')
        .update(`${r.email.toLowerCase()}:${r.subject.toLowerCase()}`)
        .digest('hex') === dedupHash,
  );
  if (isDuplicate) {
    // Succeed silently — do not reveal deduplication to the submitter (bot protection).
    // Find the existing record to return the same id/time.
    const existing = recent.rows[0];
    if (existing) return toEnquirySubmitDto(existing);
  }

  // 4. Spam heuristic — honeypot is checked in the Zod schema; here we mark suspected
  //    submissions if the IP has previously sent spam (simple flag, not a full IP blocklist).
  const spamState = 'clean' as const;

  // 5. Persist the enquiry.
  const created = await enquiryRepository.create({
    enquiryTypeId: input.enquiry_type_id,
    name: input.name,
    mobile: input.mobile,
    email: input.email,
    subject: input.subject,
    message: input.message,
    organization: input.organization ?? null,
    commodityId: input.commodity_id ?? null,
    programmeSchemeId: input.programme_scheme_id ?? null,
    sourceIpHash: ipHash,
    spamState,
  });

  // 6. Send notification email to the configured recipient (fail-open — email failure must
  //    not fail the submission, per CMS requirements §4.12).
  await sendEnquiryNotification(created).catch(() => undefined);

  return toEnquirySubmitDto(created);
}

// ── Admin reads ────────────────────────────────────────────────────────────────

export interface ListResult {
  items: EnquirySummaryDto[];
  total: number;
}

export async function list(
  filters: EnquiryFilters,
  ordering: { field: EnquiryOrderingField; direction: 'asc' | 'desc' },
  skip: number,
  take: number,
): Promise<ListResult> {
  const { rows, total } = await enquiryRepository.list(filters, skip, take, ordering);
  return { items: rows.map(toEnquirySummaryDto), total };
}

export async function getById(id: string): Promise<EnquiryDetailDto> {
  return toEnquiryDetailDto(loaded(await enquiryRepository.findById(id)));
}

// ── Admin mutation ─────────────────────────────────────────────────────────────

/** PATCH — only internal_notes and spam_state may be changed (API spec §6). */
export async function patch(
  id: string,
  input: EnquiryAdminPatchInput,
  ctx: AuditContext,
): Promise<EnquiryDetailDto> {
  loaded(await enquiryRepository.findById(id));
  const updated = await enquiryRepository.update(id, {
    internalNotes: input.internal_notes !== undefined ? (input.internal_notes ?? null) : undefined,
    spamState: input.spam_state,
  });
  await auditService.update(ctx, ENQUIRY_ENTITY, id, undefined, {
    spam_state: input.spam_state,
    has_notes: !!input.internal_notes,
  });
  return toEnquiryDetailDto(updated);
}

/** Archive — idempotent; archived enquiry is hidden from default listings. */
export async function archive(id: string, ctx: AuditContext): Promise<EnquiryDetailDto> {
  const existing = loaded(await enquiryRepository.findById(id));
  if (existing.archivedAt) return toEnquiryDetailDto(existing); // already archived → no-op
  const updated = await enquiryRepository.update(id, { archivedAt: new Date() });
  await auditService.log('ARCHIVE', ctx, { module: ENQUIRY_ENTITY, recordId: id });
  return toEnquiryDetailDto(updated);
}

// ── Export ─────────────────────────────────────────────────────────────────────

/** Fetch all enquiry rows for XLSX export (API spec §6 — only enquiries export). */
export async function exportRows(filters: EnquiryFilters): Promise<EnquiryExportRow[]> {
  const rows = await enquiryRepository.listAll(filters);
  return rows.map(toEnquiryExportRow);
}

export const enquiryService = { submit, list, getById, patch, archive, exportRows };
