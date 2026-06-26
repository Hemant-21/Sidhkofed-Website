'use client';

/**
 * Metrics manager (shown on the report detail). Lists the report's metrics (server-paginated) and
 * provides add / edit / delete — every operation a backend call. Values are displayed exactly as the
 * backend resolved them; nothing is computed or aggregated here. Gated by `dashboard.manage_data`.
 */

import { useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, Gauge } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/layout/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Pagination } from '@/components/ui/pagination';
import { EmptyState } from '@/components/feedback/empty-state';
import { ErrorState } from '@/components/feedback/error-state';
import { SkeletonText } from '@/components/feedback/skeleton';
import { Can } from '@/components/auth';
import { useConfirmDialog } from '@/hooks/use-confirm-dialog';
import { usePagination } from '@/hooks/use-pagination';
import { formatNumber } from '@/utils/format';
import { useReportMetrics, useDeleteMetric, DASHBOARD_PERMS } from '../api';
import { DATASET_SOURCE_LABEL, type Metric } from '../types';
import { MetricDialog } from './metric-dialog';

export function MetricsManager({ reportId }: { reportId: string }) {
  const confirm = useConfirmDialog();
  const { page, setPage } = usePagination();
  const query = useMemo(() => ({ page, page_size: 20, ordering: 'display_order' }), [page]);
  const list = useReportMetrics(reportId, query);
  const remove = useDeleteMetric(reportId);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Metric | undefined>(undefined);

  const openAdd = () => {
    setEditing(undefined);
    setDialogOpen(true);
  };
  const openEdit = (metric: Metric) => {
    setEditing(metric);
    setDialogOpen(true);
  };

  const onDelete = async (metric: Metric) => {
    if (await confirm.confirmDelete(`the metric "${metric.label_en}"`)) {
      remove.mutate(metric.id);
    }
  };

  const metrics = list.data?.items ?? [];
  const pagination = list.data?.pagination;

  const renderValue = (m: Metric) => {
    if (m.value != null) {
      return (
        <span className="font-medium text-foreground">
          {formatNumber(m.value)}
          {m.unit ? <span className="ml-1 text-xs text-muted-foreground">{m.unit}</span> : null}
        </span>
      );
    }
    if (m.value_text != null) return <span className="font-medium text-foreground">{m.value_text}</span>;
    return <span className="text-muted-foreground">—</span>;
  };

  return (
    <Card>
      <CardHeader
        title="Metrics"
        description="Backend-authored figures for this report. Membership reports (#10–#13) read membership counts for the selected period."
        actions={
          <Can permission={DASHBOARD_PERMS.manageData}>
            <Button size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={openAdd}>
              Add metric
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
            <SkeletonText lines={5} />
          </div>
        ) : metrics.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={Gauge}
              title="No metrics yet"
              description="Add a metric, or import a dataset to populate metrics in bulk."
              action={
                <Can permission={DASHBOARD_PERMS.manageData}>
                  <Button size="sm" onClick={openAdd}>
                    Add metric
                  </Button>
                </Can>
              }
            />
          </div>
        ) : (
          <ul className="divide-y divide-border" aria-label="Report metrics">
            {metrics.map((m) => (
              <li key={m.id} className="flex items-center gap-3 px-5 py-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-foreground">{m.label_en}</span>
                    <code className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                      {m.metric_key}
                    </code>
                    <Badge tone="muted">{DATASET_SOURCE_LABEL[m.source]}</Badge>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {m.financial_year ? <>FY {m.financial_year.label} · </> : null}
                    {m.reporting_period ? <>{m.reporting_period.name_en} · </> : null}
                    Order: {m.display_order}
                  </p>
                </div>

                <div className="shrink-0 text-right text-sm">{renderValue(m)}</div>

                <div className="flex shrink-0 items-center gap-1">
                  <Can permission={DASHBOARD_PERMS.manageData}>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEdit(m)}
                      aria-label={`Edit ${m.label_en}`}
                    >
                      <Pencil className="h-4 w-4" aria-hidden="true" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => void onDelete(m)}
                      aria-label={`Delete ${m.label_en}`}
                      isLoading={remove.isPending && remove.variables === m.id}
                    >
                      <Trash2 className="h-4 w-4 text-danger" aria-hidden="true" />
                    </Button>
                  </Can>
                </div>
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

      <MetricDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        reportId={reportId}
        metric={editing}
      />
    </Card>
  );
}
