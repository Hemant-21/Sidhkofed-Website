/**
 * Application-wide constants: pagination, date formats, validation regex, and app
 * config. Single home for values multiple modules would otherwise duplicate.
 */

/** Pagination: backend default 20, cap 100 (API spec §1.4). */
export const PAGE_SIZE_DEFAULT = 20;
export const PAGE_SIZE_MAX = 100;
export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;

/** Date/time display formats (Intl-based; see utils/date.ts). */
export const DATE_FORMATS = {
  /** API transport: YYYY-MM-DD (API spec §0). */
  apiDate: 'yyyy-MM-dd',
  display: 'dd MMM yyyy',
  displayWithTime: 'dd MMM yyyy, HH:mm',
} as const;

/** Validation regex (frontend pre-checks; backend remains authoritative). */
export const REGEX = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  /** Indian mobile: optional +91/0 prefix then 10 digits starting 6–9. */
  mobile: /^(?:\+91|0)?[6-9]\d{9}$/,
  slug: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
  url: /^https?:\/\/[^\s/$.?#].[^\s]*$/i,
  uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
} as const;

/** Debounce defaults (search inputs, etc.), in milliseconds. */
export const DEBOUNCE_MS = 300;

/** Responsive breakpoints (px) — kept in sync with Tailwind defaults. */
export const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
} as const;

export const APP = {
  name: 'SIDHKOFED CMS',
  shortName: 'SIDHKOFED',
  /** Toast auto-dismiss default (ms). */
  toastDuration: 5000,
} as const;

/** localStorage keys (namespaced to avoid collisions). */
export const STORAGE_KEYS = {
  theme: 'sidhkofed.theme',
  sidebarCollapsed: 'sidhkofed.sidebar.collapsed',
  language: 'sidhkofed.language',
  draftPrefix: 'sidhkofed.draft.',
} as const;
