import { Request, Response, NextFunction, RequestHandler } from 'express';
/**
 * Middleware to check uploaded images for security
 */
export declare const imageUploadCheck: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Middleware to handle single image upload
 */
export declare const uploadSingleImage: (fieldName: string) => RequestHandler[];
/**
 * Middleware to handle multiple image uploads
 */
export declare const uploadMultipleImages: (fieldName: string, maxCount?: number) => RequestHandler[];
/**
 * Middleware to handle mixed file uploads
 */
export declare const uploadMixedImages: (fields: {
    name: string;
    maxCount: number;
}[]) => RequestHandler[];
declare const _default: {
    imageUploadCheck: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    uploadSingleImage: (fieldName: string) => RequestHandler[];
    uploadMultipleImages: (fieldName: string, maxCount?: number) => RequestHandler[];
    uploadMixedImages: (fields: {
        name: string;
        maxCount: number;
    }[]) => RequestHandler[];
};
export default _default;
//# sourceMappingURL=imageUploadCheck.d.ts.map