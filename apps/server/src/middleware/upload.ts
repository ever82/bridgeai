/**
 * File Upload Middleware
 *
 * Handles file uploads with security validations including:
 * - File type restrictions
 * - File size limits
 * - Image content validation
 * - Malicious file detection
 */
import type { Request, Response, NextFunction } from 'express';
import multer, { type FileFilterCallback } from 'multer';
import path from 'path';
import { getRequestContext } from './requestContext';

// ============================================================================
// Configuration
// ============================================================================

/**
 * Maximum file sizes (in bytes)
 */
const MAX_FILE_SIZES = {
  image: 10 * 1024 * 1024, // 10MB
  video: 100 * 1024 * 1024, // 100MB
  audio: 50 * 1024 * 1024, // 50MB
  document: 25 * 1024 * 1024, // 25MB
  default: 10 * 1024 * 1024, // 10MB
};

/**
 * Allowed MIME types by category
 */
const ALLOWED_MIME_TYPES: Record<string, string[]> = {
  image: [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    'image/avif',
  ],
  video: [
    'video/mp4',
    'video/webm',
    'video/ogg',
    'video/quicktime', // .mov
    'video/x-msvideo', // .avi
  ],
  audio: [
    'audio/mpeg',
    'audio/mp3',
    'audio/wav',
    'audio/ogg',
    'audio/webm',
    'audio/aac',
    'audio/flac',
  ],
  document: [
    'application/pdf',
    'text/plain',
    'text/markdown',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/json',
    'text/csv',
  ],
  code: [
    'text/javascript',
    'text/typescript',
    'application/javascript',
    'application/typescript',
    'text/html',
    'text/css',
    'text/x-python',
    'text/x-java',
    'text/x-c',
    'text/x-c++',
  ],
};

/**
 * Dangerous file extensions that should be rejected
 */
const DANGEROUS_EXTENSIONS = [
  '.exe',
  '.dll',
  '.bat',
  '.cmd',
  '.sh',
  '.php',
  '.jsp',
  '.asp',
  '.aspx',
  '.py',
  '.rb',
  '.pl',
  '.cgi',
  '.jar',
  '.war',
  '.ear',
  '.msi',
  '.com',
  '.scr',
  '.pif',
  '.vbs',
  '.js',
  '.wsf',
  '.hta',
  '.ps1',
  '.psm1',
  '.app',
  '.dmg',
  '.pkg',
  '.deb',
  '.rpm',
];

/**
 * Dangerous MIME types that should be rejected
 */
const DANGEROUS_MIME_TYPES = [
  'application/x-msdownload',
  'application/x-msdos-program',
  'application/x-executable',
  'application/x-sharedlib',
  'application/x-dosexec',
  'application/x-msi',
  'application/x-bat',
  'application/x-sh',
  'application/x-php',
  'application/x-python-code',
  'text/x-python',
  'application/java-archive',
  'application/x-java-archive',
  'application/x-shellscript',
];

// ============================================================================
// File Type Detection
// ============================================================================

/**
 * Get file category from MIME type
 */
function getFileCategory(mimeType: string): keyof typeof MAX_FILE_SIZES | null {
  for (const [category, types] of Object.entries(ALLOWED_MIME_TYPES)) {
    if (types.includes(mimeType)) {
      return category as keyof typeof MAX_FILE_SIZES;
    }
  }
  return null;
}

/**
 * Check if file extension is dangerous
 */
function isDangerousExtension(filename: string): boolean {
  const ext = path.extname(filename).toLowerCase();
  return DANGEROUS_EXTENSIONS.includes(ext);
}

/**
 * Check if MIME type is dangerous
 */
function isDangerousMimeType(mimeType: string): boolean {
  return DANGEROUS_MIME_TYPES.includes(mimeType.toLowerCase());
}

/**
 * Check if MIME type is allowed for a specific category
 */
function isAllowedMimeType(mimeType: string, category?: string): boolean {
  if (isDangerousMimeType(mimeType)) {
    return false;
  }

  if (category && category in ALLOWED_MIME_TYPES) {
    return ALLOWED_MIME_TYPES[category].includes(mimeType);
  }

  // Check all categories if no specific category provided
  return Object.values(ALLOWED_MIME_TYPES).some((types) => types.includes(mimeType));
}

// ============================================================================
// File Filter
// ============================================================================

/**
 * Create file filter for multer
 */
function createFileFilter(
  allowedCategories?: string[],
  allowedMimeTypes?: string[]
): (req: Request, file: Express.Multer.File, cb: FileFilterCallback) => void {
  return (req: Request, file: Express.Multer.File, cb: FileFilterCallback): void => {
    const context = getRequestContext(req);

    // Check for dangerous extensions
    if (isDangerousExtension(file.originalname)) {
      context?.logWarning('Dangerous file extension detected', {
        filename: file.originalname,
        mimetype: file.mimetype,
        ip: req.ip,
      });
      cb(new Error(`File type not allowed: ${path.extname(file.originalname)}`));
      return;
    }

    // Check for dangerous MIME types
    if (isDangerousMimeType(file.mimetype)) {
      context?.logWarning('Dangerous MIME type detected', {
        filename: file.originalname,
        mimetype: file.mimetype,
        ip: req.ip,
      });
      cb(new Error('File type not allowed'));
      return;
    }

    // Check if specific MIME types are allowed
    if (allowedMimeTypes && allowedMimeTypes.length > 0) {
      if (!allowedMimeTypes.includes(file.mimetype)) {
        cb(new Error(`File type not allowed: ${file.mimetype}`));
        return;
      }
      cb(null, true);
      return;
    }

    // Check if category is allowed
    if (allowedCategories && allowedCategories.length > 0) {
      const fileCategory = getFileCategory(file.mimetype);
      if (!fileCategory || !allowedCategories.includes(fileCategory)) {
        cb(new Error(`File category not allowed: ${fileCategory || 'unknown'}`));
        return;
      }
      cb(null, true);
      return;
    }

    // Default: accept if not dangerous
    cb(null, true);
  };
}

// ============================================================================
// Storage Configuration
// ============================================================================

/**
 * Memory storage (for processing before cloud upload)
 */
const memoryStorage = multer.memoryStorage();

/**
 * Disk storage (for local development/testing)
 */
const diskStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  },
});

// ============================================================================
// Upload Middleware Factory
// ============================================================================

export interface UploadOptions {
  /** Allowed file categories */
  categories?: string[];
  /** Specific allowed MIME types */
  mimeTypes?: string[];
  /** Maximum file size in bytes (overrides category default) */
  maxSize?: number;
  /** Maximum number of files */
  maxCount?: number;
  /** Storage type */
  storage?: 'memory' | 'disk';
  /** Field name for single file upload */
  fieldName?: string;
}

/**
 * Create single file upload middleware
 */
export function uploadSingle(options: UploadOptions = {}) {
  const {
    categories,
    mimeTypes,
    maxSize,
    storage = 'memory',
    fieldName = 'file',
  } = options;

  const limits: multer.Options['limits'] = {
    fileSize: maxSize || MAX_FILE_SIZES.default,
    files: 1,
  };

  return multer({
    storage: storage === 'memory' ? memoryStorage : diskStorage,
    fileFilter: createFileFilter(categories, mimeTypes),
    limits,
  }).single(fieldName);
}

/**
 * Create multiple files upload middleware
 */
export function uploadMultiple(options: UploadOptions = {}) {
  const {
    categories,
    mimeTypes,
    maxSize,
    maxCount = 5,
    storage = 'memory',
    fieldName = 'files',
  } = options;

  const limits: multer.Options['limits'] = {
    fileSize: maxSize || MAX_FILE_SIZES.default,
    files: maxCount,
  };

  return multer({
    storage: storage === 'memory' ? memoryStorage : diskStorage,
    fileFilter: createFileFilter(categories, mimeTypes),
    limits,
  }).array(fieldName, maxCount);
}

/**
 * Create mixed fields upload middleware
 */
export function uploadFields(fields: multer.Field[], options: UploadOptions = {}) {
  const { categories, mimeTypes, maxSize, storage = 'memory' } = options;

  const limits: multer.Options['limits'] = {
    fileSize: maxSize || MAX_FILE_SIZES.default,
    files: fields.reduce((sum, field) => sum + (field.maxCount || 1), 0),
  };

  return multer({
    storage: storage === 'memory' ? memoryStorage : diskStorage,
    fileFilter: createFileFilter(categories, mimeTypes),
    limits,
  }).fields(fields);
}

