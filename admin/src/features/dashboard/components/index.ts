/**
 * Admin Dashboard components (Phase 15.2). Fixed, non-configurable widgets composed
 * from the shared design system — reused by the dashboard page and available to any
 * future module needing a KPI/status/activity surface.
 */

export {
  StatCard,
  DashboardCard,
  StatusRow,
  InfoCard,
  WarningCard,
  type StatCardProps,
  type DashboardCardProps,
} from './cards';
export { ContentKpiGrid, HeadlineKpiGrid } from './kpi-section';
export { QuickActions } from './quick-actions';
export { RecentActivity } from './recent-activity';
export { ContentStateSummary } from './content-state-summary';
export { ReportStatus } from './report-status';
export { SystemStatus } from './system-status';
export { SearchShortcut } from './search-shortcut';
