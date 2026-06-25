/**
 * Unit tests — memberships buildWhere (incl. public predicate, enum/relation/year filters),
 * validators (required fields, DU requirement, enum validity, unknown-key rejection), and
 * list-query surface separation + ordering allow-list. DB-free.
 */
import { describe, it, expect } from 'vitest';
import type { Request } from 'express';
import { buildWhere } from './memberships.repository';
import {
  validateMembershipCreate,
  validateMembershipUpdate,
  membershipBulkRowSchema,
} from './memberships.validators';
import { parseMembershipFilters, parseMembershipOrdering } from './memberships.query';
import { ValidationError } from '@/shared/errors';

const INST = '11111111-1111-4111-8111-111111111111';
const DU = '22222222-2222-4222-8222-222222222222';
const DIST = '33333333-3333-4333-8333-333333333333';
const RP = '44444444-4444-4444-8444-444444444444';
const reqWith = (query: Record<string, unknown>): Request => ({ query }) as unknown as Request;

describe('memberships buildWhere', () => {
  it('applies the public predicate as an AND element', () => {
    const predicate = (buildWhere({}, { public: true }).AND as Array<Record<string, unknown>>)[0];
    expect(predicate.publicationState).toBe('published');
  });
  it('applies publication_state only on the admin surface', () => {
    expect(buildWhere({ publicationState: 'draft' }, {}).publicationState).toBe('draft');
    // public ignores publicationState in favour of the predicate
    expect(
      buildWhere({ publicationState: 'draft' }, { public: true }).publicationState,
    ).toBeUndefined();
  });
  it('filters the two orthogonal axes independently', () => {
    const w = buildWhere({ membershipLevel: 'sidhkofed', membershipType: 'nominal' }, {});
    expect(w.membershipLevel).toBe('sidhkofed');
    expect(w.membershipType).toBe('nominal');
  });
  it('resolves institution / district_union / district / reporting_period by id-or-slug', () => {
    expect(buildWhere({ institution: INST }, {}).institution).toEqual({ id: INST });
    expect(buildWhere({ districtUnion: 'gumla-du' }, {}).districtUnion).toEqual({
      slug: 'gumla-du',
    });
    expect(buildWhere({ district: DIST }, {}).district).toEqual({ id: DIST });
    expect(buildWhere({ reportingPeriod: 'fy-2026' }, {}).reportingPeriod).toEqual({
      slug: 'fy-2026',
    });
  });
  it('translates a year filter into a join_date range', () => {
    const range = buildWhere({ year: 2026 }, {}).joinDate as { gte: Date; lt: Date };
    expect(range.gte.toISOString()).toBe('2026-01-01T00:00:00.000Z');
    expect(range.lt.toISOString()).toBe('2027-01-01T00:00:00.000Z');
  });
});

describe('validateMembershipCreate', () => {
  const base = { institution_id: INST, membership_level: 'sidhkofed', membership_type: 'primary' };
  it('accepts a minimal SIDHKOFED membership', () => {
    const out = validateMembershipCreate(base);
    expect(out.institution_id).toBe(INST);
    expect(out.membership_level).toBe('sidhkofed');
  });
  it('requires district_union_id when level is district_union', () => {
    expect(() => validateMembershipCreate({ ...base, membership_level: 'district_union' })).toThrow(
      ValidationError,
    );
  });
  it('accepts a district_union membership when the DU org is supplied', () => {
    const out = validateMembershipCreate({
      ...base,
      membership_level: 'district_union',
      district_union_id: DU,
    });
    expect(out.district_union_id).toBe(DU);
  });
  it('rejects an invalid membership_type enum', () => {
    expect(() => validateMembershipCreate({ ...base, membership_type: 'gold' })).toThrow(
      ValidationError,
    );
  });
  it('rejects an invalid status enum', () => {
    expect(() => validateMembershipCreate({ ...base, status: 'pending' })).toThrow(ValidationError);
  });
  it('accepts optional district / reporting period / join date / notes', () => {
    const out = validateMembershipCreate({
      ...base,
      district_id: DIST,
      reporting_period_id: RP,
      join_date: '2026-04-01',
      notes_en: 'Renewed for FY26.',
    });
    expect(out.district_id).toBe(DIST);
    expect(out.join_date).toBeInstanceOf(Date);
  });
  it('rejects a malformed join_date', () => {
    expect(() => validateMembershipCreate({ ...base, join_date: '01-04-2026' })).toThrow(
      ValidationError,
    );
  });
  it('rejects unknown keys', () => {
    expect(() => validateMembershipCreate({ ...base, foo: 1 })).toThrow(ValidationError);
  });
  it('rejects a client-set publication_state (server-managed)', () => {
    expect(() => validateMembershipCreate({ ...base, publication_state: 'published' })).toThrow(
      ValidationError,
    );
  });
});

