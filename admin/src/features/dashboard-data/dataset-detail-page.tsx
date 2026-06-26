'use client';

/**
 * Dashboard dataset detail page (`GET /admin/dashboard/datasets/{id}`). A dataset is an immutable
 * import record — source, processing status, row count, financial year / reporting period, optional
 * source file, and timestamps. Read-only (the backend exposes no dataset edit/archive); it links
 * back to its parent report's management surface.
 */

import { ExternalLink } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardHeader } from '@/components/layout/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/feedback/skeleton';
import { ErrorState } from '@/components/feedback/error-state';
import { formatNumber } from '@/utils/format';
import { formatDateTime } from '@/utils/date';
import { ROUTES } from '@/constants/routes';
import { useDataset } from './api';
import {
  DATASET_SOURCE_LABEL,
  DATASET_STATUS_LABEL,
  type Dataset,
  type DatasetStatus,
} from './types';

const STATUS_TONE: Record<DatasetStatus, 'success' | 'warning' | 'danger'> = {
  processed: 'success',
  pending: 'warning',
  failed: 'danger',
};

export function DatasetDetailPage({ id }: { id: string }) {
  const detail = useDataset(id);
  const dataset = detail.data;

  if (detail.isLoading) return <DetailSkeleton />;
  if (detail.isError || !dataset) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Dataset"
          breadcrumbs={[
            { label: 'Dashboard', href: ROUTES.dashboard },
            { label: 'Reports', href: ROUTES.dashboardReports },
            { label: 'Dataset' },
          ]}
        />
        <ErrorState error={detail.error} onRetry={() => void detail.refetch()} />
      </div>
    );
  }

  const d: Dataset = dataset;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dataset"
        description={`${DATASET_SOURCE_LABEL[d.source]} import · ${formatNumber(d.row_count)} row(s)`}
        breadcrumbs={[
          { label: 'Dashboard', href: ROUTES.dashboard },
          { label: 'Reports', href: ROUTES.dashboardReports },
          { label: 'Dataset' },
        ]}
      />

      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={STATUS_TONE[d.status]}>{DATASET_STATUS_LABEL[d.status]}</Badge>
        <Badge tone="muted">{DATASET_SOURCE_LABEL[d.source]}</Badge>
      </div>

      <Card>
        <CardHeader title="Overview" />
        <CardContent>
          <dl className="grid gap-4 sm:grid-cols-2">
            <Item label="Status">{DATASET_STATUS_LABEL[d.status]}</Item>
            <Item label="Source">{DATASET_SOURCE_LABEL[d.source]}</Item>
            <Item label="Rows">{formatNumber(d.row_count)}</Item>
            <Item label="Financial year">{d.financial_year ? d.financial_year.label : '—'}</Item>
            <Item label="Reporting period">
              {d.reporting_period ? d.reporting_period.name_en : '—'}
            </Item>
            <Item label="Processed">
              {d.processed_at ? formatDateTime(d.processed_at) : '—'}
            </Item>
            <Item label="Created">{formatDateTime(d.created_at)}</Item>
            <Item label="Parent report">
              <a
                href={`${ROUTES.dashboardReports}/${d.report_id}`}
                className="text-primary hover:underline"
              >
                Open report
              </a>
            </Item>
          </dl>
        </CardContent>
      </Card>

      {d.source_file ? (
        <Card>
          <CardHeader title="Source file" />
          <CardContent>
            <a
              href={d.source_file.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-primary hover:underline"
            >
              {d.source_file.file_name}
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            </a>
            <p className="mt-1 text-xs text-muted-foreground">{d.source_file.mime_type}</p>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function Item({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm text-foreground">{children}</dd>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-9 w-72" />
      <Skeleton className="h-6 w-40" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}
