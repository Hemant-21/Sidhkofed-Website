/**
 * Unit tests — faq service: FAQ-category activation validation, Content-Editor edit restriction, and
 * category-only re-validation on PATCH. Repository + cross-module services are mocked (DB-free).
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

vi.mock('./faqs.repository', () => ({ faqRepository: repo }));
vi.mock('@/services/cache', () => ({ cacheService: cache }));
vi.mock('@/modules/audit/audit.service', () => ({ auditService: audit }));

import { faqService } from './faqs.service';
import { PermissionError, ValidationError } from '@/shared/errors';

const NOW = new Date('2026-06-25T00:00:00.000Z');
const CAT = '44444444-4444-4444-8444-444444444444';

function makeRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'f-1',
    slug: 'how-to-join',
    questionEn: 'How to join?',
    questionHi: null,
    answerEn: 'Apply online.',
    answerHi: null,
    faqCategory: null,
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
  repo.update.mockImplementation(async () => makeRow());
  repo.create.mockImplementation(async () => makeRow());
});

describe('faqService — category activation validation', () => {
  it('rejects a create referencing an inactive FAQ category (422)', async () => {
    repo.validateReferences.mockResolvedValue({ faq_category_id: ['FAQ category is inactive.'] });
    await expect(
      faqService.create({ question_en: 'Q', answer_en: 'A', faq_category_id: CAT } as never, ctx(editor)),
    ).rejects.toBeInstanceOf(ValidationError);
    expect(repo.create).not.toHaveBeenCalled();
  });
  it('does not re-validate the category when PATCH omits it', async () => {
    repo.findById.mockResolvedValue(makeRow({ publicationState: 'draft' }));
    await faqService.update('f-1', { answer_en: 'Updated' }, ctx(editor));
    expect(repo.validateReferences).not.toHaveBeenCalled();
  });
});

describe('faqService.update — Content Editor restriction', () => {
  it('rejects a Content Editor editing a PUBLISHED faq (403)', async () => {
    repo.findById.mockResolvedValue(makeRow({ publicationState: 'published' }));
    await expect(faqService.update('f-1', { answer_en: 'x' }, ctx(editor))).rejects.toBeInstanceOf(PermissionError);
  });
  it('allows a Publisher editing a PUBLISHED faq', async () => {
    repo.findById.mockResolvedValue(makeRow({ publicationState: 'published' }));
    await expect(faqService.update('f-1', { answer_en: 'x' }, ctx(publisher))).resolves.toBeDefined();
  });
});
