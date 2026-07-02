/**
 * Unit tests — menu validators (location enum, url scheme, destination requirement, reorder shape)
 * and query parsing (required public location). DB-free.
 */
import { describe, it, expect } from 'vitest';
import type { Request } from 'express';
import {
  validateMenuItemCreate,
  validateMenuItemUpdate,
  validateMenuReorder,
} from './menus.validators';
import { parseMenuFilters, parsePublicMenuLocation } from './menus.query';
import { ValidationError } from '@/shared/errors';

const UUID = '44444444-4444-4444-8444-444444444444';
const reqWith = (query: Record<string, unknown>): Request => ({ query } as unknown as Request);

describe('validateMenuItemCreate', () => {
  it('accepts an internal-path url item', () => {
    const out = validateMenuItemCreate({ label_en: 'About', location: 'header', url: '/about' });
    expect(out.url).toBe('/about');
  });
  it('accepts a page-linked item', () => {
    expect(validateMenuItemCreate({ label_en: 'About', location: 'footer', page_id: UUID }).page_id).toBe(UUID);
  });
  it('accepts an external https url with new-tab', () => {
    const out = validateMenuItemCreate({
      label_en: 'GeM',
      location: 'utility',
      url: 'https://gem.gov.in',
      opens_new_tab: true,
    });
    expect(out.opens_new_tab).toBe(true);
  });
  it('rejects an item with neither url nor page_id', () => {
    expect(() => validateMenuItemCreate({ label_en: 'X', location: 'header' })).toThrow(ValidationError);
  });
  it('rejects an unsafe url scheme (javascript:)', () => {
    expect(() =>
      validateMenuItemCreate({ label_en: 'X', location: 'header', url: 'javascript:alert(1)' }),
    ).toThrow(ValidationError);
  });
  // Phase 10 remediation Issue 2 — URL scheme allow-list.
  it.each(['/about', '/events', '/contact', '/'])('accepts the internal path %s', (url) => {
    expect(validateMenuItemCreate({ label_en: 'X', location: 'header', url }).url).toBe(url);
  });
  it.each(['https://example.com', 'http://example.com'])('accepts the absolute url %s', (url) => {
    expect(validateMenuItemCreate({ label_en: 'X', location: 'header', url }).url).toBe(url);
  });
  it.each(['//evil.example', 'javascript:alert(1)', 'data:text/html,x', 'ftp://files.example/x'])(
    'rejects the unsupported/unsafe url %s (422)',
    (url) => {
      expect(() => validateMenuItemCreate({ label_en: 'X', location: 'header', url })).toThrow(ValidationError);
    },
  );
  it('rejects an invalid location', () => {
    expect(() => validateMenuItemCreate({ label_en: 'X', location: 'sidebar', url: '/x' })).toThrow(ValidationError);
  });
  it('rejects unknown keys', () => {
    expect(() => validateMenuItemCreate({ label_en: 'X', location: 'header', url: '/x', foo: 1 })).toThrow(
      ValidationError,
    );
  });
});

describe('validateMenuItemUpdate', () => {
  it('is partial (label only)', () => {
    expect(validateMenuItemUpdate({ label_en: 'Renamed' }).label_en).toBe('Renamed');
  });
});

describe('validateMenuReorder', () => {
  it('accepts a list of {id, display_order}', () => {
    const out = validateMenuReorder({ items: [{ id: UUID, display_order: 1 }] });
    expect(out.items).toHaveLength(1);
  });
  it('rejects an empty list', () => {
    expect(() => validateMenuReorder({ items: [] })).toThrow(ValidationError);
  });
  it('rejects extra keys on an item', () => {
    expect(() => validateMenuReorder({ items: [{ id: UUID, display_order: 1, x: 2 }] })).toThrow(ValidationError);
  });
});

describe('menu query parsing', () => {
  it('admin filter accepts location + is_active', () => {
    const f = parseMenuFilters(reqWith({ location: 'header', is_active: 'true' }));
    expect(f.location).toBe('header');
    expect(f.isActive).toBe(true);
  });
  it('admin filter rejects an invalid location', () => {
    expect(() => parseMenuFilters(reqWith({ location: 'sidebar' }))).toThrow(ValidationError);
  });
  it('public location is required', () => {
    expect(() => parsePublicMenuLocation(reqWith({}))).toThrow(ValidationError);
  });
  it('public location must be valid', () => {
    expect(() => parsePublicMenuLocation(reqWith({ location: 'sidebar' }))).toThrow(ValidationError);
    expect(parsePublicMenuLocation(reqWith({ location: 'footer' }))).toBe('footer');
  });
});
