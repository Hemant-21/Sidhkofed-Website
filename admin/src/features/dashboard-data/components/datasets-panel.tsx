'use client';

/**
 * Datasets panel (shown on the report detail). Lists the report's imported datasets — source,
 * processing status, row count, financial year / reporting period — and links each to its detail.
 * Datasets are immutable import records (no edit/archive in the backend); the panel is read-only plus
 * a link to the Excel Import surface for this report. Gated reads for all CMS roles.
 */

import { useMemo } from 'react';
import Link from 'next/link';
import { Upload, Database } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/layout/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Pagination } from '@/components/ui/pagination';
import { EmptyState } from '@/components/feedback/empty-state';
import { ErrorState } from '@/components/feedback/error-state';
import { SkeletonText } from '@/components/feedback/skeleton';
import { Can } from '@/components/auth';
import { usePagination } from '@/hooks/use-pagination';
import { formatNumber } from '@/utils/format';
import { formatDateTime } from '@/utils/date';
import { ROUTES } from '@/constants/routes';
import { useReportDatasets, DASHBOARD_PERMS } from '../api';
import {
  DATASET_SOURCE_LABEL,
  DATASET_STATUS_LABEL,
  type Dataset,
  type DatasetStatus,
} from '../types';

const STATUS_TONE: Record<DatasetStatus, 'success' | 'warning' | 'danger'> = {
  processed: 'success',
  pending: 'warning',
  failed: 'danger',
};

export function DatasetsPanel({ reportId }: { reportId: string }) {
  const { page, setPage } = usePagination();
  const query = useMemo(() => ({ page, page_size: 20, ordering: '-created_at' }), [page]);
  const list = useReportDatasets(reportId, query);

  const datasets = list.data?.items ?? [];
  const pagination = list.data?.pagination;

  return (
    <Card>
      <CardHeader
        title="Datasets"
        description="Imported summary data. Each processed dataset creates or refreshes this report's metrics."
        actions={
          <Can permission={DASHBOARD_PERMS.manageData}>
            <Button
              asChild
              size="sm"
              variant="outline"
              leftIcon={<Upload className="h-4 w-4" />}
            >
              <Link href={`${ROUTES.dashboardImport}?report=${reportId}`}>Import data</Link>
            </Button>
          </Can>
        }
      />
      <CardContent className="p-0">
        {list.isError ? (
          <div className="p-6">
            <ErrorState error={list.error} onRetry={() => void list.refetch()} />
          </div>
        ) : list.isLoading ? (
          <div className="p-6">
            <SkeletonText lines={4} />
          </div>
        ) : datasets.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={Database}
              title="No datasets yet"
              description="Import a CSV/XLSX to populate this report's metrics."
              action={
                <Can permission={DASHBOARD_PERMS.manageData}>
                  <Button asChild size="sm">
                    <Link href={`${ROUTES.dashboardImport}?report=${reportId}`}>Import data</Link>
                  </Button>
                </Can>
              }
            />
          </div>
        ) : (
          <ul className="divide-y divide-border" aria-label="Report datasets">
            {datasets.map((d: Dataset) => (
              <li key={d.id} className="flex items-center gap-3 px-5 py-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`${ROUTES.dashboardDatasets}/${d.id}`}
                      className="font-medium text-foreground hover:text-primary hover:underline"
                    >
                      {DATASET_SOURCE_LABEL[d.source]} · {formatNumber(d.row_count)} row(s)
                    </Link>
                    <Badge tone={STATUS_TONE[d.status]}>{DATASET_STATUS_LABEL[d.status]}</Badge>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {d.financial_year ? <>FY {d.financial_year.label} · </> : null}
                    {d.reporting_period ? <>{d.reporting_period.name_en} · </> : null}
                    {d.processed_at
                      ? `Processed ${formatDateTime(d.processed_at)}`
                      : `Created ${formatDateTime(d.created_at)}`}
                  </p>
                </div>
                <Button asChild variant="ghost" size="sm">
                  <Link href={`${ROUTES.dashboardDatasets}/${d.id}`}>View</Link>
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>

      {pagination && pagination.total_pages > 1 ? (
        <div className="border-t border-border p-3">
          <Pagination
            page={pagination.page}
            pageSize={pagination.page_size}
            totalItems={pagination.total_items}
            totalPages={pagination.total_pages}
            onPageChange={setPage}
          />
        </div>
      ) : null}
    </Card>
  );
}
