import type { Metadata } from 'next';
import Link from 'next/link';
import {
  GraduationCap,
  ImageIcon,
  BookOpen,
  FileText,
  ArrowRight,
} from 'lucide-react';
import { getListSafe } from '@/lib/api/server';
import { PUBLIC_ENDPOINTS } from '@/lib/api/endpoints';
import type { DocumentSummary } from '@/lib/types/content';
import { buildMetadata } from '@/lib/seo';
import { PAGE_SIZE, toPage, qstr, getMasterOptions } from '@/lib/listing';
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

const CATEGORIES = [
  {
    icon: FileText,
    label: 'Bye-laws',
    description: 'SIDHKOFED and District Union bye-laws.',
    href: '/publications?knowledge_category=bye-laws#listing',
  },
  {
    icon: GraduationCap,
    label: 'Training Resources',
    description: 'Manuals, handbooks and learning resources.',
    href: '/publications?knowledge_category=training-resources#listing',
  },
  {
    icon: BookOpen,
    label: 'SOPs & Manuals',
    description: 'Standard operating procedures and operational manuals.',
    href: '/publications?knowledge_category=sops-and-manuals#listing',
  },
  {
    icon: ImageIcon,
    label: 'Media Gallery',
    description: 'Photo and video archive of activities and events.',
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
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {CATEGORIES.map(({ icon: Icon, label, description, href }) => (
              <Link
                key={href}
                href={href}
                className="group flex flex-col gap-2 rounded-xl border border-border bg-surface p-4 transition-colors hover:border-primary/50 hover:bg-primary/5"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 transition-colors group-hover:bg-primary/20">
                  <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-foreground leading-tight">{label}</p>
                  <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{description}</p>
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" aria-hidden="true" />
              </Link>
            ))}
          </div>
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
