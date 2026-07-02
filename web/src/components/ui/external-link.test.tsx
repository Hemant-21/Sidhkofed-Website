import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ExternalLink } from './external-link';

describe('ExternalLink', () => {
  it('opens safely in a new tab and announces it to screen readers', () => {
    render(<ExternalLink href="https://gem.gov.in">View on GeM</ExternalLink>);
    const link = screen.getByRole('link', { name: /View on GeM/ });
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    expect(screen.getByText(/opens in a new tab/i)).toBeInTheDocument();
  });
});
