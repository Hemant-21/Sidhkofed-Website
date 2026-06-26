/**
 * Pure formatting helpers (no framework/DB deps). Dates are rendered for display
 * only; the API already returns `YYYY-MM-DD` (dates) and ISO-8601 (timestamps).
 */

import type { Language } from '@/i18n/dictionary';

const LOCALE: Record<Language, string> = { en: 'en-IN', hi: 'hi-IN' };

/** Format an ISO date/timestamp string for display. Returns '' for null/invalid. */
export function formatDate(
  value: string | null | undefined,
  lang: Language = 'en',
  opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' },
): string {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat(LOCALE[lang], opts).format(d);
}

/** Format a date range; collapses to a single date when end is missing/equal. */
export function formatDateRange(
  start: string | null | undefined,
  end: string | null | undefined,
  lang: Language = 'en',
): string {
  const s = formatDate(start, lang);
  if (!end || end === start) return s;
  return `${s} – ${formatDate(end, lang)}`;
}

/** Number formatting with thousands separators (Indian locale). */
export function formatNumber(value: number | string | null | undefined, lang: Language = 'en'): string {
  if (value === null || value === undefined || value === '') return '';
  const n = typeof value === 'string' ? Number(value) : value;
  if (Number.isNaN(n)) return String(value);
  return new Intl.NumberFormat(LOCALE[lang]).format(n);
}

/** Truncate plain text to a max length on a word boundary, adding an ellipsis. */
export function truncate(text: string | null | undefined, max = 160): string {
  if (!text) return '';
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const lastSpace = cut.lastIndexOf(' ');
  return `${cut.slice(0, lastSpace > 0 ? lastSpace : max).trimEnd()}…`;
}

/** Human label from an enum-like value: `single_date` -> `Single date`. */
export function humanizeEnum(value: string | null | undefined): string {
  if (!value) return '';
  return value
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
