import { logger } from '../../shared/logger';

/**
 * services/reports/exif.util.ts — GPS EXIF extraction and validation from image files.
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

export interface ExifMetadataResult {
  gps: GpsCoordinates | null;
  cameraMake?: string;
  cameraModel?: string;
  capturedAt?: Date;
  isValidGps: boolean;
  isSriLanka: boolean;
  validationStatus: 'valid' | 'out_of_bounds' | 'zone_mismatch' | 'out_of_zone_bounds' | 'missing_gps' | 'error';
  rawExif?: Record<string, any>;
}

/**
 * Extracts GPS coordinates from an image file.
 * Returns null if the image has no GPS data (e.g. screenshot, stock photo).
 */
export async function extractGps(filePath: string): Promise<GpsCoordinates | null> {
  try {
    const exifr = await import('exifr');
    const gps = await exifr.gps(filePath);

    if (!gps || gps.latitude == null || gps.longitude == null) {
      logger.debug('No GPS data found in image', { filePath });
      return null;
    }

    return {
      latitude: gps.latitude,
      longitude: gps.longitude,
      altitude: (gps as any).altitude ?? undefined,
    };
  } catch (err) {
    logger.warn('EXIF GPS extraction failed', {
      filePath,
      error: (err as Error).message,
    });
    return null;
  }
}

/**
 * Extracts full EXIF metadata and validates GPS bounds.
 */
export async function extractExifMetadata(filePath: string): Promise<ExifMetadataResult> {
  try {
    const exifr = await import('exifr');
    const output = await exifr.parse(filePath, {
      gps: true,
      exif: true,
      tiff: true,
      xmp: true,
    }).catch(() => null);

    const gps = await extractGps(filePath);
    if (!gps) {
      return {
        gps: null,
        cameraMake: output?.Make,
        cameraModel: output?.Model,
        capturedAt: output?.DateTimeOriginal ? new Date(output.DateTimeOriginal) : undefined,
        isValidGps: false,
        isSriLanka: false,
        validationStatus: 'missing_gps',
        rawExif: output || undefined,
      };
    }

    const validLanka = isWithinSriLanka(gps.latitude, gps.longitude);
    return {
      gps,
      cameraMake: output?.Make,
      cameraModel: output?.Model,
      capturedAt: output?.DateTimeOriginal ? new Date(output.DateTimeOriginal) : undefined,
      isValidGps: true,
      isSriLanka: validLanka,
      validationStatus: validLanka ? 'valid' : 'out_of_bounds',
      rawExif: output || undefined,
    };
  } catch (err: any) {
    logger.warn('EXIF full metadata extraction failed', {
      filePath,
      error: err.message,
    });
    return {
      gps: null,
      isValidGps: false,
      isSriLanka: false,
      validationStatus: 'error',
    };
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
