/**
 * Vision Analysis Service
 * Provides comprehensive image analysis using AI vision APIs
 */
import { VisionAnalysisResult, SensitiveType } from './sensitiveContentDetection';
import { IVisionModelAdapter } from './vision/types';
export interface VisionAnalysisOptions {
    detectSensitiveContent: boolean;
    detectObjects: boolean;
    detectScenes: boolean;
    detectText: boolean;
    minConfidence: number;
}
export interface SceneAnalysis {
    scene: string;
    confidence: number;
    attributes: string[];
}
export interface ObjectAnalysis {
    label: string;
    boundingBox: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
    confidence: number;
}
export interface TextAnalysis {
    text: string;
    boundingBox: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
    confidence: number;
}
export interface ComprehensiveVisionResult {
    sensitiveContent: VisionAnalysisResult;
    sceneAnalysis: SceneAnalysis | null;
    objects: ObjectAnalysis[];
    text: TextAnalysis[];
    recommendations: DesensitizationRecommendation[];
}
export interface DesensitizationRecommendation {
    type: SensitiveType;
    priority: 'low' | 'medium' | 'high';
    reason: string;
    suggestedMethod: 'blur' | 'mosaic' | 'pixelate' | 'replace_background';
    suggestedIntensity: number;
}
/**
 * Perform comprehensive vision analysis on an image
 */
export declare function analyzeImage(imageBuffer: Buffer, options?: VisionAnalysisOptions, adapter?: IVisionModelAdapter): Promise<ComprehensiveVisionResult>;
/**
 * Batch analyze multiple images
 */
export declare function batchAnalyzeImages(imageBuffers: Buffer[], options?: VisionAnalysisOptions, adapter?: IVisionModelAdapter): Promise<ComprehensiveVisionResult[]>;
/**
 * Get analysis statistics for a batch of images
 */
export declare function getBatchStatistics(results: ComprehensiveVisionResult[]): {
    totalImages: number;
    imagesWithSensitiveContent: number;
    totalDetections: number;
    avgProcessingTime: number;
    detectionTypeCounts: {
        [k: string]: number;
    };
    sensitiveContentPercentage: number;
};
//# sourceMappingURL=visionAnalysis.d.ts.map