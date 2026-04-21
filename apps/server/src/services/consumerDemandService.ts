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

import {
  AgentType,
  AgentStatus,
  AgentAdRole,
  ConsumerDemandStatus,
  ProductCategory,
  BudgetRange,
  BrandPreference,
  MerchantPreferenceConfig,
  DemandTimeline,
  DemandProfilePreview,
  ConsumerDemandProfile,
  UpdateConsumerConfigRequest,
  ExtractedDemandData,
} from '@bridgeai/shared';

import { prisma } from '../db/client';
import { AppError } from '../errors/AppError';
import { logger } from '../utils/logger';

// Re-export types from shared
export {
  AgentAdRole,
  ConsumerDemandStatus,
  ProductCategory,
  BudgetRange,
  BrandPreference,
  MerchantPreferenceConfig,
  DemandTimeline,
  DemandProfilePreview,
  ConsumerDemandProfile,
} from '@bridgeai/shared';

// Local type definitions (shared package may not export all)
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
export async function createConsumerAgent(
  userId: string,
  request: CreateConsumerAgentRequest
): Promise<any> {
  logger.info('Creating consumer agent', { userId, name: request.name });

  // Validate role
  if (request.role !== AgentAdRole.CONSUMER) {
    throw new AppError(
      'Invalid role for consumer agent. Must be CONSUMER',
      'INVALID_ROLE',
      400
    );
  }

  // Validate name
  if (!request.name || request.name.trim().length === 0) {
    throw new AppError('Agent name is required', 'AGENT_NAME_REQUIRED', 400);
  }

  if (request.name.length > 100) {
    throw new AppError('Agent name must be less than 100 characters', 'AGENT_NAME_TOO_LONG', 400);
  }

  // Build initial config
  const initialProfile: Partial<ConsumerDemandProfile> = {
    role: AgentAdRole.CONSUMER,
    categories: (request.initialConfig?.categories || []) as any,
    categoryIds: request.initialConfig?.categoryIds || [],
    budget: (request.initialConfig?.budget || {
      type: 'single',
      min: 0,
      max: 1000,
      currency: 'CNY',
      disclosure: 'RANGE_ONLY',
    }) as any,
    brandPreference: (request.initialConfig?.brandPreference || {
      preferred: [],
      avoided: [],
      anyBrand: true,
    }) as any,
    merchantPreference: (request.initialConfig?.merchantPreference || {
      types: ['CHAIN', 'LOCAL'],
      preferChain: true,
      acceptIndividual: true,
      requirePhysicalStore: false,
    }) as any,
    timeline: (request.initialConfig?.timeline || {
      urgency: 'MEDIUM',
      flexibleDates: true,
    }) as any,
    status: ConsumerDemandStatus.DRAFT,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const agent = await prisma.agent.create({
    data: {
      userId,
      type: 'AGENTAD',
      name: request.name.trim(),
      description: request.description || null,
      status: AgentStatus.DRAFT,
      config: {
        role: AgentAdRole.CONSUMER,
        consumerProfile: initialProfile,
        scene: 'AGENTAD',
      } as any,
      latitude: null,
      longitude: null,
      isActive: true,
    },
  });

  logger.info('Consumer agent created', { agentId: agent.id });

  return {
    ...agent,
    config: agent.config as any,
  };
}

/**
 * Configure categories for consumer demand
 * 配置消费类别（最多5个）
 */
export async function configureCategories(
  agentId: string,
  userId: string,
  categoryIds: string[]
): Promise<any> {
  logger.info('Configuring categories', { agentId, categoryCount: categoryIds.length });

  // Validate category count
  if (categoryIds.length > 5) {
    throw new AppError(
      'Maximum 5 categories allowed',
      'TOO_MANY_CATEGORIES',
      400
    );
  }

  if (categoryIds.length === 0) {
    throw new AppError(
      'At least one category is required',
      'NO_CATEGORIES',
      400
    );
  }

  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
  });

  if (!agent) {
    throw new AppError('Agent not found', 'AGENT_NOT_FOUND', 404);
  }

  if (agent.userId !== userId) {
    throw new AppError('Unauthorized to update this agent', 'UNAUTHORIZED', 403);
  }

  // Check if this is a consumer agent
  const config = agent.config as any;
  if (!config?.role || config.role !== AgentAdRole.CONSUMER) {
    throw new AppError(
      'This agent is not a consumer agent',
      'NOT_CONSUMER_AGENT',
      400
    );
  }

  // Build category objects from IDs
  // In real implementation, these would be fetched from a category service
  const categories: ProductCategory[] = categoryIds.map((id, index) => ({
    id,
    name: getCategoryName(id),
    level: 1,
    sortOrder: index,
  }));

  // Update config
  const updatedConfig = {
    ...config,
    consumerProfile: {
      ...config.consumerProfile,
      categories,
      categoryIds,
      updatedAt: new Date(),
    },
  };

  const updatedAgent = await prisma.agent.update({
    where: { id: agentId },
    data: { config: updatedConfig },
  });

  return {
    ...updatedAgent,
    config: updatedConfig,
  };
}

