/**
 * GPT-4 Vision Adapter
 * OpenAI GPT-4 Vision模型适配器
 */
import { ImageInput, VisionModelConfig } from '../../vision/types';
import { BaseVisionAdapter } from './base';
interface GPT4VisionConfig {
    apiKey: string;
    apiUrl?: string;
    organization?: string;
    timeoutMs?: number;
}
export declare class GPT4VisionAdapter extends BaseVisionAdapter {
    readonly id = "gpt-4-vision";
    readonly provider = "OpenAI";
    readonly supportsImages = true;
    private apiConfig;
    private baseUrl;
    constructor(apiConfig: GPT4VisionConfig, modelConfig?: Partial<VisionModelConfig>);
    initialize(): Promise<void>;
    healthCheck(): Promise<boolean>;
    analyzeImage(image: ImageInput, prompt: string, config?: Partial<VisionModelConfig>): Promise<string>;
    /**
     * 批量分析多张图像
     */
    analyzeMultipleImages(images: ImageInput[], prompt: string, config?: Partial<VisionModelConfig>): Promise<string>;
    /**
     * GPT-4 Vision不支持图像嵌入，使用文本描述生成嵌入
     */
    generateEmbedding(image: ImageInput, config?: Partial<VisionModelConfig>): Promise<number[]>;
    private makeRequest;
}
export {};
//# sourceMappingURL=gpt4Vision.d.ts.map