/**
 * Conversation Report Service
 * 会话报告生成服务 (ISSUE-DATE003 c4)
 *
 * 功能:
 * - 生成会话摘要
 * - 重新评估匹配兼容性分数
 * - 识别共同兴趣亮点
 * - 生成对话建议和提示
 * - 创建结构化报告
 */
/**
 * 会话报告接口
 */
export interface ConversationReport {
    id: string;
    roomId: string;
    agentAId: string;
    agentBId: string;
    userIdA: string;
    userIdB: string;
    summary: string;
    compatibilityScore: number;
    previousMatchScore: number;
    scoreChange: number;
    sharedInterests: string[];
    highlights: ConversationHighlight[];
    topics: TopicSummary[];
    suggestions: string[];
    duration: number;
    totalRounds: number;
    qualityMetrics: {
        fluency: number;
        engagement: number;
        depth: number;
    };
    createdAt: Date;
}
/**
 * 会话亮点接口
 */
export interface ConversationHighlight {
    topic: string;
    content: string;
    round: number;
    type: 'shared_interest' | 'deep_connection' | 'fun_moment' | 'value_alignment';
}
/**
 * 话题摘要接口
 */
export interface TopicSummary {
    name: string;
    rounds: number;
    depth: number;
    engagement: number;
}
/**
 * 会话消息接口
 */
export interface ConversationMessage {
    id: string;
    senderId: string;
    content: string;
    timestamp: Date;
    round: number;
}
/**
 * 会话质量评估接口
 */
export interface QualityAssessment {
    round: number;
    fluency: number;
    engagement: number;
    depth: number;
    topic?: string;
}
/**
 * 会话数据接口
 */
export interface SessionData {
    roomId: string;
    agentAId: string;
    agentBId: string;
    userIdA: string;
    userIdB: string;
    messages: ConversationMessage[];
    startTime: Date;
    endTime?: Date;
    matchScore?: number;
}
/**
 * 用户档案接口（简化版）
 */
export interface UserProfile {
    id: string;
    userId: string;
    interests: string[];
    personality?: string[];
    lifestyle?: string[];
    expectations?: string[];
}
/**
 * 会话报告服务
 */
export declare class ConversationReportService {
    private version;
    private reports;
    /**
     * 生成会话报告
     * 整合会话数据、质量评估生成完整报告
     */
    generateReport(roomId: string, sessionData: SessionData, qualityAssessments: QualityAssessment[]): Promise<ConversationReport>;
    /**
     * 生成会话摘要
     * 使用LLM分析对话内容生成简洁摘要
     */
    private generateSummary;
    /**
     * 生成默认摘要（基于消息统计）
     */
    private generateFallbackSummary;
    /**
     * 评估兼容性分数
     * 根据对话内容、话题深度、共同兴趣等因素重新评估匹配分数
     */
    private evaluateCompatibility;
    /**
     * 提取话题信息
     */
    private extractTopics;
    /**
     * 简单话题检测
     */
    private detectTopics;
    /**
     * 估算话题深度
     */
    private estimateTopicDepth;
    /**
     * 提取会话亮点
     */
    private extractHighlights;
    /**
     * 提取共同兴趣
     */
    private extractSharedInterests;
    /**
     * 计算质量指标
     */
    private calculateQualityMetrics;
    /**
     * 生成对话建议
     */
    private generateSuggestions;
    /**
     * 获取报告
     */
    getReport(reportId: string): Promise<ConversationReport | null>;
    /**
     * 根据用户ID获取报告列表
     */
    getReportsByUser(userId: string): Promise<ConversationReport[]>;
    /**
     * 持久化报告
     */
    private persistReport;
    /**
     * 从数据库加载报告
     */
    private loadReport;
    /**
     * 获取服务版本
     */
    getVersion(): string;
}
export declare const conversationReportService: ConversationReportService;
//# sourceMappingURL=conversationReportService.d.ts.map