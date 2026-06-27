/**
 * System Settings module types — mirror the backend Settings API (src/modules/settings/*).
 *
 * `GET /admin/settings` returns settings grouped by category:
 *   { groups: { [group]: Array<{ key, value, description }> } }
 * `GET|PUT /admin/settings/:key` exchange a single `{ key, group, value, description }` record; PUT
 * accepts `{ value }` and validates it against the backend's typed catalog (unknown keys → 404,
 * invalid values → 422). The frontend NEVER defines settings — it renders whatever the backend
 * returns and submits values back for the backend to validate (API spec §6). Super Admin only.
 *
 * The list response does NOT carry each value's declared type, so the editor control is inferred
 * from the runtime value (boolean/number/array/object/string) plus light key-name heuristics; the
 * backend remains the source of truth and rejects anything invalid on PUT.
 */

/** One setting as returned inside a group by `GET /admin/settings`. */
export interface SettingItem {
  key: string;
  value: unknown;
  description: string;
}

/** `GET /admin/settings` response payload. */
export interface SettingsGroupsResponse {
  groups: Record<string, SettingItem[]>;
}

/** `GET|PUT /admin/settings/:key` single-record shape. */
export interface SettingRecord {
  key: string;
  group: string;
  value: unknown;
  description: string;
}

/** The editor control inferred for a setting value. */
export type SettingKind = 'boolean' | 'number' | 'language' | 'url' | 'string' | 'text' | 'stringArray' | 'json';

/** Friendly group labels (UI only). Falls back to a humanized key for unknown groups. */
export const SETTING_GROUP_LABEL: Record<string, string> = {
  site: 'Site',
  homepage: 'Homepage',
  contact: 'Contact',
  social: 'Social',
  footer: 'Footer',
  seo: 'SEO',
  uploads: 'Media & Uploads',
  limits: 'Limits',
  translation: 'Translation',
};

/** Stable display order for the settings tabs (any extra groups are appended). */
export const SETTING_GROUP_ORDER = [
  'site',
  'homepage',
  'contact',
  'social',
  'footer',
  'seo',
  'uploads',
  'limits',
  'translation',
];

/**
 * Infer the editor control from a setting's runtime value + key name. Pure + unit-testable. The
 * backend still validates the submitted value, so a wrong guess only affects the input affordance,
 * never correctness.
 */
export function inferSettingKind(key: string, value: unknown): SettingKind {
  if (typeof value === 'boolean') return 'boolean';
  if (typeof value === 'number') return 'number';
  if (Array.isArray(value)) {
    return value.every((v) => typeof v === 'string') ? 'stringArray' : 'json';
  }
  if (value !== null && typeof value === 'object') return 'json';
  // string | null below
  if (key.endsWith('default_language')) return 'language';
  if (key.endsWith('_url') || key.includes('url')) return 'url';
  if (/address|description|copyright|hours/.test(key)) return 'text';
  return 'string';
}

/** Label a setting key for display: `contact.office_name` → "Office name". */
export function settingLabel(key: string): string {
  const leaf = key.includes('.') ? key.slice(key.indexOf('.') + 1) : key;
  return leaf
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\bUrl\b/, 'URL')
    .replace(/\bSeo\b/, 'SEO')
    .replace(/\bKpis?\b/i, 'KPIs')
    .replace(/\bId\b/, 'ID');
}
