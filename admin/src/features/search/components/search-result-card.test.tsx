import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SearchResultCard } from './search-result-card';
import { ROUTES } from '@/constants/routes';
import type { SearchResult } from '@/types/search';

const base: SearchResult = {
  content_type: 'event',
  id: 'evt-1',
  slug: 'lac-training',
  title_en: 'Lac cultivation training',
  title_hi: 'लाख प्रशिक्षण',
  summary: 'Two-day field training.',
  publication_date: '2026-02-10',
  cover_media: null,
  public_url: '/events/lac-training',
};

describe('SearchResultCard', () => {
  it('renders backend-provided fields and links to the admin record', () => {
    render(<SearchResultCard result={base} />);

    expect(screen.getByText('Lac cultivation training')).toBeInTheDocument();
    expect(screen.getByText('लाख प्रशिक्षण')).toBeInTheDocument();
    expect(screen.getByText('Two-day field training.')).toBeInTheDocument();

    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', `${ROUTES.events}/evt-1`);
  });

  it('omits optional fields the backend did not provide', () => {
    render(<SearchResultCard result={{ ...base, title_hi: null, summary: null }} />);
    expect(screen.queryByText('लाख प्रशिक्षण')).not.toBeInTheDocument();
    expect(screen.queryByText('Two-day field training.')).not.toBeInTheDocument();
  });
});
