/**
 * Storage abstraction contract.
 *
 * A reusable service over private object storage. Files live outside the database;
 * PostgreSQL stores only metadata + references (API spec §7). The foundation defines
 * the interface and two drivers (local, S3-compatible). Upload APIs/media endpoints
 * are NOT implemented here — that is the Media module (out of foundation scope).
 */

export type StorageProvider = 'local' | 's3' | 'gcs';

export interface PutObjectInput {
  /** Object key (path) within the bucket/root, e.g. `media/2026/uuid.jpg`. */
  key: string;
  body: Buffer | Uint8Array | string;
  contentType?: string;
  /** Optional checksum (e.g. sha256 hex) the driver may persist as metadata. */
  checksum?: string;
}

export interface PutObjectResult {
  key: string;
  size: number;
}

export interface SignedUrlOptions {
  /** Override the default signed-URL TTL (seconds). */
  expiresInSeconds?: number;
}

/**
 * Driver-neutral storage operations. Drivers MUST treat objects as private; public
 * delivery happens via `getPublicUrl`/signed URLs governed by the parent record's
 * visibility, never by exposing raw storage keys.
 */
export interface StorageService {
  readonly provider: StorageProvider;

  /** Write an object and return its key + size. */
  put(input: PutObjectInput): Promise<PutObjectResult>;

  /** Read an object's bytes. */
  get(key: string): Promise<Buffer>;

  /** Delete an object. (Linked assets are never deleted by the API — caller enforces.) */
  delete(key: string): Promise<void>;

  /** Whether an object exists. */
  exists(key: string): Promise<boolean>;

  /**
   * A delivery URL for the object. For local storage this is a path under
   * STORAGE_PUBLIC_BASE_URL; for S3 it is a time-limited signed URL.
   */
  getUrl(key: string, options?: SignedUrlOptions): Promise<string>;

  /** Verify the backing store is reachable/usable (health probe). */
  healthCheck(): Promise<boolean>;
}
