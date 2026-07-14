import fs from 'fs';
import path from 'path';
import { config } from '../config/env';
import { logger } from '../shared/logger';
import type { StorageDriver, UploadResult } from './storage.interface';

/**
 * storage/localStorage.provider.ts — Local filesystem storage driver.
 * Active when STORAGE_DRIVER=local (default for development).
 *
 * Files are written to UPLOADS_DIR (default: ./uploads).
 * The API serves them via express.static — add the static middleware
 * in app.ts when building the /uploads/* route (or let the frontend
 * proxy through Vite's dev server).
 */

export class LocalStorageDriver implements StorageDriver {
  private readonly uploadsDir: string;
  private readonly baseUrl: string;

  constructor() {
    this.uploadsDir = path.resolve(config.UPLOADS_DIR);
    // Base URL for serving uploaded files
    this.baseUrl = `http://localhost:${config.PORT}/uploads`;

    // Ensure uploads directory exists
    if (!fs.existsSync(this.uploadsDir)) {
      fs.mkdirSync(this.uploadsDir, { recursive: true });
      logger.info('Created uploads directory', { path: this.uploadsDir });
    }
  }

  async upload(sourcePath: string, destKey: string, _mimeType: string): Promise<UploadResult> {
    const destPath = path.join(this.uploadsDir, destKey);
    const destDir = path.dirname(destPath);

    // Create subdirectories if needed (e.g. reports/2024/)
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }

    // Move the multer temp file to its final destination
    await fs.promises.copyFile(sourcePath, destPath);

    // Remove the multer temp file only if it's different from the dest
    if (sourcePath !== destPath) {
      await fs.promises.unlink(sourcePath).catch(() => {
        // Non-fatal — multer may have already cleaned it up
      });
    }

    const url = `${this.baseUrl}/${destKey}`;
    logger.debug('File stored locally', { key: destKey, url });
    return { url, key: destKey };
  }

  async getUrl(key: string): Promise<string> {
    return `${this.baseUrl}/${key}`;
  }

  async delete(key: string): Promise<void> {
    const filePath = path.join(this.uploadsDir, key);
    await fs.promises.unlink(filePath).catch((err: NodeJS.ErrnoException) => {
      if (err.code !== 'ENOENT') {
        logger.warn('Failed to delete local file', { key, error: err.message });
      }
    });
  }
}
