/**
 * VisionShare Publish Validation Service
 * 发布验证服务，负责检查用户发布权限和内容合规性
 */
import type { PublishValidationResult } from '@bridgeai/shared/types/visionShare';
interface ValidationOptions {
    userId: string;
    budgetAmount: number;
    budgetType: 'POINTS' | 'CASH';
    description?: string;
    latitude?: number;
    longitude?: number;
}
/**
 * 发布验证服务
 */
export declare class PublishValidationService {
    private readonly logger;
    private readonly MIN_CREDIT_SCORE;
    private readonly DAILY_PUBLISH_LIMIT;
    private readonly MAX_LOCATION_OFFSET;
    /**
     * 执行完整的发布验证
     */
    validate(options: ValidationOptions): Promise<PublishValidationResult>;
    /**
     * 检查用户信用分
     */
    private checkCreditScore;
    /**
     * 检查用户积分/余额
     */
    private checkBalance;
    /**
     * 检查每日发布限制
     */
    private checkDailyLimit;
    /**
     * 内容安全检查
     */
    private checkContent;
    /**
     * 地理位置合理性检查
     */
    private checkLocation;
    /**
     * 快速验证（仅检查关键项）
     */
    quickValidate(userId: string): Promise<boolean>;
    /**
     * 获取用户发布限制信息
     */
    getPublishLimits(userId: string): Promise<{
        dailyLimit: number;
        dailyUsed: number;
        dailyRemaining: number;
        canPublish: boolean;
    }>;
}
export declare const publishValidationService: PublishValidationService;
export {};
//# sourceMappingURL=publishValidation.d.ts.map