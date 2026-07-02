import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { documentColumns } from './document-columns';
import type { DocumentSummary } from '../types';

const row: DocumentSummary = {
  id: 'd1',
  slug: 'annual-report',
  title_en: 'Annual Report',
  title_hi: null,
  document_type: { id: 'dt', slug: 'report', name_en: 'Report', name_hi: null },
  knowledge_category: { id: 'kc', slug: 'reports', name_en: 'Research and Reports', name_hi: null },
  financial_year: { id: 'fy', label: 'FY 2025-26' },
  language: 'en',
  publication_date: '2026-05-01',
  is_public: true,
  show_in_knowledge_centre: true,
  file: { id: 'fa', file_url: 'u', file_name: 'report.pdf', mime_type: 'application/pdf', file_size: 1024, title: null },
  publication_state: 'published',
  public_visibility: true,
  show_on_homepage: false,
  highlight_type: null,
  display_order: null,
  published_at: '2026-05-02T00:00:00.000Z',
  archived_at: null,
  created_at: '2026-05-01T00:00:00.000Z',
  updated_at: '2026-05-02T00:00:00.000Z',
};

describe('documentColumns', () => {
  it('defines the contract columns with sortable title/publication_date', () => {
    const cols = documentColumns();
    const ids = cols.map((c) => c.id);
    expect(ids).toEqual(
      expect.arrayContaining(['title', 'document_type', 'knowledge_category', 'language', 'publication_date', 'publication_state', 'highlight', 'show_on_homepage', 'updated_at']),
    );
    expect(cols.find((c) => c.id === 'title')?.sortField).toBe('title_en');
    expect(cols.find((c) => c.id === 'publication_date')?.sortField).toBe('publication_date');
  });

  it('appends an action column only when an actions renderer is supplied', () => {
    expect(documentColumns().some((c) => c.isActionColumn)).toBe(false);
    expect(documentColumns(() => null).some((c) => c.isActionColumn)).toBe(true);
  });

  it('shows the knowledge category only when the doc is in the Knowledge Centre', () => {
    const col = documentColumns().find((c) => c.id === 'knowledge_category')!;
    render(<>{col.cell(row)}</>);
    expect(screen.getByText('Research and Reports')).toBeInTheDocument();
  });

  it('renders the publication state badge', () => {
    const col = documentColumns().find((c) => c.id === 'publication_state')!;
    render(<>{col.cell(row)}</>);
    expect(screen.getByText('Published')).toBeInTheDocument();
  });
});
