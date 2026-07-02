/**
 * Bilingual content selection (codex §10). Editorial records carry `*_en`
 * (primary, usually required) and optional `*_hi`. Manual Hindi takes priority;
 * when Hindi is missing the English value is shown as a fallback. The backend does
 * not machine-translate in Phase 1, so we never fabricate Hindi — we only surface
 * `translation_source` so the UI can label automatic content if it ever appears.
 */

import type { Language } from '@/i18n/dictionary';

/**
 * Pick the language-appropriate value from an `en`/`hi` pair.
 * Falls back to the English value (then empty string) when the requested language
 * is missing.
 */
export function pickText(
  en: string | null | undefined,
  hi: string | null | undefined,
  lang: Language,
): string {
  if (lang === 'hi') return (hi && hi.trim().length > 0 ? hi : en) ?? '';
  return (en && en.trim().length > 0 ? en : hi) ?? '';
}

/**
 * Pick from a record using a base field name, e.g. `pickField(row, 'title', lang)`
 * reads `title_en` / `title_hi`. Keeps call sites terse for the many DTOs that
 * follow the `*_en`/`*_hi` convention.
 */
export function pickField<T extends Record<string, unknown>>(
  row: T | null | undefined,
  base: string,
  lang: Language,
): string {
  if (!row) return '';
  const en = row[`${base}_en`] as string | null | undefined;
  const hi = row[`${base}_hi`] as string | null | undefined;
  return pickText(en, hi, lang);
}

/** Whether a record's effective Hindi content is an automatic/missing translation. */
export function isAutoTranslated(translationSource: string | null | undefined, lang: Language): boolean {
  return lang === 'hi' && translationSource === 'automatic';
}
