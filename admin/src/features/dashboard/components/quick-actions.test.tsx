import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

const { canAnyMock, hasRoleMock } = vi.hoisted(() => ({
  canAnyMock: vi.fn(),
  hasRoleMock: vi.fn(),
}));

vi.mock('@/hooks/use-permissions', () => ({
  usePermissions: () => ({ canAny: canAnyMock, hasRole: hasRoleMock }),
}));

import { QuickActions } from './quick-actions';

describe('QuickActions (permission-aware)', () => {
  beforeEach(() => {
    canAnyMock.mockReset();
    hasRoleMock.mockReset();
  });

  it('hides every create shortcut when the user holds no permissions', () => {
    canAnyMock.mockReturnValue(false);
    hasRoleMock.mockReturnValue(false);

    render(<QuickActions />);

    expect(screen.queryByText('Create Event')).not.toBeInTheDocument();
    expect(screen.getByText(/No quick actions available/i)).toBeInTheDocument();
  });

  it('shows a create shortcut only when the user holds a qualifying permission', () => {
    // Grant content.create/update (events, documents, institutions), nothing else.
    canAnyMock.mockImplementation((perms: string[]) => perms.includes('content.create'));
    hasRoleMock.mockReturnValue(false);

    render(<QuickActions />);

    expect(screen.getByText('Create Event')).toBeInTheDocument();
    expect(screen.getByText('Upload Document')).toBeInTheDocument();
    // No programmes.create grant → hidden.
    expect(screen.queryByText('Create Programme')).not.toBeInTheDocument();
    // Read-only "Open Media" is role-gated, role denied → hidden.
    expect(screen.queryByText('Open Media')).not.toBeInTheDocument();
  });

  it('shows the read-only Media shortcut for any CMS role', () => {
    canAnyMock.mockReturnValue(false);
    hasRoleMock.mockReturnValue(true);

    render(<QuickActions />);
    expect(screen.getByText('Open Media')).toBeInTheDocument();
  });
});
