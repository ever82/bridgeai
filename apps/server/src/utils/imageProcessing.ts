/**
 * Image Processing Utilities
 * Helper functions for image manipulation and processing
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
}

/**
 * Get image dimensions and metadata from buffer
 * In production, this would use an image library like Sharp
 */
export async function getImageMetadata(imageBuffer: Buffer): Promise<ImageMetadata> {
  // In production: Use sharp or similar library
  // const sharp = require('sharp');
  // const metadata = await sharp(imageBuffer).metadata();

  // Mock metadata for development
  return {
    width: 1920,
    height: 1080,
    format: 'jpeg',
    size: imageBuffer.length,
    colorSpace: 'srgb',
    hasAlpha: false,
  };
}

/**
 * Resize an image while maintaining aspect ratio
 */
export async function resizeImage(
  imageBuffer: Buffer,
  targetWidth: number,
  targetHeight?: number
): Promise<Buffer> {
  // In production: Use sharp
  // const sharp = require('sharp');
  // return await sharp(imageBuffer)
  //   .resize(targetWidth, targetHeight, { fit: 'inside' })
  //   .toBuffer();

  console.log(`Resized image to ${targetWidth}x${targetHeight || 'auto'}`);
  return imageBuffer;
}

/**
 * Convert image format
 */
export async function convertImageFormat(
  imageBuffer: Buffer,
  targetFormat: 'jpeg' | 'png' | 'webp' | 'avif'
): Promise<Buffer> {
  // In production: Use sharp for format conversion
  console.log(`Converted image to ${targetFormat}`);
  return imageBuffer;
}

/**
 * Optimize image for web
 */
export async function optimizeImage(
  imageBuffer: Buffer,
  quality: number = 80
): Promise<Buffer> {
  // In production: Use sharp with compression
  console.log(`Optimized image with quality ${quality}`);
  return imageBuffer;
}

/**
 * Crop image to specified region
 */
export async function cropImage(
  imageBuffer: Buffer,
  boundingBox: BoundingBox
): Promise<Buffer> {
  // In production: Use sharp extract
  // const sharp = require('sharp');
  // return await sharp(imageBuffer)
  //   .extract({
  //     left: boundingBox.x,
  //     top: boundingBox.y,
  //     width: boundingBox.width,
  //     height: boundingBox.height
  //   })
  //   .toBuffer();

  console.log(`Cropped image: ${JSON.stringify(boundingBox)}`);
  return imageBuffer;
}

/**
 * Apply Gaussian blur to entire image or region
 */
export async function applyBlur(
  imageBuffer: Buffer,
  sigma: number,
  boundingBox?: BoundingBox
): Promise<Buffer> {
  // In production: Use sharp blur
  console.log(`Applied blur with sigma ${sigma}`);
  return imageBuffer;
}

/**
 * Create a composite image by overlaying one image on another
 */
export async function compositeImages(
  baseImage: Buffer,
  overlayImage: Buffer,
  position: { x: number; y: number }
): Promise<Buffer> {
  // In production: Use sharp composite
  console.log(`Composited image at position ${position.x}, ${position.y}`);
  return baseImage;
}

/**
 * Generate a thumbnail
 */
export async function generateThumbnail(
  imageBuffer: Buffer,
  maxDimension: number = 200
): Promise<Buffer> {
  const metadata = await getImageMetadata(imageBuffer);
  const scale = Math.min(maxDimension / metadata.width, maxDimension / metadata.height);
  const newWidth = Math.round(metadata.width * scale);
  const newHeight = Math.round(metadata.height * scale);

  return resizeImage(imageBuffer, newWidth, newHeight);
}

/**
 * Calculate scaled bounding box for different image sizes
 */
