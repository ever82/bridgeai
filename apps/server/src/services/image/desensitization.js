/**
 * Image Desensitization Service
 * Provides various desensitization algorithms: blur, mosaic, pixelate, background replacement
 * Uses Sharp for actual image manipulation
 */
import sharp from 'sharp';
/**
 * Clamp bounding box to image dimensions
 */
function clampBoundingBox(box, width, height) {
    const x = Math.max(0, Math.min(box.x, width - 1));
    const y = Math.max(0, Math.min(box.y, height - 1));
    const boxWidth = Math.min(box.width, width - x);
    const boxHeight = Math.min(box.height, height - y);
    return { x, y, width: Math.max(1, boxWidth), height: Math.max(1, boxHeight) };
}
/**
 * Apply Gaussian blur to a region of the image using Sharp
 */
async function applyGaussianBlur(imageBuffer, boundingBox, intensity) {
    const metadata = await sharp(imageBuffer).metadata();
    const imgWidth = metadata.width ?? 1;
    const imgHeight = metadata.height ?? 1;
    const box = clampBoundingBox(boundingBox, imgWidth, imgHeight);
    // Map intensity (0-100) to sigma (0.3-20)
    const sigma = 0.3 + (intensity / 100) * 19.7;
    const blurredRegion = await sharp(imageBuffer)
        .extract({ left: box.x, top: box.y, width: box.width, height: box.height })
        .blur(sigma)
        .toBuffer();
    return await sharp(imageBuffer)
        .ensureAlpha()
        .composite([
        {
            input: blurredRegion,
            left: box.x,
            top: box.y,
        },
    ])
        .toBuffer();
}
/**
 * Apply mosaic effect to a region using Sharp (downscale + upscale)
 */
async function applyMosaic(imageBuffer, boundingBox, intensity) {
    const metadata = await sharp(imageBuffer).metadata();
    const imgWidth = metadata.width ?? 1;
    const imgHeight = metadata.height ?? 1;
    const box = clampBoundingBox(boundingBox, imgWidth, imgHeight);
    // Block size based on intensity: higher intensity = larger blocks
    const blockSize = Math.max(2, Math.floor(intensity / 5));
    const smallWidth = Math.max(1, Math.floor(box.width / blockSize));
    const smallHeight = Math.max(1, Math.floor(box.height / blockSize));
    // Downscale to create mosaic effect, then upscale back
    const mosaicedRegion = await sharp(imageBuffer)
        .extract({ left: box.x, top: box.y, width: box.width, height: box.height })
        .resize(smallWidth, smallHeight, { kernel: 'nearest' })
        .resize(box.width, box.height, { kernel: 'nearest' })
        .toBuffer();
    return await sharp(imageBuffer)
        .ensureAlpha()
        .composite([
        {
            input: mosaicedRegion,
            left: box.x,
            top: box.y,
        },
    ])
        .toBuffer();
}
/**
 * Apply pixelation to a region (similar to mosaic but with more aggressive downscaling)
 */
async function applyPixelation(imageBuffer, boundingBox, intensity) {
    const metadata = await sharp(imageBuffer).metadata();
    const imgWidth = metadata.width ?? 1;
    const imgHeight = metadata.height ?? 1;
    const box = clampBoundingBox(boundingBox, imgWidth, imgHeight);
    const pixelSize = Math.max(4, Math.floor(intensity / 3));
    const tinyWidth = Math.max(1, Math.floor(box.width / pixelSize));
    const tinyHeight = Math.max(1, Math.floor(box.height / pixelSize));
    const pixelatedRegion = await sharp(imageBuffer)
        .extract({ left: box.x, top: box.y, width: box.width, height: box.height })
        .resize(tinyWidth, tinyHeight)
        .resize(box.width, box.height, { kernel: 'nearest' })
        .toBuffer();
    return await sharp(imageBuffer)
        .ensureAlpha()
        .composite([
        {
            input: pixelatedRegion,
            left: box.x,
            top: box.y,
        },
    ])
        .toBuffer();
}
/**
 * Replace region with solid color (simulates background replacement)
 */
