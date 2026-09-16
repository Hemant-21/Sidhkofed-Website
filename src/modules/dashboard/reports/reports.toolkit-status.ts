/**
 * Standardized toolkit item distribution status — the single rule used by all three reports
 * (previously the trial SQL files had two different rules: an item-level 4-state rule and a
 * simplified binary per-district rule in `programme-report-trial.sql`'s "District details" column;
 * this module keeps only the item-level rule and drops the simplified one, per the requirement to
 * standardize toolkit status handling).
 *
 * Inputs are two counts already aggregated DB-side, scoped to one toolkit item across whatever set
 * of qualifying (deduplicated) events the caller has resolved:
 *   - evidenceCount: distinct ToolkitDistributionSummary rows linked to a qualifying event for this
 *     item's toolkit (regardless of distributionDone).
 *   - distributedCount: the subset of those where distributionDone = true AND the item's
 *     ToolkitDistributionItem.totalQuantity > 0.
 *
 * `not_recorded` (no evidence) is always distinguished from `not_distributed` (confirmed, recorded
 * non-distribution) — never conflated. Applicability (whether a toolkit exists at all for the scope)
 * is a separate, higher-level concern — see `ToolkitInfo.applicable` in reports.types.ts — this
 * function never returns "N/A".
 */
import type { ToolkitItemStatus } from './reports.types';

export interface ToolkitItemStatusCounts {
  evidenceCount: number;
  distributedCount: number;
}

export function computeToolkitItemStatus(counts: ToolkitItemStatusCounts): ToolkitItemStatus {
  const { evidenceCount, distributedCount } = counts;
  if (evidenceCount <= 0) return 'not_recorded';
  if (distributedCount >= evidenceCount) return 'distributed';
  if (distributedCount > 0) return 'partially_distributed';
  return 'not_distributed';
}

export const TOOLKIT_ITEM_STATUS_LABELS: Record<ToolkitItemStatus, string> = {
  distributed: 'Distributed',
  partially_distributed: 'Partially distributed',
  not_distributed: 'Not distributed',
  not_recorded: 'Not recorded',
};
