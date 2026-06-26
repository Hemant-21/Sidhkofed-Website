import { describe, it, expect } from 'vitest';
import {
  buildInstitutionPayload,
  emptyInstitutionForm,
  institutionToForm,
  type InstitutionFormValues,
} from './institution-form-payload';
import type { InstitutionDetail } from './types';

const base = (): InstitutionFormValues => ({
  ...emptyInstitutionForm(),
  institution_type_id: 'type-1',
  name_en: '  JSLPS  ',
});

describe('buildInstitutionPayload', () => {
  it('trims name_en and nulls empty optional fields', () => {
    const payload = buildInstitutionPayload(base());
    expect(payload.name_en).toBe('JSLPS');
    expect(payload.name_hi).toBeNull();
    expect(payload.description_en).toBeNull();
    expect(payload.website_url).toBeNull();
    expect(payload.district_id).toBeNull();
    expect(payload.contact_email).toBeNull();
    expect(payload.logo_media_id).toBeNull();
  });

  it('omits the highlight window when no highlight is set', () => {
    const payload = buildInstitutionPayload({ ...base(), highlight_start_at: '2026-01-01', highlight_end_at: '2026-02-01' });
    expect(payload.highlight_type).toBeNull();
    expect(payload.highlight_start_at).toBeNull();
    expect(payload.highlight_end_at).toBeNull();
  });

  it('sends the highlight window only with a highlight type, widened to ISO', () => {
    const payload = buildInstitutionPayload({
      ...base(),
      highlight_type: 'featured',
      highlight_start_at: '2026-01-01',
      highlight_end_at: '2026-02-01',
    });
    expect(payload.highlight_type).toBe('featured');
    expect(payload.highlight_start_at).toBe('2026-01-01T00:00:00.000Z');
    expect(payload.highlight_end_at).toBe('2026-02-01T00:00:00.000Z');
  });

  it('coerces display_order to a number or null', () => {
    expect(buildInstitutionPayload({ ...base(), display_order: '3' }).display_order).toBe(3);
    expect(buildInstitutionPayload({ ...base(), display_order: '' }).display_order).toBeNull();
  });

  it('never produces server-managed fields', () => {
    const payload = buildInstitutionPayload(base()) as Record<string, unknown>;
    expect(payload).not.toHaveProperty('slug');
    expect(payload).not.toHaveProperty('publication_state');
    expect(payload).not.toHaveProperty('created_by');
  });
});

describe('institutionToForm', () => {
  it('round-trips a detail payload into editable form values', () => {
    const detail = {
      id: 'i1',
      slug: 'jslps',
      name_en: 'JSLPS',
      name_hi: 'जेएसएलपीएस',
      institution_type: { id: 'type-1', slug: 'ngo', name_en: 'NGO', name_hi: null },
      district: { id: 'd1', slug: 'gumla', name_en: 'Gumla', name_hi: null },
      logo: { id: 'm1', url: 'https://x/y.png', file_name: 'y.png', mime_type: 'image/png', title: null, alt_text: null, caption: null, width: null, height: null },
      website_url: 'https://jslps.org',
      publication_state: 'published',
      public_visibility: true,
      show_on_homepage: true,
      highlight_type: null,
      display_order: 2,
      published_at: null,
      archived_at: null,
      created_at: '',
      updated_at: '',
      description_en: 'Desc',
      description_hi: null,
      address_en: 'Ranchi',
      address_hi: null,
      contact_email: 'a@b.org',
      contact_phone: '12345',
      publish_start_at: null,
      highlight_start_at: null,
      highlight_end_at: null,
      created_by: null,
      updated_by: null,
      public_url: '/institutions/jslps',
    } as InstitutionDetail;

    const form = institutionToForm(detail);
    expect(form.institution_type_id).toBe('type-1');
    expect(form.district_id).toBe('d1');
    expect(form.logo_media_id).toBe('m1');
    expect(form.website_url).toBe('https://jslps.org');
    expect(form.display_order).toBe('2');
    expect(form.contact_email).toBe('a@b.org');
  });
});
