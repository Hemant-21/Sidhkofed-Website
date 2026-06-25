/** Unit tests — public toolkit DTOs never leak a non-public linked programme (Issue 7). DB-free. */
import { describe, it, expect } from 'vitest';
import { toPublicToolkitSummaryDto, toToolkitSummaryDto } from './toolkits.dto';
import type { ToolkitSummaryRow } from './toolkits.repository';

const NOW = new Date();
const future = new Date(NOW.getTime() + 1000 * 60 * 60 * 24 * 30);

function row(programmeOverride: Record<string, unknown> | null): ToolkitSummaryRow {
  return {
    id: 't1',
    slug: 'kit',
    titleEn: 'Kit',
    titleHi: null,
    summaryEn: null,
    summaryHi: null,
    descriptionEn: null,
    descriptionHi: null,
    publicationState: 'published',
    publicVisibility: true,
    showOnHomepage: false,
    highlightType: null,
    displayOrder: 0,
    publishedAt: NOW,
    archivedAt: null,
    createdAt: NOW,
    updatedAt: NOW,
    commodity: null,
    coverMedia: null,
    programmeScheme:
      programmeOverride === null
        ? null
        : {
            id: 'p1',
            slug: 'prog',
            titleEn: 'Programme',
            titleHi: null,
            shortCode: null,
            publicationState: 'published',
            publicVisibility: true,
            archivedAt: null,
            publishStartAt: null,
            ...programmeOverride,
          },
  } as unknown as ToolkitSummaryRow;
}

describe('toPublicToolkitSummaryDto programme visibility', () => {
  it('surfaces a published, visible programme', () => {
    expect(toPublicToolkitSummaryDto(row({})).programme).toMatchObject({ slug: 'prog' });
  });

  it('hides a draft programme', () => {
    expect(toPublicToolkitSummaryDto(row({ publicationState: 'draft' })).programme).toBeNull();
  });

  it('hides an archived programme', () => {
    expect(toPublicToolkitSummaryDto(row({ archivedAt: NOW })).programme).toBeNull();
  });

  it('hides a future-scheduled programme', () => {
    expect(toPublicToolkitSummaryDto(row({ publishStartAt: future })).programme).toBeNull();
  });

  it('hides a programme with public_visibility=false', () => {
    expect(toPublicToolkitSummaryDto(row({ publicVisibility: false })).programme).toBeNull();
  });

  it('admin DTO still shows the programme regardless of its publication state', () => {
    expect(toToolkitSummaryDto(row({ publicationState: 'draft' })).programme).toMatchObject({ slug: 'prog' });
  });
});
