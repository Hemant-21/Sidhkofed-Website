/**
 * Unit tests — official-communication service: Content-Editor edit restriction (only drafts),
 * reference validation, lifecycle audit, and the core rule that an expiry date NEVER
 * auto-unpublishes the record. Repository + cross-module services are mocked, so these run DB-free.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { ResolvedAuthorization } from '@/modules/auth/auth.types';

const { repo, cache, audit } = vi.hoisted(() => ({
  repo: {
    slugExists: vi.fn(),
    findById: vi.fn(),
    update: vi.fn(),
    create: vi.fn(),
    validateReferences: vi.fn(),
  },
  cache: { delByPrefix: vi.fn(), getJson: vi.fn(), setJson: vi.fn() },
  audit: { create: vi.fn(), update: vi.fn(), log: vi.fn() },
}));

vi.mock('./official-communications.repository', () => ({ officialCommunicationRepository: repo }));
vi.mock('@/services/cache', () => ({ cacheService: cache }));
vi.mock('@/modules/audit/audit.service', () => ({ auditService: audit }));

import { officialCommunicationService } from './official-communications.service';
import { PermissionError, ValidationError } from '@/shared/errors';

const NOW = new Date('2026-06-25T00:00:00.000Z');
const TYPE = '44444444-4444-4444-8444-444444444444';

function makeRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'oc-1',
    slug: 'notice-1',
    titleEn: 'Notice 1',
    titleHi: null,
    summaryEn: null,
    summaryHi: null,
    bodyEn: null,
    bodyHi: null,
    communicationType: { id: TYPE, slug: 'notice', nameEn: 'Notice', nameHi: null },
    referenceNumber: null,
    issueDate: null,
    effectiveDate: null,
    expiryDate: new Date('2026-01-01T00:00:00.000Z'), // already expired
    issuingAuthority: null,
    document: null,
    documentId: null,
    publicationState: 'published',
    publicVisibility: true,
    showOnHomepage: false,
    highlightType: null,
    displayOrder: null,
    publishStartAt: null,
    highlightStartAt: null,
    highlightEndAt: null,
    publishedAt: NOW,
    archivedAt: null,
    createdById: 'u-1',
    updatedById: 'u-1',
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

const authz = (over: Partial<ResolvedAuthorization>): ResolvedAuthorization =>
  ({ isSuperAdmin: false, roles: [], permissions: [], ...over } as ResolvedAuthorization);
const editor = authz({ permissions: ['content.create', 'content.update'] });
const publisher = authz({ permissions: ['content.update', 'content.publish'] });
const ctx = (a: ResolvedAuthorization) => ({ userId: 'u-1', authz: a });

beforeEach(() => {
  vi.clearAllMocks();
  repo.validateReferences.mockResolvedValue({});
  repo.slugExists.mockResolvedValue(false);
  repo.update.mockImplementation(async (_id: string, _data: unknown) => makeRow());
  repo.create.mockImplementation(async () => makeRow());
});

describe('officialCommunicationService.update — Content Editor restriction', () => {
  it('rejects a Content Editor editing a PUBLISHED record (403)', async () => {
    repo.findById.mockResolvedValue(makeRow({ publicationState: 'published' }));
    await expect(
      officialCommunicationService.update('oc-1', { title_hi: 'x' }, ctx(editor)),
    ).rejects.toBeInstanceOf(PermissionError);
    expect(repo.update).not.toHaveBeenCalled();
  });
  it('allows a Content Editor editing a DRAFT record', async () => {
    repo.findById.mockResolvedValue(makeRow({ publicationState: 'draft' }));
    await expect(officialCommunicationService.update('oc-1', { title_hi: 'x' }, ctx(editor))).resolves.toBeDefined();
    expect(repo.update).toHaveBeenCalledOnce();
  });
});

describe('officialCommunicationService — reference validation', () => {
  it('rejects a create with an invalid communication type (422)', async () => {
    repo.validateReferences.mockResolvedValue({ communication_type_id: ['Communication type is inactive.'] });
    await expect(
      officialCommunicationService.create({ title_en: 'X', communication_type_id: TYPE } as never, ctx(editor)),
    ).rejects.toBeInstanceOf(ValidationError);
    expect(repo.create).not.toHaveBeenCalled();
  });
});

describe('officialCommunicationService — expiry never auto-unpublishes', () => {
  it('a publisher unpublish is the ONLY way state changes; an expired record stays published on edit', async () => {
    repo.findById.mockResolvedValue(makeRow({ publicationState: 'published' })); // expiryDate in the past
    const updateData: Record<string, unknown>[] = [];
    repo.update.mockImplementation(async (_id: string, data: Record<string, unknown>) => {
      updateData.push(data);
      return makeRow();
    });
    await officialCommunicationService.update('oc-1', { summary_en: 'edited' }, ctx(publisher));
    // The edit must NOT touch publicationState/archivedAt — expiry is informational only.
    expect(updateData[0]).not.toHaveProperty('publicationState');
    expect(updateData[0]).not.toHaveProperty('archivedAt');
  });

  it('lifecycle unpublish records an audit entry and transitions state', async () => {
    repo.findById.mockResolvedValue(makeRow({ publicationState: 'published' }));
    repo.update.mockResolvedValue(makeRow({ publicationState: 'unpublished' }));
    await officialCommunicationService.lifecycle('oc-1', 'unpublish', ctx(publisher));
    expect(audit.log).toHaveBeenCalledWith(
      'UNPUBLISH',
      expect.anything(),
      expect.objectContaining({ module: 'official_communication', previousState: 'published', newState: 'unpublished' }),
    );
  });
});
