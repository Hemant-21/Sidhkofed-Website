import { describe, it, expect } from 'vitest';
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
  });
});
