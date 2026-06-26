'use client';

/**
 * Settings page (Administration). Grouped settings from `GET /admin/settings`, edited in place and
 * saved one key at a time via `PUT /admin/settings/:key`. Super Admin only — gated here as an
 * affordance; the backend enforces the role. Reuses the shared layout, feedback, and UI primitives.
 */

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { RotateCcw } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardHeader, CardContent } from '@/components/layout/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/feedback/skeleton';
import { ErrorState } from '@/components/feedback/error-state';
import { ForbiddenState } from '@/components/feedback/forbidden-state';
import { EmptyState } from '@/components/feedback/empty-state';
import { Settings as SettingsIcon } from 'lucide-react';
import { usePermissions } from '@/hooks/use-permissions';
import { useToast } from '@/hooks/use-toast';
import { errorMessage } from '@/lib/api/server-errors';
import { ROLE_KEYS } from '@/constants/permissions';
import { fetchSettings, updateSetting, SETTINGS_QUERY_KEY } from './api';
import type { SettingItem } from './types';
import { inferKind, toInputString, coerceValue } from './setting-value';

const GROUP_LABELS: Record<string, string> = {
  site: 'Site',
  homepage: 'Homepage',
  contact: 'Contact',
  social: 'Social',
  footer: 'Footer',
  seo: 'SEO',
  uploads: 'Uploads',
  limits: 'Limits',
  translation: 'Translation',
};

export function SettingsPage() {
  const { hasRole } = usePermissions();
  const query = useQuery({ queryKey: SETTINGS_QUERY_KEY, queryFn: fetchSettings });

  if (!hasRole(ROLE_KEYS.superAdmin)) {
    return (
      <div className="space-y-6">
        <PageHeader title="Settings" />
        <ForbiddenState />
      </div>
    );
  }

  const groups = query.data?.groups ?? {};
  const groupKeys = Object.keys(groups).sort();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="System configuration. Changes are validated and audited; some take effect on the next cache refresh."
        actions={
          <Button
            variant="outline"
            size="sm"
            leftIcon={<RotateCcw className="h-4 w-4" />}
            onClick={() => void query.refetch()}
            isLoading={query.isFetching}
          >
            Reload
          </Button>
        }
      />

      {query.isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      ) : groupKeys.length === 0 ? (
        <EmptyState icon={SettingsIcon} title="No settings" description="No configurable settings are available." />
      ) : (
        groupKeys.map((group) => (
          <Card key={group}>
            <CardHeader title={GROUP_LABELS[group] ?? group} />
            <CardContent className="space-y-5">
              {(groups[group] ?? []).map((item) => (
                <SettingRow key={item.key} item={item} />
              ))}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}

function SettingRow({ item }: { item: SettingItem }) {
  const kind = inferKind(item.value);
  const toast = useToast();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<string>(toInputString(item.value));
  const [saving, setSaving] = useState(false);
  const inputId = `setting-${item.key}`;

  const dirty = kind !== 'boolean' && draft !== toInputString(item.value);

  async function save(value: unknown) {
    setSaving(true);
    try {
      await updateSetting(item.key, value);
      await queryClient.invalidateQueries({ queryKey: SETTINGS_QUERY_KEY });
      toast.success('Setting saved.');
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  if (kind === 'boolean') {
    return (
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <Label htmlFor={inputId}>{item.key}</Label>
          {item.description ? <p className="text-xs text-muted-foreground">{item.description}</p> : null}
        </div>
        <Switch
          label={item.key}
          checked={Boolean(item.value)}
          disabled={saving}
          onCheckedChange={(checked) => void save(checked)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <Label htmlFor={inputId}>{item.key}</Label>
      {item.description ? <p className="text-xs text-muted-foreground">{item.description}</p> : null}
      <div className="flex items-center gap-2">
        <Input
          id={inputId}
          type={kind === 'number' ? 'number' : 'text'}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          className="max-w-md"
        />
        <Button
          size="sm"
          disabled={!dirty}
          isLoading={saving}
          onClick={() => void save(coerceValue(draft, item.value))}
        >
          Save
        </Button>
      </div>
    </div>
  );
}
