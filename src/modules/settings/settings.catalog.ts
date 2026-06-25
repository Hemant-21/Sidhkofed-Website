/**
 * Settings catalog — the single source of truth for every known setting (TASK 2).
 *
 * Each entry declares its group, value `kind`, a Zod schema for validation, a default,
 * and how it is stored (`text` scalar vs `json`). The catalog backs typed accessors so
 * the rest of the app never does raw JSON lookups against the `settings` table.
 *
 * Storage maps onto the approved `settings` columns (Part 9): scalars → `value_text`,
 * arrays/objects → `value_json`. Unknown keys are rejected by the service.
 */
import { z } from 'zod';
import { uploadConfig, localizationConfig } from '@/config';

/** Setting groups = the API spec / TASK 2 categories. */
export const SETTING_GROUPS = [
  'site',
  'homepage',
  'contact',
  'social',
  'footer',
  'seo',
  'uploads',
  'limits',
  'translation',
] as const;
export type SettingGroup = (typeof SETTING_GROUPS)[number];

type Kind = 'string' | 'number' | 'boolean' | 'url' | 'language' | 'stringArray' | 'json';

export interface SettingDef<T = unknown> {
  group: SettingGroup;
  kind: Kind;
  schema: z.ZodType<T>;
  default: T;
  description: string;
}

const def = <T>(d: SettingDef<T>): SettingDef<T> => d;

/**
 * Safe-URL validation (remediation Issue 8). `z.string().url()` accepts dangerous schemes
 * (`javascript:`, `data:`, `vbscript:`, …) because they are technically valid URLs. These
 * helpers allow ONLY http(s) absolute URLs (and, for links, approved `/relative` paths) and
 * reject every other scheme + protocol-relative `//host` forms.
 */
function isSafeAbsoluteUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}
function isSafeLinkUrl(value: string): boolean {
  // Approved relative path (single leading slash, not protocol-relative `//host`).
  if (value.startsWith('/') && !value.startsWith('//')) return true;
  return isSafeAbsoluteUrl(value);
}

/** Absolute http(s) URL only (used by social/contact/map links). */
const url = z.string().trim().refine(isSafeAbsoluteUrl, 'Enter a valid http:// or https:// URL.');
/** Footer/menu link: an http(s) URL or an approved `/relative` path; unsafe schemes rejected. */
const linkUrl = z.string().trim().min(1).max(2000).refine(isSafeLinkUrl, 'Enter an http(s):// URL or a /relative path.');
const nonNeg = z.number().int().nonnegative();

/**
 * The known settings. Adding a key here makes it readable, writable, validated, typed,
 * and exposed by the admin API — no other change needed.
 */
