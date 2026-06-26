'use client';

/**
 * Excel Import page (codex §16 / API spec §6). Imports tabular summary data into a fixed report's
 * metrics. Pick a report, then validate + commit a CSV/XLSX (or pasted rows). All parsing,
 * validation, duplicate detection and the transactional import happen server-side; this page only
 * orchestrates the backend flow and shows its results. Gated by `dashboard.manage_data`.
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { BarChart3 } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent } from '@/components/layout/card';
import { Select } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { EmptyState } from '@/components/feedback/empty-state';
import { ForbiddenState } from '@/components/feedback/forbidden-state';
import { Can } from '@/components/auth';
import { usePermissions } from '@/hooks/use-permissions';
import { useCrudList } from '@/hooks/crud';
import { ROUTES } from '@/constants/routes';
import { REPORTS_RESOURCE, DASHBOARD_PERMS } from './api';
import type { DashboardReportSummary } from './types';
import { DatasetImportForm } from './components/dataset-import-form';
import { DatasetsPanel } from './components/datasets-panel';

export function DashboardImportPage({ reportId }: { reportId?: string }) {
  const router = useRouter();
  const { can } = usePermissions();
  const [selected, setSelected] = useState(reportId ?? '');

  const reports = useCrudList<DashboardReportSummary>(REPORTS_RESOURCE, {
    page: 1,
    page_size: 100,
    ordering: 'display_order',
  });

  const reportOptions = [
    { value: '', label: 'Select a report…' },
    ...(reports.data?.items ?? []).map((r) => ({ value: r.id, label: r.title_en })),
  ];

  const onSelect = (value: string) => {
    setSelected(value);
    // Keep the URL shareable/bookmarkable for a given report.
    const url = value ? `${ROUTES.dashboardImport}?report=${value}` : ROUTES.dashboardImport;
    router.replace(url);
  };

  if (!can(DASHBOARD_PERMS.manageData)) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Excel Import"
          breadcrumbs={[{ label: 'Dashboard', href: ROUTES.dashboard }, { label: 'Import' }]}
        />
        <ForbiddenState />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Excel Import"
        description="Import summary data into a dashboard report's metrics. Validation and import run on the server."
        breadcrumbs={[{ label: 'Dashboard', href: ROUTES.dashboard }, { label: 'Import' }]}
      />

      <Card>
        <CardContent>
          <div className="max-w-md space-y-1">
            <Label htmlFor="import-report">Report</Label>
            <Select
              id="import-report"
              value={selected}
              onChange={(e) => onSelect(e.target.value)}
              options={reportOptions}
              disabled={reports.isLoading}
            />
            <p className="text-xs text-muted-foreground">
              Choose which fixed report to import data into.
            </p>
          </div>
        </CardContent>
      </Card>

      {selected ? (
        <Can permission={DASHBOARD_PERMS.manageData} fallback={<ForbiddenState />}>
          <DatasetImportForm reportId={selected} />
          <DatasetsPanel reportId={selected} />
        </Can>
      ) : (
        <Card>
          <CardContent>
            <EmptyState
              icon={BarChart3}
              title="Select a report to import data"
              description="Imported rows become that report's metrics for the chosen financial year and reporting period."
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
