'use client';

/**
 * KPI sections (Phase 15.2). Two fixed, non-configurable KPI grids:
 *
 *  1. ContentKpiGrid  — per-module record totals. Each total is the BACKEND's
 *     `pagination.total_items` for that resource (the server's count, requested
 *     with page_size=1); the frontend never tallies records itself.
 *  2. HeadlineKpiGrid — the resolved public dashboard figures (`/public/dashboard/kpis`),
 *     the same homepage-safe metrics the website shows. Values come fully resolved
 *     from the backend.
 */

import {
  CalendarDays,
  FileText,
  BookOpen,
  Building2,
  Megaphone,
  Gavel,
  BadgeCheck,
  BarChart3,
  type LucideIcon,
} from 'lucide-react';
import { GridLayout } from '@/components/layout';
import { EmptyState } from '@/components/feedback/empty-state';
import { formatNumber } from '@/utils/format';
import type { DashboardPeriodFilters } from '@/types/dashboard';
import { useContentCounts, useDashboardKpis, type ContentCountSpec } from '../hooks';
import { StatCard } from './cards';

/** Fixed per-module KPI descriptors. Each maps to one admin resource total. */
interface ContentKpi extends ContentCountSpec {
  label: string;
  icon: LucideIcon;
}

const CONTENT_KPIS: ContentKpi[] = [
  { key: 'events', resource: 'events', label: 'Events', icon: CalendarDays },
  { key: 'documents', resource: 'documents', label: 'Documents', icon: FileText },
  { key: 'programmes', resource: 'programmes', label: 'Programmes', icon: BookOpen },
  { key: 'institutions', resource: 'institutions', label: 'Institutions', icon: Building2 },
  {
    key: 'communications',
    resource: 'official-communications',
    label: 'Communications',
    icon: Megaphone,
  },
  { key: 'tenders', resource: 'tenders', label: 'Tenders', icon: Gavel },
  { key: 'memberships', resource: 'memberships', label: 'Memberships', icon: BadgeCheck },
];

/** Per-module content totals. Every card resolves its own loading/error/retry. */
export function ContentKpiGrid() {
  const results = useContentCounts(CONTENT_KPIS);
  return (
    <GridLayout columns={4}>
      {CONTENT_KPIS.map((kpi, i) => {
        const q = results[i];
        return (
          <StatCard
            key={kpi.key}
            icon={kpi.icon}
            label={kpi.label}
            value={formatNumber(q?.data ?? 0)}
            isLoading={q?.isLoading}
            error={q?.error}
            onRetry={() => q?.refetch()}
          />
        );
      })}
    </GridLayout>
  );
}

/** Headline figures from the public dashboard KPI subset (resolved by the backend). */
export function HeadlineKpiGrid({ period }: { period?: DashboardPeriodFilters }) {
  const { data, isLoading, error, refetch } = useDashboardKpis(period);

  // Flatten every resolved metric across the homepage-flagged reports into KPI cards.
  const metrics = (data?.kpis ?? []).flatMap((report) =>
    report.metrics.map((m) => ({ report, metric: m })),
  );

  if (isLoading) {
    return (
      <GridLayout columns={3}>
        {Array.from({ length: 3 }).map((_, i) => (
          <StatCard key={i} icon={BarChart3} label="Loading" value="—" isLoading />
        ))}
      </GridLayout>
    );
  }

  if (error) {
    return (
      <StatCard
        icon={BarChart3}
        label="Headline figures"
        value="—"
        error={error}
        onRetry={() => refetch()}
      />
    );
  }

  if (metrics.length === 0) {
    return (
      <EmptyState
        icon={BarChart3}
        title="No published headline figures"
        description="Headline KPIs appear here once dashboard reports are published with homepage metrics."
      />
    );
  }

  return (
    <GridLayout columns={3}>
      {metrics.map(({ report, metric }) => (
        <StatCard
          key={`${report.report_key}:${metric.metric_key}`}
          icon={BarChart3}
          label={metric.label_en}
          value={metric.value_text ?? formatNumber(metric.value)}
          unit={metric.unit}
          hint={report.title_en}
        />
      ))}
    </GridLayout>
  );
}
