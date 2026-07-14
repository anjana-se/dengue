import { logger } from '../../shared/logger';

/**
 * services/reports/exif.util.ts — GPS EXIF extraction from image files.
 * Used for community uploads (user may not manually enter coordinates)
 * and drone images (GPS baked in by the drone).
 *
 * Library: exifr — supports JPEG, TIFF, HEIC, PNG; reads GPS from
 * EXIF, XMP, and IPTC segments. No native bindings required.
 */

export interface GpsCoordinates {
  latitude: number;
  longitude: number;
  altitude?: number;
}

/**
 * Extracts GPS coordinates from an image file.
 * Returns null if the image has no GPS data (e.g. screenshot, stock photo).
 */
export async function extractGps(filePath: string): Promise<GpsCoordinates | null> {
  try {
    // Dynamic import — exifr is ESM, importing it dynamically keeps the rest
    // of the codebase as CommonJS without an interop headache.
    const exifr = await import('exifr');
    const gps = await exifr.gps(filePath);

    if (!gps || gps.latitude == null || gps.longitude == null) {
      logger.debug('No GPS data found in image', { filePath });
      return null;
    }

    return {
      latitude: gps.latitude,
      longitude: gps.longitude,
    };
  } catch (err) {
    // EXIF parsing failure is non-fatal — the report can still be created
    // without coordinates (zone assignment will be skipped)
    logger.warn('EXIF extraction failed', {
      filePath,
      error: (err as Error).message,
    });
    return null;
  }
}

/**
 * Validates that coordinates are within Sri Lanka's approximate bounding box.
 * Prevents obviously wrong GPS readings from being persisted.
 *
 * Sri Lanka bounds: lat 5.9–9.9°N, lng 79.7–81.9°E
 */
export function isWithinSriLanka(lat: number, lng: number): boolean {
  return lat >= 5.9 && lat <= 9.9 && lng >= 79.7 && lng <= 81.9;
}