/**
 * Helper function to get category name from ID
 */
function getCategoryName(id: string): string {
  const categoryNames: Record<string, string> = {
    food: '餐饮美食',
    restaurant: '餐厅',
    cafe: '咖啡茶饮',
    bakery: '烘焙甜品',
    bar: '酒吧',
    retail: '零售购物',
    clothing: '服装鞋帽',
    electronics: '数码电子',
    home: '家居用品',
    beauty: '美妆护肤',
    jewelry: '珠宝配饰',
    books: '图书文具',
    services: '生活服务',
    beauty_salon: '美容美发',
    fitness: '健身运动',
    cleaning: '保洁清洗',
    repair: '维修服务',
    pet: '宠物服务',
    entertainment: '休闲娱乐',
    ktv: 'KTV',
    cinema: '电影院',
    gaming: '游戏娱乐',
    sports: '运动场馆',
    education: '教育培训',
    training: '职业培训',
    language: '语言学习',
    arts: '艺术培训',
    health: '医疗健康',
    hospital: '医院诊所',
    dental: '口腔服务',
    massage: '按摩理疗',
    psychology: '心理咨询',
    travel: '旅游出行',
    hotel: '酒店住宿',
    transport: '交通服务',
  };
  return categoryNames[id] || id;
}

/**
 * Configure budget for consumer demand
 * 配置预算范围
 */
export async function configureBudget(
  agentId: string,
  userId: string,
  budget: BudgetRange
): Promise<any> {
  logger.info('Configuring budget', { agentId, budgetType: budget.type });

  // Validate budget values
  if (budget.min < 0 || budget.max < 0) {
    throw new AppError('Budget values must be non-negative', 'INVALID_BUDGET', 400);
  }

  if (budget.min > budget.max) {
    throw new AppError('Minimum budget cannot exceed maximum', 'INVALID_BUDGET_RANGE', 400);
  }

  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
  });

  if (!agent) {
    throw new AppError('Agent not found', 'AGENT_NOT_FOUND', 404);
  }

  if (agent.userId !== userId) {
    throw new AppError('Unauthorized to update this agent', 'UNAUTHORIZED', 403);
  }

  const config = agent.config as any;
  if (!config?.role || config.role !== AgentAdRole.CONSUMER) {
    throw new AppError('This agent is not a consumer agent', 'NOT_CONSUMER_AGENT', 400);
  }

  const updatedConfig = {
    ...config,
    consumerProfile: {
      ...config.consumerProfile,
      budget,
      updatedAt: new Date(),
    },
  };

  const updatedAgent = await prisma.agent.update({
    where: { id: agentId },
    data: { config: updatedConfig },
  });

  return {
    ...updatedAgent,
    config: updatedConfig,
  };
}

/**
 * Configure preferences for consumer demand
 * 配置品牌和商家偏好
 */
export async function configurePreferences(
  agentId: string,
  userId: string,
  preferences: {
    brandPreference?: BrandPreference;
    merchantPreference?: MerchantPreferenceConfig;
  }
): Promise<any> {
  logger.info('Configuring preferences', { agentId });

  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
  });

  if (!agent) {
    throw new AppError('Agent not found', 'AGENT_NOT_FOUND', 404);
  }

  if (agent.userId !== userId) {
    throw new AppError('Unauthorized to update this agent', 'UNAUTHORIZED', 403);
  }

  const config = agent.config as any;
  if (!config?.role || config.role !== AgentAdRole.CONSUMER) {
    throw new AppError('This agent is not a consumer agent', 'NOT_CONSUMER_AGENT', 400);
  }

  const updatedProfile: any = {
    ...config.consumerProfile,
    updatedAt: new Date(),
  };

  if (preferences.brandPreference) {
    updatedProfile.brandPreference = preferences.brandPreference;
  }

  if (preferences.merchantPreference) {
    // Validate merchant preference
    if (preferences.merchantPreference.minRating !== undefined) {
      if (preferences.merchantPreference.minRating < 1 || preferences.merchantPreference.minRating > 5) {
        throw new AppError('Rating must be between 1 and 5', 'INVALID_RATING', 400);
      }
    }
    updatedProfile.merchantPreference = preferences.merchantPreference;
  }

  const updatedConfig = {
    ...config,
    consumerProfile: updatedProfile,
  };

  const updatedAgent = await prisma.agent.update({
    where: { id: agentId },
    data: { config: updatedConfig },
  });

  return {
    ...updatedAgent,
    config: updatedConfig,
  };
}

