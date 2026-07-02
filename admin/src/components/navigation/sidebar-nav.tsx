'use client';

import { useMemo, useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/utils/cn';
import { usePermissions } from '@/hooks/use-permissions';
import { NAVIGATION, type NavItem, type NavSection } from '@/config/navigation';
import { Tooltip } from '@/components/ui/tooltip';

const STORAGE_KEY = 'sidebar_sections';

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

  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());

  // Restore persisted section collapse state on mount.
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) setCollapsedSections(new Set(JSON.parse(stored) as string[]));
    } catch {
      // ignore
    }
  }, []);

  const toggleSection = useCallback((key: string) => {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  return (
    <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4" aria-label="Main navigation">
      {sections.map((section) => {
        // Sections without a label (overview/Dashboard) are never collapsible.
        const isCollapsible = !!section.label;
        const isSectionCollapsed = isCollapsible && !collapsed && collapsedSections.has(section.key);

        return (
          <div key={section.key} className="space-y-0.5">
            {section.label && !collapsed ? (
              isCollapsible ? (
                <button
                  type="button"
                  onClick={() => toggleSection(section.key)}
                  className="flex w-full items-center justify-between px-2 pb-1 pt-3 text-left"
                  aria-expanded={!isSectionCollapsed}
                >
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {section.label}
                  </span>
                  <ChevronDown
                    className={cn(
                      'h-3.5 w-3.5 text-muted-foreground transition-transform duration-200',
                      isSectionCollapsed && '-rotate-90',
                    )}
                    aria-hidden="true"
                  />
                </button>
              ) : (
                <p className="px-2 pb-1 pt-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {section.label}
                </p>
              )
            ) : section.label && collapsed ? (
              // Divider line between sections in icon-rail mode.
              <div className="my-2 border-t border-border" />
            ) : null}

            {/* Items hidden when section is collapsed (never hidden in icon-rail mode). */}
            <ul className={cn('space-y-0.5', isSectionCollapsed && 'hidden')}>
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
        );
      })}
    </nav>
  );
}
