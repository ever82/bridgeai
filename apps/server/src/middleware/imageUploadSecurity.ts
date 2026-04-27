/**
 * Image Upload Security Middleware
 *
 * Unified middleware that chains:
 *   multer (file receive) → security validation → EXIF stripping → response
 *
 * Usage:
 *   router.post('/image', authenticate, secureImageUpload('image'), handler)
 */
import { Request, Response, NextFunction } from 'express';
import multer from 'multer';

import {
  ImageUploadSecurityService,
  type UploadSecurityConfig,
} from '../services/security/imageUploadSecurity';
import { AppError } from '../errors/AppError';

// ---------------------------------------------------------------------------
// Multer configuration
// ---------------------------------------------------------------------------

const storage = multer.memoryStorage();

const ALLOWED_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

const imageFileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  if (ALLOWED_MIMES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type: ${file.mimetype}. Allowed: ${ALLOWED_MIMES.join(', ')}`));
  }
};

// ---------------------------------------------------------------------------
// Security config defaults
// ---------------------------------------------------------------------------

export interface SecureUploadOptions {
  fieldName?: string;
  maxCount?: number;
  maxFileSize?: number;
  allowedFormats?: string[];
  stripMetadata?: boolean;
  scanForMalware?: boolean;
}

const DEFAULT_OPTIONS: SecureUploadOptions = {
  fieldName: 'image',
  maxCount: 1,
  maxFileSize: 10 * 1024 * 1024,
  allowedFormats: ['jpeg', 'png', 'webp', 'gif'],
  stripMetadata: true,
  scanForMalware: false,
};

// ---------------------------------------------------------------------------
// Middleware factory
// ---------------------------------------------------------------------------

/**
 * Single image upload with full security pipeline.
 * On success, `req.file.buffer` is replaced with the sanitized buffer.
 * Security metadata is attached to `req.imageSecurityResult`.
 */
export function secureImageUpload(options: SecureUploadOptions = {}) {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const upload = multer({
    storage,
    fileFilter: imageFileFilter,
    limits: { fileSize: opts.maxFileSize, files: opts.maxCount },
  }).single(opts.fieldName!);

  return [upload, createSecurityHandler(opts)];
}

/**
 * Multiple images upload with full security pipeline.
 * All file buffers are replaced with sanitized versions.
 * `req.imageSecurityResults` is an array of results.
 */
export function secureImagesUpload(options: SecureUploadOptions = {}) {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const upload = multer({
    storage,
    fileFilter: imageFileFilter,
    limits: { fileSize: opts.maxFileSize, files: opts.maxCount ?? 10 },
  }).array(opts.fieldName ?? 'images', opts.maxCount ?? 10);

  return [upload, createSecurityHandler(opts)];
}

// ---------------------------------------------------------------------------
// Internal security handler
// ---------------------------------------------------------------------------

function createSecurityHandler(opts: SecureUploadOptions) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const files = collectFiles(req);
      if (files.length === 0) {
        next();
        return;
      }

      const service = ImageUploadSecurityService.getInstance();
      const secConfig: Partial<UploadSecurityConfig> = {
        maxFileSize: opts.maxFileSize,
        allowedFormats: opts.allowedFormats,
        stripMetadata: opts.stripMetadata,
        scanForMalware: opts.scanForMalware,
      };

      const results = await Promise.all(
        files.map(file =>
          service.secureImage(file.buffer, file.mimetype, file.originalname, secConfig)
        )
      );

      // Check for failures
      const failures = results.filter(r => !r.passed);
      if (failures.length > 0) {
        const allViolations = failures.flatMap(f => f.violations);
        res.status(400).json({
          success: false,
          error: {
            code: 'IMAGE_SECURITY_CHECK_FAILED',
            message: 'Image security check failed',
            violations: allViolations,
          },
        });
        return;
      }

      // Replace buffers with sanitized versions
      for (let i = 0; i < files.length; i++) {
        const result = results[i];
        if (result.sanitizedBuffer) {
          files[i].buffer = result.sanitizedBuffer;
        }
      }

      // Attach results for downstream use
      if (files.length === 1 && req.file) {
        (req as Request & { imageSecurityResult?: (typeof results)[0] }).imageSecurityResult =
          results[0];
      }
      (req as Request & { imageSecurityResults?: typeof results }).imageSecurityResults = results;

      next();
    } catch (error) {
      next(
        new AppError(
          error instanceof Error ? error.message : 'Image security check error',
          'IMAGE_SECURITY_ERROR',
          500
        )
      );
    }
  };
}

function collectFiles(req: Request): Express.Multer.File[] {
  if (req.file) return [req.file];
  if (Array.isArray(req.files)) return req.files;
  if (req.files && typeof req.files === 'object') {
    return Object.values(req.files).flat();
  }
  return [];
}

// ---------------------------------------------------------------------------
// Multer error handler
// ---------------------------------------------------------------------------

export function uploadSecurityErrorHandler(
  err: Error,
  _req: Request,
  res: Response,
  next: NextFunction
): void {
  if (err instanceof multer.MulterError) {
    let message = 'Upload error';
    let code = 'UPLOAD_ERROR';

    switch (err.code) {
      case 'LIMIT_FILE_SIZE':
        message = 'File too large';
        code = 'FILE_TOO_LARGE';
        break;
      case 'LIMIT_FILE_COUNT':
        message = 'Too many files';
        code = 'TOO_MANY_FILES';
        break;
      case 'LIMIT_UNEXPECTED_FILE':
        message = `Unexpected field: ${err.field}`;
        code = 'UNEXPECTED_FIELD';
        break;
    }

    res.status(400).json({ success: false, error: { code, message } });
    return;
  }

  if (err.message?.includes('Invalid file type')) {
    res.status(400).json({
      success: false,
      error: { code: 'INVALID_FILE_TYPE', message: err.message },
    });
    return;
  }

  next(err);
}