/**
 * Update timeline configuration
 * 更新时间要求配置
 */
export async function configureTimeline(
  agentId: string,
  userId: string,
  timeline: DemandTimeline
): Promise<any> {
  logger.info('Configuring timeline', { agentId, urgency: timeline.urgency });

  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
  });

  if (!agent) {
    throw new AppError('Agent not found', 'AGENT_NOT_FOUND', 404);
  }

  if (agent.userId !== userId) {
    throw new AppError('Unauthorized to update this agent', 'UNAUTHORIZED', 403);
  }

  const config = agent.config as any;
  if (!config?.role || config.role !== AgentAdRole.CONSUMER) {
    throw new AppError('This agent is not a consumer agent', 'NOT_CONSUMER_AGENT', 400);
  }

  const updatedConfig = {
    ...config,
    consumerProfile: {
      ...config.consumerProfile,
      timeline,
      updatedAt: new Date(),
    },
  };

  const updatedAgent = await prisma.agent.update({
    where: { id: agentId },
    data: { config: updatedConfig },
  });

  return {
    ...updatedAgent,
    config: updatedConfig,
  };
}

/**
 * Apply AI extracted demand data to consumer profile
 * 应用 AI 提取的需求数据
 */
export async function applyAIExtractedData(
  agentId: string,
  userId: string,
  extractedData: ExtractedDemandData
): Promise<any> {
  logger.info('Applying AI extracted data', { agentId, confidence: extractedData.confidence });

  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
  });

  if (!agent) {
    throw new AppError('Agent not found', 'AGENT_NOT_FOUND', 404);
  }

  if (agent.userId !== userId) {
    throw new AppError('Unauthorized to update this agent', 'UNAUTHORIZED', 403);
  }

  const config = agent.config as any;
  if (!config?.role || config.role !== AgentAdRole.CONSUMER) {
    throw new AppError('This agent is not a consumer agent', 'NOT_CONSUMER_AGENT', 400);
  }

  const profile: ConsumerDemandProfile = config.consumerProfile;

  // Apply extracted categories
  if (extractedData.categories && extractedData.categories.length > 0) {
    profile.categoryIds = extractedData.categories.slice(0, 5);
    profile.categories = extractedData.categories.slice(0, 5).map((id, index) => ({
      id,
      name: getCategoryName(id),
      level: 1,
      sortOrder: index,
    }));
  }

  // Apply extracted budget
  if (extractedData.budget) {
    if (extractedData.budget.min !== undefined) {
      profile.budget.min = extractedData.budget.min;
    }
    if (extractedData.budget.max !== undefined) {
      profile.budget.max = extractedData.budget.max;
    }
    if (extractedData.budget.type) {
      profile.budget.type = extractedData.budget.type as any;
    }
  }

  // Apply extracted brands
  if (extractedData.brands) {
    if (extractedData.brands.preferred) {
      profile.brandPreference.preferred = extractedData.brands.preferred;
    }
    if (extractedData.brands.avoided) {
      profile.brandPreference.avoided = extractedData.brands.avoided;
    }
  }

  // Apply extracted urgency
  if (extractedData.urgency) {
    profile.timeline.urgency = extractedData.urgency;
  }

  // Apply extracted timeline dates
  if (extractedData.timeline) {
    if (extractedData.timeline.startDate) {
      profile.timeline.preferredStartDate = new Date(extractedData.timeline.startDate);
    }
    if (extractedData.timeline.endDate) {
      profile.timeline.preferredEndDate = new Date(extractedData.timeline.endDate);
    }
  }

  // Apply extracted location
  if (extractedData.location) {
    profile.location = {
      ...profile.location,
      city: extractedData.location.city,
      radius: extractedData.location.radius || profile.location?.radius || 5,
    };
  }

  // Store AI extraction metadata
  profile.aiExtractedData = {
    rawText: JSON.stringify(extractedData),
    confidence: extractedData.confidence,
    extractedAt: new Date(),
  };

  profile.updatedAt = new Date();

  const updatedConfig = {
    ...config,
    consumerProfile: profile,
  };

  const updatedAgent = await prisma.agent.update({
    where: { id: agentId },
    data: { config: updatedConfig },
  });

  return {
    ...updatedAgent,
    config: updatedConfig,
  };
}

