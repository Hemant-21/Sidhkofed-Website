import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthContext, type AuthContextValue } from '@/providers/auth-provider';
import { ToastProvider } from '@/providers/toast-provider';
import { DialogProvider } from '@/providers/dialog-provider';
import type { AuthUser } from '@/types/auth';
import { TenderLifecycleActions } from './tender-lifecycle-actions';
import type { TenderDetail } from '../types';

/**
 * RBAC regression (Phase 15.6 audit — Issue 3). Tenders are authorized with the SHARED `content.*`
 * permission set (tenders.routes.ts); `tenders.*` keys are never seeded, so the affordances must
 * resolve against `content.publish`/`content.archive`/….
 */

const ROLE_FIXTURES = {
  super_admin: { roles: ['super_admin'], permissions: ['*'] },
  content_editor: { roles: ['content_editor'], permissions: ['content.create', 'content.update', 'masters.view'] },
  publisher: {
    roles: ['publisher'],
    permissions: [
      'content.publish',
      'content.unpublish',
      'content.archive',
      'content.restore',
      'content.update',
      'masters.view',
    ],
  },
};

function renderAs(role: keyof typeof ROLE_FIXTURES, tender: Partial<TenderDetail> = {}) {
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
  const detail = { id: 't1', publication_state: 'draft', ...tender } as TenderDetail;
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <AuthContext.Provider value={auth}>
        <ToastProvider>
          <DialogProvider>
            <TenderLifecycleActions tender={detail} />
          </DialogProvider>
        </ToastProvider>
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
}

describe('TenderLifecycleActions — RBAC', () => {
  it('Publisher sees edit, publish, and archive (content.* keys resolve)', () => {
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
