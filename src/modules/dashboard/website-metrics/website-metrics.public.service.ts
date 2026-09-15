/**
 * Public Website Metrics service — Stage 3. Exposes ONLY currently-published, enabled,
 * non-archived metrics for an allowed placement (`ALLOWED_PLACEMENTS`), via
 * `website-metrics.repository.ts`'s `listPublishedForPlacement`, which already scopes to
 * `isEnabled && !isArchived && currentSnapshotId != null` and orders by `displayOrder`.
 *
 * Never reuses the admin-scoped `list()` query path. The public DTO is label/value/unit/period/
 * as-of/disclosure ONLY — no id, configRevision, raw resolvedFilters/completeness internals, or
 * publicScopePolicyVersion.
 *
 * Responses are cached under `${WEBSITE_METRICS_PUBLIC_CACHE_PREFIX}:<placement>` — the exact
 * prefix `website-metrics.shared.ts` already clears from `invalidateWebsiteMetricsPublicCache()` on
 * every publish/unpublish/archive/restore, so no extra invalidation wiring is needed here.
 */
import { ValidationError } from '@/shared/errors';
import { cacheService } from '@/services/cache';
import { websiteMetricsRepository as repo, type WebsiteMetricRow } from './website-metrics.repository';
import { ALLOWED_PLACEMENTS, isAllowedPlacement, type PlacementKey } from './website-metrics.types';
import { WEBSITE_METRICS_PUBLIC_CACHE_PREFIX } from './website-metrics.shared';

export interface PublicMetricPeriodDto {
  mode: string;
  start: string | null;
  end: string | null;
}

export interface PublicMetricDto {
  metric_key: string;
  label_en: string;
  label_hi: string | null;
  value: number;
  unit: string | null;
  period: PublicMetricPeriodDto;
  as_of_date: string | null;
  disclosure_note_en: string;
  disclosure_note_hi: string | null;
}

function cacheKey(placement: PlacementKey): string {
  return `${WEBSITE_METRICS_PUBLIC_CACHE_PREFIX}:${placement}`;
}

/** Best-effort extraction of the resolved period's mode/start/end out of the stored snapshot Json. */
function toPeriodDto(resolvedPeriod: unknown): PublicMetricPeriodDto {
  const p = (resolvedPeriod ?? {}) as Record<string, unknown>;
  return {
    mode: typeof p.mode === 'string' ? p.mode : 'unknown',
    start: typeof p.start === 'string' ? p.start : null,
    end: typeof p.end === 'string' ? p.end : null,
  };
}

/**
 * A published metric always has a `currentSnapshot` (the repository query filters on
 * `currentSnapshotId != null`), but the type is nullable from the Prisma include, so this is
 * defensive rather than expected to ever skip a row in practice.
 */
function toPublicDto(row: WebsiteMetricRow): PublicMetricDto | null {
  const snapshot = row.currentSnapshot;
  if (!snapshot) return null;
  return {
    metric_key: row.metricKey,
    label_en: snapshot.labelEn,
    label_hi: snapshot.labelHi,
    value: Number(snapshot.value),
    unit: snapshot.unit,
    period: toPeriodDto(snapshot.resolvedPeriod),
    // `calculatedAt` is when the figure was actually true (the moment it was computed from live
    // operational data); `publishedAt` only records when an editor clicked "publish", which can lag
    // the calculation. The public "as of" date should reflect the former.
    as_of_date: snapshot.calculatedAt ? snapshot.calculatedAt.toISOString() : null,
    disclosure_note_en: snapshot.definitionNoteEn,
    disclosure_note_hi: snapshot.definitionNoteHi,
  };
}

/** GET /public/website-metrics?placement=homepage|about_us */
async function getPublicMetrics(placement: string): Promise<{ metrics: PublicMetricDto[] }> {
  if (!placement || !isAllowedPlacement(placement)) {
    throw new ValidationError({
      placement: [`placement is required and must be one of: ${ALLOWED_PLACEMENTS.join(', ')}.`],
    });
  }

  const key = cacheKey(placement);
  const cached = await cacheService.getJson<{ metrics: PublicMetricDto[] }>(key);
  if (cached) return cached;

  const rows = await repo.listPublishedForPlacement(placement);
  const metrics = rows.map(toPublicDto).filter((m): m is PublicMetricDto => m !== null);
  const result = { metrics };
  await cacheService.setJson(key, result);
  return result;
}

export const websiteMetricsPublicService = { getPublicMetrics };
