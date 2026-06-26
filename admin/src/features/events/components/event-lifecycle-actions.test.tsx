import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthContext, type AuthContextValue } from '@/providers/auth-provider';
import { ToastProvider } from '@/providers/toast-provider';
import { DialogProvider } from '@/providers/dialog-provider';
import type { AuthUser } from '@/types/auth';
import { EventLifecycleActions } from './event-lifecycle-actions';
import type { EventDetail } from '../types';

/**
 * RBAC visibility for the event lifecycle bar. Permissions/roles mirror the seeded backend
 * grants (auth.permissions.ts): events/news authorize with the SHARED `content.*` set, and
 * complete/cancel/postpone are publisher-level role actions (EVENT_ACTION_ROLES).
 */

// Role → grants exactly as seeded in the backend (ROLE_PERMISSIONS). Super Admin = wildcard.
const ROLE_FIXTURES = {
  super_admin: { roles: ['super_admin'], permissions: ['*'] },
  content_editor: { roles: ['content_editor'], permissions: ['content.create', 'content.update'] },
  publisher: {
    roles: ['publisher'],
    permissions: ['content.publish', 'content.unpublish', 'content.archive', 'content.restore', 'content.update'],
  },
};

function renderAs(role: keyof typeof ROLE_FIXTURES, event: Partial<EventDetail> = {}) {
  const fixture = ROLE_FIXTURES[role];
  const user: AuthUser = {
    id: 'u1',
    email: 'a@b.c',
    full_name: 'T',
    preferred_language: 'en',
    is_active: true,
    roles: fixture.roles,
    permissions: fixture.permissions,
  };
  const auth: AuthContextValue = {
    user,
    status: 'authenticated',
    isAuthenticated: true,
    isLoading: false,
    login: async () => user,
    logout: async () => {},
    refreshUser: async () => {},
  };
  const detail = {
    id: 'e1',
    publication_state: 'draft',
    event_status: 'scheduled',
    ...event,
  } as EventDetail;
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <AuthContext.Provider value={auth}>
        <ToastProvider>
          <DialogProvider>
            <EventLifecycleActions event={detail} />
          </DialogProvider>
        </ToastProvider>
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
}

describe('EventLifecycleActions — RBAC', () => {
  it('Publisher sees edit, publish, archive, and the status (postpone/cancel) menu', () => {
    renderAs('publisher');
    expect(screen.getByRole('link', { name: /edit/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Publish' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Archive' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /more status actions/i })).toBeInTheDocument();
  });

  it('Content Editor sees only edit — publish/archive/status actions are hidden', () => {
    renderAs('content_editor');
    expect(screen.getByRole('link', { name: /edit/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Publish' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Archive' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /more status actions/i })).not.toBeInTheDocument();
  });

  it('Super Admin (wildcard) sees the full action set', () => {
    renderAs('super_admin');
    expect(screen.getByRole('link', { name: /edit/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Publish' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Archive' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /more status actions/i })).toBeInTheDocument();
  });

  it('hides the status menu for an already-cancelled event (not applicable)', () => {
    renderAs('publisher', { event_status: 'cancelled' });
    expect(screen.queryByRole('button', { name: /more status actions/i })).not.toBeInTheDocument();
  });

  it('swaps publish→unpublish and archive→restore by publication state', () => {
    renderAs('super_admin', { publication_state: 'published' });
    expect(screen.getByRole('button', { name: 'Unpublish' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Publish' })).not.toBeInTheDocument();
  });
});
