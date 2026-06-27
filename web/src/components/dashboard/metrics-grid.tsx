'use client';

/**
 * Renders a fixed report's resolved metrics as KPI tiles. The backend is the source
 * of truth for every figure (codex §13) — the website only renders `value`/
 * `value_text` + unit, never calculates.
 */

import type { DashboardMetric } from '@/lib/types/content';
import { useLanguage } from '@/providers/language-provider';
import { pickText } from '@/utils/bilingual';
import { formatNumber } from '@/utils/format';

export function MetricsGrid({ metrics }: { metrics: DashboardMetric[] }) {
  const { language } = useLanguage();
  if (metrics.length === 0) return null;

  return (
    <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {metrics.map((metric) => {
        const label = pickText(metric.label_en, metric.label_hi, language);
        const value = metric.value != null ? formatNumber(metric.value, language) : metric.value_text ?? '—';
        return (
          <li key={`${metric.metric_key}-${metric.label_en}`} className="rounded-lg border border-border bg-surface p-4">
            <p className="text-2xl font-extrabold text-primary">{value}</p>
            {metric.unit && <p className="text-xs font-medium text-muted-foreground">{metric.unit}</p>}
            <p className="mt-1 text-sm text-muted-foreground">{label}</p>
            {metric.reporting_period && (
              <p className="mt-1 text-xs text-muted-foreground/80">
                {pickText(metric.reporting_period.name_en, metric.reporting_period.name_hi, language)}
              </p>
            )}
          </li>
        );
      })}
    </ul>
  );
}
