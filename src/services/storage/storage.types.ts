/**
 * Storage abstraction contract.
 *
 * A reusable service over private object storage. Files live outside the database;
 * PostgreSQL stores only metadata + references (API spec §7). The foundation defines
 * the interface and two drivers (local, S3-compatible). Upload APIs/media endpoints
 * are NOT implemented here — that is the Media module (out of foundation scope).
 */

// Only implemented drivers. `gcs` was removed in the pre-Phase-5 audit (Issue 7): an
// unimplemented provider must fail config validation, not crash at first use.
export type StorageProvider = 'local' | 's3';

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

/** Driver-neutral object metadata (TASK 4 `metadata`). Null when the object is absent. */
export interface ObjectMetadata {
  key: string;
  size: number;
  contentType?: string;
  /** Last-modified time when the driver exposes it. */
  lastModified?: Date;
}

/**
 * Driver-neutral storage operations. Drivers MUST treat objects as private; public
 * delivery happens via `getPublicUrl`/signed URLs governed by the parent record's
 * visibility, never by exposing raw storage keys.
 */
export interface StorageService {
  readonly provider: StorageProvider;

  /** Write an object and return its key + size. (`upload` in TASK 4 vocabulary.) */
  put(input: PutObjectInput): Promise<PutObjectResult>;

  /**
   * Overwrite the object at `key` with new bytes (TASK 4 `replace`). Note: the Media
   * module's file-replace creates a NEW asset (API spec §7.5); this lower-level op is
   * for callers that intentionally overwrite the same key.
   */
  replace(input: PutObjectInput): Promise<PutObjectResult>;

  /** Read an object's bytes. */
  get(key: string): Promise<Buffer>;

  /** Delete an object. (Linked assets are never deleted by the API — caller enforces.) */
  delete(key: string): Promise<void>;

  /** Whether an object exists. */
  exists(key: string): Promise<boolean>;

  /** Object metadata (size/content-type/last-modified), or null when absent. */
  stat(key: string): Promise<ObjectMetadata | null>;

  /** Public/delivery URL for an object (TASK 4 `getPublicUrl`; alias of `getUrl`). */
  getPublicUrl(key: string, options?: SignedUrlOptions): Promise<string>;

  /**
   * A delivery URL for the object. For local storage this is a path under
   * STORAGE_PUBLIC_BASE_URL; for S3 it is a time-limited signed URL.
   */
  getUrl(key: string, options?: SignedUrlOptions): Promise<string>;

  /** Verify the backing store is reachable/usable (health probe). */
  healthCheck(): Promise<boolean>;

  /**
   * Whether the driver serves bytes through the app (local filesystem) rather than via a
   * direct/redirected URL (S3 signed URL). Drives the media delivery strategy (Issue 2).
   */
  readonly servesThroughApp: boolean;

  /** Stream an object's bytes (only required when `servesThroughApp` is true). */
  createReadStream?(key: string): NodeJS.ReadableStream;
}
