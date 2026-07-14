import { config } from '../config/env';
import { LocalStorageDriver } from './localStorage.provider';
import { S3StorageDriver } from './s3Storage.provider';
import type { StorageDriver } from './storage.interface';

/**
 * storage/index.ts — Factory that returns the active storage driver.
 * All calling code imports `storage` from here — never imports a driver directly.
 *
 * Switching from local to S3 only requires changing STORAGE_DRIVER in .env.
 */

let _storage: StorageDriver | null = null;

export function getStorage(): StorageDriver {
  if (_storage) return _storage;

  if (config.STORAGE_DRIVER === 's3') {
    _storage = new S3StorageDriver();
  } else {
    _storage = new LocalStorageDriver();
  }

  return _storage;
}

/** Convenience re-export of the interface for type annotations */
export type { StorageDriver, UploadResult } from './storage.interface';
