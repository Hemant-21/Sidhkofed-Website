'use client';

/**
<<<<<<< HEAD
 * Dashboard Data data layer. The data surface manages a report's datasets (imports) and metrics
 * (API spec §6, dashboard.routes.ts):
 *   - GET  /admin/dashboard/reports/:id/datasets         (read — all CMS roles)
 *   - POST /admin/dashboard/reports/:id/datasets/upload  (write — dashboard.manage_data)
 *   - GET  /admin/dashboard/reports/:id/metrics          (read — all CMS roles)
 * The fixed report catalog is read via the existing dashboard feature's `fetchReports`.
 */

import { DASHBOARD_ENDPOINTS } from '@/constants/api-endpoints';
import { getList, uploadFile } from '@/lib/api/http';
import type { ListQuery } from '@/types/api';
import type { Dataset, Metric } from './types';

/** Logical permission key the dataset-write routes require (backend-seeded `dashboard.manage_data`). */
export const DASHBOARD_DATA_PERMS = { manageData: 'dashboard.manage_data' } as const;

const reportBase = (reportId: string) => `${DASHBOARD_ENDPOINTS.adminReports}/${encodeURIComponent(reportId)}`;

export const listDatasets = (reportId: string, query?: ListQuery) =>
  getList<Dataset>(`${reportBase(reportId)}/datasets`, query);

export const listMetrics = (reportId: string, query?: ListQuery) =>
  getList<Metric>(`${reportBase(reportId)}/metrics`, query);

/** Upload a CSV/XLSX dataset file for a report (multipart `file` field). */
export const uploadDataset = (reportId: string, file: File, onProgress?: (pct: number) => void) =>
  uploadFile<Dataset>(`${reportBase(reportId)}/datasets/upload`, file, undefined, onProgress);
=======
 * Dashboard Data layer. Report definitions use the shared "P" CRUD hooks against the
 * `dashboard/reports` resource (its admin paths line up exactly with the generic pattern:
 * `/admin/dashboard/reports`, `/admin/dashboard/reports/{id}`, `.../publish|unpublish|archive|
 * restore`). Metrics and datasets are nested sub-resources of a report and Excel import is a
 * multipart upload, so they get dedicated, explicitly-pathed hooks — no bespoke fetch logic beyond
 * the shared `http` transport. The frontend never computes a metric or validates a dataset row; the
 * backend owns all of that.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminResource, DASHBOARD_ENDPOINTS } from '@/constants/api-endpoints';
import { get, getList, post, patch, del, uploadFile, type PaginatedResult } from '@/lib/api/http';
import { errorMessage } from '@/lib/api/server-errors';
import { useToast } from '@/hooks/use-toast';
import type { ListQuery } from '@/types/api';
import type {
  Metric,
  MetricWriteInput,
  Dataset,
  DatasetCreateInput,
  DatasetResult,
  PublicReportDetail,
} from './types';

/** Standard admin "P" resource string for report definitions. */
export const REPORTS_RESOURCE = 'dashboard/reports';

export { DASHBOARD_PERMS } from './permissions';

const reportBase = adminResource(REPORTS_RESOURCE).list; // /admin/dashboard/reports
const metricsBase = (reportId: string) => `${reportBase}/${encodeURIComponent(reportId)}/metrics`;
const metricPath = (reportId: string, id: string) =>
  `${metricsBase(reportId)}/${encodeURIComponent(id)}`;
const datasetsBase = (reportId: string) => `${reportBase}/${encodeURIComponent(reportId)}/datasets`;
const datasetUploadPath = (reportId: string) => `${datasetsBase(reportId)}/upload`;
const datasetDetailPath = (id: string) => `${reportBase.replace(/\/reports$/, '')}/datasets/${encodeURIComponent(id)}`;

// ── Query keys (scoped under the report so invalidation is precise) ───────────────
const metricsKey = (reportId: string, query?: ListQuery) =>
  [REPORTS_RESOURCE, reportId, 'metrics', query ?? {}] as const;
const datasetsKey = (reportId: string, query?: ListQuery) =>
  [REPORTS_RESOURCE, reportId, 'datasets', query ?? {}] as const;
const datasetDetailKey = (id: string) => [REPORTS_RESOURCE, 'dataset', id] as const;
const reportPreviewKey = (key: string) => ['dashboard', 'public-report', key] as const;

function useInvalidateReportData(reportId: string) {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: [REPORTS_RESOURCE, reportId] });
  };
}

// ── Metrics ──────────────────────────────────────────────────────────────────────

/** Paginated metric list for a report (`GET /admin/dashboard/reports/{id}/metrics`). */
export function useReportMetrics(reportId: string | undefined, query?: ListQuery, enabled = true) {
  return useQuery({
    queryKey: metricsKey(reportId ?? '', query),
    queryFn: () => getList<Metric>(metricsBase(reportId as string), query),
    enabled: enabled && Boolean(reportId),
    staleTime: 30_000,
  });
}

