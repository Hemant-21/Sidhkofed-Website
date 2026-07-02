/**
 * Unit tests — public Official Communication DTO never leaks a non-public linked document (Issue 1).
 * A draft/archived/scheduled/private document (and its file_url) must be withheld from the public
 * detail response, while the admin DTO continues to surface it. DB-free.
 */
import { describe, it, expect } from 'vitest';
import {
  toPublicOfficialCommunicationDetailDto,
  toOfficialCommunicationDetailDto,
} from './official-communications.dto';
import type { OfficialCommunicationRow } from './official-communications.repository';

const NOW = new Date();
const FUTURE = new Date(NOW.getTime() + 1000 * 60 * 60 * 24 * 30);

function row(documentOverride: Record<string, unknown> | null): OfficialCommunicationRow {
  return {
    id: 'c1',
    slug: 'comm',
    titleEn: 'Comm',
    titleHi: null,
    summaryEn: null,
    summaryHi: null,
    bodyEn: null,
    bodyHi: null,
    referenceNumber: null,
    issueDate: null,
    effectiveDate: null,
    expiryDate: null,
    issuingAuthority: null,
    highlightType: null,
    communicationType: { id: 'ct1', slug: 'circular', nameEn: 'Circular', nameHi: null },
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
    document:
      documentOverride === null
        ? null
        : {
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
            ...documentOverride,
          },
  } as unknown as OfficialCommunicationRow;
}

describe('toPublicOfficialCommunicationDetailDto — linked document visibility', () => {
  it('surfaces a published, public document', () => {
    expect(toPublicOfficialCommunicationDetailDto(row({})).document).toMatchObject({ slug: 'doc' });
  });

  it('hides a draft document', () => {
    expect(toPublicOfficialCommunicationDetailDto(row({ publicationState: 'draft' })).document).toBeNull();
  });

  it('hides an archived document', () => {
    expect(toPublicOfficialCommunicationDetailDto(row({ archivedAt: NOW })).document).toBeNull();
  });

  it('hides a scheduled (future publish_start_at) document', () => {
    expect(toPublicOfficialCommunicationDetailDto(row({ publishStartAt: FUTURE })).document).toBeNull();
  });

  it('hides a hidden document (public_visibility=false)', () => {
    expect(toPublicOfficialCommunicationDetailDto(row({ publicVisibility: false })).document).toBeNull();
  });

  it('hides a private document (is_public=false) — no file_url leaks', () => {
    const dto = toPublicOfficialCommunicationDetailDto(row({ isPublic: false }));
    expect(dto.document).toBeNull();
    expect(JSON.stringify(dto)).not.toContain('/media/secret.pdf');
  });

  it('admin DTO still surfaces the document regardless of its visibility', () => {
    expect(toOfficialCommunicationDetailDto(row({ publicationState: 'draft', isPublic: false })).document).toMatchObject({
      slug: 'doc',
    });
  });
});
