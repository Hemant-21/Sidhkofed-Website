import type { Metadata } from 'next';
import Link from 'next/link';
import { buildMetadata } from '@/lib/seo';
import { Breadcrumbs } from '@/components/ui/breadcrumb';
import { Container } from '@/components/ui/container';
import { CooperativeStructure } from '@/components/content/cooperative-structure';
import { ContactCta } from '@/components/content/contact-cta';

export const metadata: Metadata = buildMetadata({
  title: 'About SIDHKOFED',
  description:
    'Learn about SIDHKOFED — the Sidho Kanho Birsa Multipurpose Cooperative Federation empowering cooperative livelihoods across Jharkhand.',
  path: '/about',
});

export default function AboutPage() {
  return (
    <>
      <Breadcrumbs items={[{ label: 'About Us' }]} />
      <Container className="py-10">
        <meta name="google" content="on" />

        {/* Header */}
        <header className="mb-8 max-w-3xl">
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">About SIDHKOFED</h1>
            <span className="rounded-full border border-border bg-muted px-3 py-0.5 text-xs font-medium text-muted-foreground">
              Reg. No. 02/H.Q./2021
            </span>
          </div>
          <p className="text-lg text-muted-foreground">
            Sidho Kanho Birsa Multipurpose Cooperative Federation Ltd.
          </p>
          <p className="mt-1 font-hindi text-base text-muted-foreground">
            सिद्धो-कान्हो कृषि एवं वनोपज राज्य सहकारी संघ, झारखण्ड
          </p>
        </header>

        {/* Intro prose */}
        <div className="max-w-3xl space-y-4 text-base leading-relaxed text-foreground">
          <p>
            SIDHKOFED is the apex cooperative body of Jharkhand, established to strengthen the cooperative
            movement and improve the livelihoods of tribal and rural communities across the state. Incorporated
            under the Cooperative Societies Act and functioning under the aegis of the Government of Jharkhand,
            the federation addresses market inefficiencies and ensures fair compensation to Scheduled Tribe and
            rural producers.
          </p>
          <p>
            The federation works with primary cooperatives and district-level cooperative unions to provide
            training, marketing support, procurement facilitation and institutional capacity-building services
            for its member institutions and their beneficiaries.
          </p>
          <p>
            SIDHKOFED&apos;s mandate encompasses the procurement of Minor Forest Produce (MFP), trade
            facilitation for forest-based and agricultural commodities, skill development programmes, and
            dissemination of cooperative best practices across Jharkhand&apos;s 24 districts.
          </p>
        </div>

        {/* Three-tier structure */}
        <div className="mt-10 max-w-3xl">
          <h2 className="mb-2 text-xl font-semibold text-foreground">Cooperative Structure</h2>
          <p className="mb-1 text-sm text-muted-foreground">
            SIDHKOFED operates through a three-tier cooperative hierarchy:
          </p>
          <CooperativeStructure />
        </div>

        {/* Navigation cards */}
        <nav aria-label="About sections" className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Link
            href="/about/vision-mission-objectives-functions"
            className="group rounded-lg border border-border bg-surface p-5 shadow-sm transition-shadow hover:shadow-md"
          >
            <h2 className="text-base font-semibold text-foreground group-hover:text-primary">
              Vision, Mission, Objectives &amp; Functions
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Our guiding principles, strategic objectives and core operational functions.
            </p>
          </Link>
          <Link
            href="/about/organisation-governance"
            className="group rounded-lg border border-border bg-surface p-5 shadow-sm transition-shadow hover:shadow-md"
          >
            <h2 className="text-base font-semibold text-foreground group-hover:text-primary">
              Organisation &amp; Governance
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              SIDHKOFED&apos;s organisational structure, board composition and governance framework.
            </p>
          </Link>
          <Link
            href="/membership"
            className="group rounded-lg border border-border bg-surface p-5 shadow-sm transition-shadow hover:shadow-md"
          >
            <h2 className="text-base font-semibold text-foreground group-hover:text-primary">Membership</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              View member institutions, district unions and the membership process.
            </p>
          </Link>
        </nav>

        <div className="max-w-3xl">
          <ContactCta />
        </div>
      </Container>
    </>
  );
}
