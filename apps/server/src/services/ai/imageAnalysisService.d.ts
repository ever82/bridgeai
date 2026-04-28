/**
 * Image Analysis Service
 * 图像内容分析服务
 */
import { ImageInput, ImageAnalysisResult, DetectedObject, VisualFeatures, IVisionModelAdapter, VisionRequestContext } from './vision/types';
interface ImageAnalysisServiceConfig {
    adapter: IVisionModelAdapter;
    defaultTimeoutMs?: number;
    maxRetries?: number;
}
export declare class ImageAnalysisService {
    private adapter;
    private config;
    constructor(config: ImageAnalysisServiceConfig);
    /**
     * 分析单张图像
     * 识别场景、物体、活动等
     */
    analyze(image: ImageInput, context?: Partial<VisionRequestContext>): Promise<ImageAnalysisResult>;
    /**
     * 批量分析多张图像
     */
    analyzeBatch(images: ImageInput[], context?: Partial<VisionRequestContext>): Promise<ImageAnalysisResult[]>;
    /**
     * 提取视觉特征
     */
    extractVisualFeatures(image: ImageInput): Promise<VisualFeatures>;
    /**
     * 检测图像中的物体
     */
    detectObjects(image: ImageInput): Promise<DetectedObject[]>;
    /**
     * 生成场景描述
     */
    generateDescription(image: ImageInput, options?: {
        maxLength?: number;
        detail?: 'brief' | 'normal' | 'detailed';
        language?: string;
    }): Promise<string>;
    /**
     * 提取活动标签
     */
    extractActivityTags(image: ImageInput): Promise<string[]>;
    /**
     * 构建分析提示
     */
    private buildAnalysisPrompt;
    /**
     * 解析分析响应
     */
    private parseAnalysisResponse;
    /**
     * 解析视觉特征
     */
    private parseVisualFeatures;
    /**
     * 解析检测到的物体
     */
    private parseDetectedObjects;
    /**
     * 解析活动标签
     */
    private parseActivityTags;
    /**
     * 规范化视觉特征
     */
    private normalizeVisualFeatures;
    /**
     * 计算置信度
     */
    private calculateConfidence;
    /**
     * 创建错误结果
     */
    private createErrorResult;
}
export {};
//# sourceMappingURL=imageAnalysisService.d.ts.map