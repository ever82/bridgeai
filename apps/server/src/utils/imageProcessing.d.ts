/**
 * Image Processing Utilities
 * Helper functions for image manipulation using Sharp
 */
import { BoundingBox } from '../services/ai/sensitiveContentDetection';
export interface ImageDimensions {
    width: number;
    height: number;
}
export interface ImageMetadata {
    width: number;
    height: number;
    format: string;
    size: number;
    colorSpace?: string;
    hasAlpha?: boolean;
    exif?: Record<string, unknown>;
}
/**
 * Get image dimensions and metadata from buffer using Sharp
 */
export declare function getImageMetadata(imageBuffer: Buffer): Promise<ImageMetadata>;
/**
 * Resize an image while maintaining aspect ratio
 */
export declare function resizeImage(imageBuffer: Buffer, targetWidth: number, targetHeight?: number): Promise<Buffer>;
/**
 * Convert image format
 */
export declare function convertImageFormat(imageBuffer: Buffer, targetFormat: 'jpeg' | 'png' | 'webp' | 'avif'): Promise<Buffer>;
/**
 * Optimize image for web
 */
export declare function optimizeImage(imageBuffer: Buffer, quality?: number): Promise<Buffer>;
/**
 * Crop image to specified region
 */
export declare function cropImage(imageBuffer: Buffer, boundingBox: BoundingBox): Promise<Buffer>;
/**
 * Apply Gaussian blur to entire image or region
 */
export declare function applyBlur(imageBuffer: Buffer, sigma: number, boundingBox?: BoundingBox): Promise<Buffer>;
/**
 * Create a composite image by overlaying one image on another
 */
export declare function compositeImages(baseImage: Buffer, overlayImage: Buffer, position: {
    x: number;
    y: number;
}): Promise<Buffer>;
/**
 * Generate a thumbnail
 */
export declare function generateThumbnail(imageBuffer: Buffer, maxDimension?: number): Promise<Buffer>;
/**
 * Calculate scaled bounding box for different image sizes
 */
export declare function scaleBoundingBox(boundingBox: BoundingBox, originalDimensions: ImageDimensions, targetDimensions: ImageDimensions): BoundingBox;
/**
 * Check if two bounding boxes overlap
 */
export declare function doBoundingBoxesOverlap(box1: BoundingBox, box2: BoundingBox): boolean;
/**
 * Merge overlapping bounding boxes
 */
export declare function mergeBoundingBoxes(boxes: BoundingBox[]): BoundingBox[];
/**
 * Add padding to bounding box
 */
export declare function padBoundingBox(boundingBox: BoundingBox, padding: number, imageDimensions: ImageDimensions): BoundingBox;
/**
 * Validate image buffer
 */
export declare function isValidImage(buffer: Buffer): boolean;
/**
 * Get image format from buffer
 */
export declare function getImageFormat(buffer: Buffer): string | null;
/**
 * Calculate image hash for comparison
 */
export declare function calculateImageHash(buffer: Buffer): string;
/**
 * Compare two images for similarity
 */
export declare function compareImages(image1: Buffer, image2: Buffer): Promise<number>;
/**
 * Strip EXIF metadata from image for privacy protection
 */
export declare function stripExif(imageBuffer: Buffer): Promise<Buffer>;
/**
 * Extract EXIF metadata from image
 */
export declare function extractExif(imageBuffer: Buffer): Promise<Record<string, unknown> | null>;
/**
 * Check if image contains GPS EXIF data
 */
export declare function hasGpsExif(imageBuffer: Buffer): Promise<boolean>;
//# sourceMappingURL=imageProcessing.d.ts.map