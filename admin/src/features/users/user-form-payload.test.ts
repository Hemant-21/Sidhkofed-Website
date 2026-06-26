import { describe, it, expect } from 'vitest';
import { emptyUserForm, userToForm, buildCreatePayload, buildUpdatePayload } from './user-form-payload';
import type { User } from './types';

const user: User = {
  id: 'u1',
  email: 'jane@test.io',
  full_name: 'Jane Admin',
  preferred_language: 'hi',
  is_active: true,
  roles: ['content_editor'],
  last_login_at: null,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
};

describe('user form payload', () => {
  it('produces an empty create form', () => {
    expect(emptyUserForm()).toMatchObject({ email: '', roles: [], is_active: true, preferred_language: 'en' });
  });

  it('maps a user to form values (no password)', () => {
    const form = userToForm(user);
    expect(form.email).toBe('jane@test.io');
    expect(form.roles).toEqual(['content_editor']);
    expect(form.password).toBe('');
    expect(form.preferred_language).toBe('hi');
  });

  it('builds a create payload including the password', () => {
    const payload = buildCreatePayload({ ...userToForm(user), password: 'secret123', email: '  a@b.io ' });
    expect(payload.password).toBe('secret123');
    expect(payload.email).toBe('a@b.io');
    expect(payload.roles).toEqual(['content_editor']);
  });

  it('builds an update payload WITHOUT the password', () => {
    const payload = buildUpdatePayload(userToForm(user)) as Record<string, unknown>;
    expect(payload.password).toBeUndefined();
    expect(payload.full_name).toBe('Jane Admin');
  });
});
