/**
 * Local filesystem storage driver.
 *
 * Stores objects under STORAGE_LOCAL_ROOT, keeping the same key layout an object
 * store would use. Delivery URLs are built from STORAGE_PUBLIC_BASE_URL. Intended for
 * development and single-node deployments; production uses S3-compatible storage.
 */
import { promises as fs } from 'node:fs';
import { createReadStream } from 'node:fs';
import path from 'node:path';
import { storageConfig } from '@/config';
import { logger } from '@/shared/logger';
import { BadRequestError } from '@/shared/errors';
import type {
  ObjectMetadata,
  PutObjectInput,
  PutObjectResult,
  SignedUrlOptions,
  StorageService,
} from './storage.types';

const storeLog = logger.child({ component: 'storage', driver: 'local' });

export class LocalStorageService implements StorageService {
  readonly provider = 'local' as const;
  /** Local files are not publicly served by a CDN; the app streams them (Issue 2). */
  readonly servesThroughApp = true;
  private readonly root: string;
  private readonly publicBaseUrl: string;

  constructor() {
    this.root = path.resolve(storageConfig.localRoot);
    this.publicBaseUrl = storageConfig.publicBaseUrl.replace(/\/+$/, '');
  }

  /** Resolve a key to an absolute path, rejecting traversal outside the root. */
  private resolveKey(key: string): string {
    const normalized = path.normalize(key).replace(/^([/\\])+/, '');
    const full = path.resolve(this.root, normalized);
    if (full !== this.root && !full.startsWith(this.root + path.sep)) {
      throw new BadRequestError('Invalid storage key.');
    }
    return full;
  }

  async put(input: PutObjectInput): Promise<PutObjectResult> {
    const full = this.resolveKey(input.key);
    await fs.mkdir(path.dirname(full), { recursive: true });
    const body =
      typeof input.body === 'string' ? Buffer.from(input.body) : Buffer.from(input.body);
    await fs.writeFile(full, body);
    return { key: input.key, size: body.byteLength };
  }

  /** Overwrite at the same key (mkdir + writeFile is already idempotent). */
  async replace(input: PutObjectInput): Promise<PutObjectResult> {
    return this.put(input);
  }

  async get(key: string): Promise<Buffer> {
    return fs.readFile(this.resolveKey(key));
  }

  /** Streaming read for large files (e.g. media delivery). */
  createReadStream(key: string): NodeJS.ReadableStream {
    return createReadStream(this.resolveKey(key));
  }

  async delete(key: string): Promise<void> {
    await fs.rm(this.resolveKey(key), { force: true });
  }

  async exists(key: string): Promise<boolean> {
    try {
      await fs.access(this.resolveKey(key));
      return true;
    } catch {
      return false;
    }
  }

  async stat(key: string): Promise<ObjectMetadata | null> {
    try {
      const s = await fs.stat(this.resolveKey(key));
      return { key, size: s.size, lastModified: s.mtime };
    } catch {
      return null;
    }
  }

  async getUrl(key: string, _options?: SignedUrlOptions): Promise<string> {
    const cleanKey = key.replace(/^([/\\])+/, '').split(path.sep).join('/');
    return `${this.publicBaseUrl}/${cleanKey}`;
  }

  /** Alias of getUrl for the TASK 4 `getPublicUrl` vocabulary. */
  getPublicUrl(key: string, options?: SignedUrlOptions): Promise<string> {
    return this.getUrl(key, options);
  }

  async healthCheck(): Promise<boolean> {
    try {
      await fs.mkdir(this.root, { recursive: true });
      await fs.access(this.root);
      return true;
    } catch (err) {
      storeLog.error({ err }, 'Local storage health check failed');
      return false;
    }
  }
}
