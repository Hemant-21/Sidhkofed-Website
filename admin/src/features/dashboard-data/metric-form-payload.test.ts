import { describe, it, expect } from 'vitest';
import {
  buildMetricPayload,
  emptyMetricForm,
  metricToForm,
  type MetricFormValues,
} from './metric-form-payload';
import { isDatasetPreview, type DatasetResult } from './types';
import type { Metric } from './types';

const base = (): MetricFormValues => ({
  ...emptyMetricForm(),
  metric_key: '  total_members  ',
  label_en: '  Total members  ',
});

describe('buildMetricPayload', () => {
  it('sends a numeric value and nulls value_text for the number kind', () => {
    const payload = buildMetricPayload({ ...base(), value_kind: 'number', value: '1240' });
    expect(payload.value).toBe(1240);
    expect(payload.value_text).toBeNull();
    expect(payload.metric_key).toBe('total_members');
    expect(payload.label_en).toBe('Total members');
  });

  it('sends value_text and nulls value for the text kind', () => {
    const payload = buildMetricPayload({
      ...base(),
      value_kind: 'text',
      value_text: 'Steady growth',
    });
    expect(payload.value).toBeNull();
    expect(payload.value_text).toBe('Steady growth');
  });

  it('nulls a non-finite numeric value (so the backend rejects it)', () => {
    const payload = buildMetricPayload({ ...base(), value_kind: 'number', value: 'abc' });
    expect(payload.value).toBeNull();
  });

  it('nulls empty FY / reporting period and defaults display_order to 0', () => {
    const payload = buildMetricPayload(base());
    expect(payload.financial_year_id).toBeNull();
    expect(payload.reporting_period_id).toBeNull();
    expect(payload.display_order).toBe(0);
  });
});

describe('metricToForm', () => {
  it('detects the text value kind', () => {
    const metric = {
      id: 'mt1',
      report_id: 'r1',
      metric_key: 'trend',
      label_en: 'Trend',
      label_hi: null,
      value: null,
      value_text: 'up',
      unit: null,
      financial_year: null,
      reporting_period: null,
      source: 'manual',
      dataset_id: null,
      display_order: 0,
      created_at: '',
      updated_at: '',
    } as unknown as Metric;
    expect(metricToForm(metric).value_kind).toBe('text');
    expect(metricToForm(metric).value_text).toBe('up');
  });
});

describe('isDatasetPreview', () => {
  it('narrows preview vs import results', () => {
    const preview = { preview: true, valid: true, row_count: 2, errors: [] } as DatasetResult;
    const imported = {
      dataset: {} as never,
      metrics_created: 2,
      metrics_updated: 0,
    } as DatasetResult;
    expect(isDatasetPreview(preview)).toBe(true);
    expect(isDatasetPreview(imported)).toBe(false);
  });
});
