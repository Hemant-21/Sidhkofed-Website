import type { Metadata } from 'next';
import { buildMetadata } from '@/lib/seo';
import { Breadcrumbs } from '@/components/ui/breadcrumb';
import { Container } from '@/components/ui/container';

export const metadata: Metadata = buildMetadata({
  title: 'Membership Process',
  description: 'How to apply for membership in SIDHKOFED or a district cooperative union in Jharkhand.',
  path: '/membership/process',
});

export default function MembershipProcessPage() {
  return (
    <>
      <Breadcrumbs items={[{ label: 'Membership', href: '/membership' }, { label: 'Membership Process' }]} />
      <Container className="py-10">
        <meta name="google" content="on" />
        <header className="mb-8 max-w-3xl">
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Membership Process</h1>
          <p className="mt-3 text-lg text-muted-foreground">
            How to become a member of SIDHKOFED or a district cooperative union.
          </p>
        </header>

        <div className="prose prose-gray max-w-3xl dark:prose-invert">
          <h2>Types of Membership</h2>
          <ul>
            <li>
              <strong>Primary Membership (SIDHKOFED):</strong> Open to registered cooperative societies
              operating in Jharkhand.
            </li>
            <li>
              <strong>Nominal Membership (SIDHKOFED):</strong> Open to government bodies, institutions and
              organisations supporting cooperative development.
            </li>
            <li>
              <strong>District Union Membership:</strong> Cooperatives within a district may also affiliate
              with their respective district cooperative union.
            </li>
          </ul>

          <h2>Eligibility</h2>
          <ul>
            <li>
              The applying society must be duly registered under the Jharkhand Cooperative Societies Act.
            </li>
            <li>The society must be operational and not under liquidation.</li>
            <li>The society&apos;s annual general meeting should be current (AGM held as per bye-laws).</li>
            <li>Audit must be up to date.</li>
          </ul>

          <h2>Application Process</h2>
          <ol>
            <li>Obtain the membership application form from the SIDHKOFED office or the Downloads section.</li>
            <li>Fill in the form with details of the society, its registered address, registration number and key office bearers.</li>
            <li>Attach attested copies of: Registration Certificate, Bye-laws, Latest Audit Report, and AGM resolution authorising membership.</li>
            <li>Submit the completed application with the prescribed membership fee (as per prevailing fee schedule) to the SIDHKOFED office, Sameti Bhawan, Kanke Road, Ranchi – 834008.</li>
            <li>The application is placed before the Board of Directors for approval in its next scheduled meeting.</li>
            <li>Upon approval, a membership certificate is issued.</li>
          </ol>

          <h2>Contact</h2>
          <p>
            For queries regarding membership, contact the SIDHKOFED office:<br />
            <strong>Phone:</strong> 0651-2913012<br />
            <strong>Email:</strong> sidhokanhofed@gmail.com<br />
            <strong>Address:</strong> Sameti Bhawan, Kanke Road, Ranchi, Jharkhand – 834008
          </p>

          <p className="mt-6 rounded-md border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
            <strong>Note:</strong> This page is in English. Your browser can translate it automatically.
          </p>
        </div>
      </Container>
    </>
  );
}
