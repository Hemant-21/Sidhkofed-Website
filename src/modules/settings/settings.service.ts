/**
 * Settings service (TASK 2) — single source of truth + typed accessors + in-process cache.
 *
 * Resolution = catalog defaults overlaid with stored rows. The resolved map is cached in
 * the in-process cache and invalidated on any write, so the app reads settings without raw JSON lookups
 * and without hitting Postgres on every request (TASK 10).
 */
import { cacheService } from '@/services/cache';
import { auditService, type AuditContext } from '@/modules/audit/audit.service';
import { NotFoundError, ValidationError } from '@/shared/errors';
import { settingsRepository } from './settings.repository';
import {
  SETTINGS_CATALOG,
  SETTING_KEYS,
  isSettingKey,
  getSettingDef,
  decodeStored,
  encodeForStorage,
  type SettingGroup,
  type SettingKey,
  type SettingValue,
} from './settings.catalog';

const CACHE_KEY = 'settings:resolved';

type ResolvedMap = Record<string, unknown>;

/** Build the resolved settings map (defaults overlaid with stored values). */
async function buildResolvedMap(): Promise<ResolvedMap> {
  const map: ResolvedMap = {};
  for (const key of SETTING_KEYS) map[key] = SETTINGS_CATALOG[key].default;

  const rows = await settingsRepository.findAll();
  for (const row of rows) {
    if (!isSettingKey(row.key)) continue; // ignore stale/unknown keys
    map[row.key] = decodeStored(getSettingDef(row.key), row.valueText, row.valueJson);
  }
  return map;
}

/** Get the resolved map, from the in-process cache when warm. */
async function getResolvedMap(): Promise<ResolvedMap> {
  const cached = await cacheService.getJson<ResolvedMap>(CACHE_KEY);
  if (cached) return cached;
  const map = await buildResolvedMap();
  await cacheService.setJson(CACHE_KEY, map);
  return map;
}

/** Invalidate the cached settings map (after a write). */
async function invalidate(): Promise<void> {
  await cacheService.del(CACHE_KEY);
}

/** Typed accessor for a single setting (falls back to the catalog default). */
async function get<K extends SettingKey>(key: K): Promise<SettingValue<K>> {
  const map = await getResolvedMap();
  return map[key] as SettingValue<K>;
}

/** All settings in a group, keyed by full setting key. */
async function getGroup(group: SettingGroup): Promise<Record<string, unknown>> {
  const map = await getResolvedMap();
  const out: Record<string, unknown> = {};
  for (const key of SETTING_KEYS) {
    if (SETTINGS_CATALOG[key].group === group) out[key] = map[key];
  }
  return out;
}

/** The full resolved map plus per-key group/description metadata (admin GET all). */
async function getAllWithMeta(): Promise<
  Array<{ key: SettingKey; group: SettingGroup; value: unknown; description: string }>
> {
  const map = await getResolvedMap();
  return SETTING_KEYS.map((key) => ({
    key,
    group: SETTINGS_CATALOG[key].group,
    value: map[key],
    description: SETTINGS_CATALOG[key].description,
  }));
}

/** Single key with metadata, or throw 404 for an unknown key. */
async function getKeyWithMeta(
  key: string,
): Promise<{ key: SettingKey; group: SettingGroup; value: unknown; description: string }> {
  if (!isSettingKey(key)) throw new NotFoundError(`Unknown setting key "${key}".`);
  const map = await getResolvedMap();
  return { key, group: SETTINGS_CATALOG[key].group, value: map[key], description: SETTINGS_CATALOG[key].description };
}

/**
 * Validate + persist a setting value, audit the change, and invalidate the cache.
 * Rejects unknown keys (404) and invalid values (422).
 */
async function setValue(key: string, rawValue: unknown, ctx: AuditContext): Promise<{ key: SettingKey; group: SettingGroup; value: unknown; description: string }> {
  if (!isSettingKey(key)) throw new NotFoundError(`Unknown setting key "${key}".`);
  const def = getSettingDef(key);

  const parsed = def.schema.safeParse(rawValue);
  if (!parsed.success) {
    const messages = parsed.error.issues.map((i) => i.message);
    throw new ValidationError({ value: messages.length ? messages : ['Invalid value.'] });
  }

  const previous = await get(key);
  const { valueText, valueJson } = encodeForStorage(def, parsed.data);
  await settingsRepository.upsert(key, valueText, valueJson, ctx.userId ?? null, def.description);
  await invalidate();

  await auditService.log('SETTINGS_CHANGE', ctx, {
    module: 'settings',
    recordId: null,
    summary: `SETTINGS_CHANGE:${key}`,
    oldValues: { [key]: previous },
    newValues: { [key]: parsed.data },
    metadata: { key },
  });

  return { key, group: def.group, value: parsed.data, description: def.description };
}

// ── Typed convenience accessors (avoid raw lookups across the app) ────────────
const getVideoHomepageLimit = (): Promise<number> => get('limits.video_homepage_limit');
const getHomepageHighlightLimit = (): Promise<number> => get('limits.homepage_highlight_limit');
const getAllowedImageTypes = (): Promise<string[]> => get('uploads.allowed_image_types');
const getAllowedDocumentTypes = (): Promise<string[]> => get('uploads.allowed_document_types');
const getMaxImageBytes = async (): Promise<number> => (await get('uploads.max_image_mb')) * 1024 * 1024;
const getMaxDocumentBytes = async (): Promise<number> => (await get('uploads.max_document_mb')) * 1024 * 1024;

export const settingsService = {
  get,
  getGroup,
  getAllWithMeta,
  getKeyWithMeta,
  getResolvedMap,
  setValue,
  invalidate,
  getVideoHomepageLimit,
  getHomepageHighlightLimit,
  getAllowedImageTypes,
  getAllowedDocumentTypes,
  getMaxImageBytes,
  getMaxDocumentBytes,
};
