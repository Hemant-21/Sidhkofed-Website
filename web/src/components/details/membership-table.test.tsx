import type { ReactNode } from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LanguageProvider } from '@/providers/language-provider';
import { MembershipTable } from './membership-table';
import type { MembershipSummary } from '@/lib/types/content';

function withLang(ui: ReactNode) {
  return render(<LanguageProvider>{ui}</LanguageProvider>);
}

const sample: MembershipSummary[] = [
  {
    id: '1',
    slug: 'lamps-gumla',
    institution: { id: 'i1', slug: 'lamps-gumla', name_en: 'LAMPS Gumla', name_hi: null },
    membership_level: 'sidhkofed',
    membership_type: 'primary',
    membership_number: 'M-001',
    district: { id: 'd1', slug: 'gumla', name_en: 'Gumla', name_hi: null },
    district_union: null,
    reporting_period: null,
    status: 'active',
    join_date: '2025-04-01',
    primary_member_count: 0,
    nominal_member_count: 0,
    highlight_type: null,
    public_url: '/memberships/lamps-gumla',
  },
];

describe('MembershipTable', () => {
  it('renders an accessible table with the institution directory', () => {
    withLang(<MembershipTable memberships={sample} />);
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /Institution/i })).toBeInTheDocument();
    expect(screen.getByText('LAMPS Gumla')).toBeInTheDocument();
    expect(screen.getByText('Sidhkofed')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('shows an empty message when there are no records', () => {
    withLang(<MembershipTable memberships={[]} />);
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });
});
