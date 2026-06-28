import type { Metadata } from 'next';
import Link from 'next/link';
import { Eye, Building2, Users } from 'lucide-react';
import { buildMetadata } from '@/lib/seo';
import { Breadcrumbs } from '@/components/ui/breadcrumb';
import { Container } from '@/components/ui/container';
import { CooperativeStructure } from '@/components/content/cooperative-structure';
import { ContactCta } from '@/components/content/contact-cta';

export const metadata: Metadata = buildMetadata({
  title: 'About SIDHKOFED',
  description:
    'Learn about SIDHKOFED — the Sidho-Kanho Agriculture and Forest Produce State Cooperative Federation empowering cooperative livelihoods across Jharkhand.',
  path: '/about',
});

const STATS = [
  { value: 'Est. 2021',   label: 'Incorporated' },
  { value: '24',          label: 'Districts' },
  { value: '4,454',       label: 'MPCS' },
  { value: 'Jharkhand',   label: 'State' },
];

const NAV_CARDS = [
  {
    href: '/about/vision-mission-objectives-functions',
    icon: Eye,
    title: 'Vision, Mission, Objectives & Functions',
    desc: 'Our guiding principles, strategic objectives and core operational functions.',
  },
  {
    href: '/about/organisation-governance',
    icon: Building2,
    title: 'Organisation & Governance',
    desc: "SIDHKOFED's organisational structure, board composition and governance framework.",
  },
  {
    href: '/membership',
    icon: Users,
    title: 'Membership',
    desc: 'View member institutions, district unions and the membership process.',
  },
];

export default function AboutPage() {
  return (
    <>
      <Breadcrumbs items={[{ label: 'About Us' }]} />

      {/* ── PAGE HEADER BAND ── */}
      <div className="bg-primary">
        <Container className="py-10 sm:py-14">
          {/* Org identity */}
          <div className="mb-6 flex flex-wrap items-start gap-3">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                About SIDHKOFED
              </h1>
              <p className="mt-2 text-base font-medium text-white/75">
                Sidho-Kanho Agriculture and Forest Produce State Cooperative Federation
              </p>
              <p className="mt-1 text-base text-white/60" lang="hi">
                सिद्धो-कान्हो कृषि एवं वनोपज राज्य सहकारी संघ
              </p>
            </div>
            <span className="mt-1 shrink-0 rounded-full border border-white/25 bg-white/10 px-3 py-0.5 text-xs font-medium text-white/80">
              Reg. No. 02/H.Q./2021
            </span>
          </div>

          {/* Stat chips */}
          <div className="flex flex-wrap gap-x-8 gap-y-3 border-t border-white/15 pt-6">
            {STATS.map((s) => (
              <div key={s.label} className="flex items-baseline gap-1.5">
                <span className="text-lg font-black text-white">{s.value}</span>
                <span className="text-xs font-medium text-white/50">{s.label}</span>
              </div>
            ))}
          </div>
        </Container>
      </div>

      {/* ── TWO-COLUMN: PROSE LEFT, STRUCTURE RIGHT ── */}
      <Container className="py-12">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:items-start">

          {/* Left — existing prose */}
          <div className="space-y-4 text-base leading-relaxed text-foreground">
            <p>
              SIDHKOFED is the apex cooperative body of Jharkhand, established to strengthen the
              cooperative movement and improve the livelihoods of tribal and rural communities
              across the state. Incorporated under the Cooperative Societies Act and functioning
              under the aegis of the Government of Jharkhand, the federation addresses market
              inefficiencies and ensures fair compensation to Scheduled Tribe and rural producers.
            </p>
            <p>
              The federation works with primary cooperatives and district-level cooperative unions
              to provide training, marketing support, procurement facilitation and institutional
              capacity-building services for its member institutions and their beneficiaries.
            </p>
            <p>
              SIDHKOFED&apos;s mandate encompasses the procurement of Minor Forest Produce (MFP),
              trade facilitation for forest-based and agricultural commodities, skill development
              programmes, and dissemination of cooperative best practices across
              Jharkhand&apos;s 24 districts.
            </p>
          </div>

          {/* Right — hierarchy diagram */}
          <div>
            <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Cooperative Structure
            </p>
            <CooperativeStructure />
          </div>

        </div>
      </Container>

      {/* ── SECTION NAV CARDS ── */}
      <Container className="py-12">
        <nav aria-label="About sections" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {NAV_CARDS.map(({ href, icon: Icon, title, desc }) => (
            <Link
              key={href}
              href={href}
              className="group flex flex-col rounded-xl border border-border bg-surface p-6 shadow-sm transition-all hover:border-primary/40 hover:shadow-md"
            >
              <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-white">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </div>
              <h2 className="text-base font-semibold text-foreground group-hover:text-primary">
                {title}
              </h2>
              <p className="mt-1.5 text-sm text-muted-foreground">{desc}</p>
            </Link>
          ))}
        </nav>

        <div className="mt-8 max-w-3xl">
          <ContactCta />
        </div>
      </Container>
    </>
  );
}
