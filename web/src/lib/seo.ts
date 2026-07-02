import type { Metadata } from 'next';
import { env } from '@/config/env';

/**
 * Build per-page metadata from backend content (codex §11: backend metadata only,
 * never fabricated). Sets canonical URL, Open Graph and Twitter cards. Titles flow
 * through the root layout template (`%s · SIDHKOFED`).
 */
export function buildMetadata({
  title,
  description,
  path,
  image,
  type = 'website',
}: {
  title: string;
  description?: string | null;
  /** Absolute site path, e.g. `/events/lac-training`. */
  path: string;
  image?: string | null;
  type?: 'website' | 'article';
}): Metadata {
  const canonical = `${env.siteUrl}${path}`;
  const desc = description?.trim() || undefined;
  const images = image ? [{ url: image }] : undefined;

  return {
    title,
    description: desc,
    alternates: { canonical },
    openGraph: {
      title,
      description: desc,
      url: canonical,
      type,
      images,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: desc,
      images: image ? [image] : undefined,
    },
  };
}
