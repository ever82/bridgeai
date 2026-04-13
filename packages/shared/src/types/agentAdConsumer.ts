/**
 * AgentAd Consumer Demand Profile Types
 * 消费者需求画像类型定义
 */

// ============================================
// Role Types
// ============================================

export enum AgentAdRole {
  CONSUMER = 'CONSUMER',   // 消费者 - 有购买需求
  MERCHANT = 'MERCHANT',   // 商家 - 提供商品/服务
}

export const AGENTAD_ROLE_LABELS: Record<AgentAdRole, string> = {
  [AgentAdRole.CONSUMER]: '消费者',
  [AgentAdRole.MERCHANT]: '商家',
};

export const AGENTAD_ROLE_DESCRIPTIONS: Record<AgentAdRole, string> = {
  [AgentAdRole.CONSUMER]: '有购买需求的用户，配置消费画像寻找匹配商家',
  [AgentAdRole.MERCHANT]: '提供商品或服务的商家，发布广告寻找潜在客户',
};

// ============================================
// Budget Types
// ============================================

export enum BudgetDisclosure {
  PUBLIC = 'PUBLIC',           // 公开 - 商家可见
  PRIVATE = 'PRIVATE',         // 私密 - 仅系统可见
  RANGE_ONLY = 'RANGE_ONLY',   // 仅范围 - 显示范围不显示具体数值
}

export const BUDGET_DISCLOSURE_LABELS: Record<BudgetDisclosure, string> = {
  [BudgetDisclosure.PUBLIC]: '公开预算',
  [BudgetDisclosure.PRIVATE]: '保密预算',
  [BudgetDisclosure.RANGE_ONLY]: '仅显示范围',
};

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

// ============================================
// Category Types
// ============================================

export interface ProductCategory {
  id: string;
  name: string;
  icon?: string;
  parentId?: string;
  level: number;
  sortOrder: number;
}

// ============================================
// Brand Preferences
// ============================================

export interface BrandPreference {
  preferred: string[];   // 偏好品牌
  avoided: string[];     // 避开品牌
  anyBrand: boolean;     // 是否接受任何品牌
}

// ============================================
// Merchant Preferences
// ============================================

export enum MerchantType {
  CHAIN = 'CHAIN',
  LOCAL = 'LOCAL',
  INDIVIDUAL = 'INDIVIDUAL',
  ONLINE_ONLY = 'ONLINE_ONLY',
  PREMIUM = 'PREMIUM',
  BUDGET = 'BUDGET',
}

export const MERCHANT_TYPE_LABELS: Record<MerchantType, string> = {
  [MerchantType.CHAIN]: '连锁品牌',
  [MerchantType.LOCAL]: '本地商家',
  [MerchantType.INDIVIDUAL]: '个人商家',
  [MerchantType.ONLINE_ONLY]: '纯线上商家',
  [MerchantType.PREMIUM]: '高端商家',
  [MerchantType.BUDGET]: '平价商家',
};

export interface MerchantPreferenceConfig {
  types: MerchantType[];
  minRating?: number;      // 最低评分 1-5
  preferChain: boolean;
  acceptIndividual: boolean;
  maxDistance?: number;    // 公里
  requirePhysicalStore: boolean;
}

// ============================================
// Timeline & Urgency
// ============================================

export enum DemandUrgency {
  URGENT = 'URGENT',      // 24小时内
  HIGH = 'HIGH',          // 3天内
  MEDIUM = 'MEDIUM',      // 1周内
  LOW = 'LOW',            // 1个月内
  FLEXIBLE = 'FLEXIBLE',  // 灵活时间
}

export const DEMAND_URGENCY_LABELS: Record<DemandUrgency, string> = {
  [DemandUrgency.URGENT]: '急需（24小时内）',
  [DemandUrgency.HIGH]: '高（3天内）',
  [DemandUrgency.MEDIUM]: '中等（1周内）',
  [DemandUrgency.LOW]: '低（1个月内）',
  [DemandUrgency.FLEXIBLE]: '灵活时间',
};

export interface DemandTimeline {
  urgency: DemandUrgency;
  preferredStartDate?: Date;
  preferredEndDate?: Date;
  flexibleDates: boolean;
  timeConstraints?: string[];  // 如 "周末", "晚上", "工作日"
}

// ============================================
// Consumer Demand Profile (L2 Structure)
// ============================================

export interface ConsumerDemandProfile {
  role: AgentAdRole;

  // 类别配置 (最多5个)
  categories: ProductCategory[];
  categoryIds: string[];

  // 预算配置
  budget: BudgetRange;

  // 品牌偏好
  brandPreference: BrandPreference;

  // 商家偏好
  merchantPreference: MerchantPreferenceConfig;

  // 时间要求
  timeline: DemandTimeline;

  // 地理位置
  location?: {
    latitude: number;
    longitude: number;
    address?: string;
    city?: string;
    radius: number;  // 搜索半径公里
  };

  // AI提取的原始数据
  aiExtractedData?: {
    rawText: string;
    confidence: number;
    extractedAt: Date;
  };

  // 状态
  status: ConsumerDemandStatus;

  // 元数据
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date;
}

export enum ConsumerDemandStatus {
  DRAFT = 'DRAFT',
  PENDING_REVIEW = 'PENDING_REVIEW',
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  EXPIRED = 'EXPIRED',
}

// ============================================
// Preview & Summary
// ============================================

export interface DemandProfilePreview {
  summary: string;
  categorySummary: string;
  budgetSummary: string;
  brandSummary: string;
  merchantSummary: string;
  timelineSummary: string;
  locationSummary?: string;

  // 完整性检查
  completeness: {
    categories: boolean;
    budget: boolean;
    brands: boolean;
    merchants: boolean;
    timeline: boolean;
    location: boolean;
  };
  completenessScore: number;  // 0-100

  // 预计匹配商家数
  estimatedMatches?: number;

  // 建议
  suggestions: string[];
}

// ====================================
// API Request/Response Types
// ============================================

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

// ============================================
// AI Integration Types
// ============================================

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
