import type { ReactNode } from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GraduationCap } from 'lucide-react';
import { LanguageProvider } from '@/providers/language-provider';
import { CategoryCards, type CategoryCardDef } from './category-cards';

function withLang(ui: ReactNode) {
  return render(<LanguageProvider>{ui}</LanguageProvider>);
}

const categories: CategoryCardDef[] = [
  {
    icon: <GraduationCap className="h-5 w-5 text-primary" aria-hidden="true" />,
    titleKey: 'page.activities.trainings.title',
    descriptionKey: 'page.activities.trainings.subtitle',
    href: '/activities?event_type=training#listing',
  },
];

describe('CategoryCards', () => {
  it('renders a same-page link carrying the filter query param, not a separate route', () => {
    withLang(<CategoryCards categories={categories} />);
    const link = screen.getByRole('link', { name: /Trainings & Capacity Building/ });
    expect(link).toHaveAttribute('href', '/activities?event_type=training#listing');
    expect(screen.getByText('Training programmes building skills and capacity across cooperative members.')).toBeInTheDocument();
  });
});
