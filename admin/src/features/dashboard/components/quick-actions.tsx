'use client';

/**
 * Quick Actions (Phase 15.2) — fixed shortcuts to common create/manage flows.
 * PERMISSION-AWARE: an action renders only when the user holds a permission that
 * would let them act (or, for read-only shortcuts, belongs to a CMS role). The
 * backend still enforces every action; this only hides affordances the user
 * cannot use (codex §7). Module pages are wired in later phases — the routes are
 * already reserved, so these links resolve.
 */

import Link from 'next/link';
import {
  CalendarPlus,
  FileUp,
  BookPlus,
  Building2,
  Images,
  BarChart3,
  type LucideIcon,
} from 'lucide-react';
import { EmptyState } from '@/components/feedback/empty-state';
import { ROUTES } from '@/constants/routes';
import { CONTENT_PERMISSIONS, DASHBOARD_PERMISSIONS, ROLE_KEYS } from '@/constants/permissions';
import { usePermissions } from '@/hooks/use-permissions';
import { cn } from '@/utils/cn';

interface QuickAction {
  key: string;
  label: string;
  href: string;
  icon: LucideIcon;
  /** Visible when the user holds ANY of these permissions… */
  anyOf?: string[];
  /** …or belongs to ANY of these roles (read-only shortcuts only). */
  roles?: string[];
}

const ALL_CMS_ROLES = [ROLE_KEYS.superAdmin, ROLE_KEYS.contentEditor, ROLE_KEYS.publisher];

const QUICK_ACTIONS: QuickAction[] = [
  {
    key: 'create-event',
    label: 'Create Event',
    href: ROUTES.events,
    icon: CalendarPlus,
    anyOf: [CONTENT_PERMISSIONS.create, CONTENT_PERMISSIONS.update],
  },
  {
    key: 'upload-document',
    label: 'Upload Document',
    href: ROUTES.documents,
    icon: FileUp,
    anyOf: [CONTENT_PERMISSIONS.create, CONTENT_PERMISSIONS.update],
  },
  {
    key: 'create-programme',
    label: 'Create Programme',
    href: ROUTES.programmes,
    icon: BookPlus,
    anyOf: ['programmes.create', 'programmes.update'],
  },
  {
    key: 'create-institution',
    label: 'Create Institution',
    href: ROUTES.institutions,
    icon: Building2,
    anyOf: [CONTENT_PERMISSIONS.create, CONTENT_PERMISSIONS.update],
  },
  {
    key: 'open-media',
    label: 'Open Media',
    href: ROUTES.media,
    icon: Images,
    roles: ALL_CMS_ROLES,
  },
  {
    key: 'dashboard-data',
    label: 'Dashboard Data',
    href: ROUTES.dashboardData,
    icon: BarChart3,
    anyOf: [DASHBOARD_PERMISSIONS.manageData],
  },
];

export function QuickActions() {
  const { canAny, hasRole } = usePermissions();

  const visible = QUICK_ACTIONS.filter((action) => {
    const byPermission = action.anyOf ? canAny(action.anyOf) : false;
    const byRole = action.roles ? hasRole(action.roles) : false;
    return byPermission || byRole;
  });

  if (visible.length === 0) {
    return (
      <EmptyState
        title="No quick actions available"
        description="You don't currently have permission for any create or management shortcut."
      />
    );
  }

  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {visible.map((action) => (
        <li key={action.key}>
          <Link
            href={action.href}
            className={cn(
              'flex h-full flex-col items-start gap-2 rounded-lg border border-border bg-background p-4 text-sm transition-colors',
              'hover:border-primary/40 hover:bg-primary/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            )}
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
              <action.icon className="h-4 w-4" aria-hidden="true" />
            </span>
            <span className="font-medium text-foreground">{action.label}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
