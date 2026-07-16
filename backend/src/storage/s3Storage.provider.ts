import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import fs from 'fs';
import { config } from '../config/env';
import { logger } from '../shared/logger';
import { InternalServerError } from '../shared/httpErrors';
import type { StorageDriver, UploadResult } from './storage.interface';

/**
 * storage/s3Storage.provider.ts — AWS S3-compatible storage driver.
 * Active when STORAGE_DRIVER=s3.
 *
 * Compatible with: AWS S3, MinIO, Cloudflare R2, Backblaze B2, DigitalOcean Spaces.
 * Objects are private; URLs are pre-signed and valid for SIGNED_URL_EXPIRES_SECONDS.
 */

export class S3StorageDriver implements StorageDriver {
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor() {
    if (!config.S3_BUCKET) {
      throw new InternalServerError('S3_BUCKET env var is required when STORAGE_DRIVER=s3');
    }

    this.bucket = config.S3_BUCKET;

    const clientConfig: any = {
      region: config.S3_REGION,
    };

    if (config.S3_ACCESS_KEY_ID && config.S3_SECRET_ACCESS_KEY) {
      clientConfig.credentials = {
        accessKeyId: config.S3_ACCESS_KEY_ID,
        secretAccessKey: config.S3_SECRET_ACCESS_KEY,
      };
    }

    this.client = new S3Client(clientConfig);
  }

  async upload(sourcePath: string, destKey: string, mimeType: string): Promise<UploadResult> {
    const fileContent = await fs.promises.readFile(sourcePath);

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: destKey,
        Body: fileContent,
        ContentType: mimeType,
        ServerSideEncryption: 'AES256',
      }),
    );

    // Clean up temp file
    await fs.promises.unlink(sourcePath).catch(() => {});

    const url = await this.getUrl(destKey);
    logger.debug('File uploaded to S3', { key: destKey, bucket: this.bucket });
    return { url, key: destKey };
  }

  async getUrl(key: string): Promise<string> {
    const command = new GetObjectCommand({ Bucket: this.bucket, Key: key });
    return getSignedUrl(this.client, command, {
      expiresIn: config.SIGNED_URL_EXPIRES_SECONDS,
    });
  }

  async delete(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
    ).catch((err: Error) => {
      logger.warn('Failed to delete S3 object', { key, error: err.message });
    });
  }
}
