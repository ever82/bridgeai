/**
 * Image Processing Utilities
 * Helper functions for image manipulation using Sharp
 */
import sharp from 'sharp';
/**
 * Get image dimensions and metadata from buffer using Sharp
 */
export async function getImageMetadata(imageBuffer) {
    const metadata = await sharp(imageBuffer).metadata();
    return {
        width: metadata.width ?? 0,
        height: metadata.height ?? 0,
        format: metadata.format ?? 'unknown',
        size: imageBuffer.length,
        colorSpace: metadata.space,
        hasAlpha: metadata.hasAlpha,
        exif: metadata.exif,
    };
}
/**
 * Resize an image while maintaining aspect ratio
 */
export async function resizeImage(imageBuffer, targetWidth, targetHeight) {
    return await sharp(imageBuffer).resize(targetWidth, targetHeight, { fit: 'inside' }).toBuffer();
}
/**
 * Convert image format
 */
export async function convertImageFormat(imageBuffer, targetFormat) {
    return await sharp(imageBuffer).toFormat(targetFormat).toBuffer();
}
/**
 * Optimize image for web
 */
export async function optimizeImage(imageBuffer, quality = 80) {
    return await sharp(imageBuffer).jpeg({ quality, mozjpeg: true }).toBuffer();
}
/**
 * Crop image to specified region
 */
export async function cropImage(imageBuffer, boundingBox) {
    return await sharp(imageBuffer)
        .extract({
        left: boundingBox.x,
        top: boundingBox.y,
        width: boundingBox.width,
        height: boundingBox.height,
    })
        .toBuffer();
}
/**
 * Apply Gaussian blur to entire image or region
 */
export async function applyBlur(imageBuffer, sigma, boundingBox) {
    if (boundingBox) {
        // Blur only the specified region: extract, blur, composite back
        const regionBuffer = await sharp(imageBuffer)
            .extract({
            left: boundingBox.x,
            top: boundingBox.y,
            width: boundingBox.width,
            height: boundingBox.height,
        })
            .blur(sigma)
            .toBuffer();
        return await sharp(imageBuffer)
            .ensureAlpha()
            .composite([
            {
                input: regionBuffer,
                left: boundingBox.x,
                top: boundingBox.y,
            },
        ])
            .toBuffer();
    }
    return await sharp(imageBuffer).blur(sigma).toBuffer();
}
/**
 * Create a composite image by overlaying one image on another
 */
export async function compositeImages(baseImage, overlayImage, position) {
    return await sharp(baseImage)
        .ensureAlpha()
        .composite([
        {
            input: overlayImage,
            left: position.x,
            top: position.y,
        },
    ])
        .toBuffer();
}
/**
 * Generate a thumbnail
 */
export async function generateThumbnail(imageBuffer, maxDimension = 200) {
    return await sharp(imageBuffer).resize(maxDimension, maxDimension, { fit: 'inside' }).toBuffer();
}
/**
 * Calculate scaled bounding box for different image sizes
 */
export function scaleBoundingBox(boundingBox, originalDimensions, targetDimensions) {
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
export function doBoundingBoxesOverlap(box1, box2) {
    return !(box1.x + box1.width < box2.x ||
        box2.x + box2.width < box1.x ||
        box1.y + box1.height < box2.y ||
        box2.y + box2.height < box1.y);
}
/**
 * Merge overlapping bounding boxes
 */
export function mergeBoundingBoxes(boxes) {
    if (boxes.length === 0)
        return [];
    const merged = [];
    const sorted = [...boxes].sort((a, b) => a.x - b.x);
    let current = sorted[0];
    for (let i = 1; i < sorted.length; i++) {
        const next = sorted[i];
        if (doBoundingBoxesOverlap(current, next)) {
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
        }
        else {
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
export function padBoundingBox(boundingBox, padding, imageDimensions) {
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
export function isValidImage(buffer) {
    const jpegMagic = Buffer.from([0xff, 0xd8, 0xff]);
    const pngMagic = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
    const webpMagic = Buffer.from([0x52, 0x49, 0x46, 0x46]);
    if (buffer.length < 4)
        return false;
    return (buffer.slice(0, 3).equals(jpegMagic) ||
        buffer.slice(0, 4).equals(pngMagic) ||
        buffer.slice(0, 4).equals(webpMagic));
}
/**
 * Get image format from buffer
 */
export function getImageFormat(buffer) {
    if (buffer.length < 4)
        return null;
    if (buffer.slice(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff])))
        return 'jpeg';
    if (buffer.slice(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47])))
        return 'png';
    if (buffer.slice(0, 4).equals(Buffer.from([0x52, 0x49, 0x46, 0x46])))
        return 'webp';
    if (buffer.slice(0, 4).equals(Buffer.from([0x47, 0x49, 0x46, 0x38])))
        return 'gif';
    return null;
}
/**
 * Calculate image hash for comparison
 */
export function calculateImageHash(buffer) {
    const sample = buffer.slice(0, Math.min(1024, buffer.length));
    return Buffer.from(sample).toString('base64');
}
/**
 * Compare two images for similarity
 */
export async function compareImages(image1, image2) {
    const hash1 = calculateImageHash(image1);
    const hash2 = calculateImageHash(image2);
    return hash1 === hash2 ? 1.0 : 0.0;
}
/**
 * Strip EXIF metadata from image for privacy protection
 * Preserves the original image format and only removes metadata
 */
export async function stripExif(imageBuffer) {
    const metadata = await sharp(imageBuffer).metadata();
    // Sharp strips all metadata by default when re-encoding.
    // Apply auto-rotation based on EXIF orientation before stripping.
    const pipeline = sharp(imageBuffer).rotate();
    // Re-encode in the original format to remove metadata while preserving format
    switch (metadata.format) {
        case 'jpeg':
        case 'jpg':
            return await pipeline.jpeg().toBuffer();
        case 'png':
            return await pipeline.png().toBuffer();
        case 'webp':
            return await pipeline.webp().toBuffer();
        case 'gif':
            return await pipeline.gif().toBuffer();
        case 'avif':
            return await pipeline.avif().toBuffer();
        default:
            // Fallback to JPEG for unknown formats
            return await pipeline.jpeg().toBuffer();
    }
}
/**
 * Extract EXIF metadata from image
 */
export async function extractExif(imageBuffer) {
    const metadata = await sharp(imageBuffer).metadata();
    if (!metadata.exif)
        return null;
    return metadata.exif;
}
/**
 * Check if image contains GPS EXIF data
 */
export async function hasGpsExif(imageBuffer) {
    const metadata = await sharp(imageBuffer).metadata();
    if (!metadata.exif)
        return false;
    const exifStr = typeof metadata.exif === 'string' ? metadata.exif : JSON.stringify(metadata.exif);
    return exifStr.includes('GPS') || exifStr.includes('gps');
}
//# sourceMappingURL=imageProcessing.js.map