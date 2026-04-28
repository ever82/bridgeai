/**
 * Supply Extraction Service
 * 供给智能提炼服务 - 核心解析引擎
 *
 * 功能：
 * - 服务描述理解
 * - 供给实体识别
 * - 服务类型分类
 * - 供给结构化输出
 * - 能力评估评分
 */
import { LLMService } from './llmService';
import { LLMProvider } from './types';
export interface Supply {
    id?: string;
    agentId?: string;
    title: string;
    description: string;
    serviceType: string;
    capabilities: Capability[];
    pricing: PricingInfo;
    skills: string[];
    availability?: AvailabilityInfo;
    location?: LocationInfo;
    experience?: ExperienceInfo;
    quality: QualityMetrics;
    metadata?: Record<string, unknown>;
}
export interface Capability {
    name: string;
    description: string;
    level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
    category: string;
    keywords: string[];
}
export interface PricingInfo {
    type: 'hourly' | 'fixed' | 'range' | 'negotiable';
    minRate?: number;
    maxRate?: number;
    currency: string;
    unit?: string;
    description?: string;
}
export interface AvailabilityInfo {
    schedule: string;
    timezone?: string;
    responseTime?: string;
    leadTime?: string;
}
export interface LocationInfo {
    city?: string;
    country?: string;
    remote: boolean;
    onsite: boolean;
    hybrid: boolean;
    timezone?: string;
}
export interface ExperienceInfo {
    years?: number;
    totalProjects?: number;
    relevantProjects?: number;
    certifications?: string[];
    portfolio?: string[];
}
export interface QualityMetrics {
    overallScore: number;
    completenessScore: number;
    clarityScore: number;
    relevanceScore: number;
    confidence: number;
}
export interface SupplyExtractionRequest {
    text: string;
    scene: string;
    agentId?: string;
    userId?: string;
    language?: string;
    options?: ExtractionOptions;
}
export interface ExtractionOptions {
    includeCapabilities?: boolean;
    includePricing?: boolean;
    includeAvailability?: boolean;
    includeLocation?: boolean;
    includeExperience?: boolean;
    minConfidence?: number;
}
export interface SupplyExtractionResult {
    success: boolean;
    supply: Supply;
    fieldsExtracted: string[];
    fieldsFailed: string[];
    provider: LLMProvider;
    model: string;
    latencyMs: number;
}
export interface BulkSupplyExtractionRequest {
    items: SupplyExtractionRequest[];
    options?: ExtractionOptions;
}
export interface BulkSupplyExtractionResult {
    success: boolean;
    results: SupplyExtractionResult[];
    failed: number;
    total: number;
    qualityReport: QualityReport;
}
export interface QualityReport {
    overallQuality: number;
    averageConfidence: number;
    averageCompleteness: number;
    extractionRate: number;
    issues: QualityIssue[];
    recommendations: string[];
}
export interface QualityIssue {
    type: 'missing_field' | 'low_confidence' | 'ambiguous' | 'inconsistent';
    field?: string;
    message: string;
    severity: 'low' | 'medium' | 'high';
}
/**
 * Supply Extraction Service 类
 * 供给智能提炼服务的核心解析引擎
 */
export declare class SupplyExtractionService {
    private llmService;
    constructor(llmService?: LLMService);
    /**
     * 初始化服务
     */
    initialize(): Promise<void>;
    /**
     * 从自然语言文本中提取供给信息
     */
    extract(request: SupplyExtractionRequest): Promise<SupplyExtractionResult>;
    /**
     * 批量提取供给信息
     */
    extractBulk(request: BulkSupplyExtractionRequest): Promise<BulkSupplyExtractionResult>;
    /**
     * 构建提取提示词
     */
    private buildExtractionPrompt;
    /**
     * 解析提取结果
     */
    private parseExtractionResult;
    /**
     * 评估提取质量
     */
    private evaluateQuality;
    /**
     * 构建供给对象
     */
    private buildSupplyObject;
    /**
     * 获取已提取的字段
     */
    private getExtractedFields;
    /**
     * 获取失败的字段
     */
    private getFailedFields;
    /**
     * 生成质量报告
     */
    private generateQualityReport;
    /**
     * Build scene-specific metadata from extraction results
     */
    private buildSceneMetadata;
    /**
     * 将 camelCase 转换为 snake_case
     */
    private toSnakeCase;
    /**
     * 获取置信度级别
     */
    getConfidenceLevel(confidence: number): 'high' | 'medium' | 'low';
    /**
     * 获取质量等级
     */
    getQualityGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F';
}
export declare const supplyExtractionService: SupplyExtractionService;
//# sourceMappingURL=supplyExtractionService.d.ts.map