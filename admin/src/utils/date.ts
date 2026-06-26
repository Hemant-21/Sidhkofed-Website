/**
 * Date/time formatting helpers built on the platform `Intl` API (no extra deps).
 * The API transports dates as `YYYY-MM-DD` and timestamps as ISO-8601 UTC.
 */

const DISPLAY_DATE = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

const DISPLAY_DATETIME = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

function toDate(value: string | number | Date | null | undefined): Date | null {
  if (value === null || value === undefined || value === '') return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** `2026-06-26` → `26 Jun 2026`. Returns `fallback` for invalid/empty input. */
export function formatDate(value: string | Date | null | undefined, fallback = '—'): string {
  const d = toDate(value);
  return d ? DISPLAY_DATE.format(d) : fallback;
}

/** ISO timestamp → `26 Jun 2026, 14:30`. */
export function formatDateTime(value: string | Date | null | undefined, fallback = '—'): string {
  const d = toDate(value);
  return d ? DISPLAY_DATETIME.format(d) : fallback;
}

/** Convert any date input to the API `YYYY-MM-DD` form (or null). */
export function toApiDate(value: string | Date | null | undefined): string | null {
  const d = toDate(value);
  if (!d) return null;
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/** Compact relative time (e.g. "3 days ago"); falls back to absolute date. */
export function formatRelative(value: string | Date | null | undefined): string {
  const d = toDate(value);
  if (!d) return '—';
  const diffMs = d.getTime() - Date.now();
  const diffSec = Math.round(diffMs / 1000);
  const abs = Math.abs(diffSec);
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
  if (abs < 60) return rtf.format(Math.round(diffSec), 'second');
  if (abs < 3600) return rtf.format(Math.round(diffSec / 60), 'minute');
  if (abs < 86400) return rtf.format(Math.round(diffSec / 3600), 'hour');
  if (abs < 2592000) return rtf.format(Math.round(diffSec / 86400), 'day');
  return formatDate(d);
}
