/**
 * `/dashboard` — the Admin Dashboard (Phase 15.2). A fixed, role-aware overview of
 * KPIs, content state, recent activity, dashboard reports, and system status, built
 * entirely from shared infrastructure and existing backend APIs. The page body is
 * the feature component; this route file only mounts it inside the admin shell.
 */

import { DashboardPage } from '@/features/dashboard';

export default function Dashboard() {
  return <DashboardPage />;
}
