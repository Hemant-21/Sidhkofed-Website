/**
 * Unit tests — leadership buildWhere, validators, and list-query key validation. DB-free.
 */
import { describe, it, expect } from 'vitest';
import type { Request } from 'express';
import { buildWhere } from './leadership.repository';
import { validateLeadershipCreate, validateLeadershipUpdate } from './leadership.validators';
import { parseLeadershipFilters } from './leadership.query';
import { ValidationError } from '@/shared/errors';

const UUID = '44444444-4444-4444-8444-444444444444';
const reqWith = (query: Record<string, unknown>): Request => ({ query } as unknown as Request);

describe('leadership buildWhere', () => {
  it('applies the public predicate as an AND element', () => {
    const predicate = (buildWhere({}, { public: true }).AND as Array<Record<string, unknown>>)[0];
    expect(predicate.publicationState).toBe('published');
  });
  it('admin filters by publication_state', () => {
    const where = buildWhere({ publicationState: 'draft' }, {});
    expect(where.publicationState).toBe('draft');
  });
});

describe('validateLeadershipCreate', () => {
  it('accepts an entry with name + govt_role + sidhkofed_role', () => {
    const out = validateLeadershipCreate({
      name_en: 'Shri Hemant Soren',
      govt_role_en: "Hon'ble Chief Minister, Jharkhand",
      sidhkofed_role_en: 'President, SIDHKOFED',
    });
    expect(out.name_en).toBe('Shri Hemant Soren');
  });
  it('accepts an optional photo_media_id', () => {
    expect(
      validateLeadershipCreate({
        name_en: 'Shri Shashi Ranjan, I.A.S.',
        govt_role_en: 'Chief Executive Officer, SIDHKOFED',
        sidhkofed_role_en: 'CEO, SIDHKOFED',
        photo_media_id: UUID,
      }).photo_media_id,
    ).toBe(UUID);
  });
  it('rejects a missing name_en', () => {
    expect(() =>
      validateLeadershipCreate({
        govt_role_en: "Hon'ble Chief Minister, Jharkhand",
        sidhkofed_role_en: 'President, SIDHKOFED',
      }),
    ).toThrow(ValidationError);
  });
  it('rejects a missing govt_role_en', () => {
    expect(() =>
      validateLeadershipCreate({ name_en: 'Shri Hemant Soren', sidhkofed_role_en: 'President, SIDHKOFED' }),
    ).toThrow(ValidationError);
  });
  it('rejects a missing sidhkofed_role_en', () => {
    expect(() =>
      validateLeadershipCreate({
        name_en: 'Shri Hemant Soren',
        govt_role_en: "Hon'ble Chief Minister, Jharkhand",
      }),
    ).toThrow(ValidationError);
  });
  it('rejects unknown keys', () => {
    expect(() =>
      validateLeadershipCreate({
        name_en: 'X',
        govt_role_en: 'Y',
        sidhkofed_role_en: 'Z',
        foo: 1,
      }),
    ).toThrow(ValidationError);
  });
  it('PATCH keeps every field optional', () => {
    expect(validateLeadershipUpdate({ name_hi: 'x' }).name_hi).toBe('x');
    expect(() => validateLeadershipUpdate({ photo_media_id: 'not-a-uuid' })).toThrow(ValidationError);
  });
});

describe('parseLeadershipFilters', () => {
  it('rejects publication_state on the PUBLIC surface (admin-only)', () => {
    expect(() => parseLeadershipFilters(reqWith({ publication_state: 'published' }), { admin: false })).toThrow(
      ValidationError,
    );
  });
  it('accepts admin filters', () => {
    const f = parseLeadershipFilters(reqWith({ publication_state: 'published' }), { admin: true });
    expect(f.publicationState).toBe('published');
  });
});
