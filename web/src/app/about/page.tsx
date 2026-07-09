import type { Metadata } from 'next';
import { Eye, Crosshair, Leaf } from 'lucide-react';
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
  { value: 'Est. 2021', label: 'Incorporated' },
  { value: '24',        label: 'Districts'     },
  { value: '4,454',     label: 'MPCS'          },
  { value: 'Jharkhand', label: 'State'         },
];

const COMMODITIES = [
  { name: 'Lac',           category: 'Minor Forest Produce' },
  { name: 'Honey',         category: 'Minor Forest Produce' },
  { name: 'Karanj Seeds',  category: 'Oil Seed / MFP'       },
  { name: 'Ragi',          category: 'Agriculture'           },
  { name: 'Sal Seeds',     category: 'Minor Forest Produce' },
  { name: 'Mahua',         category: 'Minor Forest Produce' },
];

export default function AboutPage() {
  return (
    <>
      <Breadcrumbs items={[{ label: 'About Us' }]} />

      {/* ── 1. PAGE HEADER BAND ── */}
      <div className="bg-primary">
        <Container className="py-10 sm:py-14">
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

      {/* ── 2. ABOUT + COOPERATIVE STRUCTURE ── */}
      <Container className="py-12">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:items-start">
          <div className="space-y-4 text-base leading-relaxed text-foreground">
            <p>
              Sidho Kanho Agriculture and Forest Produce State Cooperative Federation Ltd.
              (SIDHKOFED) is the State-level apex cooperative federation working for the
              development of agriculture and minor forest produce-based livelihoods in Jharkhand.
            </p>
            <p>
              Through a three-tier cooperative structure, it connects 24 District Cooperative
              Unions with approximately 4,454 MPCS/LAMPS across the State. Its major areas of
              work include capacity building, procurement, value addition, storage, marketing,
              digital services and livelihood promotion.
            </p>
          </div>
          <div>
            <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Cooperative Structure
            </p>
            <CooperativeStructure />
          </div>
        </div>
      </Container>

      {/* ── 3. ORGANISATION STRUCTURE ── */}
      <div className="bg-muted/40">
        <Container className="py-12">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:items-start">

            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Organisation Structure
              </p>
              <h2 className="mb-4 text-xl font-bold text-foreground">How SIDHKOFED is organised</h2>
              <p className="text-base leading-relaxed text-foreground">
                SIDHKOFED functions through a three-tier structure comprising the State-level apex
                federation, 24 District Cooperative Unions and approximately 4,454 grassroots
                MPCS/LAMPS. The Federation is governed by its Board of Directors and supported by
                the Chief Executive Officer, officials, technical experts and programme teams.
              </p>
              <p className="mt-4 text-base leading-relaxed text-foreground">
                This structure enables State-level planning and coordination while ensuring
                implementation and beneficiary outreach through district and primary cooperative
                institutions.
              </p>
            </div>

            {/* Governance card */}
            <div className="space-y-3">
              <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Governance
              </p>
              {[
                { role: 'Board of Directors',          note: 'Apex governing body of the federation' },
                { role: 'Chief Executive Officer',     note: 'Shri Shashi Ranjan, I.A.S.' },
                { role: 'Technical Experts',           note: 'Programme and domain specialists' },
                { role: 'Programme Teams',             note: 'District and field implementation' },
              ].map((item) => (
                <div
                  key={item.role}
                  className="flex items-start gap-3 rounded-lg border border-border bg-surface px-4 py-3"
                >
                  <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
                  <div>
                    <p className="text-sm font-semibold text-foreground">{item.role}</p>
                    <p className="text-xs text-muted-foreground">{item.note}</p>
                  </div>
                </div>
              ))}
            </div>

          </div>
        </Container>
      </div>

      {/* ── 4. VISION & MISSION ── */}
      <Container className="py-12">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">

          {/* Vision */}
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-6">
            <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Eye className="h-5 w-5 text-primary" aria-hidden="true" />
            </div>
            <h2 className="mb-3 text-lg font-bold text-foreground">Vision</h2>
            <p className="text-sm leading-relaxed text-foreground">
              To establish an inclusive, professionally managed and digitally enabled cooperative
              ecosystem across all 24 districts of Jharkhand. SIDHKOFED envisions strong grassroots
              institutions that improve the income, market participation and livelihood security of
              farmers, forest-produce collectors, artisans and cooperative members. It seeks to
              position cooperatives as sustainable engines of rural economic growth and community
              empowerment.
            </p>
          </div>

          {/* Mission */}
          <div className="rounded-xl border border-accent/20 bg-accent/5 p-6">
            <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
              <Crosshair className="h-5 w-5 text-accent" aria-hidden="true" />
            </div>
            <h2 className="mb-3 text-lg font-bold text-foreground">Mission</h2>
            <p className="text-sm leading-relaxed text-foreground">
              To strengthen more than 4,400 primary cooperative institutions through training,
              technology, market linkage and transparent programme implementation. SIDHKOFED works
              to improve procurement, processing, value addition, storage and marketing of
              agricultural and minor forest produce.
            </p>
          </div>

        </div>
      </Container>

      {/* ── 5. KEY COMMODITIES ── */}
      <div className="bg-muted/40">
        <Container className="py-12">
          <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            What We Procure
          </p>
          <h2 className="mb-6 text-xl font-bold text-foreground">Key Commodities</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {COMMODITIES.map((c) => (
              <div
                key={c.name}
                className="flex flex-col items-center rounded-lg border border-border bg-surface p-4 text-center"
              >
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <Leaf className="h-4 w-4 text-primary" aria-hidden="true" />
                </div>
                <p className="text-sm font-bold text-foreground">{c.name}</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">{c.category}</p>
              </div>
            ))}
          </div>
        </Container>
      </div>

      {/* ── 6. CONTACT CTA ── */}
      <Container className="py-12">
        <div className="max-w-3xl">
          <ContactCta />
        </div>
      </Container>
    </>
  );
}
