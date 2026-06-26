'use client';

import { useState } from 'react';
import { Database } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/utils/cn';
import { MASTER_TYPES, MASTER_GROUPS, DEFAULT_MASTER_KEY, findMasterType } from './types';
import { MasterList } from './components/master-list';

export function MastersPage() {
  const [activeKey, setActiveKey] = useState(DEFAULT_MASTER_KEY);
  const activeConfig = findMasterType(activeKey) ?? MASTER_TYPES[0]!;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Master Data"
        description="Manage the reference lists that power dropdown menus and content classification across the CMS."
      />

      <div className="flex gap-6">
        {/* Sidebar type selector */}
        <nav
          aria-label="Master type list"
          className="w-56 shrink-0 space-y-4"
        >
          {MASTER_GROUPS.map((group) => {
            const groupTypes = MASTER_TYPES.filter((t) => group.keys.includes(t.key));
            if (!groupTypes.length) return null;
            return (
              <div key={group.label}>
                <p className="mb-1 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {group.label}
                </p>
                <ul role="list" className="space-y-0.5">
                  {groupTypes.map((type) => (
                    <li key={type.key}>
                      <button
                        type="button"
                        onClick={() => setActiveKey(type.key)}
                        aria-current={activeKey === type.key ? 'page' : undefined}
                        className={cn(
                          'flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors',
                          activeKey === type.key
                            ? 'bg-primary/10 text-primary font-medium'
                            : 'text-foreground hover:bg-muted',
                        )}
                      >
                        <span className="truncate">{type.label}</span>
                        {type.editMode === 'seeded' ? (
                          <Badge tone="muted" className="shrink-0 text-[10px]">Seeded</Badge>
                        ) : null}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </nav>

        {/* Active master list */}
        <div className="min-w-0 flex-1">
          <div className="mb-4">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <h2 className="text-base font-semibold text-foreground">{activeConfig.label}</h2>
              {activeConfig.editMode === 'seeded' ? (
                <Badge tone="muted">Seeded</Badge>
              ) : null}
            </div>
            <p className="mt-0.5 text-sm text-muted-foreground">{activeConfig.description}</p>
          </div>

          <MasterList key={activeKey} config={activeConfig} />
        </div>
      </div>
    </div>
  );
}
