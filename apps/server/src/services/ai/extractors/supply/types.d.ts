/**
 * Supply Scene Extractor Types
 * 供给场景提取器类型定义 - 供给方(服务提供者)的信息提取
 */
/**
 * Supply Scene Types
 * 供给场景类型
 */
export type SupplySceneType = 'visionshare' | 'agentjob' | 'agentad' | 'unknown';
/**
 * Supply Qualification Level
 * 供给方资质等级
 */
export type QualificationLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert' | 'master';
/**
 * Supply Quality Metrics
 * 供给质量指标
 */
export interface SupplyQualityMetrics {
    completeness: number;
    credibility: number;
    competitiveness: number;
}
/**
 * Supply Qualification
 * 供给方资质
 */
export interface SupplyQualification {
    certifications: string[];
    experienceYears?: number;
    level: QualificationLevel;
    specializations: string[];
    awards?: string[];
}
/**
 * Base Supply Extracted Data
 * 供给提取数据基类
 */
export interface SupplyExtractedData {
    scene: SupplySceneType;
    /** 供给方描述原文 */
    rawText: string;
    /** 供给方资质 */
    qualification: SupplyQualification;
    /** 质量评估 */
    qualityMetrics: SupplyQualityMetrics;
    /** 提取置信度 */
    confidence: number;
    /** 关键词 */
    keywords: string[];
}
/**
 * VisionShare Supply Data
 * VisionShare 供给数据 - 摄影师/服务提供者
 */
export interface VisionShareSupplyData extends SupplyExtractedData {
    scene: 'visionshare';
    equipment: {
        cameras: string[];
        lenses: string[];
        lighting: string[];
        other: string[];
    };
    experience: {
        years: number;
        photographyTypes: string[];
        portfolio: string[];
        notableProjects: string[];
    };
    style: {
        primary: string;
        secondary: string[];
        techniques: string[];
    };
    pricing?: {
        portrait?: {
            price: number;
            currency: string;
            unit?: string;
        };
        wedding?: {
            price: number;
            currency: string;
            unit?: string;
        };
        commercial?: {
            price: number;
            currency: string;
            unit?: string;
        };
        other?: {
            price: number;
            currency: string;
            unit?: string;
        };
    };
    availability?: {
        weekdays: boolean;
        weekends: boolean;
        evenings: boolean;
        travel: boolean;
    };
}
/**
 * Job Supply Data
 * AgentJob 供给数据 - 求职者
 */
export interface JobSupplyData extends SupplyExtractedData {
    scene: 'agentjob';
    skills: {
        technical: string[];
        soft: string[];
        languages: string[];
        certifications: string[];
    };
    experience: {
        totalYears: number;
        level: 'junior' | 'mid' | 'senior' | 'expert';
        industries: string[];
        companies: string[];
        roles: string[];
    };
    expectations: {
        salaryRange?: {
            price: number;
            currency: string;
            unit?: string;
            period: 'monthly' | 'yearly';
        };
        jobTypes: string[];
        location?: string;
        remote: boolean;
        startDate?: string;
    };
    education?: {
        degree: string;
        major: string;
        school?: string;
    };
}
/**
 * Ad Supply Data
 * AgentAd 供给数据 - 商家
 */
export interface AdSupplyData extends SupplyExtractedData {
    scene: 'agentad';
    products: Array<{
        name: string;
        category: string;
        description?: string;
        condition: 'new' | 'used' | 'refurbished';
        pricing?: {
            price: number;
            currency: string;
            unit?: string;
        };
        inventory?: number;
        features?: string[];
    }>;
    offers: Array<{
        type: string;
        description: string;
        conditions?: string;
        validUntil?: string;
    }>;
    business: {
        name?: string;
        category?: string;
        rating?: number;
        verified: boolean;
        location?: string;
        platforms: string[];
    };
}
/**
 * Supply Scene Detection Result
 * 供给场景检测结果
 */
export interface SupplySceneDetectionResult {
    scene: SupplySceneType;
    confidence: number;
    keywords: string[];
    alternativeScenes: Array<{
        scene: SupplySceneType;
        confidence: number;
    }>;
}
/**
 * Supply Extractor Interface
 * 供给提取器接口
 */
export interface SupplyExtractor<T extends SupplyExtractedData = SupplyExtractedData> {
    /** 获取场景类型 */
    getSceneType(): SupplySceneType;
    /** 从文本提取供给信息 */
    extract(text: string, context?: Record<string, any>): Promise<T>;
    /** 检查是否可以处理该文本 */
    canHandle(text: string): Promise<{
        canHandle: boolean;
        confidence: number;
    }>;
    /** 获取必填字段 */
    getRequiredFields(): string[];
    /** 获取可选字段 */
    getOptionalFields(): string[];
    /** 验证提取结果 */
    validate(data: T): {
        valid: boolean;
        missingFields: string[];
    };
    /** 生成澄清问题 */
    generateClarificationQuestions(missingFields: string[]): string[];
}
//# sourceMappingURL=types.d.ts.map