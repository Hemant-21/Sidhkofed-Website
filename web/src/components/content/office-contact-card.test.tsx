import type { ReactNode } from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LanguageProvider } from '@/providers/language-provider';
import { OfficeContactCard } from './office-contact-card';
import type { PublicContactSettings } from '@/lib/types/settings';

function withLang(ui: ReactNode) {
  return render(<LanguageProvider>{ui}</LanguageProvider>);
}

const fullSettings: PublicContactSettings = {
  'contact.office_name': 'Sidho-Kanho Agriculture and Forest Produce State Cooperative Federation Ltd.',
  'contact.address': '1st Floor, Sameti Bhawan, Behind Krishi Bhawan, Kanke Road, Ranchi, Jharkhand – 834008',
  'contact.phone': '0651-2913142',
  'contact.email': 'sidhokanhofed@gmail.com',
  'contact.office_hours': 'Monday – Saturday, 10:00 AM – 5:00 PM',
  'contact.map_url': 'https://maps.app.goo.gl/hUMpwZStpAnDRwZs8',
};

describe('OfficeContactCard', () => {
  it('renders nothing when settings are null (fetch failed)', () => {
    const { container } = withLang(
      <OfficeContactCard settings={null} fallbackHeadingKey="contact.fallbackHeading.general" />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when every field is blank (Settings > Contact not filled in yet)', () => {
    const empty: PublicContactSettings = {
      'contact.office_name': '',
      'contact.address': '',
      'contact.phone': '',
      'contact.email': '',
      'contact.office_hours': '',
      'contact.map_url': '',
    };
    const { container } = withLang(
      <OfficeContactCard settings={empty} fallbackHeadingKey="contact.fallbackHeading.general" />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders the real office name, address, phone, email, hours, and map link when populated', () => {
    withLang(<OfficeContactCard settings={fullSettings} fallbackHeadingKey="contact.fallbackHeading.general" />);

    expect(
      screen.getByText('Sidho-Kanho Agriculture and Forest Produce State Cooperative Federation Ltd.'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('1st Floor, Sameti Bhawan, Behind Krishi Bhawan, Kanke Road, Ranchi, Jharkhand – 834008'),
    ).toBeInTheDocument();
    expect(screen.getByText('0651-2913142').closest('a')).toHaveAttribute('href', 'tel:06512913142');
    expect(screen.getByText('sidhokanhofed@gmail.com').closest('a')).toHaveAttribute(
      'href',
      'mailto:sidhokanhofed@gmail.com',
    );
    expect(screen.getByText('Monday – Saturday, 10:00 AM – 5:00 PM')).toBeInTheDocument();
    expect(screen.getByText('View on map').closest('a')).toHaveAttribute(
      'href',
      'https://maps.app.goo.gl/hUMpwZStpAnDRwZs8',
    );
  });

  it('falls back to the given heading key when Office Name is blank, and hides a blank map link', () => {
    const partial: PublicContactSettings = { ...fullSettings, 'contact.office_name': '', 'contact.map_url': '' };
    withLang(<OfficeContactCard settings={partial} fallbackHeadingKey="contact.fallbackHeading.procurement" />);

    expect(screen.getByText('SIDHKOFED Procurement Office')).toBeInTheDocument();
    expect(screen.queryByText('View on map')).not.toBeInTheDocument();
  });
});
