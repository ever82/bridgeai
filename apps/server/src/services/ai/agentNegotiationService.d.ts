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
    budgetRange?: {
        min: number;
        max: number;
    };
    categoryPreferences?: string[];
    brandPreferences?: string[];
    purchaseHistory?: string[];
    creditScore?: number;
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
    creditScore?: number;
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
    creditScore?: number;
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
        budget?: {
            min?: number;
            max?: number;
        };
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
export declare class AgentNegotiationService {
    private version;
    private rooms;
    private defaultConfig;
    /**
     * 创建协商群聊房间
     * AD003-CR01: 匹配商家群聊创建
     */
    createNegotiationRoom(consumerAgent: AgentInfo, merchantAgents: AgentInfo[], consumerDemand: NegotiationContext['consumerDemand'], config?: Partial<NegotiationConfig>): Promise<NegotiationRoom>;
    /**
     * 生成Agent开场白
     * AD003-CR02: Agent自动介绍与需求表达
     */
    generateConsumerIntroduction(roomId: string, consumerProfile?: ConsumerProfile): Promise<NegotiationMessage>;
    /**
     * 生成商家优惠方案展示
     * AD003-CR03: 商家Agent优惠方案展示
     */
    generateMerchantOfferPresentation(roomId: string, merchantId: string, offer: MerchantOffer): Promise<NegotiationMessage>;
    /**
     * 生成智能追问问题
     * AD003-CR04: 智能条件协商与追问
     */
    generateFollowUpQuestions(roomId: string, targetMerchantId: string): Promise<FollowUpQuestion[]>;
    /**
     * 执行协商追问
     */
    executeFollowUpQuestion(roomId: string, question: FollowUpQuestion): Promise<NegotiationMessage>;
    /**
     * 多方案对比分析
     * AD003-CR05: 多方案对比分析
     */
    compareOffers(roomId: string): Promise<ComparisonResult>;
    /**
     * 生成对比分析报告消息
     */
    generateComparisonReport(roomId: string, comparisonResult: ComparisonResult): Promise<NegotiationMessage>;
    /**
     * 生成最优方案推荐
     * AD003-CR06: 最优方案推荐与人工确认
     */
    generateRecommendation(roomId: string): Promise<RecommendationResult>;
    /**
     * 生成推荐消息
     */
    generateRecommendationMessage(roomId: string, recommendation: RecommendationResult): Promise<NegotiationMessage>;
    /**
     * 确认选择方案
     */
    confirmSelection(roomId: string, offerId: string, confirmed: boolean): Promise<NegotiationRoom>;
    /**
     * 获取房间
     */
    getRoom(roomId: string): NegotiationRoom;
    /**
     * 获取所有房间
     */
    getAllRooms(): NegotiationRoom[];
    /**
     * 获取房间消息历史
     */
    getRoomMessages(roomId: string): NegotiationMessage[];
    /**
     * 构建开场白提示词
     */
    private buildIntroductionPrompt;
    /**
     * 构建优惠展示提示词
     */
    private buildOfferPresentationPrompt;
    /**
     * 构建追问问题提示词
     */
    private buildFollowUpQuestionsPrompt;
    /**
     * 构建商家回复提示词
     */
    private buildMerchantResponsePrompt;
    /**
     * 构建对比提示词
     */
    private buildComparisonPrompt;
    /**
     * 构建推荐提示词
     */
    private buildRecommendationPrompt;
    /**
     * 解析追问问题
     */
    private parseFollowUpQuestions;
    /**
     * 解析对比结果
     */
    private parseComparisonResult;
    /**
     * 解析推荐结果
     */
    private parseRecommendationResult;
    /**
     * 构建对比报告内容
     */
    private buildComparisonReportContent;
    /**
     * 记录指标
     */
    private recordMetrics;
    /**
     * 获取服务版本
     */
    getVersion(): string;
}
export declare const agentNegotiationService: AgentNegotiationService;
//# sourceMappingURL=agentNegotiationService.d.ts.map