/**
 * Website Metrics — shared, framework-free types (Stage 2 of the Operational Reports / Website
 * Metrics plan). A Website Metric is an ADMIN-CONFIGURED pointer at one public-eligible measure of
 * one Operational Report (Stage 1), plus a filter/period configuration, a bilingual label, and a
 * placement on the public site. Its numeric VALUE is never entered by hand — it only ever comes
 * from a server-side preview→publish calculation (`website-metrics.service.ts`) frozen into a
 * `WebsiteMetricSnapshot` row.
 */
import type { PeriodInput } from '../operational-reports/operational-reports.types';

/** Audit module key for this entity. */
export const WEBSITE_METRIC_ENTITY = 'website_metric';

/**
 * The placement registry — every public surface a Website Metric may be attached to. This is the
 * single source of truth Stage 2's validators enforce against, and what Stage 3's public endpoint
 * (and eventually the CMS UI) will read placements from. Adding a placement is a code change here,
 * never a free-text admin field.
 */
export const ALLOWED_PLACEMENTS = ['homepage', 'about_us'] as const;
export type PlacementKey = (typeof ALLOWED_PLACEMENTS)[number];

export function isAllowedPlacement(value: string): value is PlacementKey {
  return (ALLOWED_PLACEMENTS as readonly string[]).includes(value);
}

/** The metric's editable configuration — everything except identity/lifecycle bookkeeping. */
export interface WebsiteMetricConfig {
  reportKey: string;
  measureKey: string;
  filterConfig: Record<string, string[]>;
  periodConfig: PeriodInput;
  labelEn: string;
  labelHi?: string | null;
  placementKey: PlacementKey;
  displayOrder: number;
}

export interface WebsiteMetricFilters {
  placementKey?: string;
  isEnabled?: boolean;
  isArchived?: boolean;
}

export const WEBSITE_METRIC_ORDERING_FIELDS = ['display_order', 'created_at'] as const;
export type WebsiteMetricOrderingField = (typeof WEBSITE_METRIC_ORDERING_FIELDS)[number];
