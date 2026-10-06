/**
 * Idempotent settings seed: populate the approved SIDHKOFED Settings rows from the live DB
 * baseline so a fresh environment starts with the same Master/Settings configuration.
 *
 * Re-running the seed replaces stale/demo values for every known key in SETTINGS_CATALOG.
 */
import { PrismaClient } from '@prisma/client';
import { SETTINGS_CATALOG, encodeForStorage, type SettingKey } from '@/modules/settings/settings.catalog';
import { settingsService } from '@/modules/settings/settings.service';

const SETTINGS_DEFAULTS: Partial<Record<SettingKey, unknown>> = {
  'site.name': 'SIDHKOFED - Sidho-Kanho Agriculture and Forest Produce State Cooperative Federation Ltd.',
  'site.tagline': 'From Forest to Global Markets',
  'site.logo_media_id': '3f24f935-ecf7-4c53-bd05-2d673cef6692',
  'site.default_language': 'en',
  'homepage.show_dashboard_kpis': true,
  'homepage.featured_partners_limit': 8,
  'contact.office_name': 'Sidho-Kanho Agriculture and Forest Produce State Cooperative Federation Ltd.',
  'contact.address': '1st Floor, Sameti Bhawan, Behind Krishi Bhawan, Kanke Road, Ranchi, Jharkhand – 834008',
  'contact.phone': '0651-2913142',
  'contact.email': 'sidhokanhofed@gmail.com',
  'contact.office_hours': 'Monday – Saturday, 10:00 AM – 5:00 PM',
  'contact.map_url': 'https://maps.app.goo.gl/hUMpwZStpAnDRwZs8',
  'social.facebook_url': 'https://www.facebook.com/sidhkofed/',
  'social.twitter_url': 'https://x.com/sidhkofed',
  'social.youtube_url': 'https://www.youtube.com/@sidhkofedjh',
  'social.instagram_url': '',
  'social.linkedin_url': 'https://www.linkedin.com/in/sidhkofed',
  'footer.copyright_text': '© SIDHKOFED',
  'footer.important_links': [],
  'seo.default_title': 'SIDHKOFED - Sidho-Kanho Agriculture and Forest Produce State Cooperative Federation Ltd.',
  'seo.default_description':
    'SIDHKOFED supports cooperative livelihoods across Jharkhand through minor forest produce procurement, training, market linkages and public governance. It connects 24 districts and thousands of tribal households.\n\nIt operates through a three-tier cooperative structure: the State federation, District Cooperative Unions and primary societies. Together they deliver capacity building, procurement, storage, marketing and digital services.',
  'seo.default_social_image_media_id': '6853eb6c-ba01-4312-b751-b608641a94f5',
  'uploads.max_image_mb': 10,
  'uploads.max_document_mb': 25,
  'uploads.allowed_image_types': ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  'uploads.allowed_document_types': [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ],
  'limits.homepage_highlight_limit': 6,
  'limits.video_homepage_limit': 3,
  'translation.fallback_enabled': true,
};

export async function seedContactDefaults(prisma: PrismaClient): Promise<void> {
  const entries = Object.entries(SETTINGS_DEFAULTS) as Array<[SettingKey, unknown]>;
  for (const [key, value] of entries) {
    const def = SETTINGS_CATALOG[key];
    const { valueText, valueJson } = encodeForStorage(def, value);
    await prisma.setting.upsert({
      where: { key },
      update: { valueText, valueJson: valueJson ?? undefined, description: def.description },
      create: { key, valueText, valueJson: valueJson ?? undefined, description: def.description },
    });
  }
  await settingsService.invalidate(); // so a fresh seed takes effect immediately, not after the cache TTL
  console.log(`  ✓ settings defaults: ensured ${entries.length} keys exist`);
}
