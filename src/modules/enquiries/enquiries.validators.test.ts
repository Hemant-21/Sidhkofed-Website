/**
 * Unit tests — enquiry validator schemas (DB-free).
 * Covers public submit rules (honeypot, mobile format, email, required fields)
 * and admin PATCH restrictions (only notes + spam_state accepted, unknown keys rejected).
 */
import { describe, it, expect } from 'vitest';
import { validateEnquirySubmit, validateEnquiryAdminPatch } from './enquiries.validators';
import { ValidationError } from '@/shared/errors';

const UUID = '11111111-1111-4111-8111-111111111111';

const VALID_SUBMIT = {
  name: 'Ramesh Kumar',
  mobile: '+91 94300 12345',
  email: 'ramesh@example.com',
  enquiry_type_id: UUID,
  subject: 'Procurement enquiry',
  message: 'I would like to know about the procurement process.',
};

describe('validateEnquirySubmit', () => {
  it('accepts a minimal valid submission', () => {
    const out = validateEnquirySubmit(VALID_SUBMIT);
    expect(out.name).toBe('Ramesh Kumar');
    expect(out.email).toBe('ramesh@example.com');
  });

  it('normalises email to lowercase', () => {
    const out = validateEnquirySubmit({ ...VALID_SUBMIT, email: 'Ramesh@EXAMPLE.COM' });
    expect(out.email).toBe('ramesh@example.com');
  });

  it('accepts optional fields', () => {
    const out = validateEnquirySubmit({
      ...VALID_SUBMIT,
      organization: 'Cooperative Society',
      commodity_id: UUID,
      programme_scheme_id: UUID,
      captcha_token: 'abc123',
    });
    expect(out.organization).toBe('Cooperative Society');
    expect(out.commodity_id).toBe(UUID);
  });

  it('rejects a filled honeypot field', () => {
    expect(() => validateEnquirySubmit({ ...VALID_SUBMIT, website: 'http://spam.example' })).toThrow(
      ValidationError,
    );
  });

  it('rejects missing required fields', () => {
    expect(() => validateEnquirySubmit({ name: 'Test' })).toThrow(ValidationError);
  });

  it('rejects an invalid email address', () => {
    expect(() => validateEnquirySubmit({ ...VALID_SUBMIT, email: 'not-an-email' })).toThrow(ValidationError);
  });

  it('rejects a mobile number that is too short', () => {
    expect(() => validateEnquirySubmit({ ...VALID_SUBMIT, mobile: '123' })).toThrow(ValidationError);
  });

  it('rejects an invalid enquiry_type_id (not a UUID)', () => {
    expect(() => validateEnquirySubmit({ ...VALID_SUBMIT, enquiry_type_id: 'not-a-uuid' })).toThrow(
      ValidationError,
    );
  });

  it('rejects unknown extra fields (strict mode)', () => {
    expect(() => validateEnquirySubmit({ ...VALID_SUBMIT, extra_field: 'surprise' })).toThrow(ValidationError);
  });

  it('trims whitespace from name and subject', () => {
    const out = validateEnquirySubmit({ ...VALID_SUBMIT, name: '  Sita  ', subject: '  Question  ' });
    expect(out.name).toBe('Sita');
    expect(out.subject).toBe('Question');
  });
});

describe('validateEnquiryAdminPatch', () => {
  it('accepts internal_notes update', () => {
    const out = validateEnquiryAdminPatch({ internal_notes: 'Followed up by phone.' });
    expect(out.internal_notes).toBe('Followed up by phone.');
  });

  it('accepts spam_state update', () => {
    const out = validateEnquiryAdminPatch({ spam_state: 'suspected' });
    expect(out.spam_state).toBe('suspected');
  });

  it('accepts null internal_notes (clear notes)', () => {
    const out = validateEnquiryAdminPatch({ internal_notes: null });
    expect(out.internal_notes).toBeNull();
  });

  it('rejects an invalid spam_state value', () => {
    expect(() => validateEnquiryAdminPatch({ spam_state: 'blocked' })).toThrow(ValidationError);
  });

  it('rejects unknown fields (strict mode — no public contact edits allowed)', () => {
    expect(() => validateEnquiryAdminPatch({ name: 'Hacker', email: 'hack@evil.com' })).toThrow(ValidationError);
  });

  it('accepts an empty patch (no-op)', () => {
    const out = validateEnquiryAdminPatch({});
    expect(out.spam_state).toBeUndefined();
    expect(out.internal_notes).toBeUndefined();
  });
});
