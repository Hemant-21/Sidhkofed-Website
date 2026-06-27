'use client';

/**
 * System Settings page. Super Admin only (API spec §8). Fetches all settings via
 * `GET /admin/settings` and renders them in a tabbed layout, one tab per group. Each
 * setting is edited in-place via `<SettingEditor>` which tracks dirty state and issues
 * a `PUT /admin/settings/:key` on save. No bulk-save: each setting saves independently
 * so a network error on one key never silently discards another.
 *
 * Groups and their items are entirely backend-driven — the frontend renders whatever
 * the API returns. The `SETTING_GROUP_ORDER` / `SETTING_GROUP_LABEL` constants only
 * influence display order and friendly labels; they do NOT define what settings exist.
 */

import { useCallback, useMemo } from 'react';
import { Settings } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { EmptyState } from '@/components/feedback/empty-state';
import { ErrorState } from '@/components/feedback/error-state';
import { ForbiddenState } from '@/components/feedback/forbidden-state';
import { usePermissions } from '@/hooks/use-permissions';
import { ROLE_KEYS } from '@/constants/permissions';
import { humanize } from '@/utils/format';
import { useSettings, useUpdateSetting } from './hooks';
import { SettingsGroup, SettingsGroupSkeleton } from './components/settings-group';
import { SETTING_GROUP_LABEL, SETTING_GROUP_ORDER } from './types';

export function SettingsPage() {
  const { hasRole } = usePermissions();
  const isSuperAdmin = hasRole(ROLE_KEYS.superAdmin);

  const settings = useSettings(isSuperAdmin);
  const { mutate: updateSetting, isPending } = useUpdateSetting();

  // Build a stable tab order: known groups first (by SETTING_GROUP_ORDER), then unknown groups appended.
  const groups = useMemo(() => {
    if (!settings.data?.groups) return [];
    const all = Object.keys(settings.data.groups);
    const ordered = SETTING_GROUP_ORDER.filter((g) => all.includes(g));
    const extra = all.filter((g) => !SETTING_GROUP_ORDER.includes(g));
    return [...ordered, ...extra];
  }, [settings.data?.groups]);

  const handleSave = useCallback(
    (key: string, value: unknown) => updateSetting({ key, value }),
    [updateSetting],
  );

  if (!isSuperAdmin) {
    return (
      <div className="space-y-6">
        <PageHeader title="System Settings" description="Platform configuration managed by Super Administrator." />
        <ForbiddenState
          title="Restricted to Super Admin"
          description="System settings are available to Super Administrators only."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="System Settings"
        description="Platform configuration, contact details, social links, localization, and upload limits."
      />

      {/* Loading */}
      {settings.isLoading ? (
        <div className="space-y-4">
          <SettingsGroupSkeleton />
          <SettingsGroupSkeleton />
        </div>
      ) : settings.isError ? (
        <ErrorState error={settings.error} onRetry={() => void settings.refetch()} />
      ) : groups.length === 0 ? (
        <EmptyState
          icon={Settings}
          title="No settings found"
          description="The backend returned no settings groups."
        />
      ) : (
        <Tabs defaultValue={groups[0] ?? ''}>
          <TabsList className="mb-4 flex-wrap gap-1 h-auto">
            {groups.map((group) => (
              <TabsTrigger key={group} value={group}>
                {SETTING_GROUP_LABEL[group] ?? humanize(group)}
              </TabsTrigger>
            ))}
          </TabsList>

          {groups.map((group) => {
            const items = settings.data!.groups[group] ?? [];
            const title = SETTING_GROUP_LABEL[group] ?? humanize(group);
            return (
              <TabsContent key={group} value={group}>
                {items.length === 0 ? (
                  <EmptyState
                    icon={Settings}
                    title="No settings in this group"
                    description="This group currently has no configurable settings."
                  />
                ) : (
                  <SettingsGroup
                    title={`${title} Settings`}
                    items={items}
                    onSave={handleSave}
                    disabled={isPending}
                  />
                )}
              </TabsContent>
            );
          })}
        </Tabs>
      )}
    </div>
  );
}
