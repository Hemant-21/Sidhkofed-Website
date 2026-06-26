/**
 * Unit tests — dashboard repository where-builder (pure, DB-free). Confirms the public report read
 * applies the full visibility predicate + `is_active=true`, and the admin read does not.
 */
import { describe, it, expect } from 'vitest';
import { buildReportWhere } from './dashboard.repository';

describe('buildReportWhere', () => {
  it('applies the public-visibility predicate and is_active for public reads', () => {
    const where = buildReportWhere({}, { public: true }) as Record<string, unknown>;
    expect(where.isActive).toBe(true);
    expect(Array.isArray(where.AND)).toBe(true);
    const pred = (where.AND as Array<Record<string, unknown>>)[0];
    expect(pred.publicationState).toBe('published');
    expect(pred.publicVisibility).toBe(true);
    expect(pred.archivedAt).toBeNull();
  });

  it('does not force published/active for admin reads, honouring the publication_state filter', () => {
    const where = buildReportWhere({ publicationState: 'draft' }, {}) as Record<string, unknown>;
    expect(where.AND).toBeUndefined();
    expect(where.publicationState).toBe('draft');
    expect(where.isActive).toBeUndefined();
  });

  it('honours the show_on_homepage admin filter', () => {
    const where = buildReportWhere({ showOnHomepage: true }, {}) as Record<string, unknown>;
    expect(where.showOnHomepage).toBe(true);
  });
});
