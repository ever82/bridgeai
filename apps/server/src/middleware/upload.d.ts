import type { Request, Response, NextFunction, RequestHandler } from 'express';
import multer from 'multer';
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
export declare function uploadSingle(options?: UploadOptions): any;
/**
 * Create multiple files upload middleware
 */
export declare function uploadMultiple(options?: UploadOptions): RequestHandler;
/**
 * Create mixed fields upload middleware
 */
export declare function uploadFields(fields: multer.Field[], options?: UploadOptions): RequestHandler;
/**
 * Upload single image
 */
export declare function uploadImage(fieldName?: string, maxSize?: number): any;
/**
 * Upload multiple images
 */
export declare function uploadImages(fieldName?: string, maxCount?: number, maxSize?: number): RequestHandler;
/**
 * Upload single document
 */
export declare function uploadDocument(fieldName?: string, maxSize?: number): any;
/**
 * Upload video
 */
export declare function uploadVideo(fieldName?: string, maxSize?: number): any;
/**
 * Upload audio
 */
export declare function uploadAudio(fieldName?: string, maxSize?: number): any;
/**
 * Handle multer errors
 */
export declare function handleUploadError(err: Error, _req: Request, res: Response, next: NextFunction): void;
/**
 * Validate image buffer (check for valid image structure)
 * This is a basic check - for production, use sharp or similar library
 */
export declare function validateImageBuffer(buffer: Buffer): {
    valid: boolean;
    format?: string;
};
/**
 * Middleware to validate uploaded image content
 */
export declare function validateImageContent(req: Request, res: Response, next: NextFunction): void;
export default uploadSingle;
//# sourceMappingURL=upload.d.ts.map