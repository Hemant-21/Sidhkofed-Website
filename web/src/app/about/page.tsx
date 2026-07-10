import type { Metadata } from 'next';
import { Eye, Crosshair, Leaf, CheckCircle2 } from 'lucide-react';
import { buildMetadata } from '@/lib/seo';
import { getListSafe } from '@/lib/api/server';
import { PUBLIC_ENDPOINTS } from '@/lib/api/endpoints';
import type { Commodity } from '@/lib/types/api';
import { Breadcrumbs } from '@/components/ui/breadcrumb';
import { Container } from '@/components/ui/container';
import { SectionHeading } from '@/components/ui/section-heading';
import { CooperativeStructure } from '@/components/content/cooperative-structure';
import { GovernanceToggle } from '@/components/content/governance-toggle';
import { ContactCta } from '@/components/content/contact-cta';
import { CoverImage } from '@/components/content/cover-image';

export const metadata: Metadata = buildMetadata({
  title: 'About SIDHKOFED',
  description:
    'Learn about SIDHKOFED — the Sidho-Kanho Agriculture and Forest Produce State Cooperative Federation empowering cooperative livelihoods across Jharkhand.',
  path: '/about',
});

const STATS = [
  { value: 'Est. 2021', label: 'Incorporated' },
  { value: '24', label: 'Districts' },
  { value: '4,454', label: 'MPCS' },
  { value: 'Jharkhand', label: 'State' },
];

const STATE_BOARD = [
  { role: 'Chairman', note: "Hon'ble Chief Minister of Jharkhand" },
  {
    role: 'Vice-Chairman',
    note: 'Minister, Agriculture, Animal Husbandry & Cooperation Department',
  },
  {
    role: 'Ex-Officio Directors',
    note: 'Addl. Chief Secretary / Principal Secretary / Secretary — Forest, Environment & Climate Change; Finance; Agriculture, Animal Husbandry & Cooperation; and Welfare Departments',
  },
  { role: 'Chief Executive Officer', note: 'Appointed I.A.S./I.F.S. Officer' },
  { role: 'Secretary', note: 'Appointed Sr. Officer from Cooperative Department' },
  {
    role: 'Elected Directors',
    note: '10 directors — 2 from each of the 5 divisions, 50% seats reserved for women',
  },
  { role: 'Nominated Directors', note: '3 directors nominated by the State Government' },
  { role: 'Special Invitee Director', note: 'Representing JHASCOLAMPF, JHAMFCOFED and VEJFED' },
  { role: 'Special Invitees (MLAs)', note: 'One MLA from each division' },
];

const DISTRICT_BOARD = [
  { role: 'Chairman', note: 'Deputy Commissioner' },
  { role: 'Managing Director', note: 'Divisional Forest Officer' },
  { role: 'Director-cum-Secretary', note: 'District Cooperative Officer' },
  {
    role: 'Ex-Officio Directors',
    note: 'District Agriculture Officer; Project Director / District Welfare Officer; District Supply Officer; District Panchayati Raj Officer; General Manager, District Industries Centre',
  },
  { role: 'Special Invitees', note: "Hon'ble MLAs of the concerned district" },
];

const OBJECTIVES = [
  'Eliminate middlemen from the trade of agricultural and forest produce and related activities.',
  'Ensure fair prices for the products of Scheduled Tribes and rural inhabitants.',
  'Organise the production, collection, processing and marketing of agricultural and forest produce — such as paddy, mahua, lac, tasar, bael and kodo-kutki — on a cooperative basis.',
  'Establish a system for procurement, storage, processing and sales that maximises benefits for members.',
  'Facilitate access to national and international markets and provide support through cooperative institutions.',
  'Establish coordination between district-level and primary-level cooperative societies.',
];

export default async function AboutPage() {
  const { items: commodities } = await getListSafe<Commodity>(`${PUBLIC_ENDPOINTS.masters}/commodities`, {
    query: { page_size: 100 },
    revalidate: 3600,
  });

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
              (SIDHKOFED) is the State-level apex cooperative federation working for the development
              of agriculture and minor forest produce-based livelihoods in Jharkhand.
            </p>
            <p>
              Through a three-tier cooperative structure, it connects 24 District Cooperative Unions
              with approximately 4,454 MPCS/LAMPS across the State. Its major areas of work include
              capacity building, procurement, value addition, storage, marketing, digital services
              and livelihood promotion.
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

      {/* ── 3. ORGANISATION STRUCTURE + GOVERNANCE ── */}
      <div className="bg-muted/40">
        <Container className="py-12">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:items-start">
            <div>
              <SectionHeading title="Organisation Structure" />
              <p className="text-base leading-relaxed text-foreground">
                SIDHKOFED functions through a three-tier structure comprising the State-level apex
                federation, 24 District Cooperative Unions and approximately 4,454 grassroots
                MPCS/LAMPS. Each District Union is in turn headed by the Deputy Commissioner, with
                district officials serving as ex-officio directors — switch the tabs alongside to
                see either board&apos;s composition.
              </p>
            </div>

            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Governance — Board of Directors
              </p>
              <GovernanceToggle stateBoard={STATE_BOARD} districtBoard={DISTRICT_BOARD} />
            </div>
          </div>
        </Container>
      </div>

      {/* ── 3B. OBJECTIVES ── */}
      <Container className="py-12">
        <SectionHeading title="Objectives" />
        <div className="grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2">
          {OBJECTIVES.map((objective) => (
            <div key={objective} className="flex items-start gap-2.5">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
              <p className="text-sm leading-relaxed text-foreground">{objective}</p>
            </div>
          ))}
        </div>
      </Container>

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
              To strengthen more than 4,454 primary cooperative institutions through training,
              technology, market linkage and transparent programme implementation. SIDHKOFED works
              to improve procurement, processing, value addition, storage and marketing of
              agricultural and minor forest produce.
            </p>
          </div>
        </div>
      </Container>

      {/* ── 5. KEY COMMODITIES ── */}
      {commodities.length > 0 && (
        <div className="bg-muted/40">
          <Container className="py-12">
            <SectionHeading title="Key Commodities" />
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
              {commodities.map((c) => (
                <div
                  key={c.id}
                  className="flex flex-col items-center rounded-lg border border-border bg-surface p-4 text-center"
                >
                  {c.icon_media ? (
                    <CoverImage
                      media={c.icon_media}
                      fallbackAlt={c.name_en}
                      rounded
                      className="mb-3 h-10 w-10"
                      sizes="40px"
                    />
                  ) : (
                    <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                      <Leaf className="h-4 w-4 text-primary" aria-hidden="true" />
                    </div>
                  )}
                  <p className="text-sm font-bold text-foreground">{c.name_en}</p>
                  {c.category && <p className="mt-0.5 text-[11px] text-muted-foreground">{c.category}</p>}
                </div>
              ))}
            </div>
          </Container>
        </div>
      )}

      {/* ── 6. CONTACT CTA ── */}
      <Container className="py-12">
        <ContactCta />
      </Container>
    </>
  );
}
