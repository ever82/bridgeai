/**
 * Image Moderation Service
 * 图像安全审核服务
 */
import { ImageInput, ImageModerationResult, ViolationType, IVisionModelAdapter } from './vision/types';
interface ImageModerationServiceConfig {
    adapter: IVisionModelAdapter;
    safetyThreshold?: number;
    strictMode?: boolean;
}
export declare class ImageModerationService {
    private adapter;
    private config;
    private readonly thresholds;
    constructor(config: ImageModerationServiceConfig);
    /**
     * 审核单张图像
     */
    moderate(image: ImageInput, context?: {
        userId?: string;
        requestId?: string;
    }): Promise<ImageModerationResult>;
    /**
     * 批量审核图像
     */
    moderateBatch(images: ImageInput[], context?: {
        userId?: string;
        requestId?: string;
    }): Promise<ImageModerationResult[]>;
    /**
     * 快速安全检查（仅返回是否安全）
     */
    isSafe(image: ImageInput): Promise<boolean>;
    /**
     * 获取特定违规类型的风险评分
     */
    getViolationScore(image: ImageInput, violationType: ViolationType): Promise<number>;
    /**
     * 更新阈值配置
     */
    updateThresholds(thresholds: Partial<Record<ViolationType, number>>): void;
    /**
     * 构建审核提示
     */
    private buildModerationPrompt;
    /**
     * 解析审核响应
     */
    private parseModerationResponse;
    /**
     * 提取评分值
     */
    private extractScore;
    /**
     * 获取默认违规描述
     */
    private getDefaultViolationDescription;
    /**
     * 应用严格模式
     */
    private applyStrictMode;
    /**
     * 创建错误结果
     */
    private createErrorResult;
}
export {};
//# sourceMappingURL=imageModerationService.d.ts.map