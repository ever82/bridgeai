/**
 * Agent Negotiation Service
 * Agent优惠协商谈判服务 - 核心模块
 *
 * 处理消费者Agent与多个商家Agent之间的自动化协商谈判流程，包括：
 * - 群聊创建与管理
 * - Agent自动介绍与需求表达
 * - 商家优惠方案展示
 * - 智能条件协商与追问
 * - 多方案对比分析
 * - 最优方案推荐与人工确认
 */

import { llmService } from './llmService';
import { metricsService } from './metricsService';
import { LLMProvider } from './types';
import { logger } from '../../utils/logger';
import { demandExtractionService } from './demandExtractionService';
import { v4 as uuidv4 } from 'uuid';

/**
 * Agent类型
 */
export type AgentType = 'consumer' | 'merchant';

/**
 * Agent信息
 */
export interface AgentInfo {
  id: string;
  type: AgentType;
  name: string;
  avatar?: string;
  profile?: ConsumerProfile | MerchantProfile;
}

/**
 * 消费者画像
 */
export interface ConsumerProfile {
  userId: string;
  preferences: string[];
  budgetRange?: { min: number; max: number };
  categoryPreferences?: string[];
  brandPreferences?: string[];
  purchaseHistory?: string[];
}

/**
 * 商家画像
 */
export interface MerchantProfile {
  merchantId: string;
  businessName: string;
  businessType: string;
  rating?: number;
  location?: string;
  offers: MerchantOffer[];
}

/**
 * 商家优惠方案
 */
export interface MerchantOffer {
  id: string;
  title: string;
  description: string;
  discountType: 'percentage' | 'fixed' | 'buy_x_get_y' | 'bundle' | 'other';
  discountValue: number;
  minPurchase?: number;
  maxDiscount?: number;
  validFrom: string;
  validTo: string;
  applicableProducts?: string[];
  exclusions?: string[];
  usageLimit?: number;
  terms?: string[];
  hiddenBenefits?: string[];
}

/**
 * 协商消息
 */
export interface NegotiationMessage {
  id: string;
  roomId: string;
  senderId: string;
  senderType: AgentType;
  content: string;
  messageType: 'introduction' | 'offer' | 'question' | 'response' | 'comparison' | 'recommendation' | 'system';
  timestamp: Date;
  metadata?: {
    offerId?: string;
    questionType?: string;
    comparisonData?: ComparisonResult;
    recommendationData?: RecommendationResult;
  };
}

/**
 * 协商房间
 */
export interface NegotiationRoom {
  id: string;
  type: 'AGENT_AD_NEGOTIATION';
  consumerAgent: AgentInfo;
  merchantAgents: AgentInfo[];
  status: 'created' | 'negotiating' | 'comparing' | 'recommending' | 'completed' | 'cancelled';
  messages: NegotiationMessage[];
  createdAt: Date;
  updatedAt: Date;
  context: NegotiationContext;
}

/**
 * 协商上下文
 */
export interface NegotiationContext {
  consumerDemand: {
    category?: string;
    productName?: string;
    budget?: { min?: number; max?: number };
    brandPreferences?: string[];
    requirements?: string[];
    timeline?: string;
  };
  merchantOffers: Map<string, MerchantOffer[]>;
  negotiationState: {
    currentRound: number;
    maxRounds: number;
    topicsDiscussed: string[];
    agreements: Map<string, any>;
  };
  comparisonResult?: ComparisonResult;
  recommendation?: RecommendationResult;
}

/**
 * 对比结果
 */
export interface ComparisonResult {
  offers: ComparedOffer[];
  summary: string;
  bestValueOffer?: string;
  bestMatchOffer?: string;
  analysisDimensions: {
    price: number;
    quality: number;
    convenience: number;
    match: number;
  };
}

/**
 * 对比的单个优惠
 */
export interface ComparedOffer {
  offerId: string;
  merchantId: string;
  merchantName: string;
  offer: MerchantOffer;
  scores: {
    value: number;
    match: number;
    convenience: number;
    overall: number;
  };
  pros: string[];
  cons: string[];
}

/**
 * 推荐结果
 */
export interface RecommendationResult {
  recommendedOfferId: string;
  recommendedMerchantId: string;
  recommendationReason: string;
  alternativeOffers: string[];
  confidence: number;
  savingsEstimate?: {
    amount: number;
    percentage: number;
  };
}

/**
 * 协商配置
 */