/**
 * Generate demand profile preview
 * 生成需求画像预览
 */
export async function previewDemandProfile(
  agentId: string,
  userId: string
): Promise<DemandProfilePreview> {
  logger.info('Generating demand profile preview', { agentId });

  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
  });

  if (!agent) {
    throw new AppError('Agent not found', 'AGENT_NOT_FOUND', 404);
  }

  if (agent.userId !== userId) {
    throw new AppError('Unauthorized to view this agent', 'UNAUTHORIZED', 403);
  }

  const config = agent.config as any;
  const profile: ConsumerDemandProfile = config?.consumerProfile;

  if (!profile) {
    throw new AppError('Consumer profile not found', 'PROFILE_NOT_FOUND', 404);
  }

  // Build summaries
  const categorySummary = profile.categories?.length > 0
    ? `感兴趣的类别：${profile.categories.map(c => c.name).join('、')}`
    : '尚未配置类别';

  const budgetSummary = profile.budget
    ? `预算范围：${profile.budget.min}-${profile.budget.max} ${profile.budget.currency}（${getDisclosureLabel(profile.budget.disclosure)}）`
    : '尚未配置预算';

  const brandSummary = profile.brandPreference
    ? buildBrandSummary(profile.brandPreference)
    : '尚未配置品牌偏好';

  const merchantSummary = profile.merchantPreference
    ? buildMerchantSummary(profile.merchantPreference)
    : '尚未配置商家偏好';

  const timelineSummary = profile.timeline
    ? `紧急程度：${getUrgencyLabel(profile.timeline.urgency)}`
    : '尚未配置时间要求';

  const locationSummary = profile.location?.city
    ? `位置：${profile.location.city}，搜索半径${profile.location.radius}公里`
    : undefined;

  // Calculate completeness
  const completeness = {
    categories: profile.categories?.length > 0,
    budget: profile.budget?.min !== undefined && profile.budget?.max !== undefined,
    brands: profile.brandPreference !== undefined,
    merchants: profile.merchantPreference !== undefined,
    timeline: profile.timeline?.urgency !== undefined,
    location: profile.location !== undefined,
  };

  const completenessScore = Object.values(completeness).filter(v => v).length / 6 * 100;

  // Generate suggestions
  const suggestions: string[] = [];
  if (!completeness.categories) {
    suggestions.push('建议添加感兴趣的类别，以便匹配相关商家');
  }
  if (!completeness.budget) {
    suggestions.push('建议设置预算范围，帮助商家了解您的消费能力');
  }
  if (profile.budget?.disclosure === 'PRIVATE') {
    suggestions.push('预算设置为私密，商家将无法看到具体预算信息');
  }
  if (!completeness.timeline) {
    suggestions.push('建议设置时间要求，方便商家安排服务');
  }

  // Build full summary
  const summaryParts = [categorySummary, budgetSummary, timelineSummary];
  if (locationSummary) summaryParts.push(locationSummary);
  const summary = summaryParts.join('；');

  return {
    summary,
    categorySummary,
    budgetSummary,
    brandSummary,
    merchantSummary,
    timelineSummary,
    locationSummary,
    completeness,
    completenessScore: Math.round(completenessScore),
    suggestions,
  };
}

/**
 * Helper to build brand summary
 */
function buildBrandSummary(brandPref: BrandPreference): string {
  if (brandPref.anyBrand) {
    return '接受任何品牌';
  }
  const parts: string[] = [];
  if (brandPref.preferred?.length > 0) {
    parts.push(`偏好：${brandPref.preferred.join('、')}`);
  }
  if (brandPref.avoided?.length > 0) {
    parts.push(`避开：${brandPref.avoided.join('、')}`);
  }
  return parts.length > 0 ? parts.join('；') : '无特定品牌偏好';
}

/**
 * Helper to build merchant summary
 */
function buildMerchantSummary(merchantPref: MerchantPreferenceConfig): string {
  const types = merchantPref.types?.map(t => getMerchantTypeLabel(t)).join('、') || '不限';
  const parts: string[] = [`商家类型：${types}`];
  if (merchantPref.minRating) {
    parts.push(`最低评分：${merchantPref.minRating}星`);
  }
  if (merchantPref.requirePhysicalStore) {
    parts.push('要求有实体店');
  }
  return parts.join('，');
}

/**
 * Get merchant type label
 */
function getMerchantTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    CHAIN: '连锁品牌',
    LOCAL: '本地商家',
    INDIVIDUAL: '个人商家',
    ONLINE_ONLY: '纯线上',
    PREMIUM: '高端商家',
    BUDGET: '平价商家',
  };
  return labels[type] || type;
}

