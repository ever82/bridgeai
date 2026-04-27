import { createHash } from 'crypto';

import sharp from 'sharp';

export interface ImageSecurityCheckResult {
  passed: boolean;
  violations: string[];
  warnings: string[];
  metadata: {
    width: number;
    height: number;
    format: string;
    size: number;
    hasTransparency: boolean;
  };
  faces: {
    detected: boolean;
    count: number;
    blurred: boolean;
  };
  quality: {
    score: number;
    blurDetected: boolean;
    overexposed: boolean;
    underexposed: boolean;
  };
}

export interface SensitiveContentResult {
  hasSensitiveContent: boolean;
  categories: string[];
  confidence: number;
}

export interface DeIdentificationResult {
  /** Whether de-identification processing was applied */
  processed: boolean;
  /** The de-identified image buffer */
  buffer: Buffer;
  /** Method used for de-identification */
  method: string;
  /** Whether any faces or PII regions were detected */
  regionsDetected: number;
}

export class ImageSecurityService {
  private static instance: ImageSecurityService;

  static getInstance(): ImageSecurityService {
    if (!ImageSecurityService.instance) {
      ImageSecurityService.instance = new ImageSecurityService();
    }
    return ImageSecurityService.instance;
  }

  /**
   * Perform comprehensive security check on an image
   */
  async checkImage(
    imageBuffer: Buffer,
    options: {
      checkSensitiveContent?: boolean;
      checkFaces?: boolean;
      checkQuality?: boolean;
      maxFileSize?: number;
      allowedFormats?: string[];
    } = {}
  ): Promise<ImageSecurityCheckResult> {
    const {
      checkSensitiveContent = true,
      checkFaces = true,
      checkQuality = true,
      maxFileSize = 50 * 1024 * 1024, // 50MB
      allowedFormats = ['jpeg', 'jpg', 'png', 'webp'],
    } = options;

    const violations: string[] = [];
    const warnings: string[] = [];

    // Check file size
    if (imageBuffer.length > maxFileSize) {
      violations.push(`File size exceeds ${maxFileSize / 1024 / 1024}MB limit`);
    }

    // Parse image metadata
    let metadata;
    try {
      metadata = await sharp(imageBuffer).metadata();
    } catch (error) {
      violations.push('Invalid image format');
      return this.createFailedResult(violations);
    }

    // Check format
    const format = metadata.format || '';
    if (!allowedFormats.includes(format.toLowerCase())) {
      violations.push(`Unsupported image format: ${format}`);
    }

    // Check image dimensions
    const width = metadata.width || 0;
    const height = metadata.height || 0;
    if (width < 100 || height < 100) {
      violations.push('Image dimensions too small (min 100x100)');
    }
    if (width > 10000 || height > 10000) {
      violations.push('Image dimensions too large (max 10000x10000)');
    }

    // Check for transparency (potential security concern)
    const hasTransparency = metadata.hasAlpha || false;
    if (hasTransparency && format !== 'png') {
      warnings.push('Image contains transparency in non-PNG format');
    }

    // Perform sensitive content check
    let sensitiveResult: SensitiveContentResult = {
      hasSensitiveContent: false,
      categories: [],
      confidence: 0,
    };
    if (checkSensitiveContent) {
      sensitiveResult = await this.checkSensitiveContent(imageBuffer);
      if (sensitiveResult.hasSensitiveContent) {
        violations.push(`Sensitive content detected: ${sensitiveResult.categories.join(', ')}`);
      }
    }

    // Perform face detection
    let faceResult = { detected: false, count: 0, blurred: false };
    if (checkFaces) {
      faceResult = await this.detectFaces(imageBuffer);
      if (faceResult.count > 0 && !faceResult.blurred) {
        warnings.push(`${faceResult.count} face(s) detected - ensure privacy compliance`);
      }
    }

    // Perform quality check
    let qualityResult = {
      score: 100,
      blurDetected: false,
      overexposed: false,
      underexposed: false,
    };
    if (checkQuality) {
      qualityResult = await this.checkImageQuality(imageBuffer);
      if (qualityResult.score < 50) {
        violations.push('Image quality too low');
      } else if (qualityResult.score < 70) {
        warnings.push('Image quality could be improved');
      }
    }

    return {
      passed: violations.length === 0,
      violations,
      warnings,
      metadata: {
        width,
        height,
        format,
        size: imageBuffer.length,
        hasTransparency,
      },
      faces: faceResult,
      quality: qualityResult,
    };
  }

  /**
   * Placeholder implementation for sensitive content identification.
   *
   * **This is NOT a content moderation system.** The current implementation
   * only performs basic histogram analysis to detect degenerate images
   * (nearly all-black or all-white). It does NOT detect explicit, violent,
   * or otherwise sensitive imagery.
   *
   * **Known limitations:**
   * - Cannot detect nudity, violence, or other policy-violating content.
   * - Only flags suspiciously uniform images via pixel intensity stats.
   * - Confidence score (0.7) is a fixed heuristic, not model-derived.
   *
   * **Future work:** Integrate with a professional content moderation API
   * such as AWS Rekognition Moderation, Google Cloud Vision Safe Search,
   * or Azure Content Moderator to perform real content classification.
   *
   * @see ISSUE-VS003~c3 - "sensitive content identification" acceptance criteria
   */
  private async checkSensitiveContent(imageBuffer: Buffer): Promise<SensitiveContentResult> {
    const categories: string[] = [];

    try {
      const stats = await sharp(imageBuffer).stats();
      const channels = stats.channels;

      if (!channels || channels.length === 0) {
        return {
          hasSensitiveContent: false,
          categories: [],
          confidence: 0,
        };
      }

      // Basic histogram analysis — detects only degenerate (uniform) images.
      // This does NOT constitute real content moderation.
      const isMostlyBlack = channels.every(ch => ch.mean < 10 && ch.max < 50);
      const isMostlyWhite = channels.every(ch => ch.mean > 245 && ch.min > 200);

      if (isMostlyBlack) categories.push('suspicious_dark');
      if (isMostlyWhite) categories.push('suspicious_bright');

      return {
        hasSensitiveContent: categories.length > 0,
        categories,
        confidence: categories.length > 0 ? 0.7 : 0,
      };
    } catch (error) {
      console.error('Sensitive content check failed:', error);
      return {
        hasSensitiveContent: false,
        categories: [],
        confidence: 0,
      };
    }
  }

  /**
   * Placeholder implementation for face detection and privacy protection.
   *
   * **This is NOT a face detection system.** The current implementation
   * always returns a no-op result (detected: false, count: 0, blurred: false)
   * and performs no actual face analysis on the image.
   *
   * **Known limitations:**
   * - Cannot detect faces in images.
   * - Cannot determine whether detected faces are blurred for privacy.
   * - The return value is hardcoded and provides zero informational value.
   * - Callers relying on this for privacy compliance are NOT protected.
   *
   * **Future work:** Integrate with a professional face detection API such as:
   * - AWS Rekognition (DetectFaces / DetectProtectiveEquipment)
   * - Google Cloud Vision Face Detection
   * - Azure Face API
   * The integration should return actual face bounding boxes, landmarks,
   * blur/confidence scores, and optionally auto-blur faces for privacy.
   *
   * @see ISSUE-VS003~c3 - "face detection and privacy detection" acceptance criteria
   */
  private async detectFaces(
    _imageBuffer: Buffer
  ): Promise<{ detected: boolean; count: number; blurred: boolean }> {
    return {
      detected: false,
      count: 0,
      blurred: false,
    };
  }

  /**
   * Check image quality
   */
  private async checkImageQuality(imageBuffer: Buffer): Promise<{
    score: number;
    blurDetected: boolean;
    overexposed: boolean;
    underexposed: boolean;
  }> {
    try {
      const stats = await sharp(imageBuffer).stats();
      const channels = stats.channels;

      let score = 100;
      let blurDetected = false;
      let overexposed = false;
      let underexposed = false;

      // Check for blur (low contrast using max-min range as proxy for std dev)
      const avgRange = channels.reduce((sum, ch) => sum + (ch.max - ch.min), 0) / channels.length;
      if (avgRange < 40) {
        blurDetected = true;
        score -= 30;
      }

      // Check exposure
      const avgMean = channels.reduce((sum, ch) => sum + ch.mean, 0) / channels.length;
      if (avgMean > 250) {
        overexposed = true;
        score -= 25;
      } else if (avgMean < 10) {
        underexposed = true;
        score -= 25;
      }

      // Check detail/complexity (low range suggests flat/uniform image)
      const hasDetail = channels.every(ch => ch.max - ch.min > 10);
      if (!hasDetail) {
        score -= 20;
      }

      return {
        score: Math.max(0, score),
        blurDetected,
        overexposed,
        underexposed,
      };
    } catch (error) {
      console.error('Quality check failed:', error);
      return {
        score: 0,
        blurDetected: true,
        overexposed: false,
        underexposed: false,
      };
    }
  }

  /**
   * Generate image hash for deduplication
   */
  generateImageHash(imageBuffer: Buffer): string {
    return createHash('sha256').update(imageBuffer).digest('hex');
  }

  /**
   * Create thumbnail
   */
  async createThumbnail(
    imageBuffer: Buffer,
    options: { width?: number; height?: number; quality?: number } = {}
  ): Promise<Buffer> {
    const { width = 200, height = 200, quality = 80 } = options;

    return sharp(imageBuffer)
      .resize(width, height, { fit: 'cover', position: 'center' })
      .jpeg({ quality })
      .toBuffer();
  }

  /**
   * Compress image for upload
   */
  async compressImage(
    imageBuffer: Buffer,
    options: { maxWidth?: number; maxHeight?: number; quality?: number; maxSize?: number } = {}
  ): Promise<Buffer> {
    const { maxWidth = 1920, maxHeight = 1920, quality = 85, maxSize = 5 * 1024 * 1024 } = options;

    let processed = sharp(imageBuffer);
    const metadata = await processed.metadata();

    // Resize if too large
    if (
      (metadata.width && metadata.width > maxWidth) ||
      (metadata.height && metadata.height > maxHeight)
    ) {
      processed = processed.resize(maxWidth, maxHeight, {
        fit: 'inside',
        withoutEnlargement: true,
      });
    }

    // Compress
    let output = await processed.jpeg({ quality, progressive: true }).toBuffer();

    // Further reduce quality if still too large
    let currentQuality = quality;
    while (output.length > maxSize && currentQuality > 50) {
      currentQuality -= 10;
      output = await processed.jpeg({ quality: currentQuality, progressive: true }).toBuffer();
    }

    return output;
  }

  /**
   * Perform privacy de-identification on an image.
   *
   * Applies image-level blurring as a baseline privacy protection measure.
   *
   * **Current implementation: full-image Gaussian blur.** This is a
   * conservative approach that treats the entire image as potentially
   * identifying, which is suitable for cases where face/region detection
   * is unavailable or unreliable.
   *
   * **Known limitations:**
   * - Applies blur to the entire image rather than specific face/PPI regions.
   * - Does not perform actual face detection to localise blur.
   * - The `regionsDetected` count is always 0 (no region-based detection).
   *
   * **Future work:** Integrate a face detection library or cloud API
   * (AWS Rekognition, Google Cloud Vision, Azure Face API) to perform
   * region-based blurring — only blurring detected faces / PII rather
   * than the whole image.
   *
   * @param imageBuffer - Original image buffer
   * @param options.blurRadius - Gaussian blur sigma (default 5)
   * @see AC AS-VS-002-AC-3 - "privacy de-identification and upload"
   */
  async deIdentifyImage(
    imageBuffer: Buffer,
    options: { blurRadius?: number } = {}
  ): Promise<DeIdentificationResult> {
    const { blurRadius = 5 } = options;

    const processedBuffer = await sharp(imageBuffer)
      .blur(blurRadius)
      .jpeg({ quality: 85 })
      .toBuffer();

    return {
      processed: true,
      buffer: processedBuffer,
      method: 'full_image_gaussian_blur',
      regionsDetected: 0,
    };
  }

  private createFailedResult(violations: string[]): ImageSecurityCheckResult {
    return {
      passed: false,
      violations,
      warnings: [],
      metadata: { width: 0, height: 0, format: '', size: 0, hasTransparency: false },
      faces: { detected: false, count: 0, blurred: false },
      quality: { score: 0, blurDetected: true, overexposed: false, underexposed: false },
    };
  }
}

export default ImageSecurityService.getInstance();
