import { describe, expect, it } from 'vitest';
import { hasAllPermissions, hasAnyPermission, hasPermission, hasRole } from './permission';

describe('permission helpers', () => {
  it('matches an exact permission', () => {
    expect(hasPermission(['events.create', 'events.view'], 'events.create')).toBe(true);
    expect(hasPermission(['events.view'], 'events.publish')).toBe(false);
  });

  it('treats the wildcard as all-access', () => {
    expect(hasPermission(['*'], 'anything.at.all')).toBe(true);
    expect(hasAllPermissions(['*'], ['a.b', 'c.d'])).toBe(true);
    expect(hasAnyPermission(['*'], ['a.b'])).toBe(true);
  });

  it('requires every permission for hasAll', () => {
    expect(hasAllPermissions(['a.b', 'c.d'], ['a.b', 'c.d'])).toBe(true);
    expect(hasAllPermissions(['a.b'], ['a.b', 'c.d'])).toBe(false);
  });

  it('requires at least one for hasAny, and empty list is allowed', () => {
    expect(hasAnyPermission(['a.b'], ['x.y', 'a.b'])).toBe(true);
    expect(hasAnyPermission([], ['a.b'])).toBe(false);
    expect(hasAnyPermission([], [])).toBe(true);
  });

  it('checks roles', () => {
    expect(hasRole(['publisher'], 'publisher')).toBe(true);
    expect(hasRole(['content_editor'], ['publisher', 'super_admin'])).toBe(false);
  });
});
