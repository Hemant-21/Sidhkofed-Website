import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState, type ComponentProps, type ReactNode } from 'react';

/**
 * UI behaviour of the shared {@link RelationPicker}. The data hook ({@link useRelationSearch}) is
 * mocked here so the rendering states (loading / results / empty / error / pagination) are driven
 * deterministically — the hook's own server-side contract (search, pagination, archived scope) is
 * verified separately in relation-search.test.ts against a mocked `getList`.
 */

type Page = { items: Array<{ id: string; slug: string; title_en?: string; name_en?: string }>; pagination: unknown };

const { searchMock } = vi.hoisted(() => ({ searchMock: vi.fn() }));

vi.mock('./relation-search', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./relation-search')>();
  return { ...actual, useRelationSearch: searchMock };
});

import { RelationPicker } from './relation-picker';

/** Build a fake useInfiniteQuery-shaped result. */
function result(over: Partial<ReturnType<typeof base>> = {}) {
  return { ...base(), ...over };
}
function base() {
  return {
    data: { pages: [] as Page[] },
    isLoading: false,
    isError: false,
    error: null as unknown,
    hasNextPage: false,
    isFetchingNextPage: false,
    fetchNextPage: vi.fn(),
    refetch: vi.fn(),
  };
}
const page = (items: Page['items']): Page => ({ items, pagination: {} });

function renderPicker(ui: ReactNode) {
  return render(<>{ui}</>);
}

function Harness(props: Partial<ComponentProps<typeof RelationPicker>> & { multiple?: boolean }) {
  const [value, setValue] = useState<string[]>(props.value ?? []);
  return (
    <RelationPicker resource="programmes" placeholder="Select…" {...props} value={value} onChange={setValue} />
  );
}

describe('<RelationPicker>', () => {
  beforeEach(() => searchMock.mockReset());

  it('shows a loading state while the first page is in flight', async () => {
    searchMock.mockReturnValue(result({ isLoading: true }));
    const user = userEvent.setup();
    renderPicker(<Harness />);

    await user.click(screen.getByRole('combobox'));
    expect(screen.getByText('Loading…')).toBeInTheDocument();
  });

  it('renders server results and exposes accessible combobox/listbox roles', async () => {
    searchMock.mockReturnValue(result({ data: { pages: [page([{ id: '1', slug: 'a', title_en: 'Alpha' }])] } }));
    const user = userEvent.setup();
    renderPicker(<Harness />);

    const trigger = screen.getByRole('combobox');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await user.click(trigger);

    expect(screen.getByRole('listbox')).toBeInTheDocument();
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('option', { name: 'Alpha' })).toHaveAttribute('aria-selected', 'false');
  });

  it('selects an option in multi mode (marks it selected, keeps the list open)', async () => {
    searchMock.mockReturnValue(result({ data: { pages: [page([{ id: '1', slug: 'a', title_en: 'Alpha' }])] } }));
    const user = userEvent.setup();
    renderPicker(<Harness multiple />);

    await user.click(screen.getByRole('combobox'));
    await user.click(screen.getByRole('option', { name: 'Alpha' }));

    await waitFor(() =>
      expect(screen.getByRole('option', { name: 'Alpha' })).toHaveAttribute('aria-selected', 'true'),
    );
    expect(screen.getByRole('listbox')).toBeInTheDocument(); // multi keeps it open
  });

  it('closes after a single-select pick and shows the chosen label in the trigger', async () => {
    searchMock.mockReturnValue(result({ data: { pages: [page([{ id: '1', slug: 'a', title_en: 'Alpha' }])] } }));
    const user = userEvent.setup();
    renderPicker(<Harness multiple={false} />);

    await user.click(screen.getByRole('combobox'));
    await user.click(screen.getByRole('option', { name: 'Alpha' }));

    await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument());
    expect(within(screen.getByRole('combobox')).getByText('Alpha')).toBeInTheDocument();
  });

  it('renders preselected chips from initialOptions without opening/fetching', () => {
    searchMock.mockReturnValue(result());
    renderPicker(<Harness value={['x']} initialOptions={[{ value: 'x', label: 'Existing link' }]} />);
    expect(within(screen.getByRole('combobox')).getByText('Existing link')).toBeInTheDocument();
  });

  it('shows an empty state when the server returns no matches', async () => {
    searchMock.mockReturnValue(result({ data: { pages: [page([])] } }));
    const user = userEvent.setup();
    renderPicker(<Harness />);

    await user.click(screen.getByRole('combobox'));
    expect(screen.getByText('No matches')).toBeInTheDocument();
  });

  it('shows an error state with retry when the request fails', async () => {
    const refetch = vi.fn();
    searchMock.mockReturnValue(result({ isError: true, error: new Error('boom'), refetch }));
    const user = userEvent.setup();
    renderPicker(<Harness />);

    await user.click(screen.getByRole('combobox'));
    expect(screen.getByRole('alert')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /try again/i }));
    expect(refetch).toHaveBeenCalled();
  });

  it('is inert when disabled (does not open)', async () => {
    searchMock.mockReturnValue(result({ data: { pages: [page([{ id: '1', slug: 'a', title_en: 'Alpha' }])] } }));
    const user = userEvent.setup();
    renderPicker(<Harness disabled />);

    const trigger = screen.getByRole('combobox');
    expect(trigger).toBeDisabled();
    await user.click(trigger);
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('closes the popover on Escape (keyboard a11y)', async () => {
    searchMock.mockReturnValue(result({ data: { pages: [page([{ id: '1', slug: 'a', title_en: 'Alpha' }])] } }));
    const user = userEvent.setup();
    renderPicker(<Harness />);

    await user.click(screen.getByRole('combobox'));
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument());
  });

  it('paginates: shows "Load more" and requests the next page on click', async () => {
    const fetchNextPage = vi.fn();
    searchMock.mockReturnValue(
      result({ data: { pages: [page([{ id: '1', slug: 'a', title_en: 'Alpha' }])] }, hasNextPage: true, fetchNextPage }),
    );
    const user = userEvent.setup();
    renderPicker(<Harness />);

    await user.click(screen.getByRole('combobox'));
    await user.click(screen.getByRole('button', { name: /load more/i }));
    expect(fetchNextPage).toHaveBeenCalled();
  });
});