async function replaceBackground(imageBuffer, boundingBox, intensity) {
    const metadata = await sharp(imageBuffer).metadata();
    const imgWidth = metadata.width ?? 1;
    const imgHeight = metadata.height ?? 1;
    const box = clampBoundingBox(boundingBox, imgWidth, imgHeight);
    // Create a solid color overlay (dark gray, intensity controls opacity)
    const overlay = await sharp({
        create: {
            width: box.width,
            height: box.height,
            channels: 4,
            background: { r: 40, g: 40, b: 40, alpha: Math.round((intensity / 100) * 255) },
        },
    })
        .png()
        .toBuffer();
    return await sharp(imageBuffer)
        .ensureAlpha()
        .composite([
        {
            input: overlay,
            left: box.x,
            top: box.y,
        },
    ])
        .toBuffer();
}
/**
 * Apply feathering (blurred edge transition) to the desensitization region
 */
async function applyFeathering(imageBuffer, boundingBox, intensity) {
    const metadata = await sharp(imageBuffer).metadata();
    const imgWidth = metadata.width ?? 1;
    const imgHeight = metadata.height ?? 1;
    const box = clampBoundingBox(boundingBox, imgWidth, imgHeight);
    // Apply blur to create feathered edges
    const featherRadius = Math.max(2, Math.floor(intensity / 4));
    // Expand the region slightly for feathering
    const expanded = {
        x: Math.max(0, box.x - featherRadius),
        y: Math.max(0, box.y - featherRadius),
        width: Math.min(imgWidth - Math.max(0, box.x - featherRadius), box.width + featherRadius * 2),
        height: Math.min(imgHeight - Math.max(0, box.y - featherRadius), box.height + featherRadius * 2),
    };
    const clampedExpanded = clampBoundingBox(expanded, imgWidth, imgHeight);
    const sigma = 0.3 + (intensity / 100) * 15;
    const featheredRegion = await sharp(imageBuffer)
        .extract({
        left: clampedExpanded.x,
        top: clampedExpanded.y,
        width: clampedExpanded.width,
        height: clampedExpanded.height,
    })
        .blur(sigma)
        .toBuffer();
    return await sharp(imageBuffer)
        .ensureAlpha()
        .composite([
        {
            input: featheredRegion,
            left: clampedExpanded.x,
            top: clampedExpanded.y,
        },
    ])
        .toBuffer();
}
/**
 * Apply desensitization to an image based on detection results
 */
export async function desensitizeImage(imageBuffer, detections, options = { method: 'blur', intensity: 70 }) {
    const startTime = Date.now();
    let currentBuffer = imageBuffer;
    const appliedRegions = [];
    for (const detection of detections) {
        const region = {
            boundingBox: detection.boundingBox,
            method: options.method,
            intensity: options.intensity,
        };
        switch (options.method) {
            case 'blur':
                currentBuffer = await applyGaussianBlur(currentBuffer, region.boundingBox, region.intensity);
                break;
            case 'mosaic':
                currentBuffer = await applyMosaic(currentBuffer, region.boundingBox, region.intensity);
                break;
            case 'pixelate':
                currentBuffer = await applyPixelation(currentBuffer, region.boundingBox, region.intensity);
                break;
            case 'replace_background':
                currentBuffer = await replaceBackground(currentBuffer, region.boundingBox, region.intensity);
                break;
            case 'feather':
                currentBuffer = await applyFeathering(currentBuffer, region.boundingBox, region.intensity);
                break;
        }
        appliedRegions.push(region);
    }
    return {
        processedImageBuffer: currentBuffer,
        appliedRegions,
        processingTime: Date.now() - startTime,
    };
}
/**
 * Apply multiple desensitization effects to an image
 */
export async function applyMultiStageDesensitization(imageBuffer, regions) {
    const startTime = Date.now();
    const steps = [];
    const originalSize = imageBuffer.length;
    // Step 1: Pre-processing - strip EXIF by re-encoding
    const preProcessStart = Date.now();
    let currentBuffer = await sharp(imageBuffer).rotate().jpeg().toBuffer();
    steps.push({ step: 'pre-processing', duration: Date.now() - preProcessStart });
    // Step 2: Apply desensitization to each region
    const appliedRegions = [];
    for (const region of regions) {
        const regionStart = Date.now();
        const desensitizationRegion = {
            boundingBox: region.detection.boundingBox,
            method: region.method,
            intensity: region.intensity,
        };
        switch (region.method) {
            case 'blur':
                currentBuffer = await applyGaussianBlur(currentBuffer, region.detection.boundingBox, region.intensity);
                break;
            case 'mosaic':
                currentBuffer = await applyMosaic(currentBuffer, region.detection.boundingBox, region.intensity);
                break;
            case 'pixelate':
                currentBuffer = await applyPixelation(currentBuffer, region.detection.boundingBox, region.intensity);
                break;
            case 'replace_background':
                currentBuffer = await replaceBackground(currentBuffer, region.detection.boundingBox, region.intensity);
                break;
            case 'feather':
                currentBuffer = await applyFeathering(currentBuffer, region.detection.boundingBox, region.intensity);
                break;
        }
        appliedRegions.push(desensitizationRegion);
        steps.push({
            step: `desensitize-${region.detection.type}`,
            duration: Date.now() - regionStart,
            details: {
                method: region.method,
                confidence: region.detection.confidence,
                boundingBox: region.detection.boundingBox,
            },
        });
    }
    // Step 3: Post-processing - optimize output
    const postProcessStart = Date.now();
    currentBuffer = await sharp(currentBuffer).jpeg({ quality: 90 }).toBuffer();
    steps.push({ step: 'post-processing', duration: Date.now() - postProcessStart });
    return {
        processedImageBuffer: currentBuffer,
        appliedRegions,
        processingTime: Date.now() - startTime,
        steps,
        originalSize,
        processedSize: currentBuffer.length,
    };
}
/**
 * Preview desensitization effect by applying at lower quality
 */
export async function previewDesensitization(imageBuffer, boundingBox, method, intensity) {
    // Use reduced intensity for faster preview
    const previewIntensity = Math.min(intensity, 80);
    switch (method) {
        case 'blur':
            return await applyGaussianBlur(imageBuffer, boundingBox, previewIntensity);
        case 'mosaic':
            return await applyMosaic(imageBuffer, boundingBox, previewIntensity);
        case 'pixelate':
            return await applyPixelation(imageBuffer, boundingBox, previewIntensity);
        case 'replace_background':
            return await replaceBackground(imageBuffer, boundingBox, previewIntensity);
        case 'feather':
            return await applyFeathering(imageBuffer, boundingBox, previewIntensity);
        default:
            return await applyGaussianBlur(imageBuffer, boundingBox, previewIntensity);
    }
}
/**
 * Batch desensitize multiple images
 */
export async function batchDesensitize(images, options) {
    const results = await Promise.all(images.map(img => desensitizeImage(img.buffer, img.detections, options)));
    return results;
}
/**
 * Get recommended desensitization method based on content type
 */
export function getRecommendedMethod(contentType) {
    switch (contentType) {
        case 'face':
            return 'blur';
        case 'license_plate':
            return 'mosaic';
        case 'text':
        case 'address':
            return 'pixelate';
        case 'sensitive_object':
            return 'replace_background';
        default:
            return 'blur';
    }
}
/**
 * Calculate default intensity based on content type and sensitivity
 */
export function calculateDefaultIntensity(contentType, confidence) {
    const baseIntensity = {
        face: 80,
        license_plate: 90,
        text: 60,
        address: 85,
        sensitive_object: 95,
        qr_code: 85,
        barcode: 70,
    };
    const base = baseIntensity[contentType] || 70;
    const adjustment = (confidence - 0.5) * 20;
    return Math.min(100, Math.max(0, Math.round(base + adjustment)));
}
//# sourceMappingURL=desensitization.js.map