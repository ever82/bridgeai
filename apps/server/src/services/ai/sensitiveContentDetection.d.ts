/**
 * AI Sensitive Content Detection Service
 * Uses vision AI models for real detection of faces, license plates, text/addresses, etc.
 * Includes error handling, timeout, and graceful degradation.
 */
export interface BoundingBox {
    x: number;
    y: number;
    width: number;
    height: number;
}
export interface DetectionResult {
    type: SensitiveType;
    boundingBox: BoundingBox;
    confidence: number;
    metadata?: Record<string, unknown>;
}
export type SensitiveType = 'face' | 'license_plate' | 'text' | 'address' | 'sensitive_object' | 'qr_code' | 'barcode';
export interface DetectionOptions {
    types: SensitiveType[];
    minConfidence: number;
    maxResults?: number;
    timeoutMs?: number;
}
export interface VisionAnalysisResult {
    detections: DetectionResult[];
    imageWidth: number;
    imageHeight: number;
    processingTime: number;
    exifStripped: boolean;
    hadGpsData: boolean;
}
/**
 * Detect sensitive content in an image using AI vision analysis.
 * Includes timeout, retry (max 1 retry), and graceful degradation.
 */
export declare function detectSensitiveContent(imageBuffer: Buffer, options?: DetectionOptions): Promise<VisionAnalysisResult>;
/**
 * Strip EXIF data from image and return cleaned buffer
 */
export declare function stripExifFromImage(imageBuffer: Buffer): Promise<{
    cleanedBuffer: Buffer;
    exifData: Record<string, unknown> | null;
    hadGpsData: boolean;
}>;
/**
 * Calculate overall privacy risk score based on detections
 */
export declare function calculatePrivacyRisk(detections: DetectionResult[]): number;
/**
 * Get risk level based on score
 */
export declare function getRiskLevel(score: number): 'low' | 'medium' | 'high' | 'critical';
//# sourceMappingURL=sensitiveContentDetection.d.ts.map