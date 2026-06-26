'use client';

/**
 * Top navigation bar: mobile menu toggle, global-search placeholder, language +
 * notifications placeholders, theme toggle, and the user/account menu. The
 * placeholders are intentional foundation seams — future phases wire real search,
 * i18n, and notifications behind these same affordances.
 */

import { Bell, Globe, Menu, PanelLeftClose, PanelLeft, Search } from 'lucide-react';
import { Tooltip } from '@/components/ui/tooltip';
import { ThemeToggle } from './theme-toggle';
import { UserMenu } from './user-menu';

export interface TopbarProps {
  /** Open the mobile drawer (shown < lg). */
  onMenuClick: () => void;
  /** Toggle desktop sidebar collapse (shown >= lg). */
  onCollapseToggle: () => void;
  collapsed: boolean;
}

export function Topbar({ onMenuClick, onCollapseToggle, collapsed }: TopbarProps) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b border-border bg-surface/80 px-4 backdrop-blur supports-[backdrop-filter]:bg-surface/60">
      {/* Mobile drawer trigger */}
      <button
        type="button"
        onClick={onMenuClick}
        aria-label="Open navigation menu"
        className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:hidden"
      >
        <Menu className="h-5 w-5" aria-hidden="true" />
      </button>

      {/* Desktop collapse toggle */}
      <Tooltip content={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
        <button
          type="button"
          onClick={onCollapseToggle}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-pressed={collapsed}
          className="hidden h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:inline-flex"
        >
          {collapsed ? <PanelLeft className="h-5 w-5" aria-hidden="true" /> : <PanelLeftClose className="h-5 w-5" aria-hidden="true" />}
        </button>
      </Tooltip>

      {/* Global search placeholder */}
      <div className="hidden flex-1 md:block">
        <button
          type="button"
          disabled
          className="flex w-full max-w-md items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm text-muted-foreground"
          aria-label="Global search (coming soon)"
        >
          <Search className="h-4 w-4" aria-hidden="true" />
          <span>Search…</span>
        </button>
      </div>

      <div className="ml-auto flex items-center gap-1">
        <PlaceholderButton icon={Globe} label="Language (coming soon)" />
        <PlaceholderButton icon={Bell} label="Notifications (coming soon)" />
        <ThemeToggle />
        <div className="mx-1 h-6 w-px bg-border" aria-hidden="true" />
        <UserMenu />
      </div>
    </header>
  );
}

function PlaceholderButton({ icon: Icon, label }: { icon: typeof Bell; label: string }) {
  return (
    <Tooltip content={label}>
      <button
        type="button"
        disabled
        aria-label={label}
        className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Icon className="h-5 w-5" aria-hidden="true" />
      </button>
    </Tooltip>
  );
}
