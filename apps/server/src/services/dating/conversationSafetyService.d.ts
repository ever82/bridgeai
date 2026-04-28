/**
 * Conversation Safety Service
 * 会话安全服务 (ISSUE-DATE003 c6)
 *
 * 功能:
 * - 敏感话题检测
 * - 不当内容过滤
 * - 异常中断处理
 * - 紧急终止机制
 * - 纠纷举报管理
 */
/**
 * 安全等级类型
 */
export type SafetyLevel = 'safe' | 'warning' | 'danger' | 'critical';
/**
 * 安全检查结果接口
 */
export interface SafetyCheck {
    roomId: string;
    messageId: string;
    level: SafetyLevel;
    flags: SafetyFlag[];
    action: 'allow' | 'warn' | 'block' | 'terminate';
    timestamp: Date;
}
/**
 * 安全标志接口
 */
export interface SafetyFlag {
    type: 'sensitive_topic' | 'inappropriate_content' | 'harassment' | 'personal_info' | 'offensive_language';
    severity: SafetyLevel;
    description: string;
    confidence: number;
}
/**
 * 纠纷举报接口
 */
export interface DisputeReport {
    id: string;
    roomId: string;
    reporterId: string;
    reportedUserId: string;
    reason: string;
    evidence: string[];
    status: 'pending' | 'reviewing' | 'resolved';
    createdAt: Date;
}
/**
 * 安全配置接口
 */
export interface SafetyConfig {
    enableContentFilter: boolean;
    enableSensitiveTopicDetection: boolean;
    enablePersonalInfoProtection: boolean;
    autoTerminateThreshold: SafetyLevel;
}
/**
 * 检查消息安全性
 * 综合检测敏感话题、不当内容和隐私信息
 */
export declare function checkMessageSafety(roomId: string, messageId: string, content: string, senderId: string): Promise<SafetyCheck>;
/**
 * 检测敏感话题
 * 分析消息是否涉及敏感话题
 */
export declare function detectSensitiveTopics(content: string): Promise<SafetyFlag[]>;
/**
 * 过滤不当内容
 * 检测并替换不当言论
 */
export declare function filterInappropriateContent(content: string): Promise<{
    filtered: string;
    flags: SafetyFlag[];
}>;
/**
 * 处理异常中断
 * 记录并处理会话异常中断情况
 */
export declare function handleAbnormalInterruption(roomId: string, reason: string): Promise<void>;
/**
 * 紧急终止会话
 * 用于处理严重安全事件的强制终止
 */
export declare function emergencyTerminate(roomId: string, initiatorId: string, reason: string): Promise<void>;
/**
 * 创建纠纷举报
 * 用户可以对会话中的不当行为进行举报
 */
export declare function createDisputeReport(roomId: string, reporterId: string, reason: string, evidence: string[]): Promise<DisputeReport>;
/**
 * 获取安全配置
 */
export declare function getSafetyConfig(): Promise<SafetyConfig>;
declare const _default: {
    checkMessageSafety: typeof checkMessageSafety;
    detectSensitiveTopics: typeof detectSensitiveTopics;
    filterInappropriateContent: typeof filterInappropriateContent;
    handleAbnormalInterruption: typeof handleAbnormalInterruption;
    emergencyTerminate: typeof emergencyTerminate;
    createDisputeReport: typeof createDisputeReport;
    getSafetyConfig: typeof getSafetyConfig;
};
export default _default;
//# sourceMappingURL=conversationSafetyService.d.ts.map