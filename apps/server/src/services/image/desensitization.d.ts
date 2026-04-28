/**
 * Image Desensitization Service
 * Provides various desensitization algorithms: blur, mosaic, pixelate, background replacement
 * Uses Sharp for actual image manipulation
 */
import { DetectionResult, BoundingBox } from '../ai/sensitiveContentDetection';
export type DesensitizationMethod = 'blur' | 'mosaic' | 'pixelate' | 'replace_background' | 'feather';
export interface DesensitizationOptions {
    method: DesensitizationMethod;
    intensity: number;
    featherEdges?: boolean;
    featherRadius?: number;
}
export interface DesensitizationRegion {
    boundingBox: BoundingBox;
    method: DesensitizationMethod;
    intensity: number;
}
export interface DesensitizationResult {
    processedImageBuffer: Buffer;
    appliedRegions: DesensitizationRegion[];
    processingTime: number;
}
export interface ProcessingStep {
    step: string;
    duration: number;
    details?: Record<string, unknown>;
}
export interface DetailedDesensitizationResult extends DesensitizationResult {
    steps: ProcessingStep[];
    originalSize: number;
    processedSize: number;
}
/**
 * Apply desensitization to an image based on detection results
 */
export declare function desensitizeImage(imageBuffer: Buffer, detections: DetectionResult[], options?: DesensitizationOptions): Promise<DesensitizationResult>;
/**
 * Apply multiple desensitization effects to an image
 */
export declare function applyMultiStageDesensitization(imageBuffer: Buffer, regions: Array<{
    detection: DetectionResult;
    method: DesensitizationMethod;
    intensity: number;
}>): Promise<DetailedDesensitizationResult>;
/**
 * Preview desensitization effect by applying at lower quality
 */
export declare function previewDesensitization(imageBuffer: Buffer, boundingBox: BoundingBox, method: DesensitizationMethod, intensity: number): Promise<Buffer>;
/**
 * Batch desensitize multiple images
 */
export declare function batchDesensitize(images: Array<{
    buffer: Buffer;
    detections: DetectionResult[];
}>, options: DesensitizationOptions): Promise<DesensitizationResult[]>;
/**
 * Get recommended desensitization method based on content type
 */
export declare function getRecommendedMethod(contentType: string): DesensitizationMethod;
/**
 * Calculate default intensity based on content type and sensitivity
 */
export declare function calculateDefaultIntensity(contentType: string, confidence: number): number;
//# sourceMappingURL=desensitization.d.ts.map