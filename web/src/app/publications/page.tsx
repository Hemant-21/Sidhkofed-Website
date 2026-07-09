import type { Metadata } from 'next';
import {
  GraduationCap,
  ImageIcon,
  BookOpen,
  FileText,
} from 'lucide-react';
import { getListSafe } from '@/lib/api/server';
import { PUBLIC_ENDPOINTS } from '@/lib/api/endpoints';
import type { DocumentSummary } from '@/lib/types/content';
import { buildMetadata } from '@/lib/seo';
import { PAGE_SIZE, toPage, qstr, getMasterOptions } from '@/lib/listing';
import { CategoryCards, type CategoryCardDef } from '@/components/listing/category-cards';
import { FilterBar } from '@/components/listing/filter-bar';
import { PaginationNav } from '@/components/listing/pagination-nav';
import { ResultsSummary } from '@/components/listing/results-summary';
import { EmptyState } from '@/components/feedback/states';
import { DocumentCard } from '@/components/cards/document-card';
import { Breadcrumbs } from '@/components/ui/breadcrumb';
import { Container } from '@/components/ui/container';
import { SectionHeading } from '@/components/ui/section-heading';

export const revalidate = 300;

export const metadata: Metadata = buildMetadata({
  title: 'Publications',
  description: 'Acts, rules, SOPs, research, publications and training resources.',
  path: '/publications',
});

type SP = Record<string, string | string[] | undefined>;

const CATEGORIES: CategoryCardDef[] = [
  {
    icon: <FileText className="h-5 w-5 text-primary" aria-hidden="true" />,
    titleKey: 'page.publications.category.byelaws.title',
    descriptionKey: 'page.publications.category.byelaws.subtitle',
    href: '/publications?knowledge_category=bye-laws#listing',
  },
  {
    icon: <GraduationCap className="h-5 w-5 text-primary" aria-hidden="true" />,
    titleKey: 'page.publications.category.training.title',
    descriptionKey: 'page.publications.category.training.subtitle',
    href: '/publications?knowledge_category=training-resources#listing',
  },
  {
    icon: <BookOpen className="h-5 w-5 text-primary" aria-hidden="true" />,
    titleKey: 'page.publications.category.sops.title',
    descriptionKey: 'page.publications.category.sops.subtitle',
    href: '/publications?knowledge_category=sops-and-manuals#listing',
  },
  {
    icon: <ImageIcon className="h-5 w-5 text-primary" aria-hidden="true" />,
    titleKey: 'page.publications.category.media.title',
    descriptionKey: 'page.publications.category.media.subtitle',
    href: '/publications/media',
  },
];

export default async function PublicationsPage({ searchParams }: { searchParams: SP }) {
  const page = toPage(searchParams.page);

  const [list, knowledgeCategories] = await Promise.all([
    getListSafe<DocumentSummary>(PUBLIC_ENDPOINTS.knowledgeCentre, {
      query: {
        page,
        page_size: PAGE_SIZE,
        search: qstr(searchParams.search),
        knowledge_category: qstr(searchParams.knowledge_category),
        ordering: '-publication_date',
      },
    }),
    getMasterOptions('knowledge-categories'),
  ]);

  return (
    <>
      <Breadcrumbs items={[{ label: 'Publications' }]} />

      {/* Page header */}
      <div className="bg-primary">
        <Container className="py-10 sm:py-14">
          <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">Publications</h1>
          <p className="mt-2 max-w-2xl text-base text-white/70">
            Acts, rules, SOPs, annual reports, training materials and official forms from SIDHKOFED.
          </p>
        </Container>
      </div>

      {/* Category nav cards */}
      <div className="bg-muted/40 border-b border-border">
        <Container className="py-8">
          <SectionHeading title="Browse by Category" />
          <CategoryCards categories={CATEGORIES} />
        </Container>
      </div>

      {/* Full listing */}
      <Container id="listing" className="scroll-mt-24 py-8">
        <header className="mb-6">
          <h2 className="text-xl font-bold text-foreground">All Publications</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Browse the complete document library or filter by category.
          </p>
        </header>
        <div className="mb-2">
          <FilterBar
            selects={[
              { key: 'knowledge_category', labelKey: 'filter.knowledgeCategory', options: knowledgeCategories },
            ]}
          />
        </div>
        <ResultsSummary total={list.pagination.total_items} />
        {list.items.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {list.items.map((document) => (
              <DocumentCard key={document.id} document={document} />
            ))}
          </div>
        )}
        <PaginationNav page={list.pagination.page} totalPages={list.pagination.total_pages} />
      </Container>
    </>
  );
}
