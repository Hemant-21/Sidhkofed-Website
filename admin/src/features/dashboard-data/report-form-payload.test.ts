import { describe, it, expect } from 'vitest';
import {
  buildReportPayload,
  emptyReportForm,
  parseLayoutConfig,
  type ReportFormValues,
} from './report-form-payload';

const base = (): ReportFormValues => ({
  ...emptyReportForm(),
  report_key: 'sidhkofed_primary_membership',
  title_en: '  SIDHKOFED Primary  ',
});

describe('parseLayoutConfig', () => {
  it('treats empty as null', () => {
    expect(parseLayoutConfig('')).toBeNull();
    expect(parseLayoutConfig('   ')).toBeNull();
  });

  it('parses a JSON object', () => {
    expect(parseLayoutConfig('{"charts":["bar"]}')).toEqual({ charts: ['bar'] });
  });

  it('returns undefined for invalid JSON or a non-object', () => {
    expect(parseLayoutConfig('{bad')).toBeUndefined();
    expect(parseLayoutConfig('[1,2,3]')).toBeUndefined();
    expect(parseLayoutConfig('"text"')).toBeUndefined();
  });
});

describe('buildReportPayload', () => {
  it('includes report_key on create, omits it on edit', () => {
    expect(buildReportPayload(base(), false).report_key).toBe('sidhkofed_primary_membership');
    expect(buildReportPayload(base(), true).report_key).toBeUndefined();
  });

  it('trims title and nulls empty optionals', () => {
    const payload = buildReportPayload(base(), false);
    expect(payload.title_en).toBe('SIDHKOFED Primary');
    expect(payload.title_hi).toBeNull();
    expect(payload.description_en).toBeNull();
    expect(payload.layout_config).toBeNull();
    expect(payload.is_active).toBe(true);
  });

  it('serializes a parsed layout config', () => {
    const payload = buildReportPayload({ ...base(), layout_config: '{"k":1}' }, false);
    expect(payload.layout_config).toEqual({ k: 1 });
  });

  it('sends the highlight window only with a highlight type', () => {
    const none = buildReportPayload({ ...base(), highlight_start_at: '2026-01-01' }, false);
    expect(none.highlight_type).toBeNull();
    expect(none.highlight_start_at).toBeNull();

    const set = buildReportPayload(
      { ...base(), highlight_type: 'featured', highlight_start_at: '2026-01-01' },
      false,
    );
    expect(set.highlight_type).toBe('featured');
    expect(set.highlight_start_at).toBe('2026-01-01T00:00:00.000Z');
  });
});
