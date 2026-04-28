/**
 * Claude Vision Adapter
 * Anthropic Claude Vision模型适配器
 */
import { ImageInput, VisionModelConfig } from '../../vision/types';
import { BaseVisionAdapter } from './base';
interface ClaudeVisionConfig {
    apiKey: string;
    apiUrl?: string;
    timeoutMs?: number;
}
export declare class ClaudeVisionAdapter extends BaseVisionAdapter {
    readonly id = "claude-vision";
    readonly provider = "Anthropic";
    readonly supportsImages = true;
    private apiConfig;
    private baseUrl;
    constructor(apiConfig: ClaudeVisionConfig, modelConfig?: Partial<VisionModelConfig>);
    initialize(): Promise<void>;
    healthCheck(): Promise<boolean>;
    analyzeImage(image: ImageInput, prompt: string, config?: Partial<VisionModelConfig>): Promise<string>;
    /**
     * 批量分析多张图像
     */
    analyzeMultipleImages(images: ImageInput[], prompt: string, config?: Partial<VisionModelConfig>): Promise<string>;
    /**
     * Claude不支持直接的图像嵌入，使用图像描述调用OpenAI嵌入API生成文本嵌入
     */
    generateEmbedding(image: ImageInput, _config?: Partial<VisionModelConfig>): Promise<number[]>;
    /**
     * 将图像输入转换为Claude API格式
     */
    private formatImageForClaude;
    private makeRequest;
}
export {};
//# sourceMappingURL=claudeVision.d.ts.map