/**
 * Base Vision Adapter
 * 多模态视觉模型适配器基类
 */
import { IVisionModelAdapter, ImageInput, VisionModelConfig } from '../../vision/types';
/**
 * 抽象基础视觉适配器类
 */
export declare abstract class BaseVisionAdapter implements IVisionModelAdapter {
    abstract readonly id: string;
    abstract readonly provider: string;
    abstract readonly supportsImages: boolean;
    protected initialized: boolean;
    protected config: VisionModelConfig;
    constructor(config?: Partial<VisionModelConfig>);
    initialize(): Promise<void>;
    healthCheck(): Promise<boolean>;
    abstract analyzeImage(image: ImageInput, prompt: string, config?: Partial<VisionModelConfig>): Promise<string>;
    abstract generateEmbedding?(image: ImageInput, config?: Partial<VisionModelConfig>): Promise<number[]>;
    /**
     * 将图像输入转换为API格式
     */
    protected formatImageForAPI(image: ImageInput): {
        type: string;
        [key: string]: unknown;
    };
    /**
     * 验证图像输入
     */
    protected validateImageInput(image: ImageInput): void;
    /**
     * 生成请求ID
     */
    protected generateRequestId(): string;
    /**
     * 估算token数量
     */
    protected estimateTokens(text: string): number;
}
//# sourceMappingURL=base.d.ts.map