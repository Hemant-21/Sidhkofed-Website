'use client';

/**
 * Settings data layer. Reads the grouped settings catalog and writes a single key at a time
 * (`PUT /admin/settings/:key`). Super Admin only — the backend enforces the role; the page gates
 * the affordance. No CRUD factory: settings are a fixed catalog keyed by string, not a "P" resource.
 */

import { get, put } from '@/lib/api/http';
import type { SettingItem, SettingsResponse } from './types';

export const SETTINGS_QUERY_KEY = ['settings', 'all'] as const;

export const fetchSettings = () => get<SettingsResponse>('/admin/settings');

export const updateSetting = (key: string, value: unknown) =>
  put<SettingItem, { value: unknown }>(`/admin/settings/${encodeURIComponent(key)}`, { value });
