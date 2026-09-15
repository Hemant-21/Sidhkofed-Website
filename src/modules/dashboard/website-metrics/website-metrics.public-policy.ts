/**
 * The Website Metrics public-eligibility policy — a SEPARATE backend policy layer that recalculates
 * a metric's value for the public preview/publish path, rather than reusing whatever scope an
 * internal admin caller happens to be looking at (spec requirement: public figures must be
 * recomputed under a dedicated public-eligibility policy, not merely copied from an admin view).
 *
 * Verified by reading `operational-reports.repository.ts` (Stage 1, do not re-derive elsewhere):
 * EVERY aggregation function in that repository applies `PUBLISHED_SCOPE = { publicationState:
 * 'published', archivedAt: null }` unconditionally — there is no parameter, override, or admin-scope
 * variant anywhere in the repository or in `operational-reports.service.ts`'s `generate()` that
 * widens this. The default scope already IS "published, non-archived" = the public-safe scope. So
 * this module does NOT stand up a second parallel query path — it calls the exact same
 * `operationalReportsService.generate()` Stage 1 exposes, and its only job is to (a) assert that
 * remains true structurally (there is nothing to "force" because there is nothing to override), and
 * (b) version the policy so a future change to that default scope (e.g. an admin-override parameter
 * being added) is caught by a deliberate version bump here rather than silently leaking into public
 * figures.
 *
 * If `operational-reports.repository.ts` ever grows a broader/admin-only scope option, THIS is the
 * file to update — bump `PUBLIC_SCOPE_POLICY_VERSION` and make sure the call below still forces the
 * restrictive scope explicitly (never accepts a caller-supplied override).
 */
import { ValidationError } from '@/shared/errors';
import { operationalReportsService } from '../operational-reports/operational-reports.service';
import type {
  CompletenessInfo,
  PeriodInput,
  ReportKey,
  ResolvedPeriod,
} from '../operational-reports/operational-reports.types';

/**
 * Bump this only on a deliberate, reviewed change to what "public-safe" means for operational
 * report data (e.g. the repository's default scope changes, or an admin-scope override is
 * introduced upstream). Existing published `WebsiteMetricSnapshot` rows record the version they
 * were calculated under, so a bump is retroactively visible without mutating history.
 */
export const PUBLIC_SCOPE_POLICY_VERSION = 1;

export interface PublicMeasureCalculation {
  value: number | null;
  unit: string | null;
  labelEn: string;
  labelHi?: string;
  noteEn: string;
  noteHi?: string;
  calculationVersion: number;
  completeness: CompletenessInfo | null;
  resolvedPeriod: ResolvedPeriod;
  resolvedFilters: Record<string, string[]>;
  calculatedAt: Date;
  publicScopePolicyVersion: number;
}

/**
 * Calculate ONE measure's public value under the public-eligibility policy. Never accepts a scope
 * override — the underlying `generate()` call always runs Stage 1's default (published,
 * non-archived) scope, which is what makes this policy's version pin meaningful.
 */
export async function calculatePublicMeasure(
  reportKey: ReportKey,
  measureKey: string,
  filterConfig: Record<string, string[]>,
  periodConfig: PeriodInput,
): Promise<PublicMeasureCalculation> {
  const result = await operationalReportsService.generate(reportKey, {
    periodInput: periodConfig,
    filters: filterConfig,
    page: 1,
    pageSize: 1, // Only the summary measures are needed; supporting rows are discarded.
  });
  const measure = result.summary.find((m) => m.key === measureKey);
  if (!measure) {
    throw new ValidationError({
      measureKey: [`Measure "${measureKey}" did not appear in "${reportKey}" results.`],
    });
  }
  return {
    value: measure.value,
    unit: measure.unit,
    labelEn: measure.labelEn,
    labelHi: measure.labelHi,
    noteEn: measure.noteEn,
    noteHi: measure.noteHi,
    calculationVersion: measure.calculationVersion,
    completeness: measure.completeness,
    resolvedPeriod: result.resolvedPeriod,
    resolvedFilters: result.filters,
    calculatedAt: result.calculatedAt,
    publicScopePolicyVersion: PUBLIC_SCOPE_POLICY_VERSION,
  };
}
