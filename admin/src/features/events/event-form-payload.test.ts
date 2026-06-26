import { describe, expect, it } from 'vitest';
import {
  buildDynamicValues,
  buildEventPayload,
  emptyEventForm,
  eventToForm,
  type EventFormValues,
} from './event-form-payload';
import type { EventDetail, EventFieldDefinition } from './types';

const defs: EventFieldDefinition[] = [
  { id: 'd1', event_type_id: 't1', field_key: 'participant_count', label_en: 'Participants', label_hi: null, data_type: 'number', is_required: true, options: null, display_order: 0, is_active: true },
  { id: 'd2', event_type_id: 't1', field_key: 'is_commodity_specific', label_en: 'Commodity specific', label_hi: null, data_type: 'boolean', is_required: false, options: null, display_order: 1, is_active: true },
  { id: 'd3', event_type_id: 't1', field_key: 'mode', label_en: 'Mode', label_hi: null, data_type: 'select', is_required: false, options: ['a', 'b'], display_order: 2, is_active: true },
];

function values(overrides: Partial<EventFormValues> = {}): EventFormValues {
  return { ...emptyEventForm(), event_type_id: 't1', title_en: 'Lac training', start_date: '2026-07-15', ...overrides };
}

describe('buildDynamicValues', () => {
  it('coerces numbers from strings and keeps only defined keys', () => {
    const out = buildDynamicValues({ participant_count: '45', mode: 'a' }, defs);
    expect(out).toEqual({ participant_count: 45, mode: 'a' });
  });

  it('drops empty values (so required-field checks happen server-side)', () => {
    const out = buildDynamicValues({ participant_count: '', mode: '' }, defs);
    expect(out).toEqual({});
  });

  it('coerces booleans and ignores unknown keys', () => {
    const out = buildDynamicValues({ is_commodity_specific: true, unknown_key: 'x' }, defs);
    expect(out).toEqual({ is_commodity_specific: true });
  });

  it('leaves an invalid number as-is for the backend to reject', () => {
    const out = buildDynamicValues({ participant_count: 'abc' }, defs);
    expect(out).toEqual({ participant_count: 'abc' });
  });
});

describe('buildEventPayload', () => {
  it('converts empty strings to null and trims', () => {
    const p = buildEventPayload(values({ title_en: '  Lac  ', summary_en: '', district_id: '' }), []);
    expect(p.title_en).toBe('Lac');
    expect(p.summary_en).toBeNull();
    expect(p.district_id).toBeNull();
  });

  it('only sends end_date when the date mode requires it', () => {
    expect(buildEventPayload(values({ date_mode: 'single', end_date: '2026-07-20' }), []).end_date).toBeNull();
    expect(buildEventPayload(values({ date_mode: 'range', end_date: '2026-07-20' }), []).end_date).toBe('2026-07-20');
  });

  it('omits highlight window when no highlight is set', () => {
    const p = buildEventPayload(values({ highlight_type: '', highlight_start_at: '2026-01-01' }), []);
    expect(p.highlight_type).toBeNull();
    expect(p.highlight_start_at).toBeNull();
  });

  it('widens highlight + publish dates to ISO timestamps when a highlight is set', () => {
    const p = buildEventPayload(values({ highlight_type: 'featured', highlight_start_at: '2026-01-01', publish_start_at: '2026-02-01' }), []);
    expect(p.highlight_type).toBe('featured');
    expect(p.highlight_start_at).toBe('2026-01-01T00:00:00.000Z');
    expect(p.publish_start_at).toBe('2026-02-01T00:00:00.000Z');
  });

  it('parses display_order to a number or null', () => {
    expect(buildEventPayload(values({ display_order: '' }), []).display_order).toBeNull();
    expect(buildEventPayload(values({ display_order: '3' }), []).display_order).toBe(3);
  });

  it('never produces server-managed fields', () => {
    const p = buildEventPayload(values(), []) as Record<string, unknown>;
    expect(p.slug).toBeUndefined();
    expect(p.publication_state).toBeUndefined();
    expect(p.created_by).toBeUndefined();
  });
});

describe('eventToForm / emptyEventForm', () => {
  it('produces an empty form with single date mode', () => {
    const f = emptyEventForm();
    expect(f.date_mode).toBe('single');
    expect(f.commodity_ids).toEqual([]);
    expect(f.cover_media_id).toBeNull();
  });

  it('hydrates from an event detail (ids + relation arrays)', () => {
    const detail = {
      event_type: { id: 'et1', slug: 't', name_en: 'Training', name_hi: null },
      training_type: null,
      title_en: 'Lac',
      title_hi: 'लाख',
      summary_en: 'S',
      summary_hi: null,
      description_en: null,
      description_hi: null,
      date_mode: 'range',
      start_date: '2026-07-15',
      end_date: '2026-07-16',
      location_text: 'Gumla',
      district: { id: 'dist1', slug: 'gumla', name_en: 'Gumla', name_hi: null },
      block: null,
      cover_media: { id: 'm1', url: 'http://x/y.jpg' },
      commodities: [{ id: 'c1', slug: 'lac', name_en: 'Lac', name_hi: null }],
      programmes: [{ id: 'p1', slug: 'mfp', title_en: 'MFP', title_hi: null, short_code: null }],
      institutions: [],
      documents: [],
      galleries: [],
      news: [],
      dynamic_values: { participant_count: 45 },
      public_visibility: true,
      show_on_homepage: false,
      highlight_type: null,
      highlight_start_at: null,
      highlight_end_at: null,
      display_order: 2,
      publish_start_at: null,
    } as unknown as EventDetail;
    const f = eventToForm(detail);
    expect(f.event_type_id).toBe('et1');
    expect(f.date_mode).toBe('range');
    expect(f.commodity_ids).toEqual(['c1']);
    expect(f.programme_ids).toEqual(['p1']);
    expect(f.cover_media_id).toBe('m1');
    expect(f.display_order).toBe('2');
    expect(f.dynamic_values).toEqual({ participant_count: 45 });
  });
});
