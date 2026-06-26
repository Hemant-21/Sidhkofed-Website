import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthContext, type AuthContextValue } from '@/providers/auth-provider';
import { ToastProvider } from '@/providers/toast-provider';
import { DialogProvider } from '@/providers/dialog-provider';
import type { AuthUser } from '@/types/auth';
import { NewsLifecycleActions } from './news-lifecycle-actions';
import type { NewsDetail } from '../types';

/**
 * RBAC visibility for the news lifecycle bar. News reuses the SHARED `content.*` permission set
 * (news.routes.ts) — there is no `news.*` grant — so the affordances mirror events.
 */

const ROLE_FIXTURES = {
  super_admin: { roles: ['super_admin'], permissions: ['*'] },
  content_editor: { roles: ['content_editor'], permissions: ['content.create', 'content.update'] },
  publisher: {
    roles: ['publisher'],
    permissions: ['content.publish', 'content.unpublish', 'content.archive', 'content.restore', 'content.update'],
  },
};

function renderAs(role: keyof typeof ROLE_FIXTURES, news: Partial<NewsDetail> = {}) {
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
  const detail = { id: 'n1', publication_state: 'draft', ...news } as NewsDetail;
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <AuthContext.Provider value={auth}>
        <ToastProvider>
          <DialogProvider>
            <NewsLifecycleActions news={detail} />
          </DialogProvider>
        </ToastProvider>
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
}

describe('NewsLifecycleActions — RBAC', () => {
  it('Publisher sees edit, publish, and archive', () => {
    renderAs('publisher');
    expect(screen.getByRole('link', { name: /edit/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Publish' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Archive' })).toBeInTheDocument();
  });

  it('Content Editor sees only edit — publish/archive are hidden', () => {
    renderAs('content_editor');
    expect(screen.getByRole('link', { name: /edit/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Publish' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Archive' })).not.toBeInTheDocument();
  });

  it('Super Admin (wildcard) sees the full action set', () => {
    renderAs('super_admin');
    expect(screen.getByRole('button', { name: 'Publish' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Archive' })).toBeInTheDocument();
  });

  it('shows Restore (not Archive) for an archived record', () => {
    renderAs('publisher', { publication_state: 'archived' });
    expect(screen.getByRole('button', { name: 'Restore' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Archive' })).not.toBeInTheDocument();
  });
});
