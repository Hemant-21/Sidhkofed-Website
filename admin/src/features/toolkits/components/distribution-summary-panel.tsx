'use client';

/**
 * Read-only toolkit distribution summary. Renders the backend-computed AGGREGATE returned by
 * `GET /public/toolkits/{slug}/distribution-summary` (totals calculated server-side — never in the
 * frontend; codex §4.3). Per-event distribution figures are authored under the Events module; this
 * surface only displays the published toolkit-level rollup: participants covered, distribution-model
 * breakdown, and per-item totals.
 *
 * The public aggregate exists only for a published toolkit, so an unpublished/empty toolkit shows an
 * informational empty state rather than an error.
 */

import { BarChart3, Users, CalendarRange } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/layout/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/feedback/skeleton';
import { EmptyState } from '@/components/feedback/empty-state';
import { ApiError } from '@/lib/api/errors';
import { formatNumber } from '@/utils/format';
import { useToolkitDistributionSummary } from '../api';

/** A 404 from the public aggregate just means "nothing distributed yet" — not a hard error. */
const isNotFound = (error: unknown): boolean =>
  error instanceof ApiError && (error.status === 404 || error.code === 'not_found');

export function DistributionSummaryPanel({
  slug,
  isPublished,
}: {
  slug: string | undefined;
  isPublished: boolean;
}) {
  const query = useToolkitDistributionSummary(isPublished ? slug : undefined);

  if (!isPublished) {
    return (
      <Card>
        <CardHeader title="Distribution summary" description="Aggregated per-event figures, calculated by the backend." />
        <CardContent>
          <EmptyState
            icon={BarChart3}
            title="Available after publishing"
            description="The distribution summary aggregates published per-event distribution figures. Publish the toolkit to surface its rollup."
          />
        </CardContent>
      </Card>
    );
  }

  if (query.isLoading) {
    return (
      <Card>
        <CardHeader title="Distribution summary" />
        <CardContent className="space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-40 w-full" />
        </CardContent>
      </Card>
    );
  }

  // A published toolkit with no recorded distributions yields a 404 on the aggregate endpoint, or an
  // empty rollup — both are an honest "nothing distributed yet" state, not an error to retry.
  if (query.isError && !isNotFound(query.error)) {
    return (
      <Card>
        <CardHeader title="Distribution summary" />
        <CardContent>
          <EmptyState icon={BarChart3} title="Summary unavailable" description="The distribution summary could not be loaded right now." />
        </CardContent>
      </Card>
    );
  }

  const data = query.data;
  const hasData = data && (data.events_count > 0 || data.items.length > 0);

  if (!hasData) {
    return (
      <Card>
        <CardHeader title="Distribution summary" description="Aggregated per-event figures, calculated by the backend." />
        <CardContent>
          <EmptyState
            icon={BarChart3}
            title="No distributions recorded yet"
            description="Per-event toolkit distributions are recorded from the Events module. Once recorded, the totals roll up here."
          />
        </CardContent>
      </Card>
    );
  }

  const breakdown = Object.entries(data.distribution_model_breakdown);

  return (
    <Card>
      <CardHeader title="Distribution summary" description="Aggregated per-event figures, calculated by the backend (read-only)." />
      <CardContent className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-3">
          <Stat icon={CalendarRange} label="Events" value={formatNumber(data.events_count)} />
          <Stat icon={Users} label="Participants covered" value={formatNumber(data.total_participants_covered)} />
          <Stat icon={BarChart3} label="Total quantity" value={formatNumber(data.total_quantity)} />
        </div>

        {breakdown.length > 0 ? (
          <div>
            <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">Distribution model</p>
            <div className="flex flex-wrap gap-1.5">
              {breakdown.map(([model, count]) => (
                <Badge key={model} tone="info">
                  {model}: {formatNumber(count)}
                </Badge>
              ))}
            </div>
          </div>
        ) : null}

        {data.items.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <caption className="sr-only">Per-item distribution totals</caption>
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th scope="col" className="py-2 pr-3 font-medium">Item</th>
                  <th scope="col" className="py-2 pr-3 font-medium">Unit</th>
                  <th scope="col" className="py-2 pr-3 font-medium">Basis</th>
                  <th scope="col" className="py-2 text-right font-medium">Total quantity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.items.map((item) => (
                  <tr key={item.id}>
                    <td className="py-2 pr-3 text-foreground">{item.name_en}</td>
                    <td className="py-2 pr-3 text-muted-foreground">{item.unit ?? '—'}</td>
                    <td className="py-2 pr-3 text-muted-foreground">{item.distribution_basis}</td>
                    <td className="py-2 text-right tabular-nums text-foreground">
                      {item.total_quantity != null ? formatNumber(item.total_quantity) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function Stat({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border p-3">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4" aria-hidden="true" />
        <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
      </div>
      <p className="mt-1 text-xl font-semibold tabular-nums text-foreground">{value}</p>
    </div>
  );
}
