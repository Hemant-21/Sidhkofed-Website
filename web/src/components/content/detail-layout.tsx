import type { ReactNode } from 'react';
import { Breadcrumbs, type Crumb } from '@/components/ui/breadcrumb';
import { Container } from '@/components/ui/container';

/**
 * Server shell for content detail pages: breadcrumb trail plus an optional
 * two-column layout (main article + aside). Without an aside it centers a readable
 * single column. The bilingual body itself is a client island passed as children.
 */
export function DetailLayout({
  crumbs,
  children,
  aside,
}: {
  crumbs: Crumb[];
  children: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <>
      <Breadcrumbs items={crumbs} />
      <Container className="py-8">
        {aside ? (
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_19rem]">
            <article className="min-w-0">{children}</article>
            <aside className="space-y-6 lg:border-l lg:border-border lg:pl-8">{aside}</aside>
          </div>
        ) : (
          <article className="mx-auto max-w-3xl">{children}</article>
        )}
      </Container>
    </>
  );
}

/** A titled card block for aside/detail sections. */
export function DetailSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">{title}</h2>
      {children}
    </section>
  );
}
