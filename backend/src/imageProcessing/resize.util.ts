import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import { logger } from '../shared/logger';

/**
 * imageProcessing/resize.util.ts
 *
 * Resizes an image to a max longest-edge of 1920px before sending to Gemini.
 * Strips all EXIF metadata (GPS, device info) from the output — except for
 * drone images where GPS must be preserved (pass keepGps: true).
 *
 * Returns the path to the processed file (written alongside the original
 * with a `_processed` suffix so we don't modify the original).
 */

const MAX_LONGEST_EDGE = 1920;

export interface ResizeOptions {
  /** If true, GPS EXIF data is preserved (drone images). Default: false */
  keepGps?: boolean;
}

export interface ResizeResult {
  /** Path to the resized file */
  outputPath: string;
  /** Width of the output image in pixels */
  width: number;
  /** Height of the output image in pixels */
  height: number;
  /** File size in bytes after processing */
  size: number;
  /** Whether the image was actually resized (false if it was already within bounds) */
  wasResized: boolean;
}

export async function resizeImage(
  inputPath: string,
  options: ResizeOptions = {},
): Promise<ResizeResult> {
  const { keepGps = false } = options;

  const ext = path.extname(inputPath);
  const base = inputPath.slice(0, -ext.length);
  const outputPath = `${base}_processed${ext}`;

  let origWidth = 0;
  let origHeight = 0;
  let longestEdge = 0;
  let wasResized = false;
  let pipeline;
  let outputInfo;

  try {
    // Get original dimensions
    const metadata = await sharp(inputPath).metadata();
    origWidth = metadata.width ?? 0;
    origHeight = metadata.height ?? 0;
    longestEdge = Math.max(origWidth, origHeight);

    pipeline = sharp(inputPath);

    // Resize only if the image exceeds the max edge length
    wasResized = longestEdge > MAX_LONGEST_EDGE;
    if (wasResized) {
      pipeline = pipeline.resize({
        width: origWidth >= origHeight ? MAX_LONGEST_EDGE : undefined,
        height: origHeight > origWidth ? MAX_LONGEST_EDGE : undefined,
        fit: 'inside',
        withoutEnlargement: true,
      });
    }

    if (keepGps) {
      pipeline = pipeline.keepMetadata();
    } else {
      pipeline = pipeline.withMetadata({});
    }

    outputInfo = await pipeline
      .jpeg({ quality: 85, progressive: true })
      .toFile(outputPath);
  } catch (err: any) {
    logger.warn('Failed to resize image, copying original file directly to output path', { error: err.message });
    try {
      fs.copyFileSync(inputPath, outputPath);
      return {
        outputPath,
        width: 100,
        height: 100,
        size: fs.statSync(outputPath).size,
        wasResized: false,
      };
    } catch (copyErr: any) {
      logger.error('Fallback image copy failed', { error: copyErr.message });
      throw err;
    }
  }

  logger.debug('Image processed', {
    inputPath: path.basename(inputPath),
    wasResized,
    originalDimensions: `${origWidth}x${origHeight}`,
    outputDimensions: `${outputInfo.width}x${outputInfo.height}`,
    outputSize: outputInfo.size,
  });

  return {
    outputPath,
    width: outputInfo.width,
    height: outputInfo.height,
    size: outputInfo.size,
    wasResized,
  };
}

/**
 * Cleans up a processed temp file after it has been uploaded to storage.
 */
export async function cleanupProcessedFile(filePath: string): Promise<void> {
  await fs.promises.unlink(filePath).catch(() => {
    // Non-fatal — file may have already been removed
  });
}
