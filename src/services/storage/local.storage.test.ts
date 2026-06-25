/** Storage tests — LocalStorageService against the real filesystem (scratchpad keys). */
import { describe, it, expect, afterAll } from 'vitest';
import { LocalStorageService } from './local.storage';

const storage = new LocalStorageService();
const key = `test-tmp/${Date.now()}-${Math.random().toString(36).slice(2)}.txt`;

afterAll(async () => {
  await storage.delete(key).catch(() => undefined);
});

describe('LocalStorageService', () => {
  it('implements the full StorageService contract', async () => {
    const put = await storage.put({ key, body: 'hello world', contentType: 'text/plain' });
    expect(put.key).toBe(key);
    expect(put.size).toBe(11);

    expect(await storage.exists(key)).toBe(true);
    expect((await storage.get(key)).toString()).toBe('hello world');

    const meta = await storage.stat(key);
    expect(meta?.size).toBe(11);

    const url = await storage.getPublicUrl(key);
    expect(url).toContain(key);

    await storage.replace({ key, body: 'replaced' });
    expect((await storage.get(key)).toString()).toBe('replaced');

    await storage.delete(key);
    expect(await storage.exists(key)).toBe(false);
    expect(await storage.stat(key)).toBeNull();
  });

  it('rejects path traversal keys', async () => {
    await expect(storage.get('../../etc/passwd')).rejects.toThrow();
  });
});
