/**
 * Dashboard Data feature (Phase 15.8). Full admin frontend for the FIXED dashboard reports and their
 * managed data: report list/detail/definition + lifecycle, the nested Metrics manager, the Datasets
 * panel + standalone dataset detail, and the Excel Import surface. Built on the shared 15.0/15.1
 * infrastructure and backend contracts. The dashboard is fixed and backend-driven — no builder, no
 * client-side aggregation, no computed KPI (codex §13).
 */
export { DashboardDataPage } from './dashboard-data-page';
export { ReportListPage } from './report-list-page';
export { ReportDetailPage } from './report-detail-page';
export { ReportFormPage } from './report-form-page';
export { MetricsLandingPage } from './metrics-landing-page';
export { DatasetsLandingPage } from './datasets-landing-page';
export { DatasetDetailPage } from './dataset-detail-page';
export { DashboardImportPage } from './dashboard-import-page';
export { REPORTS_RESOURCE } from './api';
export * from './types';
