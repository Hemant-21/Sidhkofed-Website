import { env } from '@/config/env';

/**
 * Structured data (JSON-LD) helpers for SEO. Rendered as a <script> tag in Server
 * Components. Only data that maps cleanly to schema.org types is emitted; values
 * come from backend content, never fabricated.
 */
function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      // JSON.stringify output is safe (no closing-tag injection for our data shapes).
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export function OrganizationJsonLd() {
  return (
    <JsonLd
      data={{
        '@context': 'https://schema.org',
        '@type': 'GovernmentOrganization',
        name: 'SIDHKOFED — Jharkhand Cooperative Federation',
        url: env.siteUrl,
        areaServed: 'Jharkhand, India',
      }}
    />
  );
}

export function BreadcrumbJsonLd({ items }: { items: Array<{ name: string; url: string }> }) {
  return (
    <JsonLd
      data={{
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: items.map((item, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          name: item.name,
          item: `${env.siteUrl}${item.url}`,
        })),
      }}
    />
  );
}

export function ArticleJsonLd({
  headline,
  datePublished,
  image,
  url,
}: {
  headline: string;
  datePublished?: string | null;
  image?: string | null;
  url: string;
}) {
  return (
    <JsonLd
      data={{
        '@context': 'https://schema.org',
        '@type': 'NewsArticle',
        headline,
        ...(datePublished ? { datePublished } : {}),
        ...(image ? { image: [image] } : {}),
        mainEntityOfPage: `${env.siteUrl}${url}`,
        publisher: {
          '@type': 'GovernmentOrganization',
          name: 'SIDHKOFED',
        },
      }}
    />
  );
}

export function EventJsonLd({
  name,
  startDate,
  endDate,
  location,
  url,
}: {
  name: string;
  startDate?: string | null;
  endDate?: string | null;
  location?: string | null;
  url: string;
}) {
  return (
    <JsonLd
      data={{
        '@context': 'https://schema.org',
        '@type': 'Event',
        name,
        ...(startDate ? { startDate } : {}),
        ...(endDate ? { endDate } : {}),
        ...(location ? { location: { '@type': 'Place', name: location } } : {}),
        url: `${env.siteUrl}${url}`,
      }}
    />
  );
}

export function FaqJsonLd({ items }: { items: Array<{ question: string; answer: string }> }) {
  if (items.length === 0) return null;
  return (
    <JsonLd
      data={{
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: items.map((item) => ({
          '@type': 'Question',
          name: item.question,
          acceptedAnswer: { '@type': 'Answer', text: item.answer },
        })),
      }}
    />
  );
}
