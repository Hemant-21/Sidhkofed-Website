/**
 * Storage service factory — selects the driver from STORAGE_PROVIDER and exposes a
 * single shared instance. Modules import `storage` from here and depend only on the
 * StorageService interface, never on a concrete driver.
 */
import { storageConfig } from '@/config';
import { logger } from '@/shared/logger';
import { LocalStorageService } from './local.storage';
import { S3StorageService } from './s3.storage';
import type { StorageService } from './storage.types';

const storeLog = logger.child({ component: 'storage' });

function createStorageService(): StorageService {
  switch (storageConfig.provider) {
    case 's3':
      return new S3StorageService();
    case 'local':
      return new LocalStorageService();
    case 'gcs':
      // GCS driver not implemented in Phase 1; fail loudly rather than silently.
      throw new Error('STORAGE_PROVIDER=gcs is not implemented yet');
    default:
      throw new Error(`Unknown STORAGE_PROVIDER: ${storageConfig.provider as string}`);
  }
}

export const storage: StorageService = createStorageService();

/** Verify storage is reachable at boot (logs, does not throw). */
export async function checkStorage(): Promise<boolean> {
  const ok = await storage.healthCheck();
  if (ok) storeLog.info({ provider: storage.provider }, 'Storage ready');
  else storeLog.warn({ provider: storage.provider }, 'Storage health check failed');
  return ok;
}

export * from './storage.types';
