/**
 * One-time idempotent seed: populate the real SIDHKOFED office `contact.*` Settings so the
 * public site's contact card isn't blank before an admin ever visits Settings > Contact.
 *
 * Creates a row ONLY if it doesn't exist yet (`update: {}`) — this never overwrites a value an
 * admin (or a previous run) has already set, even if that value happens to be blank. Safe to
 * re-run on every `npm run db:seed`, in every environment.
 *
 * `contact.map_url` is included because a real, user-provided Google Maps link is available;
 * unlike the other fixture-only demo data in `fixtures.ts`, these are the site's real values.
 */
import { PrismaClient } from '@prisma/client';
import { SETTINGS_CATALOG, encodeForStorage, type SettingKey } from '@/modules/settings/settings.catalog';
import { settingsService } from '@/modules/settings/settings.service';

const CONTACT_DEFAULTS: Partial<Record<SettingKey, string>> = {
  'contact.office_name': 'Sidho-Kanho Agriculture and Forest Produce State Cooperative Federation Ltd.',
  'contact.address': '1st Floor, Sameti Bhawan, Behind Krishi Bhawan, Kanke Road, Ranchi, Jharkhand – 834008',
  'contact.phone': '0651-2913142',
  'contact.email': 'sidhokanhofed@gmail.com',
  'contact.office_hours': 'Monday – Saturday, 10:00 AM – 5:00 PM',
  'contact.map_url': 'https://maps.app.goo.gl/hUMpwZStpAnDRwZs8',
};

export async function seedContactDefaults(prisma: PrismaClient): Promise<void> {
  const entries = Object.entries(CONTACT_DEFAULTS) as Array<[SettingKey, string]>;
  for (const [key, value] of entries) {
    const def = SETTINGS_CATALOG[key];
    const { valueText, valueJson } = encodeForStorage(def, value);
    await prisma.setting.upsert({
      where: { key },
      update: {}, // never overwrite an existing row — admin edits (or a prior seed) always win
      create: { key, valueText, valueJson, description: def.description },
    });
  }
  await settingsService.invalidate(); // so a fresh seed takes effect immediately, not after the cache TTL
  console.log(`  ✓ contact defaults: ensured ${entries.length} keys exist`);
}