/**
 * Get disclosure label
 */
function getDisclosureLabel(disclosure: string): string {
  const labels: Record<string, string> = {
    PUBLIC: '公开',
    PRIVATE: '私密',
    RANGE_ONLY: '仅范围',
  };
  return labels[disclosure] || disclosure;
}

/**
 * Get urgency label
 */
function getUrgencyLabel(urgency: string): string {
  const labels: Record<string, string> = {
    URGENT: '急需（24小时内）',
    HIGH: '高（3天内）',
    MEDIUM: '中等（1周内）',
    LOW: '低（1个月内）',
    FLEXIBLE: '灵活时间',
  };
  return labels[urgency] || urgency;
}

/**
 * Publish consumer demand
 * 发布消费者需求
 */
export async function publishDemand(
  agentId: string,
  userId: string
): Promise<any> {
  logger.info('Publishing consumer demand', { agentId });

  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
  });

  if (!agent) {
    throw new AppError('Agent not found', 'AGENT_NOT_FOUND', 404);
  }

  if (agent.userId !== userId) {
    throw new AppError('Unauthorized to publish this agent', 'UNAUTHORIZED', 403);
  }

  const config = agent.config as any;
  const profile: ConsumerDemandProfile = config?.consumerProfile;

  if (!profile) {
    throw new AppError('Consumer profile not found', 'PROFILE_NOT_FOUND', 404);
  }

  // Validate minimum requirements
  if (!profile.categories || profile.categories.length === 0) {
    throw new AppError('At least one category is required', 'MISSING_CATEGORIES', 400);
  }

  if (!profile.budget) {
    throw new AppError('Budget configuration is required', 'MISSING_BUDGET', 400);
  }

  // Update profile status
  profile.status = ConsumerDemandStatus.ACTIVE;
  profile.publishedAt = new Date();
  profile.updatedAt = new Date();

  // Update agent status
  const updatedConfig = {
    ...config,
    consumerProfile: profile,
  };

  const [updatedAgent] = await Promise.all([
    prisma.agent.update({
      where: { id: agentId },
      data: {
        config: updatedConfig,
        status: AgentStatus.ACTIVE,
      },
    }),
    // Create status history entry (if table exists)
    // prisma.agentStatusHistory.create({...})
  ]);

  logger.info('Consumer demand published', { agentId, publishedAt: profile.publishedAt });

  return {
    agentId,
    status: profile.status,
    publishedAt: profile.publishedAt,
    message: '需求已发布，系统将开始为您匹配相关商家',
  };
}

/**
 * Get consumer agent with full profile
 * 获取消费者 Agent 及完整画像
 */
export async function getConsumerAgent(
  agentId: string,
  userId: string
): Promise<any> {
  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
  });

  if (!agent) {
    throw new AppError('Agent not found', 'AGENT_NOT_FOUND', 404);
  }

  if (agent.userId !== userId) {
    throw new AppError('Unauthorized to view this agent', 'UNAUTHORIZED', 403);
  }

  const config = agent.config as any;
  if (!config?.role || config.role !== AgentAdRole.CONSUMER) {
    throw new AppError('This agent is not a consumer agent', 'NOT_CONSUMER_AGENT', 400);
  }

  return {
    ...agent,
    config,
    profile: config.consumerProfile as ConsumerDemandProfile,
  };
}

/**
 * Update location configuration
 * 更新位置配置
 */
export async function configureLocation(
  agentId: string,
  userId: string,
  location: {
    latitude: number;
    longitude: number;
    address?: string;
    city?: string;
    radius: number;
  }
): Promise<any> {
  logger.info('Configuring location', { agentId, city: location.city });

  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
  });

  if (!agent) {
    throw new AppError('Agent not found', 'AGENT_NOT_FOUND', 404);
  }

  if (agent.userId !== userId) {
    throw new AppError('Unauthorized to update this agent', 'UNAUTHORIZED', 403);
  }

  const config = agent.config as any;
  if (!config?.role || config.role !== AgentAdRole.CONSUMER) {
    throw new AppError('This agent is not a consumer agent', 'NOT_CONSUMER_AGENT', 400);
  }

  const updatedConfig = {
    ...config,
    consumerProfile: {
      ...config.consumerProfile,
      location,
      updatedAt: new Date(),
    },
  };

  // Also update agent's location fields
  const updatedAgent = await prisma.agent.update({
    where: { id: agentId },
    data: {
      config: updatedConfig,
      latitude: location.latitude,
      longitude: location.longitude,
    },
  });

  return {
    ...updatedAgent,
    config: updatedConfig,
  };
}