export function useCreateMetric(reportId: string) {
  const invalidate = useInvalidateReportData(reportId);
  const toast = useToast();
  return useMutation({
    mutationFn: (body: MetricWriteInput) => post<Metric, MetricWriteInput>(metricsBase(reportId), body),
    onSuccess: () => {
      invalidate();
      toast.success('Metric created.');
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
}

export function useUpdateMetric(reportId: string) {
  const invalidate = useInvalidateReportData(reportId);
  const toast = useToast();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: MetricWriteInput }) =>
      patch<Metric, MetricWriteInput>(metricPath(reportId, id), body),
    onSuccess: () => {
      invalidate();
      toast.success('Metric updated.');
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
}

export function useDeleteMetric(reportId: string) {
  const invalidate = useInvalidateReportData(reportId);
  const toast = useToast();
  return useMutation({
    mutationFn: (id: string) => del<void>(metricPath(reportId, id)),
    onSuccess: () => {
      invalidate();
      toast.success('Metric removed.');
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
}

// ── Datasets ─────────────────────────────────────────────────────────────────────

/** Paginated dataset list for a report (`GET /admin/dashboard/reports/{id}/datasets`). */
export function useReportDatasets(reportId: string | undefined, query?: ListQuery, enabled = true) {
  return useQuery({
    queryKey: datasetsKey(reportId ?? '', query),
    queryFn: () => getList<Dataset>(datasetsBase(reportId as string), query),
    enabled: enabled && Boolean(reportId),
    staleTime: 30_000,
  });
}

/** Standalone dataset detail (`GET /admin/dashboard/datasets/{id}`). */
export function useDataset(id: string | undefined) {
  return useQuery({
    queryKey: datasetDetailKey(id ?? ''),
    queryFn: () => get<Dataset>(datasetDetailPath(id as string)),
    enabled: Boolean(id),
    staleTime: 30_000,
  });
}

/**
 * Manual dataset create / preview (`POST /admin/dashboard/reports/{id}/datasets`). When
 * `preview=true` the backend validates and returns row errors WITHOUT persisting. On a real import
 * the report's metric/dataset caches are invalidated. Errors are NOT toasted by default so the
 * caller can render row-level validation; pass `toastError` to enable it.
 */
export function useCreateDataset(reportId: string, opts: { toastError?: boolean } = {}) {
  const invalidate = useInvalidateReportData(reportId);
  const toast = useToast();
  return useMutation({
    mutationFn: (body: DatasetCreateInput) =>
      post<DatasetResult, DatasetCreateInput>(datasetsBase(reportId), body),
    onSuccess: (result) => {
      if (!('preview' in result)) invalidate();
    },
    onError: (error) => {
      if (opts.toastError) toast.error(errorMessage(error));
    },
  });
}

/**
 * Excel/CSV dataset upload / preview (`POST /admin/dashboard/reports/{id}/datasets/upload`). The
 * file is parsed and validated server-side; the frontend never parses business rows. `preview` and
 * the financial-year / reporting-period are sent as multipart text fields. Progress is reported via
 * the shared upload helper.
 */
export function useUploadDataset(reportId: string) {
  const invalidate = useInvalidateReportData(reportId);
  return useMutation({
    mutationFn: ({
      file,
      fields,
      onProgress,
    }: {
      file: File;
      fields: { financial_year_id?: string; reporting_period_id?: string; preview: boolean };
      onProgress?: (percent: number) => void;
    }) => {
      const formFields: Record<string, string> = { preview: String(fields.preview) };
      if (fields.financial_year_id) formFields.financial_year_id = fields.financial_year_id;
      if (fields.reporting_period_id) formFields.reporting_period_id = fields.reporting_period_id;
      return uploadFile<DatasetResult>(datasetUploadPath(reportId), file, formFields, onProgress);
    },
    onSuccess: (result) => {
      if (!('preview' in result)) invalidate();
    },
  });
}

// ── Public report preview (read-only; backend-resolved metrics + fixed layout) ────

/**
 * Public fixed report preview (`GET /public/dashboard/{report_key}`) — the report as the public
 * site sees it: resolved metrics + fixed layout. Read-only. Disabled until a key is present; a 404
 * (e.g. an unpublished report) is treated as "no public preview yet".
 */
export function useReportPreview(
  reportKey: string | undefined,
  period?: { financial_year?: string; reporting_period?: string },
) {
  return useQuery({
    queryKey: [...reportPreviewKey(reportKey ?? ''), period ?? {}],
    queryFn: () =>
      get<PublicReportDetail>(DASHBOARD_ENDPOINTS.publicReport(reportKey as string), {
        params: period ?? {},
      }),
    enabled: Boolean(reportKey),
    retry: false,
    staleTime: 60_000,
  });
}

export type { PaginatedResult };
>>>>>>> d476bcebf175f0a60e2572959456e7339f1461f3
