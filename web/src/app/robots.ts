import type { MetadataRoute } from 'next';
import { env } from '@/config/env';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // The public site never exposes admin/auth surfaces, but be explicit.
      disallow: ['/api/'],
    },
    sitemap: `${env.siteUrl}/sitemap.xml`,
  };
}
