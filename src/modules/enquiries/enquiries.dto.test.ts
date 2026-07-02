/**
 * Unit tests — enquiry DTO mappers (DB-free).
 * Verifies all four mapper functions produce the correct shapes and handle
 * optional / null fields correctly.
 */
import { describe, it, expect } from 'vitest';
import {
  toEnquirySummaryDto,
  toEnquiryDetailDto,
  toEnquirySubmitDto,
  toEnquiryExportRow,
} from './enquiries.dto';
import type { EnquiryRow } from './enquiries.repository';

const UUID = '11111111-1111-4111-8111-111111111111';
const UUID2 = '22222222-2222-4222-8222-222222222222';
const SUBMITTED = new Date('2026-06-27T10:00:00Z');
const UPDATED = new Date('2026-06-27T11:00:00Z');

function makeRow(over: Partial<EnquiryRow> = {}): EnquiryRow {
  return {
    id: UUID,
    enquiryTypeId: UUID2,
    name: 'Sita Devi',
    mobile: '+91 94300 99999',
    email: 'sita@example.com',
    subject: 'Training Query',
    message: 'Please share training schedule.',
    organization: 'Cooperative XYZ',
    commodityId: null,
    programmeSchemeId: null,
    submittedAt: SUBMITTED,
    sourceIpHash: null,
    spamState: 'clean',
    internalNotes: null,
    archivedAt: null,
    createdAt: SUBMITTED,
    updatedAt: UPDATED,
    enquiryType: { id: UUID2, slug: 'training', nameEn: 'Training', nameHi: 'प्रशिक्षण' },
    commodity: null,
    programmeScheme: null,
    ...over,
  } as EnquiryRow;
}

// ── toEnquirySummaryDto ───────────────────────────────────────────────────────

describe('toEnquirySummaryDto', () => {
  it('maps all required fields', () => {
    const dto = toEnquirySummaryDto(makeRow());
    expect(dto.id).toBe(UUID);
    expect(dto.name).toBe('Sita Devi');
    expect(dto.email).toBe('sita@example.com');
    expect(dto.mobile).toBe('+91 94300 99999');
    expect(dto.subject).toBe('Training Query');
    expect(dto.organization).toBe('Cooperative XYZ');
    expect(dto.spam_state).toBe('clean');
  });

  it('serializes enquiry_type as a master ref', () => {
    const dto = toEnquirySummaryDto(makeRow());
    expect(dto.enquiry_type).toEqual({ id: UUID2, slug: 'training', name_en: 'Training', name_hi: 'प्रशिक्षण' });
  });

  it('formats submitted_at as ISO string', () => {
    const dto = toEnquirySummaryDto(makeRow());
    expect(dto.submitted_at).toBe('2026-06-27T10:00:00.000Z');
  });

  it('formats archived_at as null when not archived', () => {
    const dto = toEnquirySummaryDto(makeRow({ archivedAt: null }));
    expect(dto.archived_at).toBeNull();
  });

  it('formats archived_at as ISO string when archived', () => {
    const archivedAt = new Date('2026-06-28T00:00:00Z');
    const dto = toEnquirySummaryDto(makeRow({ archivedAt }));
    expect(dto.archived_at).toBe('2026-06-28T00:00:00.000Z');
  });

  it('does NOT expose message or internal_notes (summary only)', () => {
    const dto = toEnquirySummaryDto(makeRow({ internalNotes: 'secret' })) as Record<string, unknown>;
    expect(dto.message).toBeUndefined();
    expect(dto.internal_notes).toBeUndefined();
  });
});

// ── toEnquiryDetailDto ────────────────────────────────────────────────────────

describe('toEnquiryDetailDto', () => {
  it('includes all summary fields plus message, internal_notes, and updated_at', () => {
    const dto = toEnquiryDetailDto(makeRow({ internalNotes: 'Follow up by phone.' }));
    expect(dto.id).toBe(UUID);
    expect(dto.message).toBe('Please share training schedule.');
    expect(dto.internal_notes).toBe('Follow up by phone.');
    expect(dto.updated_at).toBe('2026-06-27T11:00:00.000Z');
  });

  it('maps a commodity reference', () => {
    const row = makeRow({
      commodity: { id: 'c1', slug: 'lac', nameEn: 'Lac', nameHi: 'लाख' },
    });
    const dto = toEnquiryDetailDto(row);
    expect(dto.commodity).toEqual({ id: 'c1', slug: 'lac', name_en: 'Lac', name_hi: 'लाख' });
  });

  it('maps a programme_scheme reference', () => {
    const row = makeRow({
      programmeScheme: { id: 'p1', titleEn: 'MFP Value Chain', shortCode: 'MFP' } as EnquiryRow['programmeScheme'],
    });
    const dto = toEnquiryDetailDto(row);
    expect(dto.programme_scheme).toEqual({ id: 'p1', title_en: 'MFP Value Chain', short_code: 'MFP' });
  });

  it('returns null for commodity and programme_scheme when absent', () => {
    const dto = toEnquiryDetailDto(makeRow());
    expect(dto.commodity).toBeNull();
    expect(dto.programme_scheme).toBeNull();
  });
});

// ── toEnquirySubmitDto ────────────────────────────────────────────────────────

describe('toEnquirySubmitDto', () => {
  it('returns only id and submitted_at (no contact details exposed)', () => {
    const dto = toEnquirySubmitDto({ id: UUID, submittedAt: SUBMITTED });
    expect(Object.keys(dto)).toEqual(['id', 'submitted_at']);
    expect(dto.id).toBe(UUID);
    expect(dto.submitted_at).toBe('2026-06-27T10:00:00.000Z');
  });
});

// ── toEnquiryExportRow ────────────────────────────────────────────────────────

describe('toEnquiryExportRow', () => {
  it('flattens all fields to string values', () => {
    const row = makeRow({
      commodity: { id: 'c1', slug: 'lac', nameEn: 'Lac', nameHi: null },
      programmeScheme: { id: 'p1', titleEn: 'MFP', shortCode: null } as EnquiryRow['programmeScheme'],
      archivedAt: new Date('2026-06-30T00:00:00Z'),
    });
    const exp = toEnquiryExportRow(row);
    expect(exp.id).toBe(UUID);
    expect(exp.enquiry_type).toBe('Training');
    expect(exp.name).toBe('Sita Devi');
    expect(exp.commodity).toBe('Lac');
    expect(exp.programme_scheme).toBe('MFP');
    expect(exp.spam_state).toBe('clean');
    expect(exp.archived_at).toBe('2026-06-30');
    expect(exp.submitted_at).toBe('2026-06-27');
  });

  it('uses empty string for absent optional fields', () => {
    const exp = toEnquiryExportRow(makeRow({ organization: null, commodity: null, programmeScheme: null, archivedAt: null }));
    expect(exp.organization).toBe('');
    expect(exp.commodity).toBe('');
    expect(exp.programme_scheme).toBe('');
    expect(exp.archived_at).toBe('');
  });
});
