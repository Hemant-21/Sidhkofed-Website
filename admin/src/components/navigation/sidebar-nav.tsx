'use client';

/**
 * Renders the navigation tree from `config/navigation.ts`, filtered by the user's
 * permissions/roles and decorated with active state. Supports collapsed (icon-only)
 * mode and nested children (future submenu expansion). Pure presentation — the
 * config is the source of truth.
 */

import { useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/utils/cn';
import { usePermissions } from '@/hooks/use-permissions';
import { NAVIGATION, type NavItem, type NavSection } from '@/config/navigation';
import { Tooltip } from '@/components/ui/tooltip';

function useVisibleSections(): NavSection[] {
  const { can, hasRole } = usePermissions();
  return useMemo(() => {
    const isVisible = (item: NavItem): boolean => {
      if (item.permission && !can(item.permission)) return false;
      if (item.roles && !hasRole(item.roles)) return false;
      return true;
    };
    return NAVIGATION.map((section) => ({
      ...section,
      items: section.items.filter(isVisible).map((item) => ({
        ...item,
        children: item.children?.filter(isVisible),
      })),
    })).filter((section) => section.items.length > 0);
  }, [can, hasRole]);
}

function isActive(pathname: string, href: string): boolean {
  if (href === '/dashboard') return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SidebarNav({
  collapsed = false,
  onNavigate,
}: {
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const sections = useVisibleSections();

  return (
    <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4" aria-label="Main navigation">
      {sections.map((section) => (
        <div key={section.key}>
          {section.label && !collapsed ? (
            <p className="px-2 pb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {section.label}
            </p>
          ) : null}
          <ul className="space-y-0.5">
            {section.items.map((item) => {
              const active = isActive(pathname, item.href);
              const Icon = item.icon;
              const link = (
                <Link
                  href={item.href}
                  onClick={onNavigate}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'group flex items-center gap-3 rounded-md px-2.5 py-2 text-sm font-medium transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    collapsed && 'justify-center',
                    active
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                  )}
                >
                  <Icon className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
                  {!collapsed ? <span className="truncate">{item.label}</span> : null}
                </Link>
              );
              return (
                <li key={item.key}>
                  {collapsed ? (
                    <Tooltip content={item.label} side="right">
                      {link}
                    </Tooltip>
                  ) : (
                    link
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
