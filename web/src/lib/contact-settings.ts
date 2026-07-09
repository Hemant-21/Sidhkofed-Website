import 'server-only';

/**
 * Server-side fetch for the public contact-settings group (Settings → Contact in the CMS,
 * now exposed at `GET /public/settings/contact`). Never throws — returns `null` on any failure
 * so pages degrade to "enquiry form only, no office card" rather than breaking (the same
 * fail-safe pattern as `getOneSafe`/`getListSafe`).
 */

import { getOneSafe } from './api/server';
import { publicSettingsPath } from './api/endpoints';
import type { PublicContactSettings } from './types/settings';

/** Cache window for the contact settings fetch — matches the backend's Settings Redis TTL. */
const CONTACT_SETTINGS_REVALIDATE = 300;

export async function getContactSettings(): Promise<PublicContactSettings | null> {
  return getOneSafe<PublicContactSettings>(publicSettingsPath('contact'), {
    revalidate: CONTACT_SETTINGS_REVALIDATE,
  });
}
