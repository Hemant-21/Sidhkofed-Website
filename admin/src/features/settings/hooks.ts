'use client';

/**
 * Settings React Query hooks. Settings are infrequently changed and expensive to refetch, so
 * `staleTime` is high (5 min). On a successful PUT the cache is invalidated so the page
 * re-reads the confirmed server state. All hooks are gated via `enabled` because the settings
 * endpoint is Super Admin only (API spec §8).
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { fetchSettings, updateSetting } from './api';
import type { SettingsGroupsResponse } from './types';

const SETTINGS_KEY = ['admin', 'settings'] as const;

/** Load all settings groups. Gate with `enabled` (Super Admin only). */
export function useSettings(enabled = true) {
  return useQuery<SettingsGroupsResponse>({
    queryKey: SETTINGS_KEY,
    queryFn: fetchSettings,
    enabled,
    staleTime: 5 * 60_000,
  });
}

/** Mutate one setting. On success, invalidates the full settings cache. */
export function useUpdateSetting() {
  const qc = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: ({ key, value }: { key: string; value: unknown }) => updateSetting(key, value),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: SETTINGS_KEY });
      toast.success('Setting saved.');
    },
    onError: () => {
      toast.error('Failed to save setting. Check your input and try again.');
    },
  });
}