export interface NegotiationConfig {
  maxRounds: number;
  autoNegotiate: boolean;
  enableComparison: boolean;
  requireHumanConfirmation: boolean;
  targetMerchantCount: number;
}

/**
 * 追问问题
 */
export interface FollowUpQuestion {
  question: string;
  targetMerchantId: string;
  questionType: 'discount' | 'validity' | 'condition' | 'hidden_benefit' | 'stacking';
  context: string;
}

/**
 * Agent协商服务类
 */
export class AgentNegotiationService {
  private version = '1.0.0';
  private rooms: Map<string, NegotiationRoom> = new Map();
  private defaultConfig: NegotiationConfig = {
    maxRounds: 5,
    autoNegotiate: true,
    enableComparison: true,
    requireHumanConfirmation: true,
    targetMerchantCount: 3,
  };

  /**
   * 创建协商群聊房间
   * AD003-CR01: 匹配商家群聊创建
   */
  async createNegotiationRoom(
    consumerAgent: AgentInfo,
    merchantAgents: AgentInfo[],
    consumerDemand: NegotiationContext['consumerDemand'],
    config?: Partial<NegotiationConfig>
  ): Promise<NegotiationRoom> {
    const startTime = Date.now();

    try {
      logger.info('Creating negotiation room', {
        consumerId: consumerAgent.id,
        merchantCount: merchantAgents.length,
      });

      // Validate merchant count
      const finalConfig = { ...this.defaultConfig, ...config };
      if (merchantAgents.length < 2) {
        throw new Error('At least 2 merchant agents are required for negotiation');
      }

      // Create room
      const room: NegotiationRoom = {
        id: `room-${uuidv4()}`,
        type: 'AGENT_AD_NEGOTIATION',
        consumerAgent,
        merchantAgents,
        status: 'created',
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        context: {
          consumerDemand,
          merchantOffers: new Map(),
          negotiationState: {
            currentRound: 0,
            maxRounds: finalConfig.maxRounds,
            topicsDiscussed: [],
            agreements: new Map(),
          },
        },
      };

      // Store room
      this.rooms.set(room.id, room);

      logger.info('Negotiation room created', {
        roomId: room.id,
        latencyMs: Date.now() - startTime,
      });

      return room;
    } catch (error) {
      logger.error('Failed to create negotiation room', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * 生成Agent开场白
   * AD003-CR02: Agent自动介绍与需求表达
   */
  async generateConsumerIntroduction(
    roomId: string,
    consumerProfile?: ConsumerProfile
  ): Promise<NegotiationMessage> {
    const room = this.getRoom(roomId);
    const startTime = Date.now();

    try {
      logger.info('Generating consumer introduction', { roomId });

      // Build prompt for dialogue generation (AI004)
      const prompt = this.buildIntroductionPrompt(room, consumerProfile);

      // Generate introduction using LLM
      const response = await llmService.generateText(prompt, {
        temperature: 0.7,
        maxTokens: 500,
      });

      // Create message
      const message: NegotiationMessage = {
        id: `msg-${uuidv4()}`,
        roomId,
        senderId: room.consumerAgent.id,
        senderType: 'consumer',
        content: response.text.trim(),
        messageType: 'introduction',
        timestamp: new Date(),
      };

      // Add to room
      room.messages.push(message);
      room.status = 'negotiating';
      room.updatedAt = new Date();

      // Record metrics
      await this.recordMetrics('introduction', response, startTime);

      logger.info('Consumer introduction generated', {
        roomId,
        messageId: message.id,
        latencyMs: Date.now() - startTime,
      });

      return message;
    } catch (error) {
      logger.error('Failed to generate consumer introduction', { roomId, error });
      throw error;
    }
  }

  /**
   * 生成商家优惠方案展示
   * AD003-CR03: 商家Agent优惠方案展示
   */
  async generateMerchantOfferPresentation(
    roomId: string,
    merchantId: string,
    offer: MerchantOffer
  ): Promise<NegotiationMessage> {
    const room = this.getRoom(roomId);
    const startTime = Date.now();

    try {
      logger.info('Generating merchant offer presentation', { roomId, merchantId });

      const merchant = room.merchantAgents.find(m => m.id === merchantId);
      if (!merchant) {
        throw new Error(`Merchant ${merchantId} not found in room`);
      }

      // Build prompt for offer presentation
      const prompt = this.buildOfferPresentationPrompt(room, merchant, offer);

      // Generate presentation using LLM
      const response = await llmService.generateText(prompt, {
        temperature: 0.6,
        maxTokens: 600,
      });

      // Create message
      const message: NegotiationMessage = {
        id: `msg-${uuidv4()}`,
        roomId,
        senderId: merchantId,
        senderType: 'merchant',
        content: response.text.trim(),
        messageType: 'offer',
        timestamp: new Date(),
        metadata: {
          offerId: offer.id,
        },
      };

      // Add to room
      room.messages.push(message);
      room.updatedAt = new Date();

      // Store offer in context
      const existingOffers = room.context.merchantOffers.get(merchantId) || [];
      existingOffers.push(offer);
      room.context.merchantOffers.set(merchantId, existingOffers);

      // Record metrics
      await this.recordMetrics('offer_presentation', response, startTime);

      logger.info('Merchant offer presentation generated', {
        roomId,
        merchantId,
        offerId: offer.id,
        latencyMs: Date.now() - startTime,
      });

      return message;
    } catch (error) {
      logger.error('Failed to generate merchant offer presentation', { roomId, merchantId, error });
      throw error;
    }
  }

  /**
   * 生成智能追问问题
   * AD003-CR04: 智能条件协商与追问
   */
  async generateFollowUpQuestions(
    roomId: string,
    targetMerchantId: string
  ): Promise<FollowUpQuestion[]> {
    const room = this.getRoom(roomId);
    const startTime = Date.now();

    try {
      logger.info('Generating follow-up questions', { roomId, targetMerchantId });

      const merchant = room.merchantAgents.find(m => m.id === targetMerchantId);
      if (!merchant) {
        throw new Error(`Merchant ${targetMerchantId} not found in room`);
      }

      const offers = room.context.merchantOffers.get(targetMerchantId) || [];

      // Build prompt for follow-up question generation
      const prompt = this.buildFollowUpQuestionsPrompt(room, merchant, offers);

      // Generate questions using LLM
      const response = await llmService.generateText(prompt, {
        temperature: 0.7,
        maxTokens: 800,
      });

      // Parse questions
      const questions = this.parseFollowUpQuestions(response.text, targetMerchantId);

      // Record metrics
      await this.recordMetrics('follow_up_questions', response, startTime);

      logger.info('Follow-up questions generated', {
        roomId,
        questionCount: questions.length,
        latencyMs: Date.now() - startTime,
      });

      return questions;
    } catch (error) {
      logger.error('Failed to generate follow-up questions', { roomId, targetMerchantId, error });
      throw error;
    }
  }

  /**
   * 执行协商追问
   */
  async executeFollowUpQuestion(
    roomId: string,
    question: FollowUpQuestion
  ): Promise<NegotiationMessage> {
    const room = this.getRoom(roomId);

    try {
      logger.info('Executing follow-up question', { roomId, question: question.question });

      // Create question message from consumer agent
      const questionMessage: NegotiationMessage = {
        id: `msg-${uuidv4()}`,
        roomId,
        senderId: room.consumerAgent.id,
        senderType: 'consumer',
        content: question.question,
        messageType: 'question',
        timestamp: new Date(),
        metadata: {
          questionType: question.questionType,
        },
      };

      room.messages.push(questionMessage);

      // Generate merchant response
      const merchant = room.merchantAgents.find(m => m.id === question.targetMerchantId);
      if (!merchant) {
        throw new Error(`Merchant ${question.targetMerchantId} not found`);
      }

      const prompt = this.buildMerchantResponsePrompt(room, merchant, question);
      const response = await llmService.generateText(prompt, {
        temperature: 0.6,
        maxTokens: 400,
      });

      const responseMessage: NegotiationMessage = {
        id: `msg-${uuidv4()}`,
        roomId,
        senderId: question.targetMerchantId,
        senderType: 'merchant',
        content: response.text.trim(),
        messageType: 'response',
        timestamp: new Date(),
      };

      room.messages.push(responseMessage);
      room.updatedAt = new Date();

      // Update negotiation state
      room.context.negotiationState.currentRound++;
      room.context.negotiationState.topicsDiscussed.push(question.questionType);

      logger.info('Follow-up question executed', {
        roomId,
        questionId: questionMessage.id,
        responseId: responseMessage.id,
      });

      return responseMessage;
    } catch (error) {
      logger.error('Failed to execute follow-up question', { roomId, error });
      throw error;
    }
  }

  /**
   * 多方案对比分析
   * AD003-CR05: 多方案对比分析
   */
  async compareOffers(roomId: string): Promise<ComparisonResult> {
    const room = this.getRoom(roomId);
    const startTime = Date.now();

    try {
      logger.info('Starting offer comparison', { roomId });

      // Collect all offers from merchants
      const allOffers: Array<{ merchantId: string; offer: MerchantOffer }> = [];
      for (const [merchantId, offers] of room.context.merchantOffers.entries()) {
        for (const offer of offers) {
          allOffers.push({ merchantId, offer });
        }
      }

      if (allOffers.length < 2) {
        throw new Error('At least 2 offers are required for comparison');
      }

      // Build prompt for comparison using AI002 (demand extraction/analysis)
      const prompt = this.buildComparisonPrompt(room, allOffers);

      // Generate comparison using LLM
      const response = await llmService.generateText(prompt, {
        temperature: 0.4,
        maxTokens: 1500,
      });

      // Parse comparison result
      const comparisonResult = this.parseComparisonResult(response.text, allOffers, room);

      // Store in room context
      room.context.comparisonResult = comparisonResult;
      room.status = 'comparing';
      room.updatedAt = new Date();

      // Record metrics
      await this.recordMetrics('offer_comparison', response, startTime);

      logger.info('Offer comparison completed', {
        roomId,
        offerCount: allOffers.length,
        latencyMs: Date.now() - startTime,
      });

      return comparisonResult;
    } catch (error) {
      logger.error('Failed to compare offers', { roomId, error });
      throw error;
    }
  }

  /**
   * 生成对比分析报告消息
   */
  async generateComparisonReport(
    roomId: string,
    comparisonResult: ComparisonResult
  ): Promise<NegotiationMessage> {
    const room = this.getRoom(roomId);

    try {
      logger.info('Generating comparison report message', { roomId });

      // Build report from comparison result
      const reportContent = this.buildComparisonReportContent(comparisonResult);

      const message: NegotiationMessage = {
        id: `msg-${uuidv4()}`,
        roomId,
        senderId: room.consumerAgent.id,
        senderType: 'consumer',
        content: reportContent,
        messageType: 'comparison',
        timestamp: new Date(),
        metadata: {
          comparisonData: comparisonResult,
        },
      };

      room.messages.push(message);
      room.updatedAt = new Date();

      logger.info('Comparison report message generated', { roomId, messageId: message.id });

      return message;
    } catch (error) {
      logger.error('Failed to generate comparison report', { roomId, error });
      throw error;
    }
  }

  /**
   * 生成最优方案推荐
   * AD003-CR06: 最优方案推荐与人工确认
   */
  async generateRecommendation(roomId: string): Promise<RecommendationResult> {
    const room = this.getRoom(roomId);
    const startTime = Date.now();

    try {
      logger.info('Generating recommendation', { roomId });

      const comparisonResult = room.context.comparisonResult;
      if (!comparisonResult) {
        throw new Error('Comparison must be performed before generating recommendation');
      }

      // Build prompt for recommendation
      const prompt = this.buildRecommendationPrompt(room, comparisonResult);

      // Generate recommendation using LLM
      const response = await llmService.generateText(prompt, {
        temperature: 0.5,
        maxTokens: 1000,
      });

      // Parse recommendation
      const recommendation = this.parseRecommendationResult(response.text, comparisonResult);

      // Store in room context
      room.context.recommendation = recommendation;
      room.status = 'recommending';
      room.updatedAt = new Date();

      // Record metrics
      await this.recordMetrics('recommendation', response, startTime);

      logger.info('Recommendation generated', {
        roomId,
        recommendedOffer: recommendation.recommendedOfferId,
        confidence: recommendation.confidence,
        latencyMs: Date.now() - startTime,
      });

      return recommendation;
    } catch (error) {
      logger.error('Failed to generate recommendation', { roomId, error });
      throw error;
    }
  }

  /**
   * 生成推荐消息
   */
  async generateRecommendationMessage(
    roomId: string,
    recommendation: RecommendationResult
  ): Promise<NegotiationMessage> {
    const room = this.getRoom(roomId);

    try {
      logger.info('Generating recommendation message', { roomId });

      // Find merchant and offer info
      let merchantName = 'Unknown';
      let offerTitle = 'Unknown';
      for (const merchant of room.merchantAgents) {
        if (merchant.id === recommendation.recommendedMerchantId) {
          merchantName = merchant.name;
          const offers = room.context.merchantOffers.get(merchant.id) || [];
          const offer = offers.find(o => o.id === recommendation.recommendedOfferId);
          if (offer) {
            offerTitle = offer.title;
          }
          break;
        }
      }

      const content = `🏆 **推荐方案**

根据您的需求分析，我为您推荐 **${merchantName}** 的 **${offerTitle}**

**推荐理由：**
${recommendation.recommendationReason}

${recommendation.savingsEstimate ? `💰 预计节省：${recommendation.savingsEstimate.amount}元 (${recommendation.savingsEstimate.percentage}% off)` : ''}

您可以选择：
1. ✅ **接受推荐** - 确认选择此方案
2. 🔍 **查看其他** - 查看其他可选方案
3. 💬 **继续协商** - 与商家进一步沟通

请问您希望怎么做？`;

      const message: NegotiationMessage = {
        id: `msg-${uuidv4()}`,
        roomId,
        senderId: room.consumerAgent.id,
        senderType: 'consumer',
        content,
        messageType: 'recommendation',
        timestamp: new Date(),
        metadata: {
          recommendationData: recommendation,
        },
      };

      room.messages.push(message);
      room.updatedAt = new Date();

      logger.info('Recommendation message generated', { roomId, messageId: message.id });

      return message;
    } catch (error) {
      logger.error('Failed to generate recommendation message', { roomId, error });
      throw error;
    }
  }

  /**
   * 确认选择方案
   */
  async confirmSelection(
    roomId: string,
    offerId: string,
    confirmed: boolean
  ): Promise<NegotiationRoom> {
    const room = this.getRoom(roomId);

    try {
      logger.info('Confirming selection', { roomId, offerId, confirmed });

      if (confirmed) {
        room.status = 'completed';

        // Add confirmation message
        const message: NegotiationMessage = {
          id: `msg-${uuidv4()}`,
          roomId,
          senderId: room.consumerAgent.id,
          senderType: 'consumer',
          content: '✅ 已确认选择此方案！正在为您准备购买流程...',
          messageType: 'system',
          timestamp: new Date(),
        };
        room.messages.push(message);
      } else {
        // User rejected, back to negotiating
        room.status = 'negotiating';
      }

      room.updatedAt = new Date();

      logger.info('Selection confirmed', { roomId, offerId, confirmed });

      return room;
    } catch (error) {
      logger.error('Failed to confirm selection', { roomId, error });
      throw error;
    }
  }

  /**
   * 获取房间
   */
  getRoom(roomId: string): NegotiationRoom {
    const room = this.rooms.get(roomId);
    if (!room) {
      throw new Error(`Room ${roomId} not found`);
    }
    return room;
  }

  /**
   * 获取所有房间
   */
  getAllRooms(): NegotiationRoom[] {
    return Array.from(this.rooms.values());
  }

  /**
   * 获取房间消息历史
   */
  getRoomMessages(roomId: string): NegotiationMessage[] {
    const room = this.getRoom(roomId);
    return room.messages;
  }

  /**
   * 构建开场白提示词
   */
  private buildIntroductionPrompt(
    room: NegotiationRoom,
    consumerProfile?: ConsumerProfile
  ): string {
    const demand = room.context.consumerDemand;

    return `你是一位智能消费助手Agent，代表消费者与商家进行协商谈判。

消费者需求信息：
${demand.productName ? `- 目标商品：${demand.productName}` : ''}
${demand.category ? `- 商品类别：${demand.category}` : ''}
${demand.budget ? `- 预算范围：${demand.budget.min || '不限'} - ${demand.budget.max || '不限'} 元` : ''}
${demand.brandPreferences?.length ? `- 品牌偏好：${demand.brandPreferences.join('、')}` : ''}
${demand.requirements?.length ? `- 具体要求：${demand.requirements.join('、')}` : ''}
${demand.timeline ? `- 购买时间：${demand.timeline}` : ''}

参与的商家：
${room.merchantAgents.map(m => `- ${m.name} (${m.profile?.businessType || '商家'})`).join('\n')}

请生成一段开场白，向商家们介绍消费者需求并启动协商。
要求：
1. 礼貌而专业
2. 清晰表达需求要点
3. 说明预算范围和期望
4. 邀请商家提供优惠方案
5. 用中文回复，控制在150字以内`;
  }

  /**
   * 构建优惠展示提示词
   */
  private buildOfferPresentationPrompt(
    room: NegotiationRoom,
    merchant: AgentInfo,
    offer: MerchantOffer
  ): string {
    return `你是商家 "${merchant.name}" 的智能Agent，正在向消费者介绍你的优惠方案。

优惠方案信息：
- 标题：${offer.title}
- 描述：${offer.description}
- 优惠类型：${offer.discountType}
- 优惠力度：${offer.discountValue}${offer.discountType === 'percentage' ? '%' : '元'}
${offer.minPurchase ? `- 最低消费：${offer.minPurchase}元` : ''}
${offer.maxDiscount ? `- 最高优惠：${offer.maxDiscount}元` : ''}
- 有效期：${offer.validFrom} 至 ${offer.validTo}
${offer.applicableProducts?.length ? `- 适用商品：${offer.applicableProducts.join('、')}` : ''}
${offer.terms?.length ? `- 使用条件：${offer.terms.join('、')}` : ''}
${offer.hiddenBenefits?.length ? `- 额外福利：${offer.hiddenBenefits.join('、')}` : ''}

消费者需求：
${room.context.consumerDemand.productName ? `- 目标商品：${room.context.consumerDemand.productName}` : ''}
${room.context.consumerDemand.budget ? `- 预算：${room.context.consumerDemand.budget.min || ''}-${room.context.consumerDemand.budget.max || ''}元` : ''}

请生成一段自然、专业的介绍，向消费者推荐这个优惠方案。
要求：
1. 热情而专业
2. 突出优惠亮点
3. 说明适用条件
4. 强调对消费者的价值
5. 用中文回复，控制在200字以内`;
  }

  /**
   * 构建追问问题提示词
   */
  private buildFollowUpQuestionsPrompt(
    room: NegotiationRoom,
    merchant: AgentInfo,
    offers: MerchantOffer[]
  ): string {
    const consumerDemand = room.context.consumerDemand;

    return `作为消费者的智能Agent，请根据商家的优惠方案和消费者的需求，生成3-5个合理的追问问题。

商家信息：
- 名称：${merchant.name}
${merchant.profile?.businessType ? `- 类型：${merchant.profile.businessType}` : ''}
${merchant.profile?.rating ? `- 评分：${merchant.profile.rating}` : ''}

商家优惠方案：
${offers.map(o => `- ${o.title}: ${o.description} (优惠：${o.discountValue}${o.discountType === 'percentage' ? '%' : '元'}${o.minPurchase ? `，满${o.minPurchase}可用` : ''})`).join('\n')}

消费者需求：
${consumerDemand.productName ? `- 目标商品：${consumerDemand.productName}` : ''}
${consumerDemand.budget ? `- 预算：${consumerDemand.budget.min || ''}-${consumerDemand.budget.max || ''}元` : ''}
${consumerDemand.requirements?.length ? `- 要求：${consumerDemand.requirements.join('、')}` : ''}

请生成追问问题，帮助消费者获得更多信息以做出决策。问题类型包括：
1. discount - 询问是否有更大折扣
2. validity - 询问有效期、延期可能
3. condition - 询问使用条件、限制
4. hidden_benefit - 询问是否有隐藏福利
5. stacking - 询问是否可叠加其他优惠

请以JSON格式返回：
{
  "questions": [
    {
      "question": "问题内容",
      "type": "问题类型",
      "context": "提出此问题的理由"
    }
  ]
}`;
  }

  /**
   * 构建商家回复提示词
   */
  private buildMerchantResponsePrompt(
    room: NegotiationRoom,
    merchant: AgentInfo,
    question: FollowUpQuestion
  ): string {
    const offers = room.context.merchantOffers.get(merchant.id) || [];

    return `你是商家 "${merchant.name}" 的智能Agent，正在回复消费者的提问。

消费者问题：${question.question}
问题类型：${question.questionType}

你的优惠方案：
${offers.map(o => `- ${o.title}: ${o.description}`).join('\n')}

请生成一个友好、专业的回复。如果问题涉及具体政策，请给出合理的回答。
要求：
1. 直接回答问题
2. 体现商家诚意
3. 可以适度提供额外信息
4. 用中文回复，控制在150字以内`;
  }

  /**
   * 构建对比提示词
   */
  private buildComparisonPrompt(
    room: NegotiationRoom,
    allOffers: Array<{ merchantId: string; offer: MerchantOffer }>
  ): string {
    const consumerDemand = room.context.consumerDemand;

    return `作为智能消费分析助手，请对比分析以下商家的优惠方案。

消费者需求：
${consumerDemand.productName ? `- 目标商品：${consumerDemand.productName}` : ''}
${consumerDemand.category ? `- 类别：${consumerDemand.category}` : ''}
${consumerDemand.budget ? `- 预算：${consumerDemand.budget.min || ''}-${consumerDemand.budget.max || ''}元` : ''}
${consumerDemand.brandPreferences?.length ? `- 品牌偏好：${consumerDemand.brandPreferences.join('、')}` : ''}
${consumerDemand.requirements?.length ? `- 要求：${consumerDemand.requirements.join('、')}` : ''}

商家优惠方案：
${allOffers.map(({ merchantId, offer }, idx) => {
  const merchant = room.merchantAgents.find(m => m.id === merchantId);
  return `${idx + 1}. ${merchant?.name || 'Unknown'} - ${offer.title}
   - 优惠：${offer.discountValue}${offer.discountType === 'percentage' ? '%' : '元'}
   ${offer.minPurchase ? `- 最低消费：${offer.minPurchase}元` : ''}
   - 有效期：${offer.validFrom} 至 ${offer.validTo}
   ${offer.applicableProducts?.length ? `- 适用：${offer.applicableProducts.join('、')}` : ' - 适用：全部商品'}`;
}).join('\n')}

请进行全面对比分析，包括：
1. 优惠价值（节省金额）
2. 匹配度（与消费者需求的匹配程度）
3. 便利性（使用条件、限制等）
4. 为每个方案打分（0-100）
5. 列出每个方案的优缺点

请以JSON格式返回分析结果：
{
  "offers": [
    {
      "offerId": "优惠ID",
      "merchantId": "商家ID",
      "scores": {
        "value": 85,
        "match": 90,
        "convenience": 80,
        "overall": 85
      },
      "pros": ["优点1", "优点2"],
      "cons": ["缺点1", "缺点2"]
    }
  ],
  "summary": "整体分析总结",
  "bestValueOffer": "最具价值优惠ID",
  "bestMatchOffer": "最匹配需求优惠ID"
}`;
  }

  /**
   * 构建推荐提示词
   */
  private buildRecommendationPrompt(
    room: NegotiationRoom,
    comparisonResult: ComparisonResult
  ): string {
    return `作为智能消费顾问，请根据对比分析结果，为消费者推荐最优方案。

对比分析结果：
${comparisonResult.offers.map(o => {
  const merchant = room.merchantAgents.find(m => m.id === o.merchantId);
  return `- ${merchant?.name || 'Unknown'} (${o.offer.title})
  综合评分：${o.scores.overall}
  优惠价值：${o.scores.value}
  匹配度：${o.scores.match}
  便利性：${o.scores.convenience}
  优点：${o.pros.join('、')}
  缺点：${o.cons.join('、')}`;
}).join('\n')}

${comparisonResult.summary ? `分析总结：${comparisonResult.summary}` : ''}

请推荐最优方案，并提供详细的推荐理由。
请以JSON格式返回：
{
  "recommendedOfferId": "推荐的优惠ID",
  "recommendedMerchantId": "推荐的商家ID",
  "recommendationReason": "详细的推荐理由（100-200字）",
  "alternativeOffers": ["备选方案ID1", "备选方案ID2"],
  "confidence": 0.92,
  "savingsEstimate": {
    "amount": 500,
    "percentage": 20
  }
}`;
  }

  /**
   * 解析追问问题
   */
  private parseFollowUpQuestions(text: string, targetMerchantId: string): FollowUpQuestion[] {
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return [];
      }

      const result = JSON.parse(jsonMatch[0]);
      const questions: FollowUpQuestion[] = [];

      for (const q of result.questions || []) {
        questions.push({
          question: q.question,
          targetMerchantId,
          questionType: q.type as FollowUpQuestion['questionType'],
          context: q.context || '',
        });
      }

      return questions;
    } catch (error) {
      logger.error('Failed to parse follow-up questions', { error, text });
      return [];
    }
  }

  /**
   * 解析对比结果
   */
  private parseComparisonResult(
    text: string,
    allOffers: Array<{ merchantId: string; offer: MerchantOffer }>,
    room: NegotiationRoom
  ): ComparisonResult {
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const result = JSON.parse(jsonMatch[0]);
      const comparedOffers: ComparedOffer[] = [];

      for (const offerData of result.offers || []) {
        const originalOffer = allOffers.find(
          o => o.offer.id === offerData.offerId
        );
        if (originalOffer) {
          const merchant = room.merchantAgents.find(
            m => m.id === offerData.merchantId
          );
          comparedOffers.push({
            offerId: offerData.offerId,
            merchantId: offerData.merchantId,
            merchantName: merchant?.name || 'Unknown',
            offer: originalOffer.offer,
            scores: offerData.scores,
            pros: offerData.pros || [],
            cons: offerData.cons || [],
          });
        }
      }

      return {
        offers: comparedOffers,
        summary: result.summary || '',
        bestValueOffer: result.bestValueOffer,
        bestMatchOffer: result.bestMatchOffer,
        analysisDimensions: {
          price: 80,
          quality: 75,
          convenience: 85,
          match: 90,
        },
      };
    } catch (error) {
      logger.error('Failed to parse comparison result', { error, text });
      // Return a basic fallback result
      return {
        offers: allOffers.map(({ merchantId, offer }) => {
          const merchant = room.merchantAgents.find(m => m.id === merchantId);
          return {
            offerId: offer.id,
            merchantId,
            merchantName: merchant?.name || 'Unknown',
            offer,
            scores: { value: 70, match: 70, convenience: 70, overall: 70 },
            pros: ['优惠可用'],
            cons: ['需要更多信息'],
          };
        }),
        summary: '对比分析完成，但详细评分需要进一步完善',
        analysisDimensions: {
          price: 70,
          quality: 70,
          convenience: 70,
          match: 70,
        },
      };
    }
  }

