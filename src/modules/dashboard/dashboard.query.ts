/**
 * Query-string parsing for the dashboard list/read endpoints → framework-free filter objects +
 * allow-listed ordering. Unknown filter keys → 422; unknown ordering → 422 (API spec §1.4). FY /
 * reporting-period filters are accepted as UUIDs (resolved against masters by the service/repo).
 */
import type { Request } from 'express';
import { resolveOrdering } from '@/shared/listing';
import { parsePublicationState, parseBooleanFlag, assertKnownQueryKeys } from '@/shared/list-query';
import { ValidationError } from '@/shared/errors';
import {
  REPORT_ORDERING_FIELDS,
  METRIC_ORDERING_FIELDS,
  DATASET_ORDERING_FIELDS,
  DATASET_SOURCES,
  DATASET_STATUSES,
  type ReportFilters,
  type ReportOrderingField,
  type MetricFilters,
  type MetricOrderingField,
  type DatasetFilters,
  type DatasetOrderingField,
  type PublicDashboardFilters,
  type DatasetSourceValue,
  type DatasetStatus,
} from './dashboard.types';

const str = (v: unknown): string | undefined =>
  typeof v === 'string' && v.trim() !== '' ? v.trim() : undefined;

function parseEnum<T extends string>(value: unknown, allowed: readonly T[], field: string): T | undefined {
  const raw = str(value);
  if (raw === undefined) return undefined;
  if (!(allowed as readonly string[]).includes(raw)) {
    throw new ValidationError({ [field]: [`Must be one of: ${allowed.join(', ')}.`] });
  }
  return raw as T;
}

// ── Reports ──────────────────────────────────────────────────────────────────────
const REPORT_FILTER_KEYS = ['publication_state', 'show_on_homepage', 'is_active'] as const;

export function parseReportFilters(req: Request): ReportFilters {
  const q = req.query;
  assertKnownQueryKeys(q, REPORT_FILTER_KEYS);
  return {
    publicationState: parsePublicationState(q.publication_state),
    showOnHomepage: parseBooleanFlag(q.show_on_homepage, 'show_on_homepage'),
    isActive: parseBooleanFlag(q.is_active, 'is_active'),
  };
}

export function parseReportOrdering(req: Request): { field: ReportOrderingField; direction: 'asc' | 'desc' } {
  const ob = resolveOrdering(req.query.ordering, REPORT_ORDERING_FIELDS, {
    field: 'display_order',
    direction: 'asc',
  });
  return { field: ob.field as ReportOrderingField, direction: ob.direction };
}

// ── Metrics ────────────────────────────────────────────────────────────────────
const METRIC_FILTER_KEYS = ['financial_year', 'reporting_period', 'source'] as const;

export function parseMetricFilters(req: Request): MetricFilters {
  const q = req.query;
  assertKnownQueryKeys(q, METRIC_FILTER_KEYS);
  return {
    financialYear: str(q.financial_year),
    reportingPeriod: str(q.reporting_period),
    source: parseEnum<DatasetSourceValue>(q.source, DATASET_SOURCES, 'source'),
  };
}

export function parseMetricOrdering(req: Request): { field: MetricOrderingField; direction: 'asc' | 'desc' } {
  const ob = resolveOrdering(req.query.ordering, METRIC_ORDERING_FIELDS, {
    field: 'display_order',
    direction: 'asc',
  });
  return { field: ob.field as MetricOrderingField, direction: ob.direction };
}

// ── Datasets ─────────────────────────────────────────────────────────────────────
const DATASET_FILTER_KEYS = ['source', 'status', 'financial_year', 'reporting_period'] as const;

export function parseDatasetFilters(req: Request): DatasetFilters {
  const q = req.query;
  assertKnownQueryKeys(q, DATASET_FILTER_KEYS);
  return {
    source: parseEnum<DatasetSourceValue>(q.source, DATASET_SOURCES, 'source'),
    status: parseEnum<DatasetStatus>(q.status, DATASET_STATUSES, 'status'),
    financialYear: str(q.financial_year),
    reportingPeriod: str(q.reporting_period),
  };
}

export function parseDatasetOrdering(req: Request): { field: DatasetOrderingField; direction: 'asc' | 'desc' } {
  const ob = resolveOrdering(req.query.ordering, DATASET_ORDERING_FIELDS, {
    field: 'created_at',
    direction: 'desc',
  });
  return { field: ob.field as DatasetOrderingField, direction: ob.direction };
}

// ── Public dashboard ─────────────────────────────────────────────────────────────
const PUBLIC_FILTER_KEYS = ['financial_year', 'reporting_period'] as const;

export function parsePublicDashboardFilters(req: Request): PublicDashboardFilters {
  const q = req.query;
  assertKnownQueryKeys(q, PUBLIC_FILTER_KEYS);
  return {
    financialYear: str(q.financial_year),
    reportingPeriod: str(q.reporting_period),
  };
}
