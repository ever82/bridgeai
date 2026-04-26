/**
 * AgentAd Consumer Demand Profile Types
 * 消费者需求画像类型定义
 */
export declare enum AgentAdRole {
    CONSUMER = "CONSUMER",// 消费者 - 有购买需求
    MERCHANT = "MERCHANT"
}
export declare const AGENTAD_ROLE_LABELS: Record<AgentAdRole, string>;
export declare const AGENTAD_ROLE_DESCRIPTIONS: Record<AgentAdRole, string>;
export declare enum BudgetDisclosure {
    PUBLIC = "PUBLIC",// 公开 - 商家可见
    PRIVATE = "PRIVATE",// 私密 - 仅系统可见
    RANGE_ONLY = "RANGE_ONLY"
}
export declare const BUDGET_DISCLOSURE_LABELS: Record<BudgetDisclosure, string>;
export interface BudgetRange {
    type: 'single' | 'weekly' | 'monthly' | 'custom';
    min: number;
    max: number;
    currency: string;
    disclosure: BudgetDisclosure;
    customPeriod?: {
        value: number;
        unit: 'day' | 'week' | 'month';
    };
}
export interface ProductCategory {
    id: string;
    name: string;
    icon?: string;
    parentId?: string;
    level: number;
    sortOrder: number;
}
export interface BrandPreference {
    preferred: string[];
    avoided: string[];
    anyBrand: boolean;
}
export declare enum MerchantType {
    CHAIN = "CHAIN",
    LOCAL = "LOCAL",
    INDIVIDUAL = "INDIVIDUAL",
    ONLINE_ONLY = "ONLINE_ONLY",
    PREMIUM = "PREMIUM",
    BUDGET = "BUDGET"
}
export declare const MERCHANT_TYPE_LABELS: Record<MerchantType, string>;
export interface MerchantPreferenceConfig {
    types: MerchantType[];
    minRating?: number;
    preferChain: boolean;
    acceptIndividual: boolean;
    maxDistance?: number;
    requirePhysicalStore: boolean;
}
export declare enum DemandUrgency {
    URGENT = "URGENT",// 24小时内
    HIGH = "HIGH",// 3天内
    MEDIUM = "MEDIUM",// 1周内
    LOW = "LOW",// 1个月内
    FLEXIBLE = "FLEXIBLE"
}
export declare const DEMAND_URGENCY_LABELS: Record<DemandUrgency, string>;
export interface DemandTimeline {
    urgency: DemandUrgency;
    preferredStartDate?: Date;
    preferredEndDate?: Date;
    flexibleDates: boolean;
    timeConstraints?: string[];
}
export interface ConsumerDemandProfile {
    role: AgentAdRole;
    categories: ProductCategory[];
    categoryIds: string[];
    budget: BudgetRange;
    brandPreference: BrandPreference;
    merchantPreference: MerchantPreferenceConfig;
    timeline: DemandTimeline;
    location?: {
        latitude: number;
        longitude: number;
        address?: string;
        city?: string;
        radius: number;
    };
    aiExtractedData?: {
        rawText: string;
        confidence: number;
        extractedAt: Date;
    };
    status: ConsumerDemandStatus;
    createdAt: Date;
    updatedAt: Date;
    publishedAt?: Date;
}
export declare enum ConsumerDemandStatus {
    DRAFT = "DRAFT",
    PENDING_REVIEW = "PENDING_REVIEW",
    ACTIVE = "ACTIVE",
    PAUSED = "PAUSED",
    EXPIRED = "EXPIRED"
}
export interface DemandProfilePreview {
    summary: string;
    categorySummary: string;
    budgetSummary: string;
    brandSummary: string;
    merchantSummary: string;
    timelineSummary: string;
    locationSummary?: string;
    completeness: {
        categories: boolean;
        budget: boolean;
        brands: boolean;
        merchants: boolean;
        timeline: boolean;
        location: boolean;
    };
    completenessScore: number;
    estimatedMatches?: number;
    suggestions: string[];
}
export interface CreateConsumerAgentRequest {
    name: string;
    description?: string;
    role: AgentAdRole.CONSUMER;
    initialConfig?: Partial<ConsumerDemandProfile>;
}
export interface UpdateConsumerConfigRequest {
    categories?: ProductCategory[];
    budget?: BudgetRange;
    brandPreference?: BrandPreference;
    merchantPreference?: MerchantPreferenceConfig;
    timeline?: DemandTimeline;
    location?: ConsumerDemandProfile['location'];
}
export interface ConfigureCategoriesRequest {
    categoryIds: string[];
}
export interface ConfigureBudgetRequest {
    budget: BudgetRange;
}
export interface ConfigurePreferencesRequest {
    brandPreference?: BrandPreference;
    merchantPreference?: MerchantPreferenceConfig;
}
export interface PreviewDemandResponse {
    preview: DemandProfilePreview;
    agentId: string;
}
export interface PublishDemandRequest {
    agentId: string;
}
export interface PublishDemandResponse {
    agentId: string;
    status: ConsumerDemandStatus;
    publishedAt: Date;
    message: string;
}
export interface ExtractedDemandData {
    categories?: string[];
    budget?: {
        min?: number;
        max?: number;
        type?: string;
    };
    brands?: {
        preferred?: string[];
        avoided?: string[];
    };
    urgency?: DemandUrgency;
    timeline?: {
        startDate?: string;
        endDate?: string;
    };
    location?: {
        city?: string;
        radius?: number;
    };
    confidence: number;
    rawEntities: any[];
}
export interface AIDemandExtractionRequest {
    text: string;
    scene: 'agentad';
    context?: Record<string, any>;
}
//# sourceMappingURL=agentAdConsumer.d.ts.map