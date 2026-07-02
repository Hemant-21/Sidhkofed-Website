import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Dropdown } from './dropdown';
import { Button } from './button';

/**
 * Accessibility regression (Phase 15.6 audit — Issue 5). The Dropdown must NOT wrap its trigger in
 * a second <button> (no nested interactive elements). The toggle ARIA + click are merged onto the
 * single trigger element via Slot, and keyboard/screen-reader behaviour is preserved.
 */

function renderDropdown() {
  return render(
    <Dropdown
      trigger={<Button>Open menu</Button>}
      items={[
        { label: 'Edit', onSelect: () => {} },
        { separator: true },
        { label: 'Delete', danger: true, onSelect: () => {} },
      ]}
    />,
  );
}

describe('<Dropdown> accessibility', () => {
  it('renders the trigger as a single button with no nested interactive element', () => {
    renderDropdown();
    const trigger = screen.getByRole('button', { name: 'Open menu' });
    // The toggle ARIA is on the trigger element itself…
    expect(trigger).toHaveAttribute('aria-haspopup', 'menu');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    // …and there is NO button nested inside it (the previous bug wrapped the trigger in a button).
    expect(trigger.querySelector('button')).toBeNull();
    // Exactly one button exists while closed (the trigger).
    expect(screen.getAllByRole('button')).toHaveLength(1);
  });

  it('opens the menu on click and exposes role=menu / role=menuitem', async () => {
    const user = userEvent.setup();
    renderDropdown();
    const trigger = screen.getByRole('button', { name: 'Open menu' });

    await user.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('menu')).toBeInTheDocument();
    expect(screen.getAllByRole('menuitem')).toHaveLength(2);
  });

  it('is keyboard-operable: focus + Enter opens, Escape closes', async () => {
    const user = userEvent.setup();
    renderDropdown();
    const trigger = screen.getByRole('button', { name: 'Open menu' });

    await user.tab();
    expect(trigger).toHaveFocus();

    await user.keyboard('{Enter}');
    expect(screen.getByRole('menu')).toBeInTheDocument();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });
});
