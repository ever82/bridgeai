/**
 * Vision Service Types
 * 图像分析与Vision API的类型定义
 */

// 图像输入类型
export type ImageInputType = 'url' | 'base64';

// 图像输入
export interface ImageInput {
  type: ImageInputType;
  data: string; // URL or base64 string
  mimeType?: string;
}

// 边界框（用于OCR定位）
export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

// 检测到的物体
export interface DetectedObject {
  label: string;
  confidence: number;
  boundingBox?: BoundingBox;
}

// 视觉特征
export interface VisualFeatures {
  dominantColors: string[];
  brightness: number; // 0-100
  contrast: number; // 0-100
  sharpness: number; // 0-100
  hasFaces: boolean;
  faceCount?: number;
}

// 图像分析结果
export interface ImageAnalysisResult {
  sceneDescription: string;
  detectedObjects: DetectedObject[];
  activityTags: string[];
  visualFeatures: VisualFeatures;
  confidence: number;
  processingTimeMs: number;
}

// 审核违规类型
export type ViolationType =
  | 'none'
  | 'nsfw'
  | 'violence'
  | 'gore'
  | 'hate'
  | 'harassment'
  | 'self_harm'
  | 'illegal'
  | 'privacy'
  | 'spam';

// 图像审核结果
export interface ImageModerationResult {
  isSafe: boolean;
  violationType: ViolationType;
  violationDetails?: string;
  confidenceScore: number; // 0-1
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

// OCR文本块
export interface TextBlock {
  text: string;
  language: string;
  confidence: number;
  boundingBox: BoundingBox;
}

// OCR结果
export interface OCRResult {
  extractedText: string;
  language: string;
  detectedLanguages: string[];
  textBlocks: TextBlock[];
  isHandwritten: boolean;
  confidence: number;
  processingTimeMs: number;
}

// 图像嵌入向量
export interface ImageEmbedding {
  embedding: number[];
  dimension: number;
  model: string;
}

// 搜索结果
export interface ImageSearchResult {
  imageId: string;
  url: string;
  similarity: number;
  metadata?: Record<string, unknown>;
}

// 语义标签
export interface SemanticTags {
  tags: string[];
  categories: string[];
  attributes: Record<string, string[]>;
}

// Vision模型配置
export interface VisionModelConfig {
  provider: 'openai' | 'claude' | 'other';
  model: string;
  maxTokens?: number;
  temperature?: number;
  timeoutMs?: number;
}

// Vision请求上下文
export interface VisionRequestContext {
  requestId: string;
  userId?: string;
  timestamp: Date;
  source: string;
}

// Vision模型适配器接口
export interface IVisionModelAdapter {
  readonly id: string;
  readonly provider: string;
  readonly supportsImages: boolean;

  initialize(): Promise<void>;
  healthCheck(): Promise<boolean>;

  analyzeImage(
    image: ImageInput,
    prompt: string,
    config?: Partial<VisionModelConfig>
  ): Promise<string>;

  generateEmbedding?(
    image: ImageInput,
    config?: Partial<VisionModelConfig>
  ): Promise<number[]>;
}

// 批量处理选项
export interface BatchProcessingOptions {
  maxConcurrent: number;
  timeoutPerImageMs: number;
  retryCount: number;
  cacheResults: boolean;
}

// 批量分析结果
export interface BatchAnalysisResult<T> {
  results: (T | null)[];
  errors: Array<{ index: number; error: string }>;
  totalProcessed: number;
  totalFailed: number;
  processingTimeMs: number;
}

// 缓存配置
export interface VisionCacheConfig {
  enabled: boolean;
  ttlSeconds: number;
  maxSize: number;
  keyPrefix: string;
}
