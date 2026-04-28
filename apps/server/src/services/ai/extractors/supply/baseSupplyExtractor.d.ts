/**
 * Base Supply Extractor
 * 供给提取器基类 - 供给方(服务提供者)信息提取的通用实现
 */
import { SupplyExtractor, SupplyExtractedData, SupplySceneType, SupplyQualification, QualificationLevel, SupplyQualityMetrics } from './types';
/**
 * Base class for supply-specific extractors
 */
export declare abstract class BaseSupplyExtractor<T extends SupplyExtractedData> implements SupplyExtractor<T> {
    abstract getSceneType(): SupplySceneType;
    /** 场景检测关键词 */
    protected abstract readonly detectionKeywords: string[];
    /** 必填字段 */
    protected abstract readonly requiredFields: string[];
    /** 可选字段 */
    protected abstract readonly optionalFields: string[];
    /**
     * 从文本提取供给信息 - 子类必须实现
     */
    abstract extract(text: string, context?: Record<string, any>): Promise<T>;
    /**
     * 检查是否可以处理该文本
     */
    canHandle(text: string): Promise<{
        canHandle: boolean;
        confidence: number;
    }>;
    getRequiredFields(): string[];
    getOptionalFields(): string[];
    /**
     * 验证提取结果
     */
    validate(data: T): {
        valid: boolean;
        missingFields: string[];
    };
    /**
     * 生成澄清问题
     */
    generateClarificationQuestions(missingFields: string[]): string[];
    /**
     * 解析资质等级
     */
    protected parseQualificationLevel(text: string): QualificationLevel;
    /**
     * 解析经验年限
     */
    protected parseExperienceYears(text: string): number;
    /**
     * 构建资质信息
     */
    protected buildQualification(text: string, certifications: string[], specializations: string[]): SupplyQualification;
    /**
     * 计算质量指标
     */
    protected calculateQualityMetrics(extractedFields: number, totalFields: number, hasPricing: boolean, hasPortfolio: boolean): SupplyQualityMetrics;
    /**
     * 检查字段是否存在
     */
    protected hasField(obj: Record<string, any>, field: string): boolean;
    /**
     * 获取澄清问题 - 子类可覆盖
     */
    protected getClarificationQuestion(field: string): string;
    /**
     * 提取关键词
     */
    protected extractKeywords(text: string): string[];
    /**
     * 解析价格区间
     */
    protected parsePricing(text: string): {
        price: number;
        currency: string;
        unit?: string;
    } | undefined;
    /**
     * 解析位置信息
     */
    protected parseLocation(text: string): {
        city?: string;
        district?: string;
    };
}
//# sourceMappingURL=baseSupplyExtractor.d.ts.map