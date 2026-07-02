/**
 * Unit tests — public Procurement Update DTO never leaks a non-public linked document or programme
 * (Issue 1). Draft/archived/scheduled/private linked content (and any file_url) must be withheld
 * from the public detail response, while the admin DTO continues to surface it. DB-free.
 */
import { describe, it, expect } from 'vitest';
import {
  toPublicProcurementUpdateDetailDto,
  toProcurementUpdateDetailDto,
} from './procurement-updates.dto';
import type { ProcurementUpdateRow } from './procurement-updates.repository';

const NOW = new Date();
const FUTURE = new Date(NOW.getTime() + 1000 * 60 * 60 * 24 * 30);

const publishedProgramme = {
  id: 'p1',
  slug: 'prog',
  titleEn: 'Programme',
  titleHi: null,
  publicationState: 'published',
  publicVisibility: true,
  archivedAt: null,
  publishStartAt: null,
};
const publishedDocument = {
  id: 'd1',
  slug: 'doc',
  titleEn: 'Doc',
  titleHi: null,
  language: 'en',
  publicationDate: null,
  documentType: { slug: 'order' },
  fileAsset: { url: '/media/secret.pdf' },
  publicationState: 'published',
  publicVisibility: true,
  isPublic: true,
  archivedAt: null,
  publishStartAt: null,
};

function row(over: {
  programme?: Record<string, unknown> | null;
  document?: Record<string, unknown> | null;
  quantity?: number | null;
  displayQuantityAsMt?: boolean;
}): ProcurementUpdateRow {
  const { programme = {}, document = {}, quantity = null, displayQuantityAsMt = false } = over;
  return {
    id: 'pu1',
    slug: 'pu',
    titleEn: 'PU',
    titleHi: null,
    summaryEn: null,
    summaryHi: null,
    descriptionEn: null,
    descriptionHi: null,
    procurementUpdateType: { id: 't1', slug: 'rate', nameEn: 'Rate', nameHi: null },
    commodity: null,
    rate: null,
    unit: null,
    quantity,
    displayQuantityAsMt,
    effectiveDate: null,
    periodStart: null,
    periodEnd: null,
    district: null,
    block: null,
    locationText: null,
    status: null,
    highlightType: null,
    publicationState: 'published',
    publicVisibility: true,
    showOnHomepage: false,
    displayOrder: 0,
    publishStartAt: null,
    highlightStartAt: null,
    highlightEndAt: null,
    publishedAt: NOW,
    archivedAt: null,
    createdById: 'u1',
    updatedById: 'u1',
    createdAt: NOW,
    updatedAt: NOW,
    programmeScheme: programme === null ? null : { ...publishedProgramme, ...programme },
    document: document === null ? null : { ...publishedDocument, ...document },
  } as unknown as ProcurementUpdateRow;
}

describe('toPublicProcurementUpdateDetailDto — linked programme visibility', () => {
  it('surfaces a published, visible programme', () => {
    expect(toPublicProcurementUpdateDetailDto(row({})).programme).toMatchObject({ slug: 'prog' });
  });
  it('hides a draft programme', () => {
    expect(toPublicProcurementUpdateDetailDto(row({ programme: { publicationState: 'draft' } })).programme).toBeNull();
  });
  it('hides an archived programme', () => {
    expect(toPublicProcurementUpdateDetailDto(row({ programme: { archivedAt: NOW } })).programme).toBeNull();
  });
  it('hides a scheduled programme', () => {
    expect(toPublicProcurementUpdateDetailDto(row({ programme: { publishStartAt: FUTURE } })).programme).toBeNull();
  });
});

describe('toPublicProcurementUpdateDetailDto — linked document visibility', () => {
  it('surfaces a published, public document', () => {
    expect(toPublicProcurementUpdateDetailDto(row({})).document).toMatchObject({ slug: 'doc' });
  });
  it('hides a draft document', () => {
    expect(toPublicProcurementUpdateDetailDto(row({ document: { publicationState: 'draft' } })).document).toBeNull();
  });
  it('hides an archived document', () => {
    expect(toPublicProcurementUpdateDetailDto(row({ document: { archivedAt: NOW } })).document).toBeNull();
  });
  it('hides a scheduled document', () => {
    expect(toPublicProcurementUpdateDetailDto(row({ document: { publishStartAt: FUTURE } })).document).toBeNull();
  });
  it('hides a private document (is_public=false) — no file_url leaks', () => {
    const dto = toPublicProcurementUpdateDetailDto(row({ document: { isPublic: false } }));
    expect(dto.document).toBeNull();
    expect(JSON.stringify(dto)).not.toContain('/media/secret.pdf');
  });
});

describe('toProcurementUpdateDetailDto — admin still surfaces hidden linked content', () => {
  it('shows a draft programme and a private document', () => {
    const dto = toProcurementUpdateDetailDto(
      row({ programme: { publicationState: 'draft' }, document: { isPublic: false } }),
    );
    expect(dto.programme).toMatchObject({ slug: 'prog' });
    expect(dto.document).toMatchObject({ slug: 'doc' });
  });
});

describe('procurement quantity + display_quantity_as_mt fields', () => {
  it('quantity is null when not set', () => {
    expect(toPublicProcurementUpdateDetailDto(row({})).quantity).toBeNull();
    expect(toProcurementUpdateDetailDto(row({})).quantity).toBeNull();
  });

  it('quantity surfaces as a number when present', () => {
    // Prisma stores as Decimal; the factory passes a plain number via the cast
    const pub = toPublicProcurementUpdateDetailDto(row({ quantity: 50000 }));
    expect(pub.quantity).toBe(50000);
    const adm = toProcurementUpdateDetailDto(row({ quantity: 1234.5 }));
    expect(adm.quantity).toBe(1234.5);
  });

  it('display_quantity_as_mt defaults to false and reflects true', () => {
    expect(toPublicProcurementUpdateDetailDto(row({})).display_quantity_as_mt).toBe(false);
    expect(toPublicProcurementUpdateDetailDto(row({ displayQuantityAsMt: true })).display_quantity_as_mt).toBe(true);
    expect(toProcurementUpdateDetailDto(row({ displayQuantityAsMt: true })).display_quantity_as_mt).toBe(true);
  });
});
