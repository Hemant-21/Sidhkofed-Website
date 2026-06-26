'use client';

/**
 * Report-scoped shell. The backend exposes metrics and datasets ONLY nested under a report
 * (`/admin/dashboard/reports/{id}/metrics|datasets`) — there is no global metrics/datasets endpoint
 * to invent. So the top-level "Metrics" and "Datasets" surfaces first scope to a report (via a
 * picker synced to `?report=`), then render the report-scoped manager. This keeps the UI faithful to
 * the backend contract while honouring the task's route names.
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { BarChart3 } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent } from '@/components/layout/card';
import { Select } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { EmptyState } from '@/components/feedback/empty-state';
import { useCrudList } from '@/hooks/crud';
import { ROUTES } from '@/constants/routes';
import { REPORTS_RESOURCE } from '../api';
import type { DashboardReportSummary } from '../types';

export interface ReportScopedShellProps {
  title: string;
  description: string;
  /** The list route this shell lives at (for `?report=` URL sync). */
  baseRoute: string;
  /** Initial report id from the URL search params. */
  reportId?: string;
  emptyHint: string;
  children: (reportId: string) => ReactNode;
}

export function ReportScopedShell({
  title,
  description,
  baseRoute,
  reportId,
  emptyHint,
  children,
}: ReportScopedShellProps) {
  const router = useRouter();
  const [selected, setSelected] = useState(reportId ?? '');

  const reports = useCrudList<DashboardReportSummary>(REPORTS_RESOURCE, {
    page: 1,
    page_size: 100,
    ordering: 'display_order',
  });

  const options = [
    { value: '', label: 'Select a report…' },
    ...(reports.data?.items ?? []).map((r) => ({ value: r.id, label: r.title_en })),
  ];

  const onSelect = (value: string) => {
    setSelected(value);
    router.replace(value ? `${baseRoute}?report=${value}` : baseRoute);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={title}
        description={description}
        breadcrumbs={[{ label: 'Dashboard', href: ROUTES.dashboard }, { label: title }]}
      />

      <Card>
        <CardContent>
          <div className="max-w-md space-y-1">
            <Label htmlFor="scoped-report">Report</Label>
            <Select
              id="scoped-report"
              value={selected}
              onChange={(e) => onSelect(e.target.value)}
              options={options}
              disabled={reports.isLoading}
            />
          </div>
        </CardContent>
      </Card>

      {selected ? (
        children(selected)
      ) : (
        <Card>
          <CardContent>
            <EmptyState icon={BarChart3} title="Select a report" description={emptyHint} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
