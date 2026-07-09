import Image from 'next/image';
import Link from 'next/link';
import { getListSafe, getOneSafe } from '@/lib/api/server';
import { PUBLIC_ENDPOINTS } from '@/lib/api/endpoints';
import type {
  EventSummary,
  Faq,
  GalleryDetail,
  ProgrammeSummary,
  CommunicationSummary,
  TenderSummary,
  KpisResponse,
  Leader,
} from '@/lib/types/content';
import { Container } from '@/components/ui/container';
import { HeroSearch } from '@/components/home/hero-search';
import { KpiStrip } from '@/components/dashboard/kpi-strip';
import { QuickLinks } from '@/components/home/quick-links';
import { TrainingTimeline } from '@/components/home/training-timeline';
import { ProgrammeCard } from '@/components/cards/programme-card';
import { CommunicationCard } from '@/components/cards/communication-card';
import { TenderCard } from '@/components/cards/tender-card';
import { HomeSection } from '@/components/home/home-section';
import { FaqAccordion } from '@/components/content/faq-accordion';
import { LeadersSection } from '@/components/home/leaders-section';
import { OrganizationJsonLd } from '@/components/seo/json-ld';
import { detailPath } from '@/lib/api/endpoints';

export const revalidate = 300;

export default async function HomePage() {
  const [kpis, heroGallery, leaders, programmes, communications, tenders, trainings, faqs, galleryEvents] = await Promise.all([
    getOneSafe<KpisResponse>(PUBLIC_ENDPOINTS.dashboardKpis),
    getOneSafe<GalleryDetail>(detailPath(PUBLIC_ENDPOINTS.galleries, 'hero-slides')),
    getListSafe<Leader>(PUBLIC_ENDPOINTS.leadership, { query: { page_size: 12 } }),
    getListSafe<ProgrammeSummary>(PUBLIC_ENDPOINTS.programmes, { query: { show_on_homepage: true, page_size: 6 } }),
    getListSafe<CommunicationSummary>(PUBLIC_ENDPOINTS.communications, { query: { show_on_homepage: true, page_size: 4 } }),
    getListSafe<TenderSummary>(PUBLIC_ENDPOINTS.tenders, { query: { tender_status: 'open', page_size: 4 } }),
    getListSafe<EventSummary>(PUBLIC_ENDPOINTS.events, { query: { event_type: 'training', page_size: 3, ordering: '-start_date' } }),
    getListSafe<Faq>(PUBLIC_ENDPOINTS.faqs, { query: { highlight_type: 'homepage', page_size: 8 } }),
    getListSafe<EventSummary>(PUBLIC_ENDPOINTS.events, { query: { page_size: 10, ordering: '-start_date' } }),
  ]);

  const galleryItems = galleryEvents.items.filter((e) => e.cover_media !== null).slice(0, 6);
  // First 3 live KPI metrics for the hero's inline stat strip — same data `<KpiStrip>`
  // renders below, just capped shorter for the hero's compact layout.
  const heroStats = (kpis?.kpis ?? []).flatMap((r) => r.metrics).slice(0, 3);

  return (
    <>
      <OrganizationJsonLd />

      {/* 1. Hero — bold split with diagonal image panel, live stats, embedded search */}
      <section className="overflow-hidden bg-primary">
        <HeroSearch slides={heroGallery?.images ?? []} stats={heroStats} />
      </section>

      {/* 2. KPI Strip */}
      {kpis && kpis.kpis.length > 0 && (
        <section aria-label="Impact at a glance" className="border-b border-border bg-surface">
          <Container className="py-8">
            <KpiStrip reports={kpis.kpis} />
          </Container>
        </section>
      )}

      {/* 3. Quick Access */}
      <QuickLinks />

      {/* 4. Governance band — notices + tenders (promoted: carries the "latest updates"
          job the retired announcement ticker used to do) */}
      {(communications.items.length > 0 || tenders.items.length > 0) && (
        <section className="bg-muted/40">
          <Container className="py-14">
            <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
              <HomeSection
                titleKey="home.section.communications"
                viewAllHref="/notifications/notices"
                show={communications.items.length > 0}
                bare
              >
                <div className="space-y-4">
                  {communications.items.map((c) => (
                    <CommunicationCard key={c.id} item={c} />
                  ))}
                </div>
              </HomeSection>
              <HomeSection
                titleKey="home.section.tenders"
                viewAllHref="/notifications/tenders"
                show={tenders.items.length > 0}
                bare
              >
                <div className="space-y-4">
                  {tenders.items.map((tdr) => (
                    <TenderCard key={tdr.id} tender={tdr} />
                  ))}
                </div>
              </HomeSection>
            </div>
          </Container>
        </section>
      )}

      {/* 5. Leadership — demoted below Quick Access/KPI/Governance so it no longer
          outranks citizen tasks; CMS-driven via the Leadership module */}
      <LeadersSection leaders={leaders.items} />

      {/* 6. About editorial — 2-col */}
      <section className="bg-muted/40">
        <Container className="py-14">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Institutional Identity
              </p>
              <h2 className="mt-2 text-2xl font-bold text-foreground sm:text-3xl">
                SIDHKOFED — apex cooperative platform for Jharkhand
              </h2>
            </div>
            <div>
              <p className="text-base leading-relaxed text-foreground">
                SIDHKOFED supports cooperative livelihoods across Jharkhand through minor forest
                produce procurement, training, market linkages and public governance — connecting
                24 districts and thousands of tribal households.
              </p>
              <ul className="mt-5 space-y-2">
                {[
                  'Government credibility with modern usability',
                  'Public-first information architecture',
                  'Service-enabled, data-ready cooperative platform',
                ].map((item) => (
                  <li key={item} className="flex gap-2.5 text-sm text-muted-foreground">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    {item}
                  </li>
                ))}
              </ul>
              <Link
                href="/about"
                className="mt-6 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
              >
                About SIDHKOFED →
              </Link>
            </div>
          </div>
        </Container>
      </section>

      {/* 7. Activities & Commodities — CMS programmes */}
      {programmes.items.length > 0 && (
        <section>
          <Container className="py-14">
            <div className="mb-8">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Activities &amp; Commodities
              </p>
              <h2 className="mt-2 text-2xl font-bold text-foreground sm:text-3xl">
                Forest economy and cooperative value chains
              </h2>
            </div>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {programmes.items.map((p) => (
                <ProgrammeCard key={p.id} programme={p} />
              ))}
            </div>
            <div className="mt-8 text-right">
              <Link href="/activities" className="text-sm font-medium text-primary hover:underline">
                View all activities →
              </Link>
            </div>
          </Container>
        </section>
      )}

      {/* 8. Capacity Building — training events timeline */}
      <section className={programmes.items.length > 0 ? 'bg-muted/40' : ''}>
        <Container className="py-14">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:items-start">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Capacity Building
              </p>
              <h2 className="mt-2 text-2xl font-bold text-foreground sm:text-3xl">
                Training for districts and beneficiaries
              </h2>
              <p className="mt-4 text-base text-muted-foreground">
                Structured training programmes for cooperative members, management committees and
                district societies across Jharkhand.
              </p>
              <Link
                href="/activities/trainings"
                className="mt-6 inline-block rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                View all trainings
              </Link>
            </div>
            <div className="pt-2">
              <TrainingTimeline events={trainings.items} />
            </div>
          </div>
        </Container>
      </section>

      {/* 9. FAQ — highlight_type=homepage, hidden when empty */}
      {faqs.items.length > 0 && (
        <section className={programmes.items.length > 0 ? '' : 'bg-muted/40'}>
          <Container className="py-14">
            <FaqAccordion faqs={faqs.items} title="Common Questions" />
          </Container>
        </section>
      )}

      {/* 10. Knowledge Hub — static category cards */}
      <section className="border-t border-border">
        <Container className="py-14">
          <div className="mb-8">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Knowledge Hub
            </p>
            <h2 className="mt-2 text-2xl font-bold text-foreground sm:text-3xl">
              Acts, SOPs, reports, training materials and publications
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                label: 'Reports & Research',
                href: '/publications/reports-research',
                desc: 'Annual reports, studies and research publications',
              },
              {
                label: 'Policies, Guidelines & SOPs',
                href: '/publications/policies-guidelines-sops',
                desc: 'Cooperative governance and operational procedures',
              },
              {
                label: 'Training Materials',
                href: '/publications/training-materials',
                desc: 'Commodity-wise learning and awareness resources',
              },
              {
                label: 'Forms & Formats',
                href: '/publications/forms-formats',
                desc: 'Application forms and standard formats',
              },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="group rounded-lg border border-border bg-surface p-5 transition-all hover:border-primary hover:shadow-sm"
              >
                <p className="font-semibold text-foreground transition-colors group-hover:text-primary">
                  {item.label}
                </p>
                <p className="mt-1.5 text-sm text-muted-foreground">{item.desc}</p>
              </Link>
            ))}
          </div>
        </Container>
      </section>

      {/* 11. Media Gallery — event cover photos, hidden when fewer than 2 images */}
      {galleryItems.length >= 2 && (
        <section className="bg-muted/40">
          <Container className="py-14">
            <div className="mb-8 flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Photo Gallery
                </p>
                <h2 className="mt-1 text-2xl font-bold text-foreground sm:text-3xl">
                  Cooperative life across Jharkhand
                </h2>
              </div>
              <Link
                href="/publications/media"
                className="shrink-0 text-sm font-medium text-primary hover:underline"
              >
                View all →
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {galleryItems.map((event) => (
                <Link
                  key={event.id}
                  href={event.public_url}
                  className="group relative aspect-[4/3] overflow-hidden rounded-xl bg-muted"
                >
                  <Image
                    src={event.cover_media!.url}
                    alt={event.cover_media!.alt_text || event.cover_media!.title || event.title_en || ''}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 380px"
                    unoptimized={event.cover_media!.url.startsWith('http://localhost')}
                  />
                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                  <p className="absolute bottom-0 left-0 right-0 translate-y-1 px-3 pb-3 text-xs font-medium leading-snug text-white opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 line-clamp-2">
                    {event.title_en}
                  </p>
                </Link>
              ))}
            </div>
          </Container>
        </section>
      )}
    </>
  );
}