  /**
   * 解析推荐结果
   */
  private parseRecommendationResult(
    text: string,
    comparisonResult: ComparisonResult
  ): RecommendationResult {
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const result = JSON.parse(jsonMatch[0]);

      return {
        recommendedOfferId: result.recommendedOfferId,
        recommendedMerchantId: result.recommendedMerchantId,
        recommendationReason: result.recommendationReason,
        alternativeOffers: result.alternativeOffers || [],
        confidence: result.confidence || 0.7,
        savingsEstimate: result.savingsEstimate,
      };
    } catch (error) {
      logger.error('Failed to parse recommendation result', { error, text });
      // Return a fallback recommendation
      const bestOffer = comparisonResult.offers.reduce((best, current) =>
        current.scores.overall > best.scores.overall ? current : best
      );

      return {
        recommendedOfferId: bestOffer.offerId,
        recommendedMerchantId: bestOffer.merchantId,
        recommendationReason: `基于综合评分(${bestOffer.scores.overall}分)，该方案在优惠价值、匹配度和便利性方面表现最佳。`,
        alternativeOffers: comparisonResult.offers
          .filter(o => o.offerId !== bestOffer.offerId)
          .slice(0, 2)
          .map(o => o.offerId),
        confidence: bestOffer.scores.overall / 100,
      };
    }
  }

  /**
   * 构建对比报告内容
   */
  private buildComparisonReportContent(comparisonResult: ComparisonResult): string {
    const lines: string[] = ['📊 **方案对比分析**\n'];

    for (const offer of comparisonResult.offers) {
      lines.push(`**${offer.merchantName}** - ${offer.offer.title}`);
      lines.push(`• 综合评分：${offer.scores.overall}/100`);
      lines.push(`• 优惠价值：${offer.scores.value}/100`);
      lines.push(`• 匹配度：${offer.scores.match}/100`);
      lines.push(`• 优点：${offer.pros.join('、')}`);
      if (offer.cons.length > 0) {
        lines.push(`• 注意：${offer.cons.join('、')}`);
      }
      lines.push('');
    }

    if (comparisonResult.summary) {
      lines.push(`**分析总结：** ${comparisonResult.summary}`);
    }

    return lines.join('\n');
  }

  /**
   * 记录指标
   */
  private async recordMetrics(
    operation: string,
    response: { provider: string; model: string; usage?: { input: number; output: number; total: number }; cost?: number; latencyMs?: number },
    startTime: number
  ): Promise<void> {
    await metricsService.recordRequest({
      requestId: `negotiation-${operation}-${Date.now()}`,
      provider: response.provider as LLMProvider,
      model: response.model,
      latencyMs: response.latencyMs || Date.now() - startTime,
      success: true,
      tokenUsage: response.usage || { input: 0, output: 0, total: 0 },
      costUsd: response.cost || 0,
    });
  }

  /**
   * 获取服务版本
   */
  getVersion(): string {
    return this.version;
  }
}

// Export singleton instance
export const agentNegotiationService = new AgentNegotiationService();
