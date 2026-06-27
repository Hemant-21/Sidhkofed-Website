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
  filters,
  summary,
  children,
  pagination,
}: {
  titleKey: string;
  subtitleKey?: string;
  /** Breadcrumb label for the current page (navigation chrome). */
  crumb: string;
  filters?: ReactNode;
  summary?: ReactNode;
  children: ReactNode;
  pagination?: ReactNode;
}) {
  return (
    <>
      <Breadcrumbs items={[{ label: crumb }]} />
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
