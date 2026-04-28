/**
 * OCR Service
 * 光学字符识别服务
 */
import { ImageInput, OCRResult, BoundingBox, IVisionModelAdapter } from './vision/types';
interface OCRServiceConfig {
    adapter: IVisionModelAdapter;
    defaultLanguage?: string;
    supportHandwriting?: boolean;
    minConfidence?: number;
}
export declare class OCRService {
    private adapter;
    private config;
    private readonly supportedLanguages;
    constructor(config: OCRServiceConfig);
    /**
     * 提取图像中的文字
     */
    extractText(image: ImageInput, options?: {
        language?: string;
        detectHandwriting?: boolean;
        preserveLayout?: boolean;
    }): Promise<OCRResult>;
    /**
     * 批量提取文字
     */
    extractTextBatch(images: ImageInput[], options?: {
        language?: string;
        detectHandwriting?: boolean;
    }): Promise<OCRResult[]>;
    /**
     * 检测图像中的语言
     */
    detectLanguage(image: ImageInput): Promise<string[]>;
    /**
     * 提取特定区域的文字
     */
    extractTextInRegion(image: ImageInput, boundingBox: BoundingBox): Promise<OCRResult>;
    /**
     * 检查图像是否包含手写体
     */
    detectHandwriting(image: ImageInput): Promise<{
        hasHandwriting: boolean;
        confidence: number;
    }>;
    /**
     * 结构化数据提取（如发票、名片等）
     */
    extractStructuredData(image: ImageInput, schema: Record<string, string>): Promise<Record<string, string>>;
    /**
     * 构建OCR提示
     */
    private buildOCRPrompt;
    /**
     * 解析OCR响应
     */
    private parseOCRResponse;
    /**
     * 解析边界框
     */
    private parseBoundingBox;
    /**
     * 解析语言响应
     */
    private parseLanguageResponse;
    /**
     * 计算平均置信度
     */
    private calculateAverageConfidence;
    /**
     * 创建错误结果
     */
    private createErrorResult;
}
export {};
//# sourceMappingURL=ocrService.d.ts.map