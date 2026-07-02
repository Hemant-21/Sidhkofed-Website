/**
 * Unit tests — dashboard validators (pure, DB-free). Cover the fixed-report-key rule, the
 * exactly-one-of-value rule (metrics + dataset rows), strict unknown-key rejection, and the
 * upload-requires-file-asset contract.
 */
import { describe, it, expect } from 'vitest';
import { ValidationError } from '@/shared/errors';
import {
  validateReportCreate,
  validateMetricCreate,
  datasetRowSchema,
  validateDatasetUploadFields,
  validateDatasetCreate,
} from './dashboard.validators';

const FY = '11111111-1111-4111-8111-111111111111';

describe('validateReportCreate', () => {
  it('accepts a known fixed report key', () => {
    const out = validateReportCreate({ report_key: 'training_summary', title_en: 'Training Summary' });
    expect(out.report_key).toBe('training_summary');
  });
  it('rejects an arbitrary (non-fixed) report key — no report builder', () => {
    expect(() =>
      validateReportCreate({ report_key: 'my_custom_report', title_en: 'Custom' }),
    ).toThrow(ValidationError);
  });
  it('rejects unknown keys (strict)', () => {
    expect(() =>
      validateReportCreate({ report_key: 'training_summary', title_en: 'T', sql: 'SELECT 1' }),
    ).toThrow(ValidationError);
  });
});

describe('validateMetricCreate — exactly one of value/value_text', () => {
  const base = { metric_key: 'total', label_en: 'Total' };
  it('accepts a numeric value', () => {
    expect(validateMetricCreate({ ...base, value: 42 }).value).toBe(42);
  });
  it('accepts a text value', () => {
    expect(validateMetricCreate({ ...base, value_text: 'N/A' }).value_text).toBe('N/A');
  });
  it('rejects both value and value_text', () => {
    expect(() => validateMetricCreate({ ...base, value: 1, value_text: 'x' })).toThrow(ValidationError);
  });
  it('rejects neither value nor value_text', () => {
    expect(() => validateMetricCreate(base)).toThrow(ValidationError);
  });
});

describe('datasetRowSchema', () => {
  it('accepts a valid row with a numeric value', () => {
    const r = datasetRowSchema.safeParse({ metric_key: 'k', label_en: 'K', value: 10 });
    expect(r.success).toBe(true);
  });
  it('rejects a row with both value and value_text', () => {
    const r = datasetRowSchema.safeParse({ metric_key: 'k', label_en: 'K', value: 10, value_text: 'x' });
    expect(r.success).toBe(false);
  });
});

describe('validateDatasetUploadFields (multipart text fields)', () => {
  it('accepts optional FY + reporting period + preview flag', () => {
    const out = validateDatasetUploadFields({ financial_year_id: FY, preview: 'true' });
    expect(out.financial_year_id).toBe(FY);
    expect(out.preview).toBe('true');
  });
  it('rejects an unknown text field (strict template)', () => {
    expect(() => validateDatasetUploadFields({ rows: '[]' })).toThrow(ValidationError);
  });
  it('rejects a non-boolean preview string', () => {
    expect(() => validateDatasetUploadFields({ preview: 'yes' })).toThrow(ValidationError);
  });
});

describe('validateDatasetCreate (manual JSON route — backward compatible)', () => {
  it('rejects the excel source on the manual create route', () => {
    expect(() =>
      validateDatasetCreate({ source: 'excel', rows: [{ metric_key: 'k', label_en: 'K', value: 1 }] }),
    ).toThrow(ValidationError);
  });
  it('defaults manual create with at least one row required', () => {
    expect(() => validateDatasetCreate({ rows: [] })).toThrow(ValidationError);
  });
});
