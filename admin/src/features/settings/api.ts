/**
 * Settings API client. Calls `GET /admin/settings` (all groups) and `PUT /admin/settings/:key`
 * (single setting). The backend returns `{ groups: { [group]: SettingItem[] } }` from the
 * settings catalog; there is no POST/DELETE (API spec §6). The frontend never defines settings —
 * it renders whatever the backend returns and posts values back for server-side validation.
 */

import { get, put } from '@/lib/api/http';
import type { SettingRecord, SettingsGroupsResponse } from './types';

const BASE = '/admin/settings';

/** Fetch all settings, grouped. */
export async function fetchSettings(): Promise<SettingsGroupsResponse> {
  return get<SettingsGroupsResponse>(BASE);
}

/** Fetch a single setting by key. */
export async function fetchSetting(key: string): Promise<SettingRecord> {
  return get<SettingRecord>(`${BASE}/${encodeURIComponent(key)}`);
}

/** Update a setting value. Body `{ value }` — backend validates. */
export async function updateSetting(key: string, value: unknown): Promise<SettingRecord> {
  return put<SettingRecord, { value: unknown }>(`${BASE}/${encodeURIComponent(key)}`, { value });
}
