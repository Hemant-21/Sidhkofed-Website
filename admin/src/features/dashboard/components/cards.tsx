'use client';

/**
 * Reusable Admin Dashboard card primitives (Phase 15.2). These are the fixed,
 * non-configurable widgets the dashboard is built from — Statistic, Status, List,
 * Information, and Warning cards. They compose the shared layout/feedback
 * components (Card, Skeleton, ErrorState, Badge) so the dashboard adds no new
 * design system. Every one is accessible and renders loading/error gracefully.
 */

import type { LucideIcon } from 'lucide-react';
import { AlertTriangle, Info } from 'lucide-react';
import type { ReactNode } from 'react';
import { Card, CardContent } from '@/components/layout';
import { Skeleton } from '@/components/feedback/skeleton';
import { ErrorState } from '@/components/feedback/error-state';
import { Badge, type BadgeProps } from '@/components/ui/badge';
import { cn } from '@/utils/cn';

/**
 * Statistic (KPI) card: an icon, a label, a backend-provided value, and optional
 * unit/hint. The value is ALWAYS supplied by the backend — this card never
 * computes one. Handles its own loading/error so a KPI grid degrades per-card.
 */
export interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: ReactNode;
  unit?: string | null;
  hint?: ReactNode;
  isLoading?: boolean;
  error?: unknown;
  onRetry?: () => void;
}

export function StatCard({ icon: Icon, label, value, unit, hint, isLoading, error, onRetry }: StatCardProps) {
  return (
    <Card>
      <CardContent className="flex items-start gap-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
          {isLoading ? (
            <Skeleton className="mt-1 h-7 w-20" />
          ) : error ? (
            <button
              type="button"
              onClick={onRetry}
              className="mt-1 text-sm text-danger underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Unavailable — retry
            </button>
          ) : (
            <p className="mt-0.5 flex items-baseline gap-1">
              <span className="text-2xl font-semibold tabular-nums text-foreground">{value}</span>
              {unit ? <span className="text-sm text-muted-foreground">{unit}</span> : null}
            </p>
          )}
          {hint && !isLoading && !error ? (
            <p className="mt-0.5 truncate text-xs text-muted-foreground">{hint}</p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Card with a titled header + body — the base for Status/List/Activity cards. The
 * header carries optional actions (e.g. a manual Refresh button) and an inline
 * loading indicator.
 */
export interface DashboardCardProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  actions?: ReactNode;
  /** Show an inline error panel with retry instead of the body. */
  error?: unknown;
  onRetry?: () => void;
  children: ReactNode;
  className?: string;
}

export function DashboardCard({
  title,
  description,
  icon: Icon,
  actions,
  error,
  onRetry,
  children,
  className,
}: DashboardCardProps) {
  return (
    <Card className={cn('flex flex-col', className)}>
      <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
        <div className="flex min-w-0 items-center gap-2">
          {Icon ? <Icon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" /> : null}
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold text-foreground">{title}</h3>
            {description ? <p className="truncate text-xs text-muted-foreground">{description}</p> : null}
          </div>
        </div>
        {actions ? <div className="flex shrink-0 items-center gap-1">{actions}</div> : null}
      </div>
      <div className="flex-1 p-5">
        {error ? <ErrorState error={error} onRetry={onRetry} /> : children}
      </div>
    </Card>
  );
}

/** A single labelled status row (e.g. "Published reports — 8"). Status conveyed by text + badge. */
export function StatusRow({
  label,
  value,
  tone = 'default',
  description,
}: {
  label: string;
  value: ReactNode;
  tone?: BadgeProps['tone'];
  description?: string;
}) {
  return (
    <li className="flex items-center justify-between gap-3 py-2">
      <div className="min-w-0">
        <p className="truncate text-sm text-foreground">{label}</p>
        {description ? <p className="truncate text-xs text-muted-foreground">{description}</p> : null}
      </div>
      <Badge tone={tone} dot>
        {value}
      </Badge>
    </li>
  );
}

/** Informational note card — a neutral framing for context (not an error). */
export function InfoCard({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <div className="flex gap-3 rounded-lg border border-info/30 bg-info/5 px-4 py-3 text-sm">
      <Info className="mt-0.5 h-4 w-4 shrink-0 text-info" aria-hidden="true" />
      <div className="min-w-0">
        {title ? <p className="font-medium text-foreground">{title}</p> : null}
        <div className="text-muted-foreground">{children}</div>
      </div>
    </div>
  );
}

/** Warning note card — draws attention to something the admin may need to act on. */
export function WarningCard({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <div role="status" className="flex gap-3 rounded-lg border border-warning/30 bg-warning/5 px-4 py-3 text-sm">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
      <div className="min-w-0">
        {title ? <p className="font-medium text-foreground">{title}</p> : null}
        <div className="text-muted-foreground">{children}</div>
      </div>
    </div>
  );
}
