/**
 * Settings module types — mirror of the backend settings contract (settings.controller.ts).
 * `GET /admin/settings` returns settings grouped by category; each entry carries a key, its
 * resolved value, and a human description. `PUT /admin/settings/:key` accepts `{ value }`.
 * The frontend infers the input control from the value's runtime type (boolean → switch,
 * number → number input, string/array → text) — the backend validates against its typed catalog.
 */

export interface SettingItem {
  key: string;
  value: unknown;
  description: string;
}

/** `GET /admin/settings` → `{ groups: { [group]: SettingItem[] } }`. */
export interface SettingsResponse {
  groups: Record<string, SettingItem[]>;
}
