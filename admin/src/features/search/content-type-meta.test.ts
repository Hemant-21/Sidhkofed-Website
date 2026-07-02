import { describe, expect, it } from 'vitest';
import { CONTENT_TYPES } from '@/types/search';
import { CONTENT_TYPE_META, adminHrefForResult } from './content-type-meta';
import { ROUTES } from '@/constants/routes';

describe('CONTENT_TYPE_META', () => {
  it('defines presentation metadata for every searchable content type', () => {
    for (const type of CONTENT_TYPES) {
      const meta = CONTENT_TYPE_META[type];
      expect(meta).toBeDefined();
      expect(meta.label.length).toBeGreaterThan(0);
      expect(meta.labelPlural.length).toBeGreaterThan(0);
      expect(meta.icon).toBeTruthy();
      expect(meta.route.startsWith('/')).toBe(true);
    }
  });

  it('maps each content type to its reserved admin route', () => {
    expect(CONTENT_TYPE_META.event.route).toBe(ROUTES.events);
    expect(CONTENT_TYPE_META.official_communication.route).toBe(ROUTES.communications);
    expect(CONTENT_TYPE_META.procurement_update.route).toBe(ROUTES.procurement);
  });
});

describe('adminHrefForResult', () => {
  it('builds an admin deep-link from the content type route + id', () => {
    expect(adminHrefForResult('event', 'abc')).toBe(`${ROUTES.events}/abc`);
    expect(adminHrefForResult('document', 'xyz')).toBe(`${ROUTES.documents}/xyz`);
  });
});
