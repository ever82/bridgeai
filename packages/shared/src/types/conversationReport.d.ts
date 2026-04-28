/**
 * Conversation Report Types
 * 对话报告类型定义
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
    qualityMetrics: QualityMetricsSummary;
    createdAt: string;
}
export interface ConversationHighlight {
    topic: string;
    content: string;
    round: number;
    type: 'shared_interest' | 'deep_connection' | 'fun_moment' | 'value_alignment';
}
export interface TopicSummary {
    name: string;
    rounds: number;
    depth: number;
    engagement: number;
}
export interface QualityMetricsSummary {
    fluency: number;
    engagement: number;
    depth: number;
    overall: number;
}
export type ConversationStatus = 'pending' | 'active' | 'completed' | 'expired' | 'terminated';
export type SafetyLevel = 'safe' | 'warning' | 'danger' | 'critical';
export interface SafetyCheckResult {
    level: SafetyLevel;
    action: 'allow' | 'warn' | 'block' | 'terminate';
    flags: string[];
}
//# sourceMappingURL=conversationReport.d.ts.map