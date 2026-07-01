import type { Metadata } from 'next';
import Link from 'next/link';
import { Users, Building2, FileDown, ArrowRight, ChevronDown } from 'lucide-react';
import { getListSafe } from '@/lib/api/server';
import { PUBLIC_ENDPOINTS } from '@/lib/api/endpoints';
import type { MembershipSummary, Faq } from '@/lib/types/content';
import { buildMetadata } from '@/lib/seo';
import { Breadcrumbs } from '@/components/ui/breadcrumb';
import { Container } from '@/components/ui/container';
import { SectionHeading } from '@/components/ui/section-heading';
import { MemberHierarchy } from '@/components/membership/member-hierarchy';

export const revalidate = 300;

export const metadata: Metadata = buildMetadata({
  title: 'Membership',
  description:
    'Understand SIDHKOFED cooperative membership — types, benefits, application process and member directory.',
  path: '/membership',
});

export default async function MembershipPage() {
  const [apex, duList, faqList] = await Promise.all([
    getListSafe<MembershipSummary>(PUBLIC_ENDPOINTS.memberships, {
      query: { membership_level: 'sidhkofed', page_size: 5 },
    }),
    getListSafe<MembershipSummary>(PUBLIC_ENDPOINTS.memberships, {
      query: { membership_level: 'district_union', page_size: 50, ordering: 'display_order' },
    }),
    getListSafe<Faq>(PUBLIC_ENDPOINTS.faqs, {
      query: { faq_category: 'membership', page_size: 20 },
    }),
  ]);

  const apexRecord = apex.items[0] ?? null;
  const duRecords = duList.items;
  const totalPrimary = duRecords.reduce((sum, r) => sum + r.primary_member_count, 0);
  const totalNominal = duRecords.reduce((sum, r) => sum + r.nominal_member_count, 0);

  return (
    <>
      <Breadcrumbs items={[{ label: 'Membership' }]} />

      {/* ── PAGE HEADER ── */}
      <div className="bg-primary">
        <Container className="py-10 sm:py-14">
          <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">Membership</h1>
          <p className="mt-2 max-w-2xl text-base text-white/70">
            SIDHKOFED brings together primary cooperative societies and District Unions across all
            24 districts of Jharkhand under a unified cooperative framework.
          </p>
        </Container>
      </div>

      {/* ── SECTION 1: WHAT DOES MEMBERSHIP MEAN ── */}
      <Container className="py-12">
        <SectionHeading title="Understanding Membership" />
        <p className="mb-8 max-w-3xl text-base leading-relaxed text-muted-foreground">
          SIDHKOFED membership is open to cooperative institutions — not individuals. Two
          categories of membership exist, each with distinct rights and benefits within the
          cooperative structure.
        </p>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">

          {/* Primary / Shareholder */}
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-6">
            <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Users className="h-5 w-5 text-primary" aria-hidden="true" />
            </div>
            <div className="mb-1 inline-block rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
              Primary Member
            </div>
            <h2 className="mb-1 text-lg font-bold text-foreground">Shareholder</h2>
            <p className="mb-4 text-xs text-muted-foreground">
              LAMPS, PACS, Multipurpose Cooperative Societies (MPCS) and District Cooperative
              Unions
            </p>
            <ul className="space-y-2 text-sm text-foreground">
              {[
                'Holds shares in SIDHKOFED or the District Union',
                'Entitled to vote in general body meetings',
                'Eligible for profit sharing and dividends',
                'Participates in cooperative governance and elections',
                'Access to procurement, storage and marketing support',
              ].map((b) => (
                <li key={b} className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  {b}
                </li>
              ))}
            </ul>
          </div>

          {/* Nominal / Non-shareholder */}
          <div className="rounded-xl border border-accent/20 bg-accent/5 p-6">
            <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
              <Building2 className="h-5 w-5 text-accent" aria-hidden="true" />
            </div>
            <div className="mb-1 inline-block rounded-full bg-accent/10 px-2.5 py-0.5 text-xs font-semibold text-accent">
              Nominal Member
            </div>
            <h2 className="mb-1 text-lg font-bold text-foreground">Non-Shareholder</h2>
            <p className="mb-4 text-xs text-muted-foreground">
              Farmer Producer Organisations (FPOs), Self Help Groups (SHGs), other cooperative
              societies and eligible business entities
            </p>
            <ul className="space-y-2 text-sm text-foreground">
              {[
                'Does not hold shares or voting rights',
                'Access to cooperative services and market linkages',
                'Eligible for training and capacity building programmes',
                'Can participate in procurement and input supply activities',
                'Pathway to primary membership after fulfilling conditions',
              ].map((b) => (
                <li key={b} className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                  {b}
                </li>
              ))}
            </ul>
          </div>

        </div>
      </Container>

      {/* ── SECTION 2: APPLICATION PROCESS + FEE ── */}
      <div className="bg-muted/40">
        <Container className="py-12">
          <SectionHeading title="Application Process" />
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">

            {/* Steps */}
            <div className="space-y-5">
              {[
                {
                  step: '01',
                  title: 'Obtain the application form',
                  body: 'Download the membership application form below or collect it from your nearest District Union or SIDHKOFED office at Sameti Bhawan, Kanke Road, Ranchi.',
                },
                {
                  step: '02',
                  title: 'Prepare supporting documents',
                  body: 'Attach registration certificate, bye-laws, recent audit report, list of office-bearers and share capital details as applicable.',
                },
                {
                  step: '03',
                  title: 'Submit to the District Union or SIDHKOFED',
                  body: 'Primary society applications are submitted to the District Cooperative Union. DU applications are submitted directly to SIDHKOFED.',
                },
                {
                  step: '04',
                  title: 'Committee review',
                  body: 'The membership committee reviews the application and supporting documents. Queries, if any, are communicated within 30 working days.',
                },
                {
                  step: '05',
                  title: 'Approval and certificate',
                  body: 'On approval, the membership certificate and share allocation (for primary members) are issued and the membership number is recorded in the register.',
                },
              ].map(({ step, title, body }) => (
                <div key={step} className="flex gap-4">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-black text-white">
                    {step}
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{title}</p>
                    <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">{body}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Fee table */}
            <div>
              <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Fee Structure
              </p>
              <div className="overflow-hidden rounded-xl border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/60">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-foreground">
                        Category
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-foreground">
                        Admission Fee
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-foreground">
                        Share Value
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {[
                      { cat: 'Primary (LAMPS / PACS / MPCS)', fee: 'As per bye-laws', share: 'Min. 1 share' },
                      { cat: 'District Cooperative Union',     fee: 'As per bye-laws', share: 'As prescribed' },
                      { cat: 'Nominal Member',                 fee: 'As per bye-laws', share: 'Not applicable' },
                    ].map((r) => (
                      <tr key={r.cat} className="bg-surface">
                        <td className="px-4 py-3 text-foreground">{r.cat}</td>
                        <td className="px-4 py-3 text-muted-foreground">{r.fee}</td>
                        <td className="px-4 py-3 text-muted-foreground">{r.share}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                Exact fee amounts are specified in the SIDHKOFED bye-laws. Contact the office for
                the current fee schedule.
              </p>
            </div>

          </div>
        </Container>
      </div>

      {/* ── SECTION 3: DOWNLOADABLE FORMS ── */}
      <div id="membership-forms">
      <Container className="py-12">
        <SectionHeading title="Membership Forms" />
        <p className="mb-6 text-sm text-muted-foreground">
          Download the relevant form for your institution type. Submit the completed form with
          supporting documents to your District Union or the SIDHKOFED office.
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              label: 'Primary Membership Application',
              subtitle: 'For LAMPS, PACS and MPCS',
              href: '#',
            },
            {
              label: 'Nominal Membership Application',
              subtitle: 'For FPOs, SHGs and other entities',
              href: '#',
            },
            {
              label: 'District Union Membership',
              subtitle: 'For District Cooperative Unions',
              href: '#',
            },
          ].map(({ label, subtitle, href }) => (
            <Link
              key={label}
              href={href}
              className="flex items-center gap-3 rounded-xl border border-border bg-surface px-5 py-4 transition-colors hover:border-primary/40 hover:bg-primary/5"
            >
              <FileDown className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
              <div>
                <p className="text-sm font-semibold text-foreground">{label}</p>
                <p className="text-xs text-muted-foreground">{subtitle}</p>
              </div>
            </Link>
          ))}
        </div>
      </Container>
      </div>

      {/* ── SECTION 4: MEMBER HIERARCHY ── */}
      <div className="bg-muted/40">
        <Container className="py-12">
          <SectionHeading title="Member Directory" />
          <p className="mb-8 text-sm text-muted-foreground">
            A three-tier cooperative structure. Click the primary count to expand district-level
            membership data.
          </p>
          <MemberHierarchy
            apexRecord={apexRecord}
            duRecords={duRecords}
            totalPrimary={totalPrimary}
            totalNominal={totalNominal}
          />
          <p className="mt-6 text-xs text-muted-foreground">
            * Nominal members consist of FPOs, SHGs and other eligible cooperative entities.
          </p>
        </Container>
      </div>

      {/* ── SECTION 5: APPLY CTA ── */}
      <Container className="py-12">
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-8 text-center">
          <h2 className="mb-2 text-xl font-bold text-foreground">
            Ready to join the cooperative network?
          </h2>
          <p className="mb-6 text-sm text-muted-foreground">
            Download the membership form, prepare your documents and submit to your District Union
            or the SIDHKOFED office at Sameti Bhawan, Kanke Road, Ranchi — 834 008.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              href="#membership-forms"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary/90"
            >
              <FileDown className="h-4 w-4" aria-hidden="true" />
              Download Form
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-5 py-2.5 text-sm font-semibold text-foreground hover:bg-muted"
            >
              Contact Office
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </Container>

      {/* ── SECTION 6: FAQs (CMS-driven) ── */}
      {faqList.items.length > 0 && (
        <div className="bg-muted/40">
          <Container className="py-12">
            <SectionHeading title="Frequently Asked Questions" />
            <div className="mt-6 divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
              {faqList.items.map((faq) => (
                <details key={faq.id} className="group">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 marker:hidden hover:bg-muted/50">
                    <p className="font-semibold text-foreground">{faq.question_en}</p>
                    <ChevronDown
                      className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
                      aria-hidden="true"
                    />
                  </summary>
                  <div className="border-t border-border px-5 pb-5 pt-4">
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {faq.answer_en}
                    </p>
                  </div>
                </details>
              ))}
            </div>
          </Container>
        </div>
      )}
    </>
  );
}
