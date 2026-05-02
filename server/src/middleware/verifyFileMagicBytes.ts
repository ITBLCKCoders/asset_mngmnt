import type { Response, NextFunction, Request } from 'express';
import { fileTypeFromBuffer } from 'file-type';
import logger from '../logger.js';

type MulterFile = Express.Multer.File;

/**
 * Categories of allowed uploads. Each category maps to a set of acceptable
 * detected MIME types from `file-type`.
 *
 * NOTE: `file-type` cannot detect plain-text formats (csv, txt, svg-xml).
 * Use a separate validator for those.
 */
const ALLOWED_MIME_BY_CATEGORY: Record<string, ReadonlySet<string>> = {
  image: new Set([
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/bmp',
    'image/heic',
    'image/heif',
  ]),
  pdf: new Set(['application/pdf']),
  imageOrPdf: new Set([
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/bmp',
    'image/heic',
    'image/heif',
    'application/pdf',
  ]),
};

export type UploadCategory = keyof typeof ALLOWED_MIME_BY_CATEGORY;

/**
 * Express middleware factory. Mount AFTER multer so `req.file` /
 * `req.files` are populated. For each file, sniff the leading bytes with
 * `file-type` and reject any whose detected MIME is not in the allowed
 * set for the given category.
 *
 * Rejects when:
 *   - magic-byte detection fails (likely not a binary format we accept)
 *   - detected MIME is outside the allowed set
 *   - claimed `file.mimetype` does not match the detected type
 */
export const verifyFileMagicBytes =
  (category: UploadCategory) =>
  async (req: Request, res: Response, next: NextFunction): Promise<void | Response> => {
    const allowed = ALLOWED_MIME_BY_CATEGORY[category];
    if (!allowed) {
      logger.error(`[UPLOAD] Unknown verify category: ${category}`);
      return res.status(500).json({ error: 'Upload validation misconfigured' });
    }

    const files: MulterFile[] = [];
    if (req.file) files.push(req.file);
    if (Array.isArray(req.files)) files.push(...req.files);
    else if (req.files && typeof req.files === 'object') {
      for (const arr of Object.values(req.files)) {
        if (Array.isArray(arr)) files.push(...arr);
      }
    }

    for (const file of files) {
      if (!file?.buffer) continue;
      const detected = await fileTypeFromBuffer(file.buffer);
      if (!detected) {
        logger.warn(
          `[UPLOAD] Rejecting ${file.originalname}: unable to detect magic bytes`
        );
        return res
          .status(400)
          .json({ error: 'Unsupported or corrupted file' });
      }
      if (!allowed.has(detected.mime)) {
        logger.warn(
          `[UPLOAD] Rejecting ${file.originalname}: detected ${detected.mime} not allowed for ${category}`
        );
        return res
          .status(400)
          .json({ error: 'File type not allowed' });
      }
      if (
        file.mimetype &&
        file.mimetype !== detected.mime &&
        // tolerate jpg<->jpeg-style aliases that file-type normalises
        !(file.mimetype === 'image/jpg' && detected.mime === 'image/jpeg')
      ) {
        logger.warn(
          `[UPLOAD] MIME mismatch for ${file.originalname}: claimed ${file.mimetype}, detected ${detected.mime}`
        );
        return res
          .status(400)
          .json({ error: 'File contents do not match declared type' });
      }
    }

    next();
  };
