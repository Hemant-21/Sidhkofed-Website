import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { AuthContext, type AuthContextValue } from '@/providers/auth-provider';
import type { AuthUser } from '@/types/auth';
import { Can } from './can';

function renderWithPermissions(ui: ReactNode, permissions: string[], roles: string[] = []) {
  const user: AuthUser = {
    id: 'u1',
    email: 'a@b.c',
    full_name: 'Test User',
    preferred_language: 'en',
    is_active: true,
    roles,
    permissions,
  };
  const value: AuthContextValue = {
    user,
    status: 'authenticated',
    isAuthenticated: true,
    isLoading: false,
    login: async () => user,
    logout: async () => {},
    refreshUser: async () => {},
  };
  return render(<AuthContext.Provider value={value}>{ui}</AuthContext.Provider>);
}

describe('<Can>', () => {
  it('renders children when the permission is granted', () => {
    renderWithPermissions(<Can permission="events.publish">Publish</Can>, ['events.publish']);
    expect(screen.getByText('Publish')).toBeInTheDocument();
  });

  it('hides children (renders fallback) when the permission is missing', () => {
    renderWithPermissions(
      <Can permission="events.publish" fallback={<span>denied</span>}>
        Publish
      </Can>,
      ['events.view'],
    );
    expect(screen.queryByText('Publish')).not.toBeInTheDocument();
    expect(screen.getByText('denied')).toBeInTheDocument();
  });

  it('supports anyOf semantics', () => {
    renderWithPermissions(<Can anyOf={['a.b', 'events.update']}>Edit</Can>, ['events.update']);
    expect(screen.getByText('Edit')).toBeInTheDocument();
  });

  it('honors role-based affordances', () => {
    renderWithPermissions(<Can role="super_admin">Admin</Can>, [], ['super_admin']);
    expect(screen.getByText('Admin')).toBeInTheDocument();
  });
});
