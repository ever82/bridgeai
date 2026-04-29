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
export declare class ImageSecurityService {
    private static instance;
    private rekognitionClient;
    private visionAdapter;
    /**
     * Lazily create a Rekognition client from environment variables.
     * Returns null if required credentials are not configured.
     */
    private getRekognitionClient;
    /**
     * Lazily create an ImageModerationService backed by a Vision adapter
     * (Claude Vision or GPT-4 Vision) from environment variables.
     * Returns null if no Vision API credentials are configured.
     *
     * Priority: ANTHROPIC_API_KEY (Claude Vision) > OPENAI_API_KEY (GPT-4 Vision)
     */
    private getVisionModerationService;
    static getInstance(): ImageSecurityService;
    /**
     * Perform comprehensive security check on an image
     */
    checkImage(imageBuffer: Buffer, options?: {
        checkSensitiveContent?: boolean;
        checkFaces?: boolean;
        checkQuality?: boolean;
        maxFileSize?: number;
        allowedFormats?: string[];
    }): Promise<ImageSecurityCheckResult>;
    /**
     * Detect sensitive / policy-violating content using AWS Rekognition
     * Content Moderation (DetectModerationLabels).
     *
     * Falls back to Claude/GPT-4 Vision-powered ImageModerationService when
     * Rekognition is unavailable, and finally to basic sharp histogram analysis
     * as a last resort (degenerate-image-only detection).
     */
    private checkSensitiveContent;
    /**
     * Minimal sharp-based fallback that detects only degenerate images
     * (all-black or all-white). Used as the absolute last resort when neither
     * Rekognition nor Vision moderation is configured.
     */
    private checkSensitiveContentFallback;
    /**
     * Detect faces in an image using AWS Rekognition DetectFaces API.
     *
     * Falls back to a no-op result when Rekognition is not configured or
     * the call fails, so callers always receive a valid response.
     *
     * @see ISSUE-VS003~c3 - "face detection and privacy detection" acceptance criteria
     */
    private detectFaces;
    /**
     * Check image quality
     */
    private checkImageQuality;
    /**
     * Generate image hash for deduplication
     */
    generateImageHash(imageBuffer: Buffer): string;
    /**
     * Create thumbnail
     */
    createThumbnail(imageBuffer: Buffer, options?: {
        width?: number;
        height?: number;
        quality?: number;
    }): Promise<Buffer>;
    /**
     * Compress image for upload
     */
    compressImage(imageBuffer: Buffer, options?: {
        maxWidth?: number;
        maxHeight?: number;
        quality?: number;
        maxSize?: number;
    }): Promise<Buffer>;
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
    deIdentifyImage(imageBuffer: Buffer, options?: {
        blurRadius?: number;
    }): Promise<DeIdentificationResult>;
    private createFailedResult;
}
declare const _default: ImageSecurityService;
export default _default;
//# sourceMappingURL=imageSecurity.d.ts.map