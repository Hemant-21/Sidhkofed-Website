import type { ReactNode } from 'react';
import { Breadcrumbs } from '@/components/ui/breadcrumb';
import { Container } from '@/components/ui/container';
import { LocalizedHeading, LocalizedText } from './localized-heading';

/**
 * Shared shell for every public listing page: breadcrumb trail, bilingual page
 * heading + subtitle, an optional filter island, the results grid (children), and
 * an optional pagination island. Keeps all listings visually and structurally
 * consistent (codex: reusable section/card components).
 */
export function ListingLayout({
  titleKey,
  subtitleKey,
  crumb,
  parentCrumbs,
  filters,
  summary,
  children,
  pagination,
}: {
  titleKey: string;
  subtitleKey?: string;
  crumb: string;
  /** Optional parent breadcrumbs that precede the current crumb. */
  parentCrumbs?: { label: string; href?: string }[];
  filters?: ReactNode;
  summary?: ReactNode;
  children: ReactNode;
  pagination?: ReactNode;
}) {
  const breadcrumbItems = [...(parentCrumbs ?? []), { label: crumb }];
  return (
    <>
      <Breadcrumbs items={breadcrumbItems} />
      <Container className="py-8">
        <header className="mb-6">
          <LocalizedHeading titleKey={titleKey} as="h1" />
          {subtitleKey && (
            <LocalizedText textKey={subtitleKey} className="-mt-1 max-w-3xl text-muted-foreground" />
          )}
        </header>
        {filters && <div className="mb-2">{filters}</div>}
        {summary}
        {children}
        {pagination}
      </Container>
    </>
  );
}