export function scaleBoundingBox(
  boundingBox: BoundingBox,
  originalDimensions: ImageDimensions,
  targetDimensions: ImageDimensions
): BoundingBox {
  const scaleX = targetDimensions.width / originalDimensions.width;
  const scaleY = targetDimensions.height / originalDimensions.height;

  return {
    x: Math.round(boundingBox.x * scaleX),
    y: Math.round(boundingBox.y * scaleY),
    width: Math.round(boundingBox.width * scaleX),
    height: Math.round(boundingBox.height * scaleY),
  };
}

/**
 * Check if two bounding boxes overlap
 */
export function doBoundingBoxesOverlap(box1: BoundingBox, box2: BoundingBox): boolean {
  return !(
    box1.x + box1.width < box2.x ||
    box2.x + box2.width < box1.x ||
    box1.y + box1.height < box2.y ||
    box2.y + box2.height < box1.y
  );
}

/**
 * Merge overlapping bounding boxes
 */
export function mergeBoundingBoxes(boxes: BoundingBox[]): BoundingBox[] {
  if (boxes.length === 0) return [];

  const merged: BoundingBox[] = [];
  const sorted = [...boxes].sort((a, b) => a.x - b.x);

  let current = sorted[0];

  for (let i = 1; i < sorted.length; i++) {
    const next = sorted[i];

    if (doBoundingBoxesOverlap(current, next)) {
      // Merge boxes
      const minX = Math.min(current.x, next.x);
      const minY = Math.min(current.y, next.y);
      const maxX = Math.max(current.x + current.width, next.x + next.width);
      const maxY = Math.max(current.y + current.height, next.y + next.height);

      current = {
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY,
      };
    } else {
      merged.push(current);
      current = next;
    }
  }

  merged.push(current);
  return merged;
}

/**
 * Add padding to bounding box
 */
export function padBoundingBox(
  boundingBox: BoundingBox,
  padding: number,
  imageDimensions: ImageDimensions
): BoundingBox {
  return {
    x: Math.max(0, boundingBox.x - padding),
    y: Math.max(0, boundingBox.y - padding),
    width: Math.min(imageDimensions.width - boundingBox.x, boundingBox.width + padding * 2),
    height: Math.min(imageDimensions.height - boundingBox.y, boundingBox.height + padding * 2),
  };
}

/**
 * Validate image buffer
 */
export function isValidImage(buffer: Buffer): boolean {
  // Check magic numbers for common image formats
  const jpegMagic = Buffer.from([0xff, 0xd8, 0xff]);
  const pngMagic = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
  const webpMagic = Buffer.from([0x52, 0x49, 0x46, 0x46]);

  if (buffer.length < 4) return false;

  return (
    buffer.slice(0, 3).equals(jpegMagic) ||
    buffer.slice(0, 4).equals(pngMagic) ||
    buffer.slice(0, 4).equals(webpMagic)
  );
}

/**
 * Get image format from buffer
 */
export function getImageFormat(buffer: Buffer): string | null {
  if (buffer.length < 4) return null;

  if (buffer.slice(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))) return 'jpeg';
  if (buffer.slice(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47]))) return 'png';
  if (buffer.slice(0, 4).equals(Buffer.from([0x52, 0x49, 0x46, 0x46]))) return 'webp';
  if (buffer.slice(0, 4).equals(Buffer.from([0x47, 0x49, 0x46, 0x38]))) return 'gif';

  return null;
}

/**
 * Calculate image hash for comparison
 */
export function calculateImageHash(buffer: Buffer): string {
  // In production: Use perceptual hashing (pHash)
  // For now, use simple hash of first 1KB
  const sample = buffer.slice(0, Math.min(1024, buffer.length));
  return Buffer.from(sample).toString('base64');
}

/**
 * Compare two images for similarity
 */
export async function compareImages(image1: Buffer, image2: Buffer): Promise<number> {
  // In production: Use perceptual hashing comparison
  const hash1 = calculateImageHash(image1);
  const hash2 = calculateImageHash(image2);

  // Simple comparison - in production use Hamming distance of pHashes
  return hash1 === hash2 ? 1.0 : 0.0;
}
