/**
 * Website Metrics service — configure → preview → publish. Owns:
 *   - config validation (delegated to `website-metrics.validators.ts`, which in turn defers
 *     eligibility to Stage 1's `operational-reports.registry.ts`);
 *   - the preview→publish safety mechanism (a short-lived, cache-backed, single-use preview token
 *     tied to the exact config revision + resolved value, so `publish()` never trusts client input —
 *     the only value that can ever be published is one this service just calculated and cached);
 *   - the (non-publication-state) lifecycle: publish/unpublish (via `currentSnapshotId`),
 *     archive/restore (via `isArchived`), and manual flag-for-review;
 *   - audit logging and the public-cache invalidation hook for Stage 3.
 *
 * No HTTP, no Prisma here (coding-standards §6 — `website-metrics.repository.ts` is the only
 * Prisma caller).
 */
import { randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { ConflictError, NotFoundError, ValidationError } from '@/shared/errors';
import { cacheService } from '@/services/cache';
import { auditService, type AuditContext } from '@/modules/audit/audit.service';
import { uniqueSlug } from '@/utils/slug';
import { isReportKey } from '../operational-reports/operational-reports.registry';
import type { PeriodInput, ReportKey } from '../operational-reports/operational-reports.types';
import { calculatePublicMeasure } from './website-metrics.public-policy';
import { websiteMetricsRepository as repo, type WebsiteMetricRow, type WebsiteMetricSnapshotRow } from './website-metrics.repository';
import { assertMeasureConfig, type WebsiteMetricCreateInput, type WebsiteMetricUpdateInput } from './website-metrics.validators';
import { WEBSITE_METRIC_ENTITY, type WebsiteMetricFilters, type WebsiteMetricOrderingField } from './website-metrics.types';
import { invalidateWebsiteMetricsPublicCache, requireUser, stableStringify } from './website-metrics.shared';

const PREVIEW_TOKEN_PREFIX = 'website_metrics:preview:';
const PREVIEW_TTL_SECONDS = 5 * 60;

interface PreviewTokenPayload {
  metricId: string;
  configRevision: number;
  value: number | null;
  unit: string | null;
  labelEn: string;
  labelHi: string | null;
  definitionNoteEn: string;
  definitionNoteHi: string | null;
  resolvedFilters: Record<string, string[]>;
  resolvedPeriod: unknown;
  completeness: unknown;
  calculatedAt: string;
  calculationVersion: number;
  publicScopePolicyVersion: number;
}

export interface PreviewResult {
  previewToken: string;
  value: number | null;
  unit: string | null;
  resolvedFilters: Record<string, string[]>;
  resolvedPeriod: unknown;
  labelEn: string;
  labelHi: string | null;
  completeness: unknown;
  calculatedAt: string;
  configRevision: number;
}

function loaded(row: WebsiteMetricRow | null): WebsiteMetricRow {
  if (!row) throw new NotFoundError('Website metric not found.');
  return row;
}

function toDto(row: WebsiteMetricRow) {
  return {
    id: row.id,
    metric_key: row.metricKey,
    report_key: row.reportKey,
    measure_key: row.measureKey,
    calculation_version: row.calculationVersion,
    filter_config: row.filterConfig,
    period_config: row.periodConfig,
    label_en: row.labelEn,
    label_hi: row.labelHi,
    placement_key: row.placementKey,
    display_order: row.displayOrder,
    is_enabled: row.isEnabled,
    is_archived: row.isArchived,
    config_revision: row.configRevision,
    current_snapshot: row.currentSnapshot ? toSnapshotDto(row.currentSnapshot) : null,
    created_at: row.createdAt,
    updated_at: row.updatedAt,
  };
}

function toSnapshotDto(row: WebsiteMetricSnapshotRow) {
  return {
    id: row.id,
    metric_id: row.metricId,
    config_revision: row.configRevision,
    resolved_filters: row.resolvedFilters,
    resolved_period: row.resolvedPeriod,
    value: row.value === null ? null : Number(row.value),
    unit: row.unit,
    label_en: row.labelEn,
    label_hi: row.labelHi,
    definition_note_en: row.definitionNoteEn,
    definition_note_hi: row.definitionNoteHi,
    completeness: row.completeness,
    public_scope_policy_version: row.publicScopePolicyVersion,
    calculated_at: row.calculatedAt,
    published_at: row.publishedAt,
    published_by: row.publishedById,
    flagged_for_review: row.flaggedForReview,
    created_at: row.createdAt,
  };
}

// ── Create / update / read ──────────────────────────────────────────────────────
async function create(input: WebsiteMetricCreateInput, ctx: AuditContext) {
  const userId = requireUser(ctx);
  const measure = assertMeasureConfig(input.reportKey, input.measureKey, input.filterConfig, input.periodConfig);
  const metricKey = await uniqueSlug(
    `${input.placementKey}-${input.labelEn}`,
    (candidate) => repo.metricKeyExists(candidate),
  );

  const created = await repo.create({
    metricKey,
    reportKey: input.reportKey,
    measureKey: input.measureKey,
    calculationVersion: measure.calculationVersion,
    filterConfig: input.filterConfig as Prisma.InputJsonValue,
    periodConfig: input.periodConfig as Prisma.InputJsonValue,
    labelEn: input.labelEn,
    labelHi: input.labelHi ?? null,
    placementKey: input.placementKey,
    displayOrder: input.displayOrder ?? 0,
    configRevision: 1,
    createdById: userId,
    updatedById: userId,
  });
  await auditService.create(ctx, WEBSITE_METRIC_ENTITY, created.id, {
    metric_key: created.metricKey,
    report_key: created.reportKey,
    measure_key: created.measureKey,
  });
  return toDto(created);
}

/**
 * Update the metric's configuration. Any actual change to reportKey/measureKey/filterConfig/
 * periodConfig increments `configRevision` — this is what automatically invalidates outstanding
 * preview tokens (see `publish()`'s revision check) so a stale preview can never be published after
 * an edit. Label/placement/displayOrder edits never touch `configRevision` and never mutate any
 * existing (already-published) snapshot row — snapshots freeze their own label/period/metadata at
 * publish time and this function never writes to the snapshot table.
 */
async function updateConfig(id: string, patch: WebsiteMetricUpdateInput, ctx: AuditContext) {
  const userId = requireUser(ctx);
  const existing = loaded(await repo.findById(id));

  const effectiveReportKey = patch.reportKey ?? existing.reportKey;
  const effectiveMeasureKey = patch.measureKey ?? existing.measureKey;
  const effectiveFilterConfig = (patch.filterConfig ?? (existing.filterConfig as Record<string, string[]>)) ?? {};
  const effectivePeriodConfig = (patch.periodConfig ?? (existing.periodConfig as unknown as PeriodInput));

  const configTouched =
    patch.reportKey !== undefined ||
    patch.measureKey !== undefined ||
    patch.filterConfig !== undefined ||
    patch.periodConfig !== undefined;

  const data: Prisma.WebsiteMetricUncheckedUpdateInput = { updatedById: userId };

  if (configTouched) {
    const measure = assertMeasureConfig(
      effectiveReportKey,
      effectiveMeasureKey,
      effectiveFilterConfig,
      effectivePeriodConfig,
    );
    const configChanged =
      stableStringify({
        reportKey: existing.reportKey,
        measureKey: existing.measureKey,
        filterConfig: existing.filterConfig,
        periodConfig: existing.periodConfig,
      }) !==
      stableStringify({
        reportKey: effectiveReportKey,
        measureKey: effectiveMeasureKey,
        filterConfig: effectiveFilterConfig,
        periodConfig: effectivePeriodConfig,
      });

    data.reportKey = effectiveReportKey;
    data.measureKey = effectiveMeasureKey;
    data.calculationVersion = measure.calculationVersion;
    data.filterConfig = effectiveFilterConfig as Prisma.InputJsonValue;
    data.periodConfig = effectivePeriodConfig as unknown as Prisma.InputJsonValue;
    if (configChanged) {
      data.configRevision = existing.configRevision + 1;
    }
  }

  if (patch.labelEn !== undefined) data.labelEn = patch.labelEn;
  if (patch.labelHi !== undefined) data.labelHi = patch.labelHi;
  if (patch.placementKey !== undefined) data.placementKey = patch.placementKey;
  if (patch.displayOrder !== undefined) data.displayOrder = patch.displayOrder;

  const updated = await repo.update(id, data);
  await auditService.update(ctx, WEBSITE_METRIC_ENTITY, id, undefined, {
    config_revision: updated.configRevision,
  });
  return toDto(updated);
}

async function getById(id: string) {
  return toDto(loaded(await repo.findById(id)));
}

async function list(
  filters: WebsiteMetricFilters,
  ordering: { field: WebsiteMetricOrderingField; direction: 'asc' | 'desc' },
  skip: number,
  take: number,
) {
  const { rows, total } = await repo.list(filters, ordering, skip, take);
  return { items: rows.map(toDto), total };
}

// ── Preview / publish ────────────────────────────────────────────────────────────
async function preview(id: string, _ctx: AuditContext): Promise<PreviewResult> {
  const metric = loaded(await repo.findById(id));
  if (!isReportKey(metric.reportKey)) {
    throw new ValidationError({ reportKey: [`Unknown report key "${metric.reportKey}".`] });
  }
  // Defensive re-validation: the registry may have changed (measure removed / made ineligible)
  // since this metric's config was last saved.
  assertMeasureConfig(
    metric.reportKey,
    metric.measureKey,
    metric.filterConfig as Record<string, string[]>,
    metric.periodConfig as unknown as PeriodInput,
  );

  const calc = await calculatePublicMeasure(
    metric.reportKey as ReportKey,
    metric.measureKey,
    metric.filterConfig as Record<string, string[]>,
    metric.periodConfig as unknown as PeriodInput,
  );

  const previewToken = randomUUID();
  const payload: PreviewTokenPayload = {
    metricId: metric.id,
    configRevision: metric.configRevision,
    value: calc.value,
    unit: calc.unit,
    labelEn: metric.labelEn,
    labelHi: metric.labelHi,
    definitionNoteEn: calc.noteEn,
    definitionNoteHi: calc.noteHi ?? null,
    resolvedFilters: calc.resolvedFilters,
    resolvedPeriod: calc.resolvedPeriod,
    completeness: calc.completeness,
    calculatedAt: calc.calculatedAt.toISOString(),
    calculationVersion: calc.calculationVersion,
    publicScopePolicyVersion: calc.publicScopePolicyVersion,
  };
  await cacheService.setJson(`${PREVIEW_TOKEN_PREFIX}${previewToken}`, payload, PREVIEW_TTL_SECONDS);

  return {
    previewToken,
    value: payload.value,
    unit: payload.unit,
    resolvedFilters: payload.resolvedFilters,
    resolvedPeriod: payload.resolvedPeriod,
    labelEn: payload.labelEn,
    labelHi: payload.labelHi,
    completeness: payload.completeness,
    calculatedAt: payload.calculatedAt,
    configRevision: payload.configRevision,
  };
}

/**
 * Validate + consume a preview token, then freeze it into a new `WebsiteMetricSnapshot` and repoint
 * `currentSnapshotId` at it. NEVER accepts a client-supplied numeric value — `value` only ever comes
 * from the cached payload this service itself wrote in `preview()`. Rejects when:
 *   - the token is missing/expired (cache TTL, or already consumed by an earlier publish call);
 *   - the token was issued for a different metric;
 *   - `metric.configRevision` has moved on since the token was issued (the config was edited after
 *     preview — the caller must preview again against the new config);
 *   - the previewed value is null (no eligible records for the configured filters/period) — a null
 *     figure is never coalesced to zero and is never publishable as a public number.
 */
async function publish(id: string, previewToken: string, ctx: AuditContext) {
  const userId = requireUser(ctx);
  const metric = loaded(await repo.findById(id));

  const cacheKey = `${PREVIEW_TOKEN_PREFIX}${previewToken}`;
  const payload = await cacheService.getJson<PreviewTokenPayload>(cacheKey);
  if (!payload) {
    throw new ConflictError('Preview token is invalid or has expired. Run preview again before publishing.');
  }
  if (payload.metricId !== id) {
    throw new ConflictError('Preview token does not belong to this metric.');
  }
  if (payload.configRevision !== metric.configRevision) {
    throw new ConflictError(
      'The metric configuration changed after this preview was generated. Run preview again before publishing.',
    );
  }
  if (payload.value === null) {
    throw new ValidationError({
      value: ['The configured measure has no eligible records for this filter/period and cannot be published as a public figure.'],
    });
  }

  // Single-use: consume the token immediately so a duplicate publish call cannot create two
  // snapshots from the same calculation.
  await cacheService.del(cacheKey);

  const snapshot = await repo.createSnapshot({
    metricId: metric.id,
    configRevision: payload.configRevision,
    resolvedFilters: payload.resolvedFilters as Prisma.InputJsonValue,
    resolvedPeriod: payload.resolvedPeriod as Prisma.InputJsonValue,
    value: new Prisma.Decimal(payload.value),
    unit: payload.unit,
    labelEn: payload.labelEn,
    labelHi: payload.labelHi,
    definitionNoteEn: payload.definitionNoteEn,
    definitionNoteHi: payload.definitionNoteHi,
    completeness: payload.completeness as Prisma.InputJsonValue,
    publicScopePolicyVersion: payload.publicScopePolicyVersion,
    calculatedAt: new Date(payload.calculatedAt),
    publishedById: userId,
  });

  const updated = await repo.update(metric.id, { currentSnapshotId: snapshot.id, updatedById: userId });

  await auditService.publish(ctx, WEBSITE_METRIC_ENTITY, id, {
    newState: 'published',
    metadata: { snapshot_id: snapshot.id, config_revision: snapshot.configRevision },
  });
  // Stage 3 hook: the public endpoint's cache (not built in this stage) should be invalidated here
  // too, once it exists — this call already clears this module's own prefix.
  await invalidateWebsiteMetricsPublicCache();

  return toDto(updated);
}

async function unpublish(id: string, ctx: AuditContext) {
  const userId = requireUser(ctx);
  const metric = loaded(await repo.findById(id));
  if (!metric.currentSnapshotId) {
    throw new ConflictError('This metric is not currently published.');
  }
  // Snapshot history is intentionally left untouched — only the pointer is cleared.
  const updated = await repo.update(id, { currentSnapshotId: null, updatedById: userId });
  await auditService.unpublish(ctx, WEBSITE_METRIC_ENTITY, id, { newState: 'unpublished' });
  await invalidateWebsiteMetricsPublicCache();
  return toDto(updated);
}

async function archive(id: string, ctx: AuditContext) {
  const userId = requireUser(ctx);
  const metric = loaded(await repo.findById(id));
  if (metric.isArchived) {
    throw new ConflictError('This metric is already archived.');
  }
  const updated = await repo.update(id, { isArchived: true, updatedById: userId });
  await auditService.archive(ctx, WEBSITE_METRIC_ENTITY, id, { newState: 'archived' });
  await invalidateWebsiteMetricsPublicCache();
  return toDto(updated);
}

async function restore(id: string, ctx: AuditContext) {
  const userId = requireUser(ctx);
  const metric = loaded(await repo.findById(id));
  if (!metric.isArchived) {
    throw new ConflictError('This metric is not archived.');
  }
  const updated = await repo.update(id, { isArchived: false, updatedById: userId });
  await auditService.restore(ctx, WEBSITE_METRIC_ENTITY, id, { newState: 'restored' });
  await invalidateWebsiteMetricsPublicCache();
  return toDto(updated);
}

async function history(id: string) {
  loaded(await repo.findById(id));
  const rows = await repo.listSnapshotsByMetric(id);
  return rows.map(toSnapshotDto);
}

/**
 * Manual flag-for-review path only (spec-scoped follow-up: no automatic cross-module sweep in this
 * stage — see the final report). Flags/unflags the metric's CURRENT snapshot, the one actually shown
 * publicly; older snapshot history is untouched.
 */
async function flagForReview(id: string, ctx: AuditContext) {
  const metric = loaded(await repo.findById(id));
  if (!metric.currentSnapshotId) {
    throw new ConflictError('This metric has no published snapshot to flag.');
  }
  await repo.updateSnapshot(metric.currentSnapshotId, { flaggedForReview: true });
  await auditService.log('UPDATE', ctx, {
    module: WEBSITE_METRIC_ENTITY,
    recordId: id,
    summary: 'FLAG_FOR_REVIEW',
    metadata: { snapshot_id: metric.currentSnapshotId },
  });
  return toDto(loaded(await repo.findById(id)));
}

async function unflagForReview(id: string, ctx: AuditContext) {
  const metric = loaded(await repo.findById(id));
  if (!metric.currentSnapshotId) {
    throw new ConflictError('This metric has no published snapshot to unflag.');
  }
  await repo.updateSnapshot(metric.currentSnapshotId, { flaggedForReview: false });
  await auditService.log('UPDATE', ctx, {
    module: WEBSITE_METRIC_ENTITY,
    recordId: id,
    summary: 'UNFLAG_FOR_REVIEW',
    metadata: { snapshot_id: metric.currentSnapshotId },
  });
  return toDto(loaded(await repo.findById(id)));
}

export const websiteMetricsService = {
  create,
  updateConfig,
  getById,
  list,
  preview,
  publish,
  unpublish,
  archive,
  restore,
  history,
  flagForReview,
  unflagForReview,
};
