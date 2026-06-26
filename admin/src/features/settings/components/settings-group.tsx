'use client';

/**
 * Renders one settings group as a card of stacked `<SettingEditor>` rows. Each row handles its
 * own dirty/save state; the group itself is presentation-only.
 */

import { Card, CardContent, CardHeader } from '@/components/layout/card';
import { Skeleton } from '@/components/feedback/skeleton';
import { type SettingItem } from '../types';
import { SettingEditor } from './setting-editor';

export interface SettingsGroupProps {
  title: string;
  description?: string;
  items: SettingItem[];
  onSave: (key: string, value: unknown) => void;
  disabled?: boolean;
}

export function SettingsGroup({ title, description, items, onSave, disabled }: SettingsGroupProps) {
  return (
    <Card>
      <CardHeader title={title} description={description} />
      <CardContent className="divide-y divide-border">
        {items.map((item) => (
          <SettingEditor key={item.key} setting={item} onSave={onSave} disabled={disabled} />
        ))}
      </CardContent>
    </Card>
  );
}

export function SettingsGroupSkeleton() {
  return (
    <Card>
      <CardHeader title={<Skeleton className="h-5 w-32" />} />
      <CardContent className="divide-y divide-border">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-2 py-3">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-64" />
            <Skeleton className="h-10 w-full max-w-xs" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
