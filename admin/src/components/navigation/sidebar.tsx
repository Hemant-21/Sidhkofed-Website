'use client';

import { cn } from '@/utils/cn';
import { Brand } from './brand';
import { SidebarNav } from './sidebar-nav';

/** Desktop sidebar: brand header + permission-aware nav. Collapses to icon rail. */
export function Sidebar({ collapsed }: { collapsed: boolean }) {
  return (
    <aside
      className={cn(
        'hidden shrink-0 flex-col border-r border-border bg-surface transition-[width] duration-200 lg:flex',
        collapsed ? 'w-[4.5rem]' : 'w-64',
      )}
      aria-label="Sidebar"
    >
      <div className={cn('flex h-16 items-center border-b border-border px-4', collapsed && 'justify-center px-2')}>
        <Brand collapsed={collapsed} />
      </div>
      <SidebarNav collapsed={collapsed} />
    </aside>
  );
}
