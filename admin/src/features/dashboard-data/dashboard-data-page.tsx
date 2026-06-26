'use client';

/**
 * Dashboard Data page (Engagement & Data). Manages the DATA behind the fixed dashboard reports:
 * pick a report, view its datasets (imports) with an upload action, and review the resolved metrics.
 * Reads are open to every CMS role; dataset upload is gated by `dashboard.manage_data` (via <Can>)
 * and enforced by the backend. Reuses the report catalog hook and shared DataTable/feedback/UI.
 */

import { useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { BarChart3, Upload } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardHeader, CardContent } from '@/components/layout/card';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/data-table';
import { EmptyState } from '@/components/feedback/empty-state';
import { ErrorState } from '@/components/feedback/error-state';
import { Skeleton } from '@/components/feedback/skeleton';
import { Can } from '@/components/auth';
import { useDashboardReports } from '@/features/dashboard';
import { useToast } from '@/hooks/use-toast';
import { errorMessage } from '@/lib/api/server-errors';
import type { ColumnDef } from '@/types/table';
import { formatDateTime } from '@/utils/date';
import { PAGE_SIZE_MAX } from '@/constants/app';
import { DASHBOARD_DATA_PERMS, listDatasets, listMetrics, uploadDataset } from './api';
import type { Dataset, Metric } from './types';

export function DashboardDataPage() {
  const reports = useDashboardReports({ page_size: PAGE_SIZE_MAX, ordering: 'display_order' });
  const reportItems = reports.data?.items ?? [];
  const [reportId, setReportId] = useState<string>('');

  // Default to the first report once the catalog loads.
  const activeReportId = reportId || reportItems[0]?.id || '';

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard Data"
        description="Import datasets and review the metrics that power the public dashboard reports."
      />

      {reports.isLoading ? (
        <Skeleton className="h-10 w-72" />
      ) : reports.isError ? (
        <ErrorState error={reports.error} onRetry={() => void reports.refetch()} />
      ) : reportItems.length === 0 ? (
        <EmptyState icon={BarChart3} title="No reports" description="No dashboard reports are configured." />
      ) : (
        <>
          <div className="max-w-md space-y-1">
            <Label htmlFor="report-select">Report</Label>
            <Select
              id="report-select"
              value={activeReportId}
              onChange={(e) => setReportId(e.target.value)}
              options={reportItems.map((r) => ({ value: r.id, label: r.title_en }))}
            />
          </div>

          {activeReportId ? (
            <>
              <DatasetsPanel reportId={activeReportId} />
              <MetricsPanel reportId={activeReportId} />
            </>
          ) : null}
        </>
      )}
    </div>
  );
}

function DatasetsPanel({ reportId }: { reportId: string }) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const queryKey = ['dashboard-data', 'datasets', reportId];
  const datasets = useQuery({ queryKey, queryFn: () => listDatasets(reportId, { page_size: PAGE_SIZE_MAX }) });

  async function onFile(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    try {
      await uploadDataset(reportId, file);
      await queryClient.invalidateQueries({ queryKey: ['dashboard-data', 'datasets', reportId] });
      await queryClient.invalidateQueries({ queryKey: ['dashboard-data', 'metrics', reportId] });
      toast.success('Dataset uploaded.');
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  const columns = useMemo<ColumnDef<Dataset>[]>(
    () => [
      { id: 'source', header: 'Source', cell: (d) => <span className="text-foreground">{d.source}</span> },
      {
        id: 'status',
        header: 'Status',
        align: 'center',
        cell: (d) => <Badge tone={d.status === 'processed' ? 'success' : d.status === 'failed' ? 'danger' : 'warning'}>{d.status}</Badge>,
      },
      { id: 'row_count', header: 'Rows', align: 'center', cell: (d) => <span className="text-muted-foreground">{d.row_count}</span> },
      { id: 'period', header: 'Period', cell: (d) => <span className="text-muted-foreground">{d.reporting_period?.label ?? d.financial_year?.label ?? '—'}</span> },
      { id: 'file', header: 'File', cell: (d) => (d.source_file ? <span className="text-muted-foreground">{d.source_file.file_name}</span> : <span className="text-muted-foreground">—</span>) },
      { id: 'created_at', header: 'Imported', cell: (d) => <span className="text-muted-foreground" title={d.created_at}>{formatDateTime(d.created_at)}</span> },
    ],
    [],
  );

  return (
    <Card>
      <CardHeader
        title="Datasets"
        actions={
          <Can permission={DASHBOARD_DATA_PERMS.manageData}>
            <input
              ref={inputRef}
              type="file"
              accept=".csv,.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
              className="hidden"
              onChange={(e) => void onFile(e.target.files?.[0])}
            />
            <Button size="sm" leftIcon={<Upload className="h-4 w-4" />} isLoading={uploading} onClick={() => inputRef.current?.click()}>
              Upload dataset
            </Button>
          </Can>
        }
      />
      <CardContent className="p-0">
        <DataTable<Dataset>
          columns={columns}
          data={{
            rows: datasets.data?.items ?? [],
            totalItems: datasets.data?.pagination.total_items ?? 0,
            totalPages: datasets.data?.pagination.total_pages ?? 0,
            isLoading: datasets.isLoading,
            isError: datasets.isError,
            error: datasets.error,
          }}
          getRowId={(d) => d.id}
          onRetry={() => void datasets.refetch()}
          emptyState={<EmptyState icon={Upload} title="No datasets" description="Upload a CSV/XLSX to import data for this report." />}
        />
      </CardContent>
    </Card>
  );
}

function MetricsPanel({ reportId }: { reportId: string }) {
  const queryKey = ['dashboard-data', 'metrics', reportId];
  const metrics = useQuery({ queryKey, queryFn: () => listMetrics(reportId, { page_size: PAGE_SIZE_MAX }) });

  const columns = useMemo<ColumnDef<Metric>[]>(
    () => [
      { id: 'label', header: 'Metric', cell: (m) => <span className="font-medium text-foreground">{m.label_en}</span> },
      { id: 'key', header: 'Key', defaultHidden: true, cell: (m) => <span className="text-muted-foreground">{m.metric_key}</span> },
      {
        id: 'value',
        header: 'Value',
        align: 'right',
        cell: (m) => (
          <span className="text-foreground">
            {m.value_text ?? (m.value != null ? m.value.toLocaleString() : '—')}
            {m.unit ? <span className="ml-1 text-xs text-muted-foreground">{m.unit}</span> : null}
          </span>
        ),
      },
      { id: 'source', header: 'Source', cell: (m) => <span className="text-muted-foreground">{m.source}</span> },
    ],
    [],
  );

  return (
    <Card>
      <CardHeader title="Metrics" />
      <CardContent className="p-0">
        <DataTable<Metric>
          columns={columns}
          data={{
            rows: metrics.data?.items ?? [],
            totalItems: metrics.data?.pagination.total_items ?? 0,
            totalPages: metrics.data?.pagination.total_pages ?? 0,
            isLoading: metrics.isLoading,
            isError: metrics.isError,
            error: metrics.error,
          }}
          getRowId={(m) => m.id}
          onRetry={() => void metrics.refetch()}
          emptyState={<EmptyState icon={BarChart3} title="No metrics" description="Metrics appear here once a dataset is imported or metrics are defined." />}
        />
      </CardContent>
    </Card>
  );
}
