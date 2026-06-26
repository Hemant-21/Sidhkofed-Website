'use client';

/**
 * Public report preview (read-only). Shows the fixed report exactly as the public site resolves it
 * (`GET /public/dashboard/{report_key}`): backend-resolved metrics + the fixed layout descriptor.
 * The dashboard is NOT a builder — the frontend renders ONLY the data the backend supplies. It
 * never derives a chart dataset, computes a KPI, or aggregates a value (codex §13). Metrics are
 * displayed as resolved figures; the layout descriptor is shown verbatim for transparency.
 *
 * A period selector (financial year / reporting period) re-queries the same backend endpoint with
 * the allow-listed `financial_year` / `reporting_period` filters — the backend resolves the figures.
 */

import { useState } from 'react';
import { BarChart3, Eye } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/layout/card';
import { Select } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/feedback/empty-state';
import { ErrorState } from '@/components/feedback/error-state';
import { SkeletonText } from '@/components/feedback/skeleton';
import { useFinancialYearOptions, useReportingPeriodOptions } from '@/components/relationships';
import { formatNumber } from '@/utils/format';
import { useReportPreview } from '../api';
import type { PublicMetric } from '../types';

export function ReportPreview({ reportKey }: { reportKey: string }) {
  const [financialYearId, setFinancialYearId] = useState('');
  const [reportingPeriodId, setReportingPeriodId] = useState('');
  const financialYears = useFinancialYearOptions();
  const reportingPeriods = useReportingPeriodOptions();

  const period = {
    financial_year: financialYearId || undefined,
    reporting_period: reportingPeriodId || undefined,
  };
  const preview = useReportPreview(reportKey, period);

  return (
    <Card>
      <CardHeader
        title="Public preview"
        description="The report as the public site renders it — backend-resolved metrics only."
        actions={<Eye className="h-4 w-4 text-muted-foreground" aria-hidden="true" />}
      />
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="preview-fy">Financial year</Label>
            <Select
              id="preview-fy"
              value={financialYearId}
              onChange={(e) => setFinancialYearId(e.target.value)}
              options={[{ value: '', label: 'Default' }, ...financialYears.options]}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="preview-rp">Reporting period</Label>
            <Select
              id="preview-rp"
              value={reportingPeriodId}
              onChange={(e) => setReportingPeriodId(e.target.value)}
              options={[{ value: '', label: 'Default' }, ...reportingPeriods.options]}
            />
          </div>
        </div>

        {preview.isLoading ? (
          <SkeletonText lines={4} />
        ) : preview.isError ? (
          <ErrorState
            error={preview.error}
            title="This report is not published publicly yet, or the preview is unavailable."
            onRetry={() => void preview.refetch()}
          />
        ) : !preview.data ? (
          <EmptyState icon={BarChart3} title="No public preview" />
        ) : preview.data.metrics.length === 0 ? (
          <EmptyState
            icon={BarChart3}
            title="No metrics resolved"
            description="No metrics match the selected period."
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {preview.data.metrics.map((m: PublicMetric) => (
              <div key={m.metric_key} className="rounded-lg border border-border p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {m.label_en}
                </p>
                <p className="mt-1 text-2xl font-semibold text-foreground">
                  {m.value != null ? formatNumber(m.value) : (m.value_text ?? '—')}
                  {m.unit ? <span className="ml-1 text-sm text-muted-foreground">{m.unit}</span> : null}
                </p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {m.financial_year ? <Badge tone="muted">FY {m.financial_year.label}</Badge> : null}
                  {m.reporting_period ? <Badge tone="muted">{m.reporting_period.name_en}</Badge> : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
