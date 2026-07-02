'use client';

import type { DashboardReport, DashboardMetric } from '@/lib/types/content';
import { useLanguage } from '@/providers/language-provider';
import { pickText } from '@/utils/bilingual';
import { formatNumber } from '@/utils/format';

/**
 * Headline KPI strip fed by `/public/dashboard/kpis`. Metrics are resolved by the
 * backend (source of truth) — the website never calculates figures, it only
 * renders `value`/`value_text` + unit.
 */
export function KpiStrip({ reports }: { reports: DashboardReport[] }) {
  const metrics = reports.flatMap((r) => r.metrics);
  if (metrics.length === 0) return null;

  return (
    <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
      {metrics.slice(0, 6).map((metric) => (
        <KpiCard key={`${metric.metric_key}-${metric.label_en}`} metric={metric} />
      ))}
    </ul>
  );
}

function KpiCard({ metric }: { metric: DashboardMetric }) {
  const { language } = useLanguage();
  const label = pickText(metric.label_en, metric.label_hi, language);
  const value = metric.value != null ? formatNumber(metric.value, language) : metric.value_text ?? '—';

  return (
    <li className="rounded-lg border border-border bg-surface p-4 text-center">
      <p className="text-2xl font-extrabold text-primary">{value}</p>
      {metric.unit && <p className="text-xs font-medium text-muted-foreground">{metric.unit}</p>}
      <p className="mt-1 text-xs text-muted-foreground">{label}</p>
    </li>
  );
}
