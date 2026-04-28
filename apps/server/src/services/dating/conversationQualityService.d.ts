export interface QualityMetrics {
    fluency: number;
    topicDepth: number;
    engagement: number;
    coherence: number;
    personaConsistency: number;
    overall: number;
}
export interface QualityAssessment {
    roomId: string;
    round: number;
    metrics: QualityMetrics;
    issues: QualityIssue[];
    suggestions: string[];
    timestamp: Date;
}
export interface QualityIssue {
    type: 'low_engagement' | 'off_topic' | 'repetitive' | 'inappropriate' | 'stalled';
    severity: 'low' | 'medium' | 'high';
    description: string;
    round: number;
}
export interface QualityTrend {
    roomId: string;
    assessments: QualityAssessment[];
    averageScore: number;
    trendDirection: 'improving' | 'stable' | 'declining';
}
/**
 * 综合评估对话质量
 */
export declare function assessConversation(roomId: string, messages: Array<{
    role: string;
    content: string;
    agentId?: string;
}>, round: number): Promise<QualityAssessment>;
/**
 * 计算对话流畅度
 * 基于消息长度变化、响应速度、语言连贯性
 */
export declare function calculateFluency(messages: Array<{
    role: string;
    content: string;
}>): Promise<number>;
/**
 * 评估话题深度
 * 基于关键词密度、话题延展性、观点表达
 */
export declare function evaluateTopicDepth(messages: Array<{
    role: string;
    content: string;
}>, topics: string[]): Promise<number>;
/**
 * 分析参与度
 * 基于双方消息数量、回复率、内容充实度
 */
export declare function analyzeEngagement(messages: Array<{
    role: string;
    content: string;
    agentId?: string;
}>, agentAId: string, agentBId: string): Promise<number>;
/**
 * 检测对话问题
 */
export declare function detectIssues(messages: Array<{
    role: string;
    content: string;
}>, round: number): Promise<QualityIssue[]>;
/**
 * 获取质量趋势
 */
export declare function getQualityTrend(roomId: string): Promise<QualityTrend>;
/**
 * 生成质量报告
 */
export declare function generateQualityReport(roomId: string): Promise<QualityAssessment[]>;
declare const _default: {
    assessConversation: typeof assessConversation;
    calculateFluency: typeof calculateFluency;
    evaluateTopicDepth: typeof evaluateTopicDepth;
    analyzeEngagement: typeof analyzeEngagement;
    detectIssues: typeof detectIssues;
    getQualityTrend: typeof getQualityTrend;
    generateQualityReport: typeof generateQualityReport;
};
export default _default;
//# sourceMappingURL=conversationQualityService.d.ts.map