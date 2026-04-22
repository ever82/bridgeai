import { Request, Response, NextFunction, RequestHandler } from 'express';
import multer, { FileFilterCallback } from 'multer';

import { ImageSecurityService } from '../services/security/imageSecurity';

// Configure multer for memory storage
const storage = multer.memoryStorage();

// File filter for images
const imageFileFilter = (
  req: Request,
  file: Express.Multer.File,
  callback: FileFilterCallback
) => {
  const allowedMimetypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
  ];

  if (allowedMimetypes.includes(file.mimetype)) {
    callback(null, true);
  } else {
    callback(new Error(`Invalid file type: ${file.mimetype}. Only images are allowed.`));
  }
};

// Multer upload configuration
const upload = multer({
  storage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max file size
    files: 20, // Max 20 files per upload
  },
});

/**
 * Middleware to check uploaded images for security
 */
export const imageUploadCheck = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.files && !req.file) {
      next();
      return;
    }

    const files = req.files
      ? Array.isArray(req.files)
        ? req.files
        : Object.values(req.files).flat()
      : req.file
      ? [req.file]
      : [];

    if (files.length === 0) {
      next();
      return;
    }

    const securityService = ImageSecurityService.getInstance();
    const results = await Promise.all(
      files.map(async (file) => {
        const checkResult = await securityService.checkImage(file.buffer, {
          checkSensitiveContent: true,
          checkFaces: true,
          checkQuality: true,
        });

        return {
          filename: file.originalname,
          result: checkResult,
        };
      })
    );

    const failedChecks = results.filter((r) => !r.result.passed);

    if (failedChecks.length > 0) {
      res.status(400).json({
        success: false,
        error: 'Image security check failed',
        details: failedChecks.map((f) => ({
          filename: f.filename,
          violations: f.result.violations,
          warnings: f.result.warnings,
        })),
      });
      return;
    }

    // Attach security results to request for downstream use
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (req as any).imageSecurityResults = results.map((r) => ({
      filename: r.filename,
      metadata: r.result.metadata,
      faces: r.result.faces,
      quality: r.result.quality,
    }));

    next();
  } catch (error) {
    console.error('Image upload check error:', error);
    res.status(500).json({
      success: false,
      error: 'Image security check failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * Middleware to handle single image upload
 */
export const uploadSingleImage = (fieldName: string): RequestHandler[] => [
  upload.single(fieldName),
  imageUploadCheck,
];

/**
 * Middleware to handle multiple image uploads
 */
export const uploadMultipleImages = (fieldName: string, maxCount: number = 10): RequestHandler[] => [
  upload.array(fieldName, maxCount),
  imageUploadCheck,
];

/**
 * Middleware to handle mixed file uploads
 */
export const uploadMixedImages = (fields: { name: string; maxCount: number }[]): RequestHandler[] => [
  upload.fields(fields),
  imageUploadCheck,
];

export default {
  imageUploadCheck,
  uploadSingleImage,
  uploadMultipleImages,
  uploadMixedImages,
};
