import { getListSafe, getOneSafe } from '@/lib/api/server';
import { PUBLIC_ENDPOINTS } from '@/lib/api/endpoints';
import type {
  EventSummary,
  NewsSummary,
  ProgrammeSummary,
  CommunicationSummary,
  TenderSummary,
  DocumentSummary,
  DigitalService,
  InstitutionSummary,
  KpisResponse,
} from '@/lib/types/content';
import { Container } from '@/components/ui/container';
import { HeroSearch } from '@/components/home/hero-search';
import { KpiStrip } from '@/components/dashboard/kpi-strip';
import { EventCard } from '@/components/cards/event-card';
import { NewsCard } from '@/components/cards/news-card';
import { ProgrammeCard } from '@/components/cards/programme-card';
import { CommunicationCard } from '@/components/cards/communication-card';
import { TenderCard } from '@/components/cards/tender-card';
import { DocumentCard } from '@/components/cards/document-card';
import { DigitalServiceCard } from '@/components/cards/digital-service-card';
import { InstitutionCard } from '@/components/cards/institution-card';
import { HomeSection } from '@/components/home/home-section';
import { OrganizationJsonLd } from '@/components/seo/json-ld';

// Homepage composes individual public endpoints (no /public/home aggregate exists
// in the mounted API). Each section degrades gracefully (get*Safe → empty on error)
// so one failing surface never breaks the whole page. ISR keeps it fresh + fast.
export const revalidate = 300;

export default async function HomePage() {
  const [kpis, events, news, programmes, communications, tenders, documents, services, partners] = await Promise.all([
    getOneSafe<KpisResponse>(PUBLIC_ENDPOINTS.dashboardKpis),
    getListSafe<EventSummary>(PUBLIC_ENDPOINTS.events, { query: { show_on_homepage: true, page_size: 6, ordering: '-start_date' } }),
    getListSafe<NewsSummary>(PUBLIC_ENDPOINTS.news, { query: { show_on_homepage: true, page_size: 3 } }),
    getListSafe<ProgrammeSummary>(PUBLIC_ENDPOINTS.programmes, { query: { show_on_homepage: true, page_size: 3 } }),
    getListSafe<CommunicationSummary>(PUBLIC_ENDPOINTS.communications, { query: { show_on_homepage: true, page_size: 4 } }),
    getListSafe<TenderSummary>(PUBLIC_ENDPOINTS.tenders, { query: { tender_status: 'open', page_size: 4 } }),
    getListSafe<DocumentSummary>(PUBLIC_ENDPOINTS.documents, { query: { knowledge_centre: true, page_size: 4 } }),
    getListSafe<DigitalService>(PUBLIC_ENDPOINTS.digitalServices, { query: { page_size: 8 } }),
    getListSafe<InstitutionSummary>(PUBLIC_ENDPOINTS.homePartners, {}),
  ]);

  return (
    <>
      <OrganizationJsonLd />

      {/* Hero */}
      <section className="bg-gradient-to-b from-primary to-primary/85">
        <Container className="py-14 sm:py-20">
          <HeroSearch />
        </Container>
      </section>

      {/* KPI strip */}
      {kpis && kpis.kpis.length > 0 && (
        <section aria-label="Impact at a glance" className="border-b border-border bg-surface">
          <Container className="py-8">
            <KpiStrip reports={kpis.kpis} />
          </Container>
        </section>
      )}

      <div className="space-y-14 py-14">
        <HomeSection titleKey="home.section.news" viewAllHref="/news" show={news.items.length > 0}>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {news.items.map((n) => (
              <NewsCard key={n.id} news={n} />
            ))}
          </div>
        </HomeSection>

        <HomeSection titleKey="home.section.events" viewAllHref="/events" show={events.items.length > 0}>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {events.items.map((e) => (
              <EventCard key={e.id} event={e} />
            ))}
          </div>
        </HomeSection>

        <HomeSection titleKey="home.section.programmes" viewAllHref="/programmes" show={programmes.items.length > 0}>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {programmes.items.map((p) => (
              <ProgrammeCard key={p.id} programme={p} />
            ))}
          </div>
        </HomeSection>

        <HomeSection titleKey="home.section.services" viewAllHref="/digital-services" show={services.items.length > 0}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {services.items.map((s) => (
              <DigitalServiceCard key={s.id} service={s} />
            ))}
          </div>
        </HomeSection>

        <div className="bg-muted/40 py-14">
          <Container className="grid grid-cols-1 gap-10 lg:grid-cols-2">
            <HomeSection titleKey="home.section.communications" viewAllHref="/communications" show={communications.items.length > 0} bare>
              <div className="space-y-4">
                {communications.items.map((c) => (
                  <CommunicationCard key={c.id} item={c} />
                ))}
              </div>
            </HomeSection>

            <HomeSection titleKey="home.section.tenders" viewAllHref="/tenders" show={tenders.items.length > 0} bare>
              <div className="space-y-4">
                {tenders.items.map((tdr) => (
                  <TenderCard key={tdr.id} tender={tdr} />
                ))}
              </div>
            </HomeSection>
          </Container>
        </div>

        <HomeSection titleKey="home.section.documents" viewAllHref="/knowledge-centre" show={documents.items.length > 0}>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {documents.items.map((d) => (
              <DocumentCard key={d.id} document={d} />
            ))}
          </div>
        </HomeSection>

        <HomeSection titleKey="home.section.partners" viewAllHref="/institutions" show={partners.items.length > 0}>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {partners.items.map((i) => (
              <InstitutionCard key={i.id} institution={i} />
            ))}
          </div>
        </HomeSection>
      </div>
    </>
  );
}
