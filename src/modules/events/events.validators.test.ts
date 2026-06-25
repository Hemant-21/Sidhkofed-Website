/** Unit tests — event validators (date-mode/end-date rules, manual override, strictness). DB-free. */
import { describe, it, expect } from 'vitest';
import { validateEventCreate } from './events.validators';
import { ValidationError } from '@/shared/errors';

const UUID = '33333333-3333-4333-8333-333333333333';
const base = { event_type_id: UUID, title_en: 'Lac training', date_mode: 'single', start_date: '2026-07-15' };

describe('validateEventCreate', () => {
  it('accepts a minimal single-date event', () => {
    const out = validateEventCreate(base);
    expect(out.title_en).toBe('Lac training');
    expect(out.start_date).toBeInstanceOf(Date);
  });

  it('requires end_date for a range', () => {
    expect(() => validateEventCreate({ ...base, date_mode: 'range' })).toThrow(ValidationError);
  });

  it('rejects an end_date before start_date', () => {
    expect(() =>
      validateEventCreate({ ...base, date_mode: 'range', start_date: '2026-07-15', end_date: '2026-07-10' }),
    ).toThrow(ValidationError);
  });

  it('rejects a manual event_status without status_override', () => {
    expect(() => validateEventCreate({ ...base, event_status: 'cancelled' })).toThrow(ValidationError);
  });

  it('accepts postponed/cancelled with status_override', () => {
    const out = validateEventCreate({ ...base, status_override: true, event_status: 'postponed' });
    expect(out.event_status).toBe('postponed');
  });

  it('rejects unknown keys (strict)', () => {
    expect(() => validateEventCreate({ ...base, surprise: true })).toThrow(ValidationError);
  });

  it('rejects a non-uuid event_type_id', () => {
    expect(() => validateEventCreate({ ...base, event_type_id: 'not-a-uuid' })).toThrow(ValidationError);
  });
});
