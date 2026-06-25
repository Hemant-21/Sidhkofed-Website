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
    default:
      // Unreachable once config validation restricts the enum, but keep the guard.
      throw new Error(`Unknown STORAGE_PROVIDER: ${String(storageConfig.provider)}`);
  }
}

export const storage: StorageService = createStorageService();

/**
 * Verify storage is reachable at boot. Returns the result; the caller (server bootstrap)
 * treats a failure as fatal so the app never serves traffic with broken media storage
 * (pre-Phase-5 audit, Issue 7).
 */
export async function checkStorage(): Promise<boolean> {
  const ok = await storage.healthCheck();
  if (ok) storeLog.info({ provider: storage.provider }, 'Storage ready');
  else storeLog.error({ provider: storage.provider }, 'Storage health check failed');
  return ok;
}

export * from './storage.types';
