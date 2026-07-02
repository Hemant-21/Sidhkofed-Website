/**
 * Admin Dashboard feature (Phase 15.2). Public surface: the dashboard page, its
 * data hooks, and the reusable widgets. Composes existing backend APIs only —
 * fixed KPIs/cards/reports, no analytics builder.
 */

export { DashboardPage } from './dashboard-page';
export * from './components';
export {
  useDashboardKpis,
  useDashboardReports,
  useRecentActivity,
  useContentCount,
  useContentCounts,
  type ContentCountSpec,
} from './hooks';
