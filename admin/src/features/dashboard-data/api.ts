'use client';

/**
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
