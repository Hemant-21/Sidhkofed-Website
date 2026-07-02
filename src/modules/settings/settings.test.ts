/** Unit tests — settings catalog encode/decode + service (typed accessors, cache, write). */
import { describe, it, expect, beforeEach, vi } from 'vitest';

const { store, repo, audit } = vi.hoisted(() => ({
  store: new Map<string, string>(),
  repo: { findAll: vi.fn(), findByKey: vi.fn(), upsert: vi.fn() },
  audit: { log: vi.fn() },
}));

vi.mock('@/services/redis', () => ({
  redis: {
    async get(k: string) { return store.has(k) ? store.get(k)! : null; },
    async set(k: string, v: string) { store.set(k, v); return 'OK'; },
    async del(k: string) { return store.delete(k) ? 1 : 0; },
  },
}));
vi.mock('./settings.repository', () => ({ settingsRepository: repo }));
vi.mock('@/modules/audit/audit.service', () => ({ auditService: audit }));

import { SETTINGS_CATALOG, decodeStored, encodeForStorage, isSettingKey } from './settings.catalog';
import { settingsService } from './settings.service';

beforeEach(() => {
  store.clear();
  vi.clearAllMocks();
  repo.findAll.mockResolvedValue([]);
});

describe('settings.catalog', () => {
  it('round-trips a number through encode/decode', () => {
    const def = SETTINGS_CATALOG['limits.video_homepage_limit'];
    const { valueText } = encodeForStorage(def, 3);
    expect(valueText).toBe('3');
    expect(decodeStored(def, valueText, null)).toBe(3);
  });
  it('round-trips a json array', () => {
    const def = SETTINGS_CATALOG['uploads.allowed_image_types'];
    const enc = encodeForStorage(def, ['image/png']);
    expect(enc.valueJson).toEqual(['image/png']);
    expect(decodeStored(def, null, enc.valueJson)).toEqual(['image/png']);
  });
  it('recognizes known and unknown keys', () => {
    expect(isSettingKey('site.name')).toBe(true);
    expect(isSettingKey('nope.nope')).toBe(false);
  });
});

describe('settings.service', () => {
  it('returns catalog defaults when nothing is stored', async () => {
    expect(await settingsService.getVideoHomepageLimit()).toBe(3);
    expect(await settingsService.get('site.name')).toBe('SIDHKOFED');
  });

  it('overlays stored values over defaults', async () => {
    repo.findAll.mockResolvedValue([{ key: 'site.name', valueText: 'Custom', valueJson: null }]);
    expect(await settingsService.get('site.name')).toBe('Custom');
  });

  it('writes a valid value, audits SETTINGS_CHANGE, and invalidates the cache', async () => {
    await settingsService.getResolvedMap(); // warm cache
    expect(store.size).toBe(1);
    await settingsService.setValue('limits.video_homepage_limit', 2, { userId: 'u1' });
    expect(repo.upsert).toHaveBeenCalledWith('limits.video_homepage_limit', '2', null, 'u1', expect.any(String));
    expect(audit.log).toHaveBeenCalledWith('SETTINGS_CHANGE', expect.anything(), expect.objectContaining({ module: 'settings' }));
    expect(store.size).toBe(0); // invalidated
  });

  it('rejects an invalid value with a 422', async () => {
    await expect(settingsService.setValue('limits.video_homepage_limit', 99, { userId: 'u1' })).rejects.toMatchObject({ code: 'validation_error' });
  });

  it('rejects an unknown key with a 404', async () => {
    await expect(settingsService.setValue('nope.nope', 1, { userId: 'u1' })).rejects.toMatchObject({ code: 'not_found' });
  });
});
