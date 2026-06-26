import { describe, it, expect } from 'vitest';
<<<<<<< HEAD
import { emptyMembershipForm, membershipToForm, buildMembershipPayload } from './membership-form-payload';
import type { MembershipDetail } from './types';

const detail: MembershipDetail = {
  id: 'm1',
  slug: 'jslps-membership',
  institution: { id: 'inst-1', slug: 'jslps', name_en: 'JSLPS', name_hi: null },
  membership_level: 'district_union',
  membership_type: 'primary',
  membership_number: 'DU-001',
  district: { id: 'd1', slug: 'ranchi', name_en: 'Ranchi', name_hi: null },
  district_union: { id: 'du-1', slug: 'ranchi-du', name_en: 'Ranchi DU', name_hi: null },
  reporting_period: null,
  status: 'active',
  join_date: '2026-01-15',
  publication_state: 'published',
  public_visibility: true,
  show_on_homepage: false,
  highlight_type: null,
  display_order: 3,
  published_at: '2026-02-01T00:00:00.000Z',
  archived_at: null,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
  notes_en: 'note',
  notes_hi: null,
  publish_start_at: null,
  highlight_start_at: null,
  highlight_end_at: null,
  created_by: null,
  updated_by: null,
};

describe('membership form payload', () => {
  it('builds an empty form with required defaults', () => {
    const f = emptyMembershipForm();
    expect(f.membership_level).toBe('sidhkofed');
    expect(f.membership_type).toBe('primary');
    expect(f.status).toBe('active');
  });

  it('maps a detail record to form values', () => {
    const f = membershipToForm(detail);
    expect(f.institution_id).toBe('inst-1');
    expect(f.district_union_id).toBe('du-1');
    expect(f.join_date).toBe('2026-01-15');
    expect(f.display_order).toBe('3');
  });

  it('builds a payload: empties → null, date → ISO, highlight windows omitted when no highlight', () => {
    const payload = buildMembershipPayload({ ...emptyMembershipForm(), institution_id: 'inst-1', join_date: '2026-03-01' });
    expect(payload.institution_id).toBe('inst-1');
    expect(payload.membership_number).toBeNull();
    expect(payload.join_date).toBe('2026-03-01T00:00:00.000Z');
    expect(payload.highlight_type).toBeNull();
    expect(payload.highlight_start_at).toBeNull();
    expect(payload.display_order).toBeNull();
  });

  it('sends highlight windows when a highlight is active', () => {
    const payload = buildMembershipPayload({
      ...emptyMembershipForm(),
      institution_id: 'inst-1',
      highlight_type: 'new',
      highlight_start_at: '2026-03-01',
      highlight_end_at: '2026-03-31',
    });
    expect(payload.highlight_type).toBe('new');
    expect(payload.highlight_start_at).toBe('2026-03-01T00:00:00.000Z');
    expect(payload.highlight_end_at).toBe('2026-03-31T00:00:00.000Z');
=======
import {
  buildMembershipPayload,
  emptyMembershipForm,
  membershipToForm,
  type MembershipFormValues,
} from './membership-form-payload';
import type { MembershipDetail } from './types';

const base = (): MembershipFormValues => ({
  ...emptyMembershipForm(),
  institution_id: 'inst-1',
  membership_level: 'sidhkofed',
  membership_type: 'primary',
});

describe('buildMembershipPayload', () => {
  it('maps required axes and nulls empty optionals', () => {
    const payload = buildMembershipPayload(base());
    expect(payload.institution_id).toBe('inst-1');
    expect(payload.membership_level).toBe('sidhkofed');
    expect(payload.membership_type).toBe('primary');
    expect(payload.membership_number).toBeNull();
    expect(payload.district_id).toBeNull();
    expect(payload.reporting_period_id).toBeNull();
    expect(payload.status).toBe('active');
  });

  it('drops district_union_id unless the level is district_union', () => {
    const sidh = buildMembershipPayload({ ...base(), district_union_id: 'du-1' });
    expect(sidh.district_union_id).toBeNull();

    const du = buildMembershipPayload({
      ...base(),
      membership_level: 'district_union',
      district_union_id: 'du-1',
    });
    expect(du.district_union_id).toBe('du-1');
  });

  it('sends empty membership_level/type as undefined (not empty string)', () => {
    const payload = buildMembershipPayload({ ...emptyMembershipForm(), institution_id: 'inst-1' });
    expect(payload.membership_level).toBeUndefined();
    expect(payload.membership_type).toBeUndefined();
  });

  it('keeps join_date as YYYY-MM-DD and widens publish/highlight to ISO only with a highlight', () => {
    const noHighlight = buildMembershipPayload({
      ...base(),
      join_date: '2026-04-01',
      publish_start_at: '2026-05-01',
      highlight_start_at: '2026-01-01',
    });
    expect(noHighlight.join_date).toBe('2026-04-01');
    expect(noHighlight.publish_start_at).toBe('2026-05-01T00:00:00.000Z');
    expect(noHighlight.highlight_type).toBeNull();
    expect(noHighlight.highlight_start_at).toBeNull();

    const withHighlight = buildMembershipPayload({
      ...base(),
      highlight_type: 'featured',
      highlight_start_at: '2026-01-01',
    });
    expect(withHighlight.highlight_type).toBe('featured');
    expect(withHighlight.highlight_start_at).toBe('2026-01-01T00:00:00.000Z');
  });

  it('coerces display_order to a number or null', () => {
    expect(buildMembershipPayload({ ...base(), display_order: '3' }).display_order).toBe(3);
    expect(buildMembershipPayload({ ...base(), display_order: '' }).display_order).toBeNull();
  });
});

describe('membershipToForm', () => {
  it('round-trips a detail into editable form values', () => {
    const detail = {
      id: 'm1',
      slug: 'jslps-membership',
      institution: { id: 'inst-1', slug: 'jslps', name_en: 'JSLPS', name_hi: null },
      membership_level: 'district_union',
      membership_type: 'nominal',
      membership_number: 'DU/01',
      district: { id: 'd1', slug: 'gumla', name_en: 'Gumla', name_hi: null },
      district_union: { id: 'du-1', slug: 'gumla-du', name_en: 'Gumla DU', name_hi: null },
      reporting_period: { id: 'rp-1', slug: 'fy26', name_en: 'FY 2025-26', name_hi: null },
      status: 'active',
      join_date: '2026-04-01',
      publication_state: 'draft',
      public_visibility: true,
      show_on_homepage: false,
      highlight_type: null,
      display_order: 2,
      published_at: null,
      archived_at: null,
      created_at: '2026-04-01T00:00:00.000Z',
      updated_at: '2026-04-01T00:00:00.000Z',
      notes_en: 'note',
      notes_hi: null,
      publish_start_at: null,
      highlight_start_at: null,
      highlight_end_at: null,
      created_by: null,
      updated_by: null,
    } as unknown as MembershipDetail;

    const form = membershipToForm(detail);
    expect(form.institution_id).toBe('inst-1');
    expect(form.district_union_id).toBe('du-1');
    expect(form.reporting_period_id).toBe('rp-1');
    expect(form.join_date).toBe('2026-04-01');
    expect(form.display_order).toBe('2');
>>>>>>> d476bcebf175f0a60e2572959456e7339f1461f3
  });
});
