import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { eventColumns } from './event-columns';
import type { EventSummary } from '../types';

const row: EventSummary = {
  id: 'e1',
  slug: 'lac-training',
  title_en: 'Lac training',
  title_hi: null,
  summary_en: null,
  event_type: { id: 't', slug: 'training', name_en: 'Training', name_hi: null },
  event_status: 'scheduled',
  date_mode: 'single',
  start_date: '2026-07-15',
  end_date: null,
  location_text: 'Gumla',
  district: { id: 'd', slug: 'gumla', name_en: 'Gumla', name_hi: null },
  cover_media: null,
  highlight_type: null,
  display_order: null,
  show_on_homepage: false,
  publication_state: 'draft',
  public_visibility: false,
  published_at: null,
  archived_at: null,
  created_at: '2026-06-01T00:00:00.000Z',
  updated_at: '2026-06-02T00:00:00.000Z',
};

describe('eventColumns', () => {
  it('defines the required columns with a sortable start date', () => {
    const cols = eventColumns();
    const ids = cols.map((c) => c.id);
    expect(ids).toEqual(
      expect.arrayContaining(['title', 'event_type', 'status', 'start_date', 'end_date', 'district', 'publication_state', 'highlight', 'show_on_homepage', 'updated_at']),
    );
    expect(cols.find((c) => c.id === 'start_date')?.sortField).toBe('start_date');
  });

  it('appends an action column only when an actions renderer is supplied', () => {
    expect(eventColumns().some((c) => c.isActionColumn)).toBe(false);
    expect(eventColumns(() => null).some((c) => c.isActionColumn)).toBe(true);
  });

  it('renders the backend status as a read-only "Upcoming" label for scheduled', () => {
    const status = eventColumns().find((c) => c.id === 'status')!;
    render(<>{status.cell(row)}</>);
    expect(screen.getByText('Upcoming')).toBeInTheDocument();
  });

  it('renders the publication state badge', () => {
    const state = eventColumns().find((c) => c.id === 'publication_state')!;
    render(<>{state.cell(row)}</>);
    expect(screen.getByText('Draft')).toBeInTheDocument();
  });
});
