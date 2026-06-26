/** Storage tests — LocalStorageService against the real filesystem (scratchpad keys). */
import { describe, it, expect, afterAll } from 'vitest';
import { LocalStorageService } from './local.storage';
import { NotFoundError } from '@/shared/errors';

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

  it('translates a missing object into a controlled NotFoundError on get (round-2 Issue 2)', async () => {
    await expect(storage.get(`test-tmp/missing-${Date.now()}.txt`)).rejects.toBeInstanceOf(NotFoundError);
  });

  it('emits a controlled NotFoundError on a missing-object read stream (round-2 Issue 2)', async () => {
    const stream = storage.createReadStream(`test-tmp/missing-${Date.now()}.bin`);
    const err = await new Promise<unknown>((resolve) => {
      stream.on('error', resolve);
      stream.on('end', () => resolve(null));
      // Drain so the stream flows and surfaces the source error.
      stream.resume();
    });
    expect(err).toBeInstanceOf(NotFoundError);
  });
});
