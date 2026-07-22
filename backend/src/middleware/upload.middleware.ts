import multer from 'multer';
import path from 'path';
import { config } from '../config/env';
import { BadRequestError } from '../shared/httpErrors';

/**
 * middleware/upload.middleware.ts — Multer configuration.
 * - File size limit: MAX_UPLOAD_SIZE_MB (default 15 MB)
 * - Allowed MIME types: JPEG, PNG, WebP (breeding-site images)
 * - Destination: /uploads (local storage driver)
 * - Filename: timestamp + original extension for uniqueness
 */

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const storage = multer.diskStorage({
  // Pass the destination as a STRING (not a function) so multer's disk driver
  // runs fs.mkdirSync(recursive) for us — a function destination skips that and
  // throws ENOENT when UPLOADS_DIR doesn't exist yet (it's git-ignored).
  destination: config.UPLOADS_DIR,
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  },
});

function fileFilter(
  _req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback,
): void {
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(
      new BadRequestError(
        `File type '${file.mimetype}' is not allowed. Accepted: ${ALLOWED_MIME_TYPES.join(', ')}`,
        'INVALID_FILE_TYPE',
      ),
    );
  } else {
    cb(null, true);
  }
}

export const uploadSingle = multer({
  storage,
  fileFilter,
  limits: { fileSize: config.MAX_UPLOAD_SIZE_MB * 1024 * 1024 },
}).single('image');

export const uploadMultiple = multer({
  storage,
  fileFilter,
  limits: { fileSize: config.MAX_UPLOAD_SIZE_MB * 1024 * 1024 },
}).array('images', 20);  // up to 20 drone images per batch
