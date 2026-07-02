'use client';

/**
 * Dashboard report detail / management page. Shows the fixed report's definition + lifecycle, then
 * the nested management surfaces that the backend exposes per-report: Metrics (CRUD), Datasets
 * (imported records), and a read-only public Preview. Everything is backend-driven — no metric is
 * computed, no chart is derived, no value is aggregated client-side (codex §13).
 */

import { PageHeader } from '@/components/layout/page-header';
import { Badge } from '@/components/ui/badge';
import { StatusBadge, HighlightBadge } from '@/components/ui/status-badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Skeleton } from '@/components/feedback/skeleton';
import { ErrorState } from '@/components/feedback/error-state';
import { useCrudDetail } from '@/hooks/crud';
import { ROUTES } from '@/constants/routes';
import { REPORTS_RESOURCE } from './api';
import type { ReportDetail } from './types';
import { ReportLifecycleActions } from './components/report-lifecycle-actions';
import { MetricsManager } from './components/metrics-manager';
import { DatasetsPanel } from './components/datasets-panel';
import { ReportPreview } from './components/report-preview';

export function ReportDetailPage({ id }: { id: string }) {
  const detail = useCrudDetail<ReportDetail>(REPORTS_RESOURCE, id);
  const report = detail.data;

  if (detail.isLoading) return <DetailSkeleton />;
  if (detail.isError || !report) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Report"
          breadcrumbs={[
            { label: 'Dashboard', href: ROUTES.dashboard },
            { label: 'Reports', href: ROUTES.dashboardReports },
            { label: 'Detail' },
          ]}
        />
        <ErrorState error={detail.error} onRetry={() => void detail.refetch()} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={report.title_en}
        description={report.description_en ?? undefined}
        breadcrumbs={[
          { label: 'Dashboard', href: ROUTES.dashboard },
          { label: 'Reports', href: ROUTES.dashboardReports },
          { label: report.title_en },
        ]}
        actions={<ReportLifecycleActions report={report} />}
      />

      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge state={report.publication_state} />
        <code className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
          {report.report_key}
        </code>
        {report.is_active ? <Badge tone="success">Active</Badge> : <Badge tone="muted">Inactive</Badge>}
        {report.highlight_type ? <HighlightBadge highlight={report.highlight_type} /> : null}
        {report.show_on_homepage ? <Badge tone="info">Homepage KPI</Badge> : null}
        {!report.public_visibility ? <Badge tone="warning">Not public</Badge> : null}
      </div>

      <Tabs defaultValue="metrics">
        <TabsList>
          <TabsTrigger value="metrics">Metrics</TabsTrigger>
          <TabsTrigger value="datasets">Datasets</TabsTrigger>
          <TabsTrigger value="preview">Public preview</TabsTrigger>
        </TabsList>
        <TabsContent value="metrics">
          <MetricsManager reportId={report.id} />
        </TabsContent>
        <TabsContent value="datasets">
          <DatasetsPanel reportId={report.id} />
        </TabsContent>
        <TabsContent value="preview">
          <ReportPreview reportKey={report.report_key} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-9 w-72" />
      <div className="flex gap-2">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-6 w-24" />
      </div>
      <Skeleton className="h-10 w-72" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}
