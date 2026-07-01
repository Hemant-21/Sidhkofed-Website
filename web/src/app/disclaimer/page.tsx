import type { Metadata } from 'next';
import { buildMetadata } from '@/lib/seo';
import { Breadcrumbs } from '@/components/ui/breadcrumb';
import { Container } from '@/components/ui/container';

export const metadata: Metadata = buildMetadata({
  title: 'Disclaimer',
  description: 'Disclaimer for the SIDHKOFED website.',
  path: '/disclaimer',
});

export default function DisclaimerPage() {
  return (
    <>
      <Breadcrumbs items={[{ label: 'Disclaimer' }]} />
      <div className="bg-primary">
        <Container className="py-10 sm:py-14">
          <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">Disclaimer</h1>
          <p className="mt-2 text-base text-white/70">
            Terms of use and limitations of liability for this website.
          </p>
        </Container>
      </div>
      <Container className="py-12">
        <div className="prose prose-gray max-w-3xl dark:prose-invert">
          <p className="lead">
            The information on this website is published by the Sidho-Kanho Birsha Murmu Krishi
            Evam Vanopaj Rajya Sahkari Sangh Maryadit (SIDHKOFED) for general information
            purposes only.
          </p>

          <h2>Accuracy of Information</h2>
          <p>
            While every effort is made to keep the information current and accurate, SIDHKOFED
            makes no warranty, express or implied, about the completeness, accuracy, reliability or
            suitability of the information, products or services contained on this website for any
            particular purpose. Any reliance you place on such information is strictly at your own
            risk.
          </p>

          <h2>No Liability</h2>
          <p>
            SIDHKOFED shall not be liable for any loss or damage, including without limitation
            indirect or consequential loss or damage, arising from use of this website or from
            information, products or services provided on or linked from this website.
          </p>

          <h2>External Links</h2>
          <p>
            This website may include links to external websites. These links are provided for
            convenience only. SIDHKOFED has no control over the content of external sites and
            accepts no responsibility for them or for any loss or damage that may arise from your
            use of them.
          </p>

          <h2>Official Communications</h2>
          <p>
            Information published on this website does not constitute official government
            notifications, orders or circulars. For official purposes, refer to documents issued
            through the official gazette or authorised government channels.
          </p>

          <h2>Governing Law</h2>
          <p>
            Any disputes arising in connection with this website are subject to the jurisdiction of
            the courts of Jharkhand, India.
          </p>

          <p className="text-sm text-muted-foreground">Last updated: June 2026</p>
        </div>
      </Container>
    </>
  );
}
