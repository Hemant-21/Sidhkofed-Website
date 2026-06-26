'use client';

/**
 * Route guards. `ProtectedRoute` blocks unauthenticated access (redirect to
 * /login with a `next` param); `GuestRoute` keeps authenticated users out of
 * /login; `RequirePermission` gates a protected page on a permission and renders
 * the 403 affordance otherwise. These are the building blocks the (admin) layout
 * and future module pages compose — no page re-implements auth gating.
 */

import { useEffect, type ReactNode } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { Permission } from '@/types/auth';
import { useAuth } from '@/hooks/use-auth';
import { usePermissions } from '@/hooks/use-permissions';
import { ROUTES } from '@/constants/routes';
import { FullPageLoader } from '@/components/feedback/full-page-loader';
import { ForbiddenState } from '@/components/feedback/forbidden-state';

/** Wrap any authenticated area. While restoring the session, shows a loader. */
export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      const next =
        typeof window !== 'undefined'
          ? encodeURIComponent(window.location.pathname + window.location.search)
          : '';
      router.replace(next ? `${ROUTES.login}?next=${next}` : ROUTES.login);
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) return <FullPageLoader label="Restoring your session…" />;
  if (!isAuthenticated) return <FullPageLoader label="Redirecting to sign in…" />;
  return <>{children}</>;
}

/** Wrap guest-only pages (login). Authenticated users are sent to their target. */
export function GuestRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const params = useSearchParams();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      const next = params.get('next');
      router.replace(next ? decodeURIComponent(next) : ROUTES.dashboard);
    }
  }, [isAuthenticated, isLoading, params, router]);

  if (isLoading) return <FullPageLoader label="Loading…" />;
  if (isAuthenticated) return <FullPageLoader label="Redirecting…" />;
  return <>{children}</>;
}

/** Gate a page (or section) on a permission. Renders 403 if not allowed. */
export function RequirePermission({
  permission,
  anyOf,
  children,
  fallback,
}: {
  permission?: Permission;
  anyOf?: Permission[];
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const { can, canAny } = usePermissions();
  const allowed = permission ? can(permission) : anyOf ? canAny(anyOf) : true;
  if (!allowed) return <>{fallback ?? <ForbiddenState />}</>;
  return <>{children}</>;
}
