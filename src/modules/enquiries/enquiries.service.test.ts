/**
 * Unit tests — enquiry service business rules (DB-free).
 *
 * Covers:
 *   - Public submission: CAPTCHA delegation, reference validation, deduplication
 *     fingerprint, email notification fail-open, spam state, return shape.
 *   - Admin reads: list, getById (throws on missing).
 *   - Admin mutations: patch (only notes + spam_state), archive (idempotent).
 *   - Export: maps all rows to EnquiryExportRow.
 *
 * All collaborators are mocked; no DB or Redis required.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { EnquiryRow } from './enquiries.repository';

const { repo, captcha, email, auditSvc } = vi.hoisted(() => ({
  repo: {
    create: vi.fn(),
    findById: vi.fn(),
    update: vi.fn(),
    list: vi.fn(),
    listAll: vi.fn(),
    validateReferences: vi.fn(),
  },
  captcha: { verifyCaptcha: vi.fn() },
  email: { sendEnquiryNotification: vi.fn() },
  auditSvc: { log: vi.fn(), update: vi.fn(), create: vi.fn() },
}));

vi.mock('./enquiries.repository', () => ({ enquiryRepository: repo }));
vi.mock('@/services/captcha', () => captcha);
vi.mock('@/services/email', () => email);
vi.mock('@/modules/audit/audit.service', () => ({ auditService: auditSvc }));

import { enquiryService } from './enquiries.service';
import { NotFoundError, ValidationError } from '@/shared/errors';

// ── Test fixtures ─────────────────────────────────────────────────────────────

const UUID = '11111111-1111-4111-8111-111111111111';
const UUID2 = '22222222-2222-4222-8222-222222222222';
const now = new Date('2026-06-27T10:00:00Z');

function makeRow(over: Partial<EnquiryRow> = {}): EnquiryRow {
  return {
    id: UUID,
    enquiryTypeId: UUID2,
    name: 'Ramesh Kumar',
    mobile: '+91 94300 12345',
    email: 'ramesh@example.com',
    subject: 'Procurement enquiry',
    message: 'I would like to know about the procurement process.',
    organization: null,
    commodityId: null,
    programmeSchemeId: null,
    submittedAt: now,
    sourceIpHash: null,
    spamState: 'clean',
    internalNotes: null,
    archivedAt: null,
    createdAt: now,
    updatedAt: now,
    enquiryType: { id: UUID2, slug: 'general', nameEn: 'General', nameHi: null },
    commodity: null,
    programmeScheme: null,
    ...over,
  } as EnquiryRow;
}

const VALID_INPUT = {
  name: 'Ramesh Kumar',
  mobile: '+91 94300 12345',
  email: 'ramesh@example.com',
  enquiry_type_id: UUID2,
  subject: 'Procurement enquiry',
  message: 'I would like to know about the procurement process.',
  captcha_token: undefined,
  organization: undefined,
  commodity_id: undefined,
  programme_scheme_id: undefined,
};

const AUDIT_CTX = { userId: 'u1', ipHash: null, userAgent: null, authz: null };

beforeEach(() => {
  vi.clearAllMocks();
  captcha.verifyCaptcha.mockResolvedValue(undefined);
  repo.validateReferences.mockResolvedValue({});
  repo.list.mockResolvedValue({ rows: [], total: 0 });
  repo.create.mockResolvedValue(makeRow());
  email.sendEnquiryNotification.mockResolvedValue(undefined);
  auditSvc.log.mockResolvedValue(undefined);
  auditSvc.update.mockResolvedValue(undefined);
});

// ── submit ────────────────────────────────────────────────────────────────────

describe('enquiryService.submit', () => {
  it('verifies CAPTCHA before doing anything else', async () => {
    captcha.verifyCaptcha.mockRejectedValueOnce(new ValidationError({ captcha_token: ['Invalid.'] }));
    await expect(enquiryService.submit(VALID_INPUT, null)).rejects.toBeInstanceOf(ValidationError);
    expect(repo.validateReferences).not.toHaveBeenCalled();
  });

  it('validates master references after CAPTCHA passes', async () => {
    repo.validateReferences.mockResolvedValueOnce({ enquiry_type_id: ['Not found.'] });
    await expect(enquiryService.submit(VALID_INPUT, null)).rejects.toBeInstanceOf(ValidationError);
    expect(repo.create).not.toHaveBeenCalled();
  });

  it('returns id and submitted_at on successful submission', async () => {
    const dto = await enquiryService.submit(VALID_INPUT, 'ip-hash-abc');
    expect(dto).toEqual({ id: UUID, submitted_at: now.toISOString() });
    expect(repo.create).toHaveBeenCalledOnce();
  });

  it('passes the IP hash to the repository', async () => {
    await enquiryService.submit(VALID_INPUT, 'hashed-ip-value');
    expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ sourceIpHash: 'hashed-ip-value' }));
  });

  it('stores clean spam_state on a new submission', async () => {
    await enquiryService.submit(VALID_INPUT, null);
    expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ spamState: 'clean' }));
  });

  it('sends email notification after persisting (fail-open: email failure must not fail the submission)', async () => {
    email.sendEnquiryNotification.mockRejectedValueOnce(new Error('SMTP down'));
    const dto = await enquiryService.submit(VALID_INPUT, null);
    // The submission still succeeds.
    expect(dto.id).toBe(UUID);
    expect(email.sendEnquiryNotification).toHaveBeenCalledOnce();
  });

  it('silently deduplicates a near-identical submission within the dedup window', async () => {
    const first = makeRow();
    repo.list.mockResolvedValueOnce({ rows: [first], total: 1 });
    const dto = await enquiryService.submit(VALID_INPUT, null);
    // Second submission returns the same id as the first.
    expect(dto.id).toBe(first.id);
    // create is NOT called — the dedup short-circuits.
    expect(repo.create).not.toHaveBeenCalled();
  });

  it('does NOT deduplicate when the subject or email differs', async () => {
    // list returns a row with a DIFFERENT subject → no dedup match.
    const differentSubject = makeRow({ subject: 'Different topic' });
    repo.list.mockResolvedValueOnce({ rows: [differentSubject], total: 1 });
    await enquiryService.submit(VALID_INPUT, null);
    expect(repo.create).toHaveBeenCalledOnce();
  });

  it('accepts null ipHash (anonymous submission)', async () => {
    await enquiryService.submit(VALID_INPUT, null);
    expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ sourceIpHash: null }));
  });
});

// ── list ─────────────────────────────────────────────────────────────────────

describe('enquiryService.list', () => {
  it('returns items and total from the repository', async () => {
    repo.list.mockResolvedValueOnce({ rows: [makeRow()], total: 1 });
    const { items, total } = await enquiryService.list({}, { field: 'submitted_at', direction: 'desc' }, 0, 20);
    expect(total).toBe(1);
    expect(items[0].id).toBe(UUID);
    expect(items[0].enquiry_type.name_en).toBe('General');
  });

  it('returns empty list when no enquiries match', async () => {
    repo.list.mockResolvedValueOnce({ rows: [], total: 0 });
    const { items, total } = await enquiryService.list({}, { field: 'submitted_at', direction: 'desc' }, 0, 20);
    expect(total).toBe(0);
    expect(items).toHaveLength(0);
  });
});

// ── getById ───────────────────────────────────────────────────────────────────

describe('enquiryService.getById', () => {
  it('returns the detail DTO for a found enquiry', async () => {
    repo.findById.mockResolvedValueOnce(makeRow({ internalNotes: 'Test note', archivedAt: null }));
    const dto = await enquiryService.getById(UUID);
    expect(dto.id).toBe(UUID);
    expect(dto.message).toBe('I would like to know about the procurement process.');
    expect(dto.internal_notes).toBe('Test note');
  });

  it('throws NotFoundError when the enquiry does not exist', async () => {
    repo.findById.mockResolvedValueOnce(null);
    await expect(enquiryService.getById('nonexistent-id')).rejects.toBeInstanceOf(NotFoundError);
  });
});

// ── patch ─────────────────────────────────────────────────────────────────────

describe('enquiryService.patch', () => {
  it('updates spam_state and audits the change', async () => {
    const updated = makeRow({ spamState: 'suspected' });
    repo.findById.mockResolvedValueOnce(makeRow());
    repo.update.mockResolvedValueOnce(updated);
    const dto = await enquiryService.patch(UUID, { spam_state: 'suspected' }, AUDIT_CTX);
    expect(dto.spam_state).toBe('suspected');
    expect(repo.update).toHaveBeenCalledWith(UUID, expect.objectContaining({ spamState: 'suspected' }));
    expect(auditSvc.update).toHaveBeenCalledOnce();
  });

  it('updates internal_notes', async () => {
    const updated = makeRow({ internalNotes: 'Follow up needed.' });
    repo.findById.mockResolvedValueOnce(makeRow());
    repo.update.mockResolvedValueOnce(updated);
    const dto = await enquiryService.patch(UUID, { internal_notes: 'Follow up needed.' }, AUDIT_CTX);
    expect(dto.internal_notes).toBe('Follow up needed.');
  });

  it('throws NotFoundError when the enquiry does not exist', async () => {
    repo.findById.mockResolvedValueOnce(null);
    await expect(enquiryService.patch('bad-id', {}, AUDIT_CTX)).rejects.toBeInstanceOf(NotFoundError);
  });

  it('clears internal_notes when null is passed', async () => {
    const updated = makeRow({ internalNotes: null });
    repo.findById.mockResolvedValueOnce(makeRow({ internalNotes: 'Old note' }));
    repo.update.mockResolvedValueOnce(updated);
    const dto = await enquiryService.patch(UUID, { internal_notes: null }, AUDIT_CTX);
    expect(dto.internal_notes).toBeNull();
    expect(repo.update).toHaveBeenCalledWith(UUID, expect.objectContaining({ internalNotes: null }));
  });
});

// ── archive ───────────────────────────────────────────────────────────────────

describe('enquiryService.archive', () => {
  it('sets archivedAt and audits the action', async () => {
    const archived = makeRow({ archivedAt: new Date() });
    repo.findById.mockResolvedValueOnce(makeRow({ archivedAt: null }));
    repo.update.mockResolvedValueOnce(archived);
    const dto = await enquiryService.archive(UUID, AUDIT_CTX);
    expect(dto.archived_at).not.toBeNull();
    expect(repo.update).toHaveBeenCalledWith(UUID, expect.objectContaining({ archivedAt: expect.any(Date) }));
    expect(auditSvc.log).toHaveBeenCalledWith('ARCHIVE', AUDIT_CTX, expect.objectContaining({ module: 'enquiry' }));
  });

  it('is idempotent — returns existing DTO when already archived without calling update', async () => {
    const alreadyArchived = makeRow({ archivedAt: new Date('2026-01-01T00:00:00Z') });
    repo.findById.mockResolvedValueOnce(alreadyArchived);
    const dto = await enquiryService.archive(UUID, AUDIT_CTX);
    expect(dto.archived_at).toBe('2026-01-01T00:00:00.000Z');
    expect(repo.update).not.toHaveBeenCalled();
    expect(auditSvc.log).not.toHaveBeenCalled();
  });

  it('throws NotFoundError when the enquiry does not exist', async () => {
    repo.findById.mockResolvedValueOnce(null);
    await expect(enquiryService.archive('bad-id', AUDIT_CTX)).rejects.toBeInstanceOf(NotFoundError);
  });
});

// ── exportRows ────────────────────────────────────────────────────────────────

describe('enquiryService.exportRows', () => {
  it('maps all rows to ExportRow shape with flattened master names', async () => {
    const row = makeRow({
      commodity: { id: 'c1', slug: 'lac', nameEn: 'Lac', nameHi: null },
      programmeScheme: { id: 'p1', titleEn: 'MFP Programme', shortCode: 'MFP' } as EnquiryRow['programmeScheme'],
    });
    repo.listAll.mockResolvedValueOnce([row]);
    const rows = await enquiryService.exportRows({});
    expect(rows).toHaveLength(1);
    expect(rows[0].commodity).toBe('Lac');
    expect(rows[0].programme_scheme).toBe('MFP Programme');
    expect(rows[0].spam_state).toBe('clean');
    expect(rows[0].name).toBe('Ramesh Kumar');
  });

  it('returns empty array when no enquiries match the filters', async () => {
    repo.listAll.mockResolvedValueOnce([]);
    const rows = await enquiryService.exportRows({ archived: false });
    expect(rows).toHaveLength(0);
  });
});
