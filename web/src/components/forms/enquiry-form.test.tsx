import type { ReactNode } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LanguageProvider } from '@/providers/language-provider';
import { EnquiryForm } from './enquiry-form';
import type { MasterRef } from '@/lib/types/api';

vi.mock('@/lib/api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api/client')>();
  return { ...actual, postOne: vi.fn() };
});

import { postOne, ClientApiError } from '@/lib/api/client';

const postOneMock = vi.mocked(postOne);

function withLang(ui: ReactNode) {
  return render(<LanguageProvider>{ui}</LanguageProvider>);
}

const enquiryTypes: MasterRef[] = [
  { id: 'type-buyer', slug: 'buyer', name_en: 'Buyer enquiry', name_hi: null },
  { id: 'type-seller', slug: 'seller', name_en: 'Seller enquiry', name_hi: null },
];

async function fillRequiredFields(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Full name'), 'Test User');
  await user.type(screen.getByLabelText('Mobile number'), '9876543210');
  await user.type(screen.getByLabelText('Email address'), 'test@example.com');
  await user.selectOptions(screen.getByLabelText('Enquiry type'), 'type-buyer');
  await user.type(screen.getByLabelText('Subject'), 'Selling mahua');
  await user.type(screen.getByLabelText('Message'), 'I would like to sell mahua flowers.');
}

describe('EnquiryForm', () => {
  beforeEach(() => {
    postOneMock.mockReset();
  });

  it('renders the honeypot field hidden from view', () => {
    withLang(<EnquiryForm enquiryTypes={enquiryTypes} />);
    const honeypot = screen.getByLabelText('Website') as HTMLInputElement;
    expect(honeypot).toBeInTheDocument();
    expect(honeypot.tabIndex).toBe(-1);
    expect(honeypot.closest('[aria-hidden="true"]')).not.toBeNull();
  });

  it('shows a fallback notice instead of the form when no enquiry types are available', () => {
    withLang(<EnquiryForm enquiryTypes={[]} />);
    expect(screen.queryByLabelText('Full name')).not.toBeInTheDocument();
    expect(screen.getByText(/temporarily unavailable/i)).toBeInTheDocument();
  });

  it('submits the enquiry and shows a success confirmation', async () => {
    postOneMock.mockResolvedValue({ id: 'enq-1', submitted_at: '2026-07-08T00:00:00.000Z' });
    const user = userEvent.setup();
    withLang(<EnquiryForm enquiryTypes={enquiryTypes} />);

    await fillRequiredFields(user);
    await user.click(screen.getByRole('button', { name: /submit enquiry/i }));

    await waitFor(() => expect(screen.getByText('Enquiry submitted')).toBeInTheDocument());
    expect(postOneMock).toHaveBeenCalledWith(
      '/public/enquiries',
      expect.objectContaining({
        name: 'Test User',
        mobile: '9876543210',
        email: 'test@example.com',
        enquiry_type_id: 'type-buyer',
        subject: 'Selling mahua',
        message: 'I would like to sell mahua flowers.',
      }),
    );
  });

  it('surfaces per-field validation errors returned by the backend', async () => {
    postOneMock.mockRejectedValue(
      new ClientApiError(422, 'validation_error', 'Validation failed', {
        subject: ['Subject is required.'],
      }),
    );
    const user = userEvent.setup();
    withLang(<EnquiryForm enquiryTypes={enquiryTypes} />);

    await fillRequiredFields(user);
    await user.click(screen.getByRole('button', { name: /submit enquiry/i }));

    await waitFor(() => expect(screen.getByText('Subject is required.')).toBeInTheDocument());
    expect(screen.getByText(/correct the highlighted fields/i)).toBeInTheDocument();
  });

  it('shows a rate-limit specific message', async () => {
    postOneMock.mockRejectedValue(new ClientApiError(429, 'rate_limited', 'Too many requests'));
    const user = userEvent.setup();
    withLang(<EnquiryForm enquiryTypes={enquiryTypes} />);

    await fillRequiredFields(user);
    await user.click(screen.getByRole('button', { name: /submit enquiry/i }));

    await waitFor(() =>
      expect(screen.getByText(/submitted several enquiries recently/i)).toBeInTheDocument(),
    );
  });

  it('omits the Commodity field when no commodities are provided (e.g. /contact)', () => {
    withLang(<EnquiryForm enquiryTypes={enquiryTypes} />);
    expect(screen.queryByLabelText(/commodity/i)).not.toBeInTheDocument();
  });

  it('shows the Commodity field and includes commodity_id in the payload when provided (e.g. procurement page)', async () => {
    postOneMock.mockResolvedValue({ id: 'enq-2', submitted_at: '2026-07-08T00:00:00.000Z' });
    const commodities: MasterRef[] = [{ id: 'comm-mahua', slug: 'mahua', name_en: 'Mahua', name_hi: null }];
    const user = userEvent.setup();
    withLang(<EnquiryForm enquiryTypes={enquiryTypes} commodities={commodities} />);

    await fillRequiredFields(user);
    await user.selectOptions(screen.getByLabelText(/commodity/i), 'comm-mahua');
    await user.click(screen.getByRole('button', { name: /submit enquiry/i }));

    await waitFor(() => expect(screen.getByText('Enquiry submitted')).toBeInTheDocument());
    expect(postOneMock).toHaveBeenCalledWith(
      '/public/enquiries',
      expect.objectContaining({ commodity_id: 'comm-mahua' }),
    );
  });
});
