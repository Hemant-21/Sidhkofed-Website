import { describe, it, expect } from 'vitest';
import {
  buildProgrammePayload,
  emptyProgrammeForm,
  programmeToForm,
  type ProgrammeFormValues,
} from './programme-form-payload';
import type { ProgrammeDetail } from './types';

const base = (): ProgrammeFormValues => ({ ...emptyProgrammeForm(), title_en: '  MFP Value Chain  ' });

describe('buildProgrammePayload', () => {
  it('trims title_en and nulls empty optional fields', () => {
    const payload = buildProgrammePayload(base());
    expect(payload.title_en).toBe('MFP Value Chain');
    expect(payload.short_code).toBeNull();
    expect(payload.funding_source).toBeNull();
    expect(payload.start_date).toBeNull();
    expect(payload.end_date).toBeNull();
    expect(payload.cover_media_id).toBeNull();
    expect(payload.commodity_ids).toEqual([]);
    expect(payload.permitted_training_type_ids).toEqual([]);
  });

  it('sends start/end as calendar dates (not ISO timestamps)', () => {
    const payload = buildProgrammePayload({ ...base(), start_date: '2026-04-01', end_date: '2027-03-31' });
    expect(payload.start_date).toBe('2026-04-01');
    expect(payload.end_date).toBe('2027-03-31');
  });

  it('only sends the highlight window with a highlight type, widened to ISO', () => {
    const off = buildProgrammePayload({ ...base(), highlight_start_at: '2026-01-01' });
    expect(off.highlight_type).toBeNull();
    expect(off.highlight_start_at).toBeNull();

    const on = buildProgrammePayload({ ...base(), highlight_type: 'new', highlight_start_at: '2026-01-01', highlight_end_at: '2026-02-01' });
    expect(on.highlight_type).toBe('new');
    expect(on.highlight_start_at).toBe('2026-01-01T00:00:00.000Z');
    expect(on.highlight_end_at).toBe('2026-02-01T00:00:00.000Z');
  });

  it('coerces display_order to number or null', () => {
    expect(buildProgrammePayload({ ...base(), display_order: '5' }).display_order).toBe(5);
    expect(buildProgrammePayload({ ...base(), display_order: '' }).display_order).toBeNull();
  });

  it('never produces server-managed fields', () => {
    const payload = buildProgrammePayload(base()) as Record<string, unknown>;
    expect(payload).not.toHaveProperty('slug');
    expect(payload).not.toHaveProperty('publication_state');
  });
});

describe('programmeToForm', () => {
  it('maps detail masters back to id arrays and dates to YYYY-MM-DD', () => {
    const detail = {
      ...emptyDetail(),
      commodities: [{ id: 'c1', slug: 'lac', name_en: 'Lac', name_hi: null }],
      permitted_training_types: [{ id: 't1', slug: 'skill', name_en: 'Skill', name_hi: null }],
      start_date: '2026-04-01',
      end_date: '2027-03-31',
    } as ProgrammeDetail;
    const form = programmeToForm(detail);
    expect(form.commodity_ids).toEqual(['c1']);
    expect(form.permitted_training_type_ids).toEqual(['t1']);
    expect(form.start_date).toBe('2026-04-01');
    expect(form.end_date).toBe('2027-03-31');
  });
});

function emptyDetail(): ProgrammeDetail {
  return {
    id: 'p1',
    slug: 'mfp',
    title_en: 'MFP',
    title_hi: null,
    short_code: null,
    summary_en: null,
    funding_source: null,
    start_date: null,
    end_date: null,
    cover_media: null,
    publication_state: 'draft',
    public_visibility: false,
    show_on_homepage: false,
    highlight_type: null,
    display_order: null,
    published_at: null,
    archived_at: null,
    created_at: '',
    updated_at: '',
    summary_hi: null,
    description_en: null,
    description_hi: null,
    objectives_en: null,
    objectives_hi: null,
    eligibility_en: null,
    eligibility_hi: null,
    benefits_en: null,
    benefits_hi: null,
    application_process_en: null,
    application_process_hi: null,
    commodities: [],
    permitted_training_types: [],
    publish_start_at: null,
    highlight_start_at: null,
    highlight_end_at: null,
    created_by: null,
    updated_by: null,
    public_url: '/programmes/mfp',
  };
}
