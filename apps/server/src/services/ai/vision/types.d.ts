/**
 * Vision Service Types
 * 图像分析与Vision API的类型定义
 */
export type ImageInputType = 'url' | 'base64';
export interface ImageInput {
    type: ImageInputType;
    data: string;
    mimeType?: string;
}
export interface BoundingBox {
    x: number;
    y: number;
    width: number;
    height: number;
}
export interface DetectedObject {
    label: string;
    confidence: number;
    boundingBox?: BoundingBox;
}
export interface VisualFeatures {
    dominantColors: string[];
    brightness: number;
    contrast: number;
    sharpness: number;
    hasFaces: boolean;
    faceCount?: number;
}
export interface ImageAnalysisResult {
    sceneDescription: string;
    detectedObjects: DetectedObject[];
    activityTags: string[];
    visualFeatures: VisualFeatures;
    confidence: number;
    processingTimeMs: number;
}
export type ViolationType = 'none' | 'nsfw' | 'violence' | 'gore' | 'hate' | 'harassment' | 'self_harm' | 'illegal' | 'privacy' | 'spam';
export interface ImageModerationResult {
    isSafe: boolean;
    violationType: ViolationType;
    violationDetails?: string;
    confidenceScore: number;
    categoryScores: {
        nsfw: number;
        violence: number;
        gore: number;
        hate: number;
        harassment: number;
        selfHarm: number;
        illegal: number;
        privacy: number;
        spam: number;
    };
    processingTimeMs: number;
}
export interface TextBlock {
    text: string;
    language: string;
    confidence: number;
    boundingBox: BoundingBox;
}
export interface OCRResult {
    extractedText: string;
    language: string;
    detectedLanguages: string[];
    textBlocks: TextBlock[];
    isHandwritten: boolean;
    confidence: number;
    processingTimeMs: number;
}
export interface ImageEmbedding {
    embedding: number[];
    dimension: number;
    model: string;
}
export interface ImageSearchResult {
    imageId: string;
    url: string;
    similarity: number;
    metadata?: Record<string, unknown>;
}
export interface SemanticTags {
    tags: string[];
    categories: string[];
    attributes: Record<string, string[]>;
}
export interface VisionModelConfig {
    provider: 'openai' | 'claude' | 'other';
    model: string;
    maxTokens?: number;
    temperature?: number;
    timeoutMs?: number;
}
export interface VisionRequestContext {
    requestId: string;
    userId?: string;
    timestamp: Date;
    source: string;
}
export interface IVisionModelAdapter {
    readonly id: string;
    readonly provider: string;
    readonly supportsImages: boolean;
    initialize(): Promise<void>;
    healthCheck(): Promise<boolean>;
    analyzeImage(image: ImageInput, prompt: string, config?: Partial<VisionModelConfig>): Promise<string>;
    generateEmbedding?(image: ImageInput, config?: Partial<VisionModelConfig>): Promise<number[]>;
}
export interface BatchProcessingOptions {
    maxConcurrent: number;
    timeoutPerImageMs: number;
    retryCount: number;
    cacheResults: boolean;
}
export interface BatchAnalysisResult<T> {
    results: (T | null)[];
    errors: Array<{
        index: number;
        error: string;
    }>;
    totalProcessed: number;
    totalFailed: number;
    processingTimeMs: number;
}
export interface VisionCacheConfig {
    enabled: boolean;
    ttlSeconds: number;
    maxSize: number;
    keyPrefix: string;
}
//# sourceMappingURL=types.d.ts.map