import { createHash } from 'crypto';
import sharp from 'sharp';
import { ImageModerationService } from '../ai/imageModerationService';
import { ClaudeVisionAdapter } from '../ai/adapters/vision/claudeVision';
import { GPT4VisionAdapter } from '../ai/adapters/vision/gpt4Vision';
export class ImageSecurityService {
    static instance;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rekognitionClient = undefined;
    visionAdapter = undefined;
    /**
     * Lazily create a Rekognition client from environment variables.
     * Returns null if required credentials are not configured.
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async getRekognitionClient() {
        if (this.rekognitionClient !== undefined && this.rekognitionClient !== null) {
            return this.rekognitionClient;
        }
        const accessKeyId = process.env.S3_ACCESS_KEY;
        const secretAccessKey = process.env.S3_SECRET_KEY;
        if (!accessKeyId || !secretAccessKey) {
            this.rekognitionClient = null;
            return null;
        }
        try {
            const { RekognitionClient } = await import('@aws-sdk/client-rekognition');
            const region = process.env.AWS_REGION || 'us-east-1';
            const endpoint = process.env.S3_ENDPOINT;
            this.rekognitionClient = new RekognitionClient({
                region,
                credentials: { accessKeyId, secretAccessKey },
                ...(endpoint && endpoint !== 'localhost' ? { endpoint: `https://${endpoint}` } : {}),
            });
            return this.rekognitionClient;
        }
        catch {
            this.rekognitionClient = null;
            return null;
        }
    }
    /**
     * Lazily create an ImageModerationService backed by a Vision adapter
     * (Claude Vision or GPT-4 Vision) from environment variables.
     * Returns null if no Vision API credentials are configured.
     *
     * Priority: ANTHROPIC_API_KEY (Claude Vision) > OPENAI_API_KEY (GPT-4 Vision)
     */
    async getVisionModerationService() {
        if (this.visionAdapter !== undefined && this.visionAdapter !== null) {
            return this.visionAdapter;
        }
        const anthropicKey = process.env.ANTHROPIC_API_KEY;
        const openaiKey = process.env.OPENAI_API_KEY;
        if (anthropicKey) {
            try {
                const adapter = new ClaudeVisionAdapter({ apiKey: anthropicKey });
                await adapter.initialize();
                this.visionAdapter = new ImageModerationService({ adapter });
                return this.visionAdapter;
            }
            catch {
                // fall through to OpenAI
            }
        }
        if (openaiKey) {
            try {
                const adapter = new GPT4VisionAdapter({ apiKey: openaiKey });
                await adapter.initialize();
                this.visionAdapter = new ImageModerationService({ adapter });
                return this.visionAdapter;
            }
            catch {
                // fall through to histogram fallback
            }
        }
        this.visionAdapter = null;
        return null;
    }
    static getInstance() {
        if (!ImageSecurityService.instance) {
            ImageSecurityService.instance = new ImageSecurityService();
        }
        return ImageSecurityService.instance;
    }
    /**
     * Perform comprehensive security check on an image
     */
    async checkImage(imageBuffer, options = {}) {
        const { checkSensitiveContent = true, checkFaces = true, checkQuality = true, maxFileSize = 50 * 1024 * 1024, // 50MB
        allowedFormats = ['jpeg', 'jpg', 'png', 'webp'], } = options;
        const violations = [];
        const warnings = [];
        // Check file size
        if (imageBuffer.length > maxFileSize) {
            violations.push(`File size exceeds ${maxFileSize / 1024 / 1024}MB limit`);
        }
        // Parse image metadata
        let metadata;
        try {
            metadata = await sharp(imageBuffer).metadata();
        }
        catch (error) {
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
        let sensitiveResult = {
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
            }
            else if (qualityResult.score < 70) {
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
     * Detect sensitive / policy-violating content using AWS Rekognition
     * Content Moderation (DetectModerationLabels).
     *
     * Falls back to Claude/GPT-4 Vision-powered ImageModerationService when
     * Rekognition is unavailable, and finally to basic sharp histogram analysis
     * as a last resort (degenerate-image-only detection).
     */
    async checkSensitiveContent(imageBuffer) {
        const client = await this.getRekognitionClient();
        // --- Tier 1: AWS Rekognition ---
        if (client) {
            try {
                const { DetectModerationLabelsCommand } = await import('@aws-sdk/client-rekognition');
                const command = new DetectModerationLabelsCommand({
                    Image: { Bytes: imageBuffer },
                    MinConfidence: 50,
                });
                const response = await client.send(command);
                const labels = response.ModerationLabels ?? [];
                const categories = [];
                let maxConfidence = 0;
                for (const label of labels) {
                    const name = label.Name ?? 'Unknown';
                    const parent = label.ParentName;
                    // Use parent category when available for a cleaner category name
                    const category = parent || name;
                    if (!categories.includes(category)) {
                        categories.push(category);
                    }
                    const conf = (label.Confidence ?? 0) / 100;
                    if (conf > maxConfidence) {
                        maxConfidence = conf;
                    }
                }
                return {
                    hasSensitiveContent: categories.length > 0,
                    categories,
                    confidence: maxConfidence,
                };
            }
            catch (error) {
                console.warn('[ImageSecurity] AWS Rekognition DetectModerationLabels failed, falling back to Vision moderation:', error instanceof Error ? error.message : error);
                // Fall through to Vision fallback
            }
        }
        // --- Tier 2: Claude / GPT-4 Vision via ImageModerationService ---
        const moderationService = await this.getVisionModerationService();
        if (moderationService) {
            try {
                const imageInput = {
                    type: 'base64',
                    data: imageBuffer.toString('base64'),
                    mimeType: 'image/jpeg',
                };
                const modResult = await moderationService.moderate(imageInput);
                if (!modResult.isSafe) {
                    return {
                        hasSensitiveContent: true,
                        categories: [modResult.violationType],
                        confidence: modResult.confidenceScore,
                    };
                }
                // Vision says safe — return early so we skip the degenerate-image fallback
                return {
                    hasSensitiveContent: false,
                    categories: [],
                    confidence: modResult.confidenceScore,
                };
            }
            catch (error) {
                console.warn('[ImageSecurity] Vision moderation failed, falling back to histogram analysis:', error instanceof Error ? error.message : error);
                // Fall through to histogram fallback
            }
        }
        // --- Tier 3 (last resort): basic sharp histogram analysis (degenerate images only) ---
        return this.checkSensitiveContentFallback(imageBuffer);
    }
    /**
     * Minimal sharp-based fallback that detects only degenerate images
     * (all-black or all-white). Used as the absolute last resort when neither
     * Rekognition nor Vision moderation is configured.
     */
    async checkSensitiveContentFallback(imageBuffer) {
        try {
            const stats = await sharp(imageBuffer).stats();
            const channels = stats.channels;
            if (!channels || channels.length === 0) {
                return { hasSensitiveContent: false, categories: [], confidence: 0 };
            }
            const categories = [];
            const isMostlyBlack = channels.every(ch => ch.mean < 10 && ch.max < 50);
            const isMostlyWhite = channels.every(ch => ch.mean > 245 && ch.min > 200);
            if (isMostlyBlack)
                categories.push('suspicious_dark');
            if (isMostlyWhite)
                categories.push('suspicious_bright');
            return {
                hasSensitiveContent: categories.length > 0,
                categories,
                confidence: categories.length > 0 ? 0.7 : 0,
            };
        }
        catch (error) {
            console.error('Sensitive content fallback check failed:', error);
            return { hasSensitiveContent: false, categories: [], confidence: 0 };
        }
    }
    /**
     * Detect faces in an image using AWS Rekognition DetectFaces API.
     *
     * Falls back to a no-op result when Rekognition is not configured or
     * the call fails, so callers always receive a valid response.
     *
     * @see ISSUE-VS003~c3 - "face detection and privacy detection" acceptance criteria
     */
    async detectFaces(imageBuffer) {
        const noFaceResult = { detected: false, count: 0, blurred: false };
        try {
            const client = await this.getRekognitionClient();
            if (!client) {
                return noFaceResult;
            }
            const { DetectFacesCommand } = await import('@aws-sdk/client-rekognition');
            const command = new DetectFacesCommand({
                Image: { Bytes: imageBuffer },
                Attributes: ['DEFAULT'],
            });
            const response = await client.send(command);
            const faceDetails = response.FaceDetails || [];
            const count = faceDetails.length;
            if (count === 0) {
                return noFaceResult;
            }
            // Consider a face "blurred" (low-quality / obscured) when Rekognition
            // reports confidence below 80. A low-confidence face typically indicates
            // the face region is blurry, partially occluded, or otherwise degraded.
            const BLUR_CONFIDENCE_THRESHOLD = 80;
            const hasBlurredFace = faceDetails.some(face => (face.Confidence ?? 0) < BLUR_CONFIDENCE_THRESHOLD);
            return {
                detected: true,
                count,
                blurred: hasBlurredFace,
            };
        }
        catch (error) {
            console.warn('[ImageSecurity] AWS Rekognition DetectFaces failed, falling back to no-op result:', error instanceof Error ? error.message : error);
            return noFaceResult;
        }
    }
    /**
     * Check image quality
     */
    async checkImageQuality(imageBuffer) {
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
            }
            else if (avgMean < 10) {
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
        }
        catch (error) {
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
    generateImageHash(imageBuffer) {
        return createHash('sha256').update(imageBuffer).digest('hex');
    }
    /**
     * Create thumbnail
     */
    async createThumbnail(imageBuffer, options = {}) {
        const { width = 200, height = 200, quality = 80 } = options;
        return sharp(imageBuffer)
            .resize(width, height, { fit: 'cover', position: 'center' })
            .jpeg({ quality })
            .toBuffer();
    }
    /**
     * Compress image for upload
     */
    async compressImage(imageBuffer, options = {}) {
        const { maxWidth = 1920, maxHeight = 1920, quality = 85, maxSize = 5 * 1024 * 1024 } = options;
        let processed = sharp(imageBuffer);
        const metadata = await processed.metadata();
        // Resize if too large
        if ((metadata.width && metadata.width > maxWidth) ||
            (metadata.height && metadata.height > maxHeight)) {
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
    async deIdentifyImage(imageBuffer, options = {}) {
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
    createFailedResult(violations) {
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
//# sourceMappingURL=imageSecurity.js.map