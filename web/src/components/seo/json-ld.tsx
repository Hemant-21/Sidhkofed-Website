import { env } from '@/config/env';

/**
 * Structured data (JSON-LD) helpers for SEO. Rendered as a <script> tag in Server
 * Components. Only data that maps cleanly to schema.org types is emitted; values
 * come from backend content, never fabricated.
 */

/**
 * Serialize JSON-LD safely for inline injection. Values originate from CMS content,
 * so a title/answer could contain `</script>` (or the U+2028/U+2029 line separators)
 * and break out of the <script> block. Escaping `<`, `>`, `&` and those separators to
 * their unicode escapes keeps the payload valid JSON while making script-tag breakout
 * impossible. (U+2028/U+2029 are referenced via charCode so the source carries no raw
 * line-separator characters.)
 */
const LINE_SEP = String.fromCharCode(0x2028);
const PARA_SEP = String.fromCharCode(0x2029);

function serializeJsonLd(data: Record<string, unknown>): string {
  return JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .split(LINE_SEP)
    .join('\\u2028')
    .split(PARA_SEP)
    .join('\\u2029');
}

function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }}
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
