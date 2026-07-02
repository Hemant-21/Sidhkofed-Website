import type { Metadata } from 'next';
import { buildMetadata } from '@/lib/seo';
import { Breadcrumbs } from '@/components/ui/breadcrumb';
import { Container } from '@/components/ui/container';

export const metadata: Metadata = buildMetadata({
  title: 'Privacy Policy',
  description: 'Privacy policy for the SIDHKOFED website.',
  path: '/privacy-policy',
});

export default function PrivacyPolicyPage() {
  return (
    <>
      <Breadcrumbs items={[{ label: 'Privacy Policy' }]} />
      <div className="bg-primary">
        <Container className="py-10 sm:py-14">
          <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">Privacy Policy</h1>
          <p className="mt-2 text-base text-white/70">
            How SIDHKOFED collects, uses and protects your information.
          </p>
        </Container>
      </div>
      <Container className="py-12">
        <div className="prose prose-gray max-w-3xl dark:prose-invert">
          <p className="lead">
            This Privacy Policy explains how the Sidho-Kanho Birsha Murmu Krishi Evam Vanopaj
            Rajya Sahkari Sangh Maryadit (SIDHKOFED) website collects, uses and protects
            information when you visit this portal.
          </p>

          <h2>Information We Collect</h2>
          <p>
            This website does not collect personal information unless you voluntarily provide it
            through the contact or enquiry forms. Server access logs (IP address, browser type,
            pages visited) are retained for security and statistical purposes only.
          </p>

          <h2>Use of Information</h2>
          <p>
            Information submitted through enquiry forms is used solely to respond to your query and
            is not shared with third parties except as required by law or as part of official
            government functions.
          </p>

          <h2>Cookies</h2>
          <p>
            This website may use session cookies for functional purposes such as language preference.
            No tracking or advertising cookies are used.
          </p>

          <h2>Third-Party Links</h2>
          <p>
            This portal may link to external government websites (e.g., RTI Online, Jharkhand
            Government portals). SIDHKOFED is not responsible for the privacy practices of those
            sites.
          </p>

          <h2>Security</h2>
          <p>
            Reasonable technical measures are in place to protect information submitted to this
            website. However, no transmission over the internet is completely secure.
          </p>

          <h2>Contact</h2>
          <p>
            For questions about this policy, contact the SIDHKOFED office at Sameti Bhawan, Kanke
            Road, Ranchi — 834 008 or email{' '}
            <a href="mailto:sidhokanhofed@gmail.com">sidhokanhofed@gmail.com</a>.
          </p>

          <p className="text-sm text-muted-foreground">Last updated: June 2026</p>
        </div>
      </Container>
    </>
  );
}
