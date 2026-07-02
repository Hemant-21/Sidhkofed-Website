/**
 * Pure form ↔ API mapping for the dashboard metric form (unit-testable; no React). A metric carries
 * EXACTLY ONE of a numeric `value` or a string `value_text` (dashboard.validators.ts). The editor
 * picks the value kind and enters the backend-authored figure verbatim — the frontend NEVER computes
 * a metric value. Empty FY/reporting-period become null; the backend resolves them against masters.
 */

import type { DatasetSource, Metric, MetricWriteInput } from './types';

export type MetricValueKind = 'number' | 'text';

export interface MetricFormValues {
  metric_key: string;
  label_en: string;
  label_hi: string;
  value_kind: MetricValueKind;
  value: string;
  value_text: string;
  unit: string;
  financial_year_id: string;
  reporting_period_id: string;
  source: DatasetSource;
  display_order: string;
}

const blank = (v: string): string | null => (v.trim() === '' ? null : v.trim());

export function emptyMetricForm(): MetricFormValues {
  return {
    metric_key: '',
    label_en: '',
    label_hi: '',
    value_kind: 'number',
    value: '',
    value_text: '',
    unit: '',
    financial_year_id: '',
    reporting_period_id: '',
    source: 'manual',
    display_order: '',
  };
}

export function metricToForm(m: Metric): MetricFormValues {
  const isText = m.value_text != null && m.value == null;
  return {
    metric_key: m.metric_key,
    label_en: m.label_en,
    label_hi: m.label_hi ?? '',
    value_kind: isText ? 'text' : 'number',
    value: m.value != null ? String(m.value) : '',
    value_text: m.value_text ?? '',
    unit: m.unit ?? '',
    financial_year_id: m.financial_year?.id ?? '',
    reporting_period_id: m.reporting_period?.id ?? '',
    source: m.source,
    display_order: String(m.display_order ?? 0),
  };
}

/**
 * Build the metric write payload. Sends exactly one of `value`/`value_text` based on the chosen
 * value kind so the backend's "exactly one" rule is satisfied. A blank numeric value sends `null`
 * (the backend then rejects it with a field error, surfacing the mistake to the editor).
 */
export function buildMetricPayload(v: MetricFormValues): MetricWriteInput {
  const isNumber = v.value_kind === 'number';
  const numeric = v.value.trim() === '' ? null : Number(v.value);
  return {
    metric_key: v.metric_key.trim(),
    label_en: v.label_en.trim(),
    label_hi: blank(v.label_hi),
    value: isNumber ? (Number.isFinite(numeric) ? numeric : null) : null,
    value_text: isNumber ? null : blank(v.value_text),
    unit: blank(v.unit),
    financial_year_id: blank(v.financial_year_id),
    reporting_period_id: blank(v.reporting_period_id),
    source: v.source,
    display_order: v.display_order.trim() === '' ? 0 : Number(v.display_order),
  };
}
