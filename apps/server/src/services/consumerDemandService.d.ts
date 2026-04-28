/**
 * Consumer Demand Service
 * 消费者需求画像服务
 *
 * 处理 AgentAd 场景下 CONSUMER 角色的需求配置：
 * - 创建消费者 Agent
 * - 配置消费类别
 * - 设置预算范围
 * - 配置品牌和商家偏好
 * - AI 需求提炼集成
 * - 需求预览和发布
 */
import { BudgetRange, BrandPreference, MerchantPreferenceConfig, DemandTimeline, DemandProfilePreview, ExtractedDemandData } from '@bridgeai/shared';
export { AgentAdRole, ConsumerDemandStatus, ProductCategory, BudgetRange, BrandPreference, MerchantPreferenceConfig, DemandTimeline, DemandProfilePreview, ConsumerDemandProfile, } from '@bridgeai/shared';
interface CreateConsumerAgentRequest {
    name: string;
    description?: string;
    role: 'CONSUMER';
    initialConfig?: {
        categories?: string[];
        categoryIds?: string[];
        budget?: BudgetRange;
        brandPreference?: BrandPreference;
        merchantPreference?: MerchantPreferenceConfig;
        timeline?: DemandTimeline;
    };
}
/**
 * Create a consumer Agent for AgentAd scenario
 * 为消费者创建 Agent
 */
export declare function createConsumerAgent(userId: string, request: CreateConsumerAgentRequest): Promise<any>;
/**
 * Configure categories for consumer demand
 * 配置消费类别（最多5个）
 */
export declare function configureCategories(agentId: string, userId: string, categoryIds: string[]): Promise<any>;
/**
 * Configure budget for consumer demand
 * 配置预算范围
 */
export declare function configureBudget(agentId: string, userId: string, budget: BudgetRange): Promise<any>;
/**
 * Configure preferences for consumer demand
 * 配置品牌和商家偏好
 */
export declare function configurePreferences(agentId: string, userId: string, preferences: {
    brandPreference?: BrandPreference;
    merchantPreference?: MerchantPreferenceConfig;
}): Promise<any>;
/**
 * Update timeline configuration
 * 更新时间要求配置
 */
export declare function configureTimeline(agentId: string, userId: string, timeline: DemandTimeline): Promise<any>;
/**
 * Apply AI extracted demand data to consumer profile
 * 应用 AI 提取的需求数据
 */
export declare function applyAIExtractedData(agentId: string, userId: string, extractedData: ExtractedDemandData): Promise<any>;
/**
 * Generate demand profile preview
 * 生成需求画像预览
 */
export declare function previewDemandProfile(agentId: string, userId: string): Promise<DemandProfilePreview>;
/**
 * Publish consumer demand
 * 发布消费者需求
 */
export declare function publishDemand(agentId: string, userId: string): Promise<any>;
/**
 * Get consumer agent with full profile
 * 获取消费者 Agent 及完整画像
 */
export declare function getConsumerAgent(agentId: string, userId: string): Promise<any>;
/**
 * Update location configuration
 * 更新位置配置
 */
export declare function configureLocation(agentId: string, userId: string, location: {
    latitude: number;
    longitude: number;
    address?: string;
    city?: string;
    radius: number;
}): Promise<any>;
//# sourceMappingURL=consumerDemandService.d.ts.map