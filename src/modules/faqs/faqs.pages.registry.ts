/**
 * FAQ main-page registry — code, not a DB table (coding-standards §6: masters/registries live in
 * code when the set is small and stable). `Page` in this schema is a full CMS content-page model
 * (title/body/meta, tied 1:1 from MenuItem) — reusing it here would let arbitrary CMS pages become
 * FAQ targets, which the spec explicitly rules out. This registry is instead the single source of
 * truth for every `page_key` accepted anywhere in the FAQ module (validators, repository ordering,
 * the public `page_key` filter, and the admin `/admin/faqs/pages` options endpoint the CMS reads).
 *
 * `/faqs` itself is intentionally excluded — it already shows every eligible public FAQ and is not
 * an assignment target. Dynamic detail routes and sub-listing pages are excluded too; only stable,
 * top-level main destinations are registered.
 */
export interface FaqPageRegistryEntry {
  key: string;
  path: string;
  labelEn: string;
  labelHi: string;
}

export const FAQ_PAGE_REGISTRY: readonly FaqPageRegistryEntry[] = [
  { key: 'home', path: '/', labelEn: 'Homepage', labelHi: 'होम पेज' },
  { key: 'about', path: '/about', labelEn: 'About Us', labelHi: 'हमारे बारे में' },
  { key: 'activities', path: '/activities', labelEn: 'Activities', labelHi: 'गतिविधियाँ' },
  { key: 'membership', path: '/membership', labelEn: 'Membership', labelHi: 'सदस्यता' },
  { key: 'procurement', path: '/procurement', labelEn: 'Procurement', labelHi: 'खरीद' },
  { key: 'digital-services', path: '/digital-services', labelEn: 'Digital Services', labelHi: 'डिजिटल सेवाएं' },
  { key: 'publications', path: '/publications', labelEn: 'Publications', labelHi: 'प्रकाशन' },
  { key: 'notifications', path: '/notifications', labelEn: 'Notifications', labelHi: 'सूचनाएं' },
  { key: 'impact-dashboard', path: '/impact/dashboard', labelEn: 'Impact Dashboard', labelHi: 'प्रभाव डैशबोर्ड' },
  { key: 'contact', path: '/contact', labelEn: 'Contact Us', labelHi: 'संपर्क करें' },
] as const;

export const FAQ_PAGE_KEYS = FAQ_PAGE_REGISTRY.map((p) => p.key) as [string, ...string[]];

const KEY_SET = new Set(FAQ_PAGE_KEYS);

export function isRegisteredFaqPageKey(key: string): boolean {
  return KEY_SET.has(key);
}
