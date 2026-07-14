/**
 * storage/storage.interface.ts — Common contract for all storage drivers.
 *
 * Everything else in the codebase talks to this interface.
 * Switching STORAGE_DRIVER from 'local' to 's3' requires zero changes
 * outside the storage/ folder.
 */

export interface UploadResult {
  /** Public-accessible URL (or signed URL for private S3 buckets) */
  url: string;
  /** Provider-specific key — local path or S3 object key */
  key: string;
}

export interface StorageDriver {
  /**
   * Upload a file to the storage backend.
   * @param sourcePath  Absolute path to the temporary file on disk (from multer)
   * @param destKey     Desired storage key / path (e.g. 'reports/2024/abc.jpg')
   * @param mimeType    MIME type of the file
   */
  upload(sourcePath: string, destKey: string, mimeType: string): Promise<UploadResult>;

  /**
   * Get a publicly-accessible (or signed) URL for a stored object.
   */
  getUrl(key: string): Promise<string>;

  /**
   * Delete a stored object. Fails silently if key doesn't exist.
   */
  delete(key: string): Promise<void>;
}
