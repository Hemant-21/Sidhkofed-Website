import { describe, expect, it } from 'vitest';
import { USER_FILTER_KEYS, USERS_RESOURCE } from './types';
import type { AdminUser, CreateUserPayload, UpdateUserPayload } from './types';

describe('USERS_RESOURCE', () => {
  it('is the users API segment', () => {
    expect(USERS_RESOURCE).toBe('users');
  });
});

describe('USER_FILTER_KEYS', () => {
  it('includes search, is_active, and role', () => {
    expect(USER_FILTER_KEYS).toContain('search');
    expect(USER_FILTER_KEYS).toContain('is_active');
    expect(USER_FILTER_KEYS).toContain('role');
  });
});

describe('AdminUser type contract', () => {
  it('accepts a valid user object (structural check via assignment)', () => {
    const user: AdminUser = {
      id: 'uuid-1',
      email: 'admin@example.com',
      full_name: 'Alice Admin',
      preferred_language: 'en',
      is_active: true,
      roles: ['super_admin'],
      permissions: ['*'],
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z',
      last_login_at: null,
    };
    expect(user.id).toBe('uuid-1');
    expect(user.roles).toContain('super_admin');
    expect(user.last_login_at).toBeNull();
  });
});

describe('CreateUserPayload type contract', () => {
  it('accepts a valid create payload', () => {
    const payload: CreateUserPayload = {
      email: 'editor@example.com',
      full_name: 'Bob Editor',
      password: 'securePass123',
      role_ids: ['content_editor'],
    };
    expect(payload.email).toBeTruthy();
    expect(payload.role_ids.length).toBeGreaterThan(0);
  });

  it('optional preferred_language defaults gracefully', () => {
    const payload: CreateUserPayload = {
      email: 'e@e.com',
      full_name: 'Test',
      password: 'pass1234',
      role_ids: [],
    };
    expect(payload.preferred_language).toBeUndefined();
  });
});

describe('UpdateUserPayload type contract', () => {
  it('all fields are optional — empty object is valid', () => {
    const payload: UpdateUserPayload = {};
    expect(Object.keys(payload).length).toBe(0);
  });

  it('accepts a partial update', () => {
    const payload: UpdateUserPayload = { is_active: false };
    expect(payload.is_active).toBe(false);
  });
});
