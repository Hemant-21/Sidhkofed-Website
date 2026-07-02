import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HighlightBadge, StatusBadge } from './badge';

describe('HighlightBadge', () => {
  it('renders a humanized label and nothing for null', () => {
    const { container, rerender } = render(<HighlightBadge type="important" />);
    expect(screen.getByText('Important')).toBeInTheDocument();
    rerender(<HighlightBadge type={null} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe('StatusBadge', () => {
  it('renders status text (never colour-only) for accessibility', () => {
    render(<StatusBadge status="completed" />);
    expect(screen.getByText('Completed')).toBeInTheDocument();
  });
});
