/**
 * Unit tests — faq service: page-assignment write semantics (PATCH omission vs explicit clear),
 * Content-Editor edit restriction, and page-scoped reorder. Repository + cross-module services are
 * mocked (DB-free).
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { ResolvedAuthorization } from '@/modules/auth/auth.types';

const { repo, cache, audit } = vi.hoisted(() => ({
  repo: {
    slugExists: vi.fn(),
    findById: vi.fn(),
    update: vi.fn(),
    create: vi.fn(),
    transaction: vi.fn(),
    setPageAssignments: vi.fn(),
    findAssignment: vi.fn(),
    updateAssignmentOrder: vi.fn(),
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

function makeRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'f-1',
    slug: 'how-to-join',
    questionEn: 'How to join?',
    questionHi: null,
    answerEn: 'Apply online.',
    answerHi: null,
    pageAssignments: [],
    publicationState: 'published',
    publicVisibility: true,
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
  repo.transaction.mockImplementation(async (fn: (tx: unknown) => unknown) => fn({}));
  repo.slugExists.mockResolvedValue(false);
  repo.update.mockImplementation(async () => makeRow());
  repo.create.mockImplementation(async () => makeRow());
  repo.findById.mockResolvedValue(makeRow());
});

describe('faqService.create — page assignments', () => {
  it('writes assignments transactionally when provided', async () => {
    await faqService.create(
      { question_en: 'Q', answer_en: 'A', page_assignments: [{ page_key: 'home', display_order: 0 }] } as never,
      ctx(editor),
    );
    expect(repo.setPageAssignments).toHaveBeenCalledWith('f-1', [{ page_key: 'home', display_order: 0 }], {});
  });
  it('skips the assignment write when none are provided', async () => {
    await faqService.create({ question_en: 'Q', answer_en: 'A' } as never, ctx(editor));
    expect(repo.setPageAssignments).not.toHaveBeenCalled();
  });
});

describe('faqService.update — page-assignment omission vs explicit clear', () => {
  it('does not touch assignments when PATCH omits the key', async () => {
    repo.findById.mockResolvedValue(makeRow({ publicationState: 'draft' }));
    await faqService.update('f-1', { answer_en: 'Updated' } as never, ctx(editor));
    expect(repo.setPageAssignments).not.toHaveBeenCalled();
  });
  it('clears all assignments when PATCH sends an explicit empty array', async () => {
    repo.findById.mockResolvedValue(makeRow({ publicationState: 'draft' }));
    await faqService.update('f-1', { page_assignments: [] } as never, ctx(editor));
    expect(repo.setPageAssignments).toHaveBeenCalledWith('f-1', [], {});
  });
});

describe('faqService.update — Content Editor restriction', () => {
  it('rejects a Content Editor editing a PUBLISHED faq (403)', async () => {
    repo.findById.mockResolvedValue(makeRow({ publicationState: 'published' }));
    await expect(faqService.update('f-1', { answer_en: 'x' } as never, ctx(editor))).rejects.toBeInstanceOf(PermissionError);
  });
  it('allows a Publisher editing a PUBLISHED faq', async () => {
    repo.findById.mockResolvedValue(makeRow({ publicationState: 'published' }));
    await expect(faqService.update('f-1', { answer_en: 'x' } as never, ctx(publisher))).resolves.toBeDefined();
  });
});

describe('faqService.reorderPage', () => {
  it('rejects reordering an FAQ that is not assigned to the target page', async () => {
    repo.findAssignment.mockResolvedValue(null);
    await expect(
      faqService.reorderPage('membership', { order: [{ id: 'f-1', display_order: 0 }] }, ctx(publisher)),
    ).rejects.toBeInstanceOf(ValidationError);
    expect(repo.updateAssignmentOrder).not.toHaveBeenCalled();
  });
  it('updates each assignment order inside one transaction', async () => {
    repo.findAssignment.mockResolvedValue({ faqId: 'f-1', pageKey: 'membership', displayOrder: 0 });
    await faqService.reorderPage(
      'membership',
      { order: [{ id: 'f-1', display_order: 1 }, { id: 'f-2', display_order: 0 }] },
      ctx(publisher),
    );
    expect(repo.updateAssignmentOrder).toHaveBeenCalledTimes(2);
    expect(repo.updateAssignmentOrder).toHaveBeenCalledWith('f-1', 'membership', 1, {});
  });
});