// ============================================================================
// Pre-configured Upload Middlewares
// ============================================================================

/**
 * Upload single image
 */
export function uploadImage(fieldName = 'image', maxSize?: number) {
  return uploadSingle({
    categories: ['image'],
    fieldName,
    maxSize: maxSize || MAX_FILE_SIZES.image,
  });
}

/**
 * Upload multiple images
 */
export function uploadImages(fieldName = 'images', maxCount = 10, maxSize?: number) {
  return uploadMultiple({
    categories: ['image'],
    fieldName,
    maxCount,
    maxSize: maxSize || MAX_FILE_SIZES.image,
  });
}

/**
 * Upload single document
 */
export function uploadDocument(fieldName = 'document', maxSize?: number) {
  return uploadSingle({
    categories: ['document'],
    fieldName,
    maxSize: maxSize || MAX_FILE_SIZES.document,
  });
}

/**
 * Upload video
 */
export function uploadVideo(fieldName = 'video', maxSize?: number) {
  return uploadSingle({
    categories: ['video'],
    fieldName,
    maxSize: maxSize || MAX_FILE_SIZES.video,
  });
}

/**
 * Upload audio
 */
export function uploadAudio(fieldName = 'audio', maxSize?: number) {
  return uploadSingle({
    categories: ['audio'],
    fieldName,
    maxSize: maxSize || MAX_FILE_SIZES.audio,
  });
}

// ============================================================================
// Error Handler
// ============================================================================

/**
 * Handle multer errors
 */
export function handleUploadError(err: Error, _req: Request, res: Response, next: NextFunction): void {
  if (err instanceof multer.MulterError) {
    let message = 'File upload error';
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
      case 'LIMIT_PART_COUNT':
        message = 'Too many parts in multipart form';
        code = 'TOO_MANY_PARTS';
        break;
    }

    res.status(400).json({
      success: false,
      error: { code, message },
    });
    return;
  }

  // Handle custom file filter errors
  if (err.message.includes('File type not allowed') || err.message.includes('File category not allowed')) {
    res.status(400).json({
      success: false,
      error: { code: 'INVALID_FILE_TYPE', message: err.message },
    });
    return;
  }

  next(err);
}

// ============================================================================
// Image Validation
// ============================================================================

/**
 * Validate image buffer (check for valid image structure)
 * This is a basic check - for production, use sharp or similar library
 */
export function validateImageBuffer(buffer: Buffer): { valid: boolean; format?: string } {
  // Check magic numbers for common image formats
  if (buffer.length < 4) {
    return { valid: false };
  }

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { valid: true, format: 'jpeg' };
  }

  // PNG: 89 50 4E 47
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
    return { valid: true, format: 'png' };
  }

  // GIF: 47 49 46 38
  if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x38) {
    return { valid: true, format: 'gif' };
  }

  // WebP: 52 49 46 46 ... 57 45 42 50
  if (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46) {
    if (buffer.length >= 12 && buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50) {
      return { valid: true, format: 'webp' };
    }
  }

  // SVG: check if starts with XML or contains SVG tag
  const header = buffer.toString('utf8', 0, Math.min(buffer.length, 100)).toLowerCase();
  if (header.includes('<?xml') || header.includes('<svg')) {
    return { valid: true, format: 'svg' };
  }

  return { valid: false };
}

/**
 * Middleware to validate uploaded image content
 */
export function validateImageContent(req: Request, res: Response, next: NextFunction): void {
  if (!req.file && (!req.files || (Array.isArray(req.files) && req.files.length === 0))) {
    next();
    return;
  }

  const files = req.file ? [req.file] : Array.isArray(req.files) ? req.files : [];

  for (const file of files) {
    // Only validate images
    if (!file.mimetype.startsWith('image/')) {
      continue;
    }

    const buffer = file.buffer;
    if (!buffer) {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_IMAGE', message: 'Could not read image data' },
      });
      return;
    }

    const validation = validateImageBuffer(buffer);
    if (!validation.valid) {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_IMAGE', message: 'Invalid or corrupted image file' },
      });
      return;
    }
  }

  next();
}

export default uploadSingle;
