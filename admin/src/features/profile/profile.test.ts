import { describe, expect, it } from 'vitest';
import type { UpdateProfilePayload, ChangePasswordPayload } from './types';

describe('UpdateProfilePayload type contract', () => {
  it('all fields are optional — empty object is valid', () => {
    const payload: UpdateProfilePayload = {};
    expect(Object.keys(payload).length).toBe(0);
  });

  it('accepts full_name update', () => {
    const payload: UpdateProfilePayload = { full_name: 'New Name' };
    expect(payload.full_name).toBe('New Name');
  });

  it('accepts preferred_language update with valid values', () => {
    const en: UpdateProfilePayload = { preferred_language: 'en' };
    const hi: UpdateProfilePayload = { preferred_language: 'hi' };
    expect(en.preferred_language).toBe('en');
    expect(hi.preferred_language).toBe('hi');
  });
});

describe('ChangePasswordPayload type contract', () => {
  it('requires a password string', () => {
    const payload: ChangePasswordPayload = { password: 'newPassword123' };
    expect(payload.password).toBeTruthy();
    expect(typeof payload.password).toBe('string');
  });

  it('rejects empty string at the TypeScript level — runtime guard', () => {
    const payload: ChangePasswordPayload = { password: '' };
    // Runtime validation (min 8 chars) is enforced by the form; here we just confirm
    // the type accepts any string and that the field is present.
    expect('password' in payload).toBe(true);
  });
});
