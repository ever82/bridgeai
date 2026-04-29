/**
 * Image Upload Security Middleware
 *
 * Unified middleware that chains:
 *   multer (file receive) → security validation → EXIF stripping → response
 *
 * Usage:
 *   router.post('/image', authenticate, secureImageUpload('image'), handler)
 */
export { ImageSecurityService, type ImageSecurityCheckResult, } from '../services/security/imageSecurity';
import { Request, Response, NextFunction } from 'express';
export interface SecureUploadOptions {
    fieldName?: string;
    maxCount?: number;
    maxFileSize?: number;
    allowedFormats?: string[];
    stripMetadata?: boolean;
    scanForMalware?: boolean;
}
/**
 * Single image upload with full security pipeline.
 * On success, `req.file.buffer` is replaced with the sanitized buffer.
 * Security metadata is attached to `req.imageSecurityResult`.
 */
export declare function secureImageUpload(options?: SecureUploadOptions): import("express").RequestHandler<import("express-serve-static-core").ParamsDictionary, any, any, import("qs").ParsedQs, Record<string, any>>[];
/**
 * Multiple images upload with full security pipeline.
 * All file buffers are replaced with sanitized versions.
 * `req.imageSecurityResults` is an array of results.
 */
export declare function secureImagesUpload(options?: SecureUploadOptions): import("express").RequestHandler<import("express-serve-static-core").ParamsDictionary, any, any, import("qs").ParsedQs, Record<string, any>>[];
export declare function uploadSecurityErrorHandler(err: Error, _req: Request, res: Response, next: NextFunction): void;
//# sourceMappingURL=imageUploadSecurity.d.ts.map