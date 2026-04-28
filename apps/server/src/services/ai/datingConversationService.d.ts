/**
 * Dating Conversation Service
 * 约会对话生成服务 (ISSUE-DATE003 c2)
 *
 * 功能：
 * - 基于用户画像生成匹配的约会对话
 * - 话题引导与建议
 * - 角色一致性维护
 * - 多轮上下文记忆
 * - 与AgentDialogService集成
 */
import type { AgentPersona } from './agentDialogService';
/**
 * 约会对话配置
 */
export interface DatingConversationConfig {
    maxRounds: number;
    turnTimeoutMs: number;
    personaConsistencyThreshold: number;
    topicDepthLevels: number;
}
/**
 * 约会画像摘要
 */
export interface DatingProfileSummary {
    userId: string;
    agentId: string;
    interests: string[];
    personality: string[];
    lifestyle: string[];
    goals: string[];
    description?: string;
}
/**
 * 会话状态
 */
export type SessionStatus = 'active' | 'completed' | 'error';
/**
 * 话题类别
 */
export type TopicCategory = 'icebreaker' | 'interest' | 'value' | 'lifestyle' | 'deep';
/**
 * 对话话题
 */
export interface ConversationTopic {
    id: string;
    name: string;
    category: TopicCategory;
    relevanceScore: number;
    questions: string[];
    explored: boolean;
}
/**
 * 对话记忆
 */
export interface ConversationMemory {
    sharedInterests: string[];
    discussedTopics: string[];
    highlights: string[];
    connectionPoints: string[];
    redFlags: string[];
}
/**
 * 约会对话会话
 */
export interface DatingConversationSession {
    id: string;
    roomId: string;
    agentAId: string;
    agentBId: string;
    userIdA: string;
    userIdB: string;
    profileA: DatingProfileSummary;
    profileB: DatingProfileSummary;
    topics: ConversationTopic[];
    currentTopicIndex: number;
    round: number;
    status: SessionStatus;
    personaA: AgentPersona;
    personaB: AgentPersona;
    context: ConversationMemory;
    createdAt: Date;
    updatedAt: Date;
}
export declare class DatingConversationService {
    private sessions;
    private defaultConfig;
    constructor(config?: Partial<DatingConversationConfig>);
    /**
     * 创建默认角色画像
     */
    private buildDefaultPersona;
    /**
     * 启动新对话会话
     */
    startConversation(agentAId: string, agentBId: string, userIdA: string, userIdB: string, profileA: DatingProfileSummary, profileB: DatingProfileSummary): Promise<DatingConversationSession>;
    /**
     * 生成下一轮对话（双方各一条消息）
     */
    generateNextTurn(sessionId: string): Promise<{
        agentAMessage: string;
        agentBMessage: string;
        topic: string;
    }>;
    /**
     * 生成单个Agent的回复
     */
    generateAgentResponse(sessionId: string, agentId: string, topic?: ConversationTopic): Promise<string>;
    /**
     * 构建话题队列
     */
    private buildTopicQueue;
    /**
     * 选择下一个话题
     */
    private selectNextTopic;
    /**
     * 构建对话提示词
     */
    private buildConversationPrompt;
    /**
     * 构建系统提示词
     */
    private buildSystemPrompt;
    /**
     * 生成备用回复（当LLM不可用时）
     */
    private generateFallbackResponse;
    /**
     * 分析角色一致性分数
     */
    private analyzePersonaConsistency;
    /**
     * 获取对话摘要
     */
    getConversationSummary(sessionId: string): Promise<ConversationMemory>;
    /**
     * 获取会话详情
     */
    getSession(sessionId: string): Promise<DatingConversationSession | null>;
    /**
     * 查找共同兴趣
     */
    private findSharedInterests;
    /**
     * 更新会话状态
     */
    updateSessionStatus(sessionId: string, status: SessionStatus): Promise<void>;
    /**
     * 清理过期会话
     */
    cleanupExpiredSessions(): Promise<number>;
}
export declare const datingConversationService: DatingConversationService;
//# sourceMappingURL=datingConversationService.d.ts.map