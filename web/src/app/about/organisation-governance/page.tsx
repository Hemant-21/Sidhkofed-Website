import type { Metadata } from 'next';
import { ExternalLink } from 'lucide-react';
import { buildMetadata } from '@/lib/seo';
import { Breadcrumbs } from '@/components/ui/breadcrumb';
import { Container } from '@/components/ui/container';
import { CooperativeStructure } from '@/components/content/cooperative-structure';
import { ContactCta } from '@/components/content/contact-cta';

export const metadata: Metadata = buildMetadata({
  title: 'Organisation & Governance',
  description: "SIDHKOFED's organisational structure, board composition and governance framework.",
  path: '/about/organisation-governance',
});

export default function OrgGovernancePage() {
  return (
    <>
      <Breadcrumbs
        items={[
          { label: 'About Us', href: '/about' },
          { label: 'Organisation & Governance' },
        ]}
      />
      <Container className="py-12">
        <meta name="google" content="on" />
        <header className="mb-8 max-w-3xl">
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Organisation &amp; Governance
          </h1>
          <p className="mt-3 text-lg text-muted-foreground">
            SIDHKOFED&apos;s three-tier cooperative structure and governance framework.
          </p>
        </header>

        <div className="max-w-3xl space-y-10">
          {/* Three-tier diagram */}
          <section>
            <h2 className="mb-2 text-xl font-semibold text-foreground">Organisational Structure</h2>
            <p className="mb-4 text-base text-muted-foreground">
              SIDHKOFED operates as a three-tier cooperative structure spanning state, district and village levels.
            </p>
            <CooperativeStructure />
          </section>

          {/* Board of Directors */}
          <section>
            <h2 className="mb-4 text-xl font-semibold text-foreground">Board of Directors</h2>
            <div className="rounded-lg border-l-4 border-primary bg-primary/5 p-5">
              <p className="text-base text-foreground">
                SIDHKOFED is governed by a Board of Directors constituted under the provisions of the{' '}
                <strong>Jharkhand Cooperative Societies Act</strong>. The Board includes elected representatives
                from member cooperatives and nominated directors from the state government.
              </p>
              <p className="mt-3 text-base text-foreground">
                The <strong>Managing Director</strong> is the principal executive officer responsible for
                day-to-day administration, implementation of Board decisions and statutory compliance.
              </p>
            </div>
          </section>

          {/* Governance Framework */}
          <section>
            <h2 className="mb-4 text-xl font-semibold text-foreground">Governance Framework</h2>
            <ul className="space-y-3">
              {[
                'Annual General Body meetings are held as prescribed under the Act.',
                'Accounts are audited by the Cooperative Audit Department, Government of Jharkhand.',
                'All procurement and financial transactions follow GFR norms and cooperative bye-laws.',
              ].map((item) => (
                <li key={item} className="flex gap-3">
                  <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary" />
                  <span className="text-base text-foreground">{item}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* RTI */}
          <section>
            <h2 className="mb-3 text-xl font-semibold text-foreground">Right to Information (RTI)</h2>
            <p className="mb-4 text-base text-foreground">
              RTI applications are processed as per the Right to Information Act, 2005. Citizens may submit
              applications online through the central RTI portal.
            </p>
            <a
              href="https://rtionline.gov.in/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-md border border-border bg-surface px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
            >
              Apply on RTI Portal
              <ExternalLink className="h-4 w-4" />
            </a>
          </section>

          <p className="rounded-md border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
            <strong>Note:</strong> This page is in English. Your browser can translate it automatically. For
            official documents, refer to the{' '}
            <a href="/publications" className="underline underline-offset-4 hover:text-foreground">
              Publications
            </a>{' '}
            section.
          </p>
        </div>

        <div className="max-w-3xl">
          <ContactCta />
        </div>
      </Container>
    </>
  );
}
