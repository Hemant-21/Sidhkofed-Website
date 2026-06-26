/**
 * Page-level RBAC tests for the Super-Admin-only administration pages. Each page renders the shared
 * ForbiddenState for a non-Super-Admin user and renders its real heading for a Super Admin — proving
 * the affordance is gated (the backend remains the security boundary). Data hooks are mocked so the
 * assertions are deterministic and network-free.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthContext, type AuthContextValue } from '@/providers/auth-provider';
import { ToastProvider } from '@/providers/toast-provider';
import type { AuthUser } from '@/types/auth';

// Mock next/navigation: the list pages use the URL-synced filter framework.
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

// Mock the data layers so no request is attempted during render.
vi.mock('@/features/settings/api', () => ({
  SETTINGS_QUERY_KEY: ['settings', 'all'],
  fetchSettings: vi.fn().mockResolvedValue({ groups: {} }),
  updateSetting: vi.fn(),
}));

import { SettingsPage } from '@/features/settings';
import { AuditLogPage } from '@/features/audit-log';
import { UserListPage } from '@/features/users';

function user(roles: string[]): AuthUser {
  return { id: 'u1', email: 'a@b.c', full_name: 'Test', preferred_language: 'en', is_active: true, roles, permissions: [] };
}

function renderAs(ui: ReactNode, roles: string[]) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const value = {
    user: user(roles),
    status: 'authenticated',
    isAuthenticated: true,
    isLoading: false,
    login: async () => user(roles),
    logout: async () => {},
    refreshUser: async () => {},
  } as AuthContextValue;
  return render(
    <QueryClientProvider client={client}>
      <ToastProvider>
        <AuthContext.Provider value={value}>{ui}</AuthContext.Provider>
      </ToastProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => vi.clearAllMocks());

describe.each([
  ['Settings', () => <SettingsPage />, 'Settings'],
  ['Audit Log', () => <AuditLogPage />, 'Audit Log'],
  ['Users', () => <UserListPage />, 'Users'],
])('%s page RBAC', (_label, Page, heading) => {
  it('shows ForbiddenState for a non-Super-Admin', () => {
    renderAs(<Page />, ['content_editor']);
    expect(screen.getByText('Access denied')).toBeInTheDocument();
  });

  it('renders the page heading for a Super Admin', () => {
    renderAs(<Page />, ['super_admin']);
    expect(screen.getByRole('heading', { name: heading })).toBeInTheDocument();
    expect(screen.queryByText('Access denied')).not.toBeInTheDocument();
  });
});