describe('validateMembershipUpdate — partial DU rule', () => {
  it('enforces the DU requirement only when level is set in the same PATCH', () => {
    // PATCH that does not touch level is fine (service re-checks against persisted state)
    expect(validateMembershipUpdate({ membership_type: 'nominal' }).membership_type).toBe(
      'nominal',
    );
    // PATCH that sets level=district_union without a DU id is rejected
    expect(() => validateMembershipUpdate({ membership_level: 'district_union' })).toThrow(
      ValidationError,
    );
  });
});

describe('membershipBulkRowSchema', () => {
  it('accepts a valid row', () => {
    const parsed = membershipBulkRowSchema.safeParse({
      institution_id: INST,
      membership_level: 'sidhkofed',
      membership_type: 'primary',
    });
    expect(parsed.success).toBe(true);
  });
  it('rejects a district_union row missing the DU org', () => {
    const parsed = membershipBulkRowSchema.safeParse({
      institution_id: INST,
      membership_level: 'district_union',
      membership_type: 'primary',
    });
    expect(parsed.success).toBe(false);
  });
});

describe('parseMembershipFilters — surface separation', () => {
  it('accepts public filters on the public surface', () => {
    const f = parseMembershipFilters(
      reqWith({
        membership_level: 'sidhkofed',
        membership_type: 'primary',
        district: 'gumla',
        year: '2026',
      }),
      { admin: false },
    );
    expect(f.membershipLevel).toBe('sidhkofed');
    expect(f.year).toBe(2026);
  });
  it('rejects status / district_union on the PUBLIC surface (admin-only)', () => {
    expect(() => parseMembershipFilters(reqWith({ status: 'active' }), { admin: false })).toThrow(
      ValidationError,
    );
    expect(() =>
      parseMembershipFilters(reqWith({ district_union: 'x' }), { admin: false }),
    ).toThrow(ValidationError);
  });
  it('accepts admin-only filters on the ADMIN surface', () => {
    const f = parseMembershipFilters(
      reqWith({
        publication_state: 'draft',
        show_on_homepage: 'true',
        status: 'inactive',
        district_union: DU,
      }),
      { admin: true },
    );
    expect(f.publicationState).toBe('draft');
    expect(f.showOnHomepage).toBe(true);
    expect(f.status).toBe('inactive');
    expect(f.districtUnion).toBe(DU);
  });
  it('rejects an invalid membership_level value with 422', () => {
    expect(() =>
      parseMembershipFilters(reqWith({ membership_level: 'gold' }), { admin: false }),
    ).toThrow(ValidationError);
  });
  it('rejects an unknown filter key with 422', () => {
    expect(() => parseMembershipFilters(reqWith({ bogus: '1' }), { admin: true })).toThrow(
      ValidationError,
    );
  });
});

describe('parseMembershipOrdering', () => {
  it('defaults to display_order asc on the public surface', () => {
    expect(parseMembershipOrdering(reqWith({}), false)).toEqual({
      field: 'display_order',
      direction: 'asc',
    });
  });
  it('accepts join_date ordering', () => {
    expect(parseMembershipOrdering(reqWith({ ordering: 'join_date' }), false).field).toBe(
      'join_date',
    );
  });
  it('rejects an unsupported ordering field with 422', () => {
    expect(() => parseMembershipOrdering(reqWith({ ordering: 'status' }), true)).toThrow(
      ValidationError,
    );
  });
});
