'use client';

/**
 * The admin application shell: sidebar (desktop, collapsible) + mobile drawer +
 * top navigation + scrollable content region. Collapse preference is persisted.
 * This is the single layout every CMS page renders inside — modules supply only
 * page content. Includes a skip-link and a semantic <main> landmark (a11y).
 */

import { useEffect, useState, type ReactNode } from 'react';
import { STORAGE_KEYS } from '@/constants/app';
import { useBoolean } from '@/hooks/use-boolean';
import { Sidebar } from './sidebar';
import { MobileDrawer } from './mobile-drawer';
import { Topbar } from './topbar';

export function AdminShell({ children }: { children: ReactNode }) {
  const drawer = useBoolean(false);
  const [collapsed, setCollapsed] = useState(false);

  // Restore the persisted collapse preference once on mount.
  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEYS.sidebarCollapsed);
    if (stored === 'true') setCollapsed(true);
  }, []);

  const toggleCollapse = () => {
    setCollapsed((prev) => {
      const next = !prev;
      window.localStorage.setItem(STORAGE_KEYS.sidebarCollapsed, String(next));
      return next;
    });
  };

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
      >
        Skip to content
      </a>

      <Sidebar collapsed={collapsed} />
      <MobileDrawer open={drawer.value} onClose={drawer.setFalse} />

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onMenuClick={drawer.setTrue} onCollapseToggle={toggleCollapse} collapsed={collapsed} />
        <main id="main-content" className="flex-1 focus:outline-none" tabIndex={-1}>
          {children}
        </main>
      </div>
    </div>
  );
}