export const SETTINGS_CATALOG = {
  // ── Site ──────────────────────────────────────────────────────────────────
  'site.name': def({ group: 'site', kind: 'string', schema: z.string().min(1).max(200), default: 'SIDHKOFED', description: 'Public site / office name.' }),
  'site.tagline': def({ group: 'site', kind: 'string', schema: z.string().max(300), default: '', description: 'Short site tagline.' }),
  'site.logo_media_id': def({ group: 'site', kind: 'string', schema: z.string().uuid().nullable(), default: null as string | null, description: 'Media asset id of the site logo.' }),
  'site.default_language': def({ group: 'site', kind: 'language', schema: z.enum(['en', 'hi']), default: localizationConfig.defaultLanguage, description: 'Default UI language.' }),

  // ── Homepage ──────────────────────────────────────────────────────────────
  'homepage.show_dashboard_kpis': def({ group: 'homepage', kind: 'boolean', schema: z.boolean(), default: true, description: 'Show the KPI band on the homepage.' }),
  'homepage.featured_partners_limit': def({ group: 'homepage', kind: 'number', schema: nonNeg.max(24), default: 8, description: 'Max partner logos on the homepage.' }),

  // ── Contact ───────────────────────────────────────────────────────────────
  'contact.office_name': def({ group: 'contact', kind: 'string', schema: z.string().max(255), default: '', description: 'Office name shown on Contact.' }),
  'contact.address': def({ group: 'contact', kind: 'string', schema: z.string().max(1000), default: '', description: 'Postal address.' }),
  'contact.phone': def({ group: 'contact', kind: 'string', schema: z.string().max(60), default: '', description: 'Public phone number.' }),
  'contact.email': def({ group: 'contact', kind: 'string', schema: z.union([z.string().email(), z.literal('')]), default: '', description: 'Public contact email.' }),
  'contact.office_hours': def({ group: 'contact', kind: 'string', schema: z.string().max(255), default: '', description: 'Office hours text.' }),
  'contact.map_url': def({ group: 'contact', kind: 'url', schema: z.union([url, z.literal('')]), default: '', description: 'Map embed/link URL.' }),

  // ── Social links ──────────────────────────────────────────────────────────
  'social.facebook_url': def({ group: 'social', kind: 'url', schema: z.union([url, z.literal('')]), default: '', description: 'Facebook page URL.' }),
  'social.twitter_url': def({ group: 'social', kind: 'url', schema: z.union([url, z.literal('')]), default: '', description: 'X/Twitter URL.' }),
  'social.youtube_url': def({ group: 'social', kind: 'url', schema: z.union([url, z.literal('')]), default: '', description: 'YouTube channel URL.' }),
  'social.instagram_url': def({ group: 'social', kind: 'url', schema: z.union([url, z.literal('')]), default: '', description: 'Instagram URL.' }),
  'social.linkedin_url': def({ group: 'social', kind: 'url', schema: z.union([url, z.literal('')]), default: '', description: 'LinkedIn URL.' }),

  // ── Footer ────────────────────────────────────────────────────────────────
  'footer.copyright_text': def({ group: 'footer', kind: 'string', schema: z.string().max(500), default: '© SIDHKOFED', description: 'Footer copyright line.' }),
  'footer.important_links': def({
    group: 'footer',
    kind: 'json',
    schema: z.array(z.object({ label_en: z.string().min(1), label_hi: z.string().optional(), url: linkUrl })).max(20),
    default: [] as Array<{ label_en: string; label_hi?: string; url: string }>,
    description: 'Footer important links.',
  }),

  // ── SEO defaults ──────────────────────────────────────────────────────────
  'seo.default_title': def({ group: 'seo', kind: 'string', schema: z.string().max(255), default: 'SIDHKOFED', description: 'Default SEO/social title.' }),
  'seo.default_description': def({ group: 'seo', kind: 'string', schema: z.string().max(500), default: '', description: 'Default meta description.' }),
  'seo.default_social_image_media_id': def({ group: 'seo', kind: 'string', schema: z.string().uuid().nullable(), default: null as string | null, description: 'Default social share image (media id).' }),

  // ── File upload settings (bootstrap defaults from env; settings table is runtime SoT) ──
  'uploads.max_image_mb': def({ group: 'uploads', kind: 'number', schema: nonNeg.min(1).max(100), default: uploadConfig.maxImageMb, description: 'Max image upload size (MB).' }),
  'uploads.max_document_mb': def({ group: 'uploads', kind: 'number', schema: nonNeg.min(1).max(200), default: uploadConfig.maxDocumentMb, description: 'Max document upload size (MB).' }),
  'uploads.allowed_image_types': def({ group: 'uploads', kind: 'stringArray', schema: z.array(z.string().min(1)).min(1), default: uploadConfig.allowedImageTypes as string[], description: 'Allowed image MIME types.' }),
  'uploads.allowed_document_types': def({ group: 'uploads', kind: 'stringArray', schema: z.array(z.string().min(1)).min(1), default: uploadConfig.allowedDocumentTypes as string[], description: 'Allowed document MIME types.' }),

  // ── Homepage highlight limits + video display limits ───────────────────────
  'limits.homepage_highlight_limit': def({ group: 'limits', kind: 'number', schema: nonNeg.min(1).max(50), default: 6, description: 'Max highlighted items surfaced on the homepage.' }),
  'limits.video_homepage_limit': def({ group: 'limits', kind: 'number', schema: nonNeg.min(0).max(3), default: 3, description: 'Max featured homepage videos (cap 3 per requirements).' }),

  // ── Translation ───────────────────────────────────────────────────────────
  'translation.fallback_enabled': def({ group: 'translation', kind: 'boolean', schema: z.boolean(), default: localizationConfig.translationFallbackEnabled, description: 'Enable labeled machine-translation fallback.' }),
} as const;

export type SettingKey = keyof typeof SETTINGS_CATALOG;
/** The typed value of a given setting key. */
export type SettingValue<K extends SettingKey> = (typeof SETTINGS_CATALOG)[K]['default'];

export const SETTING_KEYS = Object.keys(SETTINGS_CATALOG) as SettingKey[];

export function isSettingKey(key: string): key is SettingKey {
  return Object.prototype.hasOwnProperty.call(SETTINGS_CATALOG, key);
}

export function getSettingDef(key: SettingKey): SettingDef {
  return SETTINGS_CATALOG[key] as SettingDef;
}

/** Decode a stored row (`value_text` / `value_json`) into the typed JS value. */
export function decodeStored(def: SettingDef, valueText: string | null, valueJson: unknown): unknown {
  if (def.kind === 'json' || def.kind === 'stringArray') {
    return valueJson ?? def.default;
  }
  if (valueText === null || valueText === undefined) return def.default;
  switch (def.kind) {
    case 'number':
      return Number(valueText);
    case 'boolean':
      return valueText === 'true';
    default:
      return valueText;
  }
}

/** Encode a validated JS value into the `settings` storage columns. */
export function encodeForStorage(def: SettingDef, value: unknown): { valueText: string | null; valueJson: unknown } {
  if (def.kind === 'json' || def.kind === 'stringArray') {
    return { valueText: null, valueJson: value };
  }
  if (value === null || value === undefined) return { valueText: null, valueJson: null };
  if (def.kind === 'boolean') return { valueText: value ? 'true' : 'false', valueJson: null };
  return { valueText: String(value), valueJson: null };
}
