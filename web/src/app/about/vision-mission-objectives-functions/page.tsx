import type { Metadata } from 'next';
import { Eye, Crosshair, ListChecks, Workflow } from 'lucide-react';
import { buildMetadata } from '@/lib/seo';
import { Breadcrumbs } from '@/components/ui/breadcrumb';
import { Container } from '@/components/ui/container';
import { ContactCta } from '@/components/content/contact-cta';

export const metadata: Metadata = buildMetadata({
  title: 'Vision, Mission, Objectives & Functions',
  description: 'The guiding vision, mission, strategic objectives and operational functions of SIDHKOFED.',
  path: '/about/vision-mission-objectives-functions',
});

function SectionHeading({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <div className="mb-4 flex items-center gap-3 border-b border-border pb-3">
      <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10">
        <Icon className="h-5 w-5 text-primary" />
      </span>
      <h2 className="text-xl font-semibold text-foreground">{title}</h2>
    </div>
  );
}

export default function VisionPage() {
  return (
    <>
      <Breadcrumbs
        items={[
          { label: 'About Us', href: '/about' },
          { label: 'Vision, Mission, Objectives & Functions' },
        ]}
      />
      <Container className="py-10">
        <meta name="google" content="on" />
        <header className="mb-10 max-w-3xl">
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Vision, Mission, Objectives &amp; Functions
          </h1>
          <p className="mt-3 text-lg text-muted-foreground">
            SIDHKOFED&apos;s guiding principles, strategic objectives and core functions.
          </p>
        </header>

        <div className="max-w-3xl space-y-10">
          {/* Vision */}
          <section>
            <SectionHeading icon={Eye} title="Vision" />
            <p className="text-base leading-relaxed text-foreground">
              To be the leading cooperative federation in Jharkhand, fostering inclusive economic growth by
              empowering tribal and rural communities through sustainable cooperative enterprises.
            </p>
          </section>

          {/* Mission */}
          <section>
            <SectionHeading icon={Crosshair} title="Mission" />
            <p className="text-base leading-relaxed text-foreground">
              To strengthen the cooperative movement in Jharkhand by providing institutional support, capacity
              building, training, marketing linkages and procurement facilitation to member cooperatives and
              their beneficiaries, ensuring fair and equitable economic participation.
            </p>
          </section>

          {/* Objectives */}
          <section>
            <SectionHeading icon={ListChecks} title="Objectives" />
            <ul className="space-y-3">
              {[
                'Promote cooperative principles and values among member institutions and communities.',
                'Facilitate procurement of Minor Forest Produce (MFP) and agricultural commodities at fair market prices.',
                'Strengthen institutional capacity of primary cooperative societies and district unions through structured training programmes.',
                'Create market linkages for cooperative produce and MFP goods at the state and national level.',
                'Ensure transparency and accountability in cooperative governance by supporting audit, compliance and documentation functions.',
                'Advocate for cooperative interests before government bodies and policy-making forums.',
              ].map((obj) => (
                <li key={obj} className="flex gap-3">
                  <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary" />
                  <span className="text-base text-foreground">{obj}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* Functions */}
          <section>
            <SectionHeading icon={Workflow} title="Functions" />
            <ul className="space-y-4">
              {[
                {
                  title: 'Training & Capacity Building',
                  desc: 'Organise training workshops, field visits and awareness programmes for cooperative members and management committees.',
                },
                {
                  title: 'Procurement Facilitation',
                  desc: 'Coordinate minor forest produce and commodity procurement drives, setting rates and managing procurement centre operations.',
                },
                {
                  title: 'Marketing Support',
                  desc: 'Facilitate market access and value chain development for cooperative products.',
                },
                {
                  title: 'Institutional Networking',
                  desc: 'Coordinate with NCDC, NAFED, TRIFED and state government departments to align cooperative activities with national programmes.',
                },
                {
                  title: 'Documentation & Reporting',
                  desc: 'Maintain records of member institutions, publish annual reports, and submit statutory returns.',
                },
              ].map((fn) => (
                <li key={fn.title} className="flex gap-3">
                  <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary" />
                  <span className="text-base text-foreground">
                    <strong>{fn.title}:</strong> {fn.desc}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <p className="rounded-md border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
            <strong>Note:</strong> This page is in English. Your browser can translate it automatically.
          </p>
        </div>

        <div className="max-w-3xl">
          <ContactCta />
        </div>
      </Container>
    </>
  );
}
