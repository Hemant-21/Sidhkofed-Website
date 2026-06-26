/** Unit tests — user validators + buildWhere + list-query key validation. DB-free. */
import { describe, it, expect } from 'vitest';
import type { Request } from 'express';
import { buildWhere } from './users.repository';
import {
  validateUserCreate,
  validateUserUpdate,
  validateUserStatus,
  validateProfilePassword,
} from './users.validators';
import { parseUserFilters, parseUserOrdering } from './users.query';
import { ValidationError } from '@/shared/errors';

const reqWith = (query: Record<string, unknown>): Request => ({ query } as unknown as Request);

describe('users buildWhere', () => {
  it('filters by is_active', () => {
    expect(buildWhere({ isActive: false }).isActive).toBe(false);
  });
  it('filters by role key via the userRoles relation', () => {
    expect(buildWhere({ role: 'super_admin' }).userRoles).toEqual({ some: { role: { key: 'super_admin' } } });
  });
  it('searches email + full name case-insensitively', () => {
    const where = buildWhere({ search: 'jane' });
    expect(where.OR).toEqual([
      { email: { contains: 'jane', mode: 'insensitive' } },
      { fullName: { contains: 'jane', mode: 'insensitive' } },
    ]);
  });
});

describe('validateUserCreate', () => {
  it('accepts a valid user and normalizes the email', () => {
    const out = validateUserCreate({
      email: '  Jane@Test.IO ',
      full_name: 'Jane',
      password: 'secret123',
      roles: ['content_editor'],
    });
    expect(out.email).toBe('jane@test.io');
    expect(out.roles).toEqual(['content_editor']);
  });
  it('rejects a short / non-compliant password', () => {
    expect(() =>
      validateUserCreate({ email: 'a@b.io', full_name: 'X', password: 'short', roles: ['publisher'] }),
    ).toThrow(ValidationError);
    expect(() =>
      validateUserCreate({ email: 'a@b.io', full_name: 'X', password: 'alllettersonly', roles: ['publisher'] }),
    ).toThrow(ValidationError);
  });
  it('rejects an invalid email', () => {
    expect(() => validateUserCreate({ email: 'nope', full_name: 'X', password: 'secret123', roles: ['publisher'] })).toThrow(
      ValidationError,
    );
  });
  it('rejects an empty roles array', () => {
    expect(() => validateUserCreate({ email: 'a@b.io', full_name: 'X', password: 'secret123', roles: [] })).toThrow(
      ValidationError,
    );
  });
  it('rejects unknown keys', () => {
    expect(() =>
      validateUserCreate({ email: 'a@b.io', full_name: 'X', password: 'secret123', roles: ['publisher'], foo: 1 }),
    ).toThrow(ValidationError);
  });
});

describe('validateUserUpdate / status / profile password', () => {
  it('accepts a partial update', () => {
    expect(validateUserUpdate({ full_name: 'Renamed' }).full_name).toBe('Renamed');
  });
  it('rejects an invalid preferred_language', () => {
    expect(() => validateUserUpdate({ preferred_language: 'fr' })).toThrow(ValidationError);
  });
  it('requires is_active boolean on status', () => {
    expect(validateUserStatus({ is_active: false }).is_active).toBe(false);
    expect(() => validateUserStatus({})).toThrow(ValidationError);
  });
  it('requires both current and new password on profile change', () => {
    expect(() => validateProfilePassword({ new_password: 'newpass12' })).toThrow(ValidationError);
    expect(validateProfilePassword({ current_password: 'x', new_password: 'newpass12' }).new_password).toBe('newpass12');
  });
});

describe('parseUserFilters / parseUserOrdering', () => {
  it('accepts known filters', () => {
    const f = parseUserFilters(reqWith({ is_active: 'true', role: 'publisher', search: 'jane' }));
    expect(f.isActive).toBe(true);
    expect(f.role).toBe('publisher');
    expect(f.search).toBe('jane');
  });
  it('rejects unknown filter keys with 422', () => {
    expect(() => parseUserFilters(reqWith({ bogus: '1' }))).toThrow(ValidationError);
  });
  it('rejects an unsupported ordering field', () => {
    expect(() => parseUserOrdering(reqWith({ ordering: 'password' }))).toThrow(ValidationError);
  });
  it('defaults ordering to -created_at', () => {
    expect(parseUserOrdering(reqWith({}))).toEqual({ field: 'created_at', direction: 'desc' });
  });
});
