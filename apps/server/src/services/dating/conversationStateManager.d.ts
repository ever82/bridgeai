/**
 * Conversation State Manager
 * 对话状态管理服务
 *
 * 管理约会对话的生命周期和状态转换，包括：
 * - 创建初始对话状态
 * - 阶段转换（intro → exploring → deepening → closing → completed）
 * - 轮次计数与限制
 * - 超时与过期处理
 * - 状态持久化
 */
export type ConversationPhase = 'intro' | 'exploring' | 'deepening' | 'closing' | 'completed';
export type ConversationStatus = 'pending' | 'active' | 'paused' | 'completed' | 'expired' | 'terminated';
export interface ConversationState {
    roomId: string;
    status: ConversationStatus;
    phase: ConversationPhase;
    currentRound: number;
    maxRounds: number;
    startTime: Date | null;
    lastActivityTime: Date | null;
    timeoutMs: number;
    phaseHistory: PhaseTransition[];
    metadata: Record<string, any>;
}
export interface PhaseTransition {
    from: ConversationPhase;
    to: ConversationPhase;
    round: number;
    timestamp: Date;
    trigger: 'auto' | 'manual' | 'timeout';
}
export interface StateTransitionResult {
    success: boolean;
    previousState: ConversationState | null;
    newState: ConversationState;
    error?: string;
}
/**
 * 创建初始对话状态
 */
export declare function createInitialState(roomId: string, config?: {
    maxRounds?: number;
    timeoutMs?: number;
    metadata?: Record<string, any>;
}): ConversationState;
/**
 * 验证阶段转换是否合法
 */
export declare function validateTransition(from: ConversationPhase, to: ConversationPhase): boolean;
/**
 * 执行阶段转换
 */
export declare function transitionPhase(state: ConversationState, newPhase: ConversationPhase, trigger: 'auto' | 'manual' | 'timeout'): StateTransitionResult;
/**
 * 推进到下一轮
 */
export declare function advanceRound(state: ConversationState): ConversationState;
/**
 * 根据当前状态判断是否应该自动转换阶段
 * 返回建议的新阶段，若无需转换则返回 null
 */
export declare function checkPhaseTransition(state: ConversationState, _messageContent?: string, qualityScore?: number): ConversationPhase | null;
/**
 * 检查对话是否已完成
 */
export declare function isConversationComplete(state: ConversationState): boolean;
/**
 * 获取状态摘要
 */
export declare function getStateSummary(state: ConversationState): Record<string, any>;
/**
 * 检查并处理超时
 */
export declare function checkTimeout(state: ConversationState): Promise<StateTransitionResult | null>;
/**
 * 持久化状态到数据库
 */
export declare function persistState(state: ConversationState): Promise<boolean>;
/**
 * 从缓存或数据库加载状态
 */
export declare function loadState(roomId: string): Promise<ConversationState | null>;
/**
 * 终止对话
 */
export declare function terminateConversation(state: ConversationState, reason?: string): StateTransitionResult;
/**
 * 暂停对话
 */
export declare function pauseConversation(state: ConversationState): ConversationState;
/**
 * 恢复对话
 */
export declare function resumeConversation(state: ConversationState): ConversationState;
declare const _default: {
    createInitialState: typeof createInitialState;
    transitionPhase: typeof transitionPhase;
    advanceRound: typeof advanceRound;
    checkPhaseTransition: typeof checkPhaseTransition;
    isConversationComplete: typeof isConversationComplete;
    getStateSummary: typeof getStateSummary;
    validateTransition: typeof validateTransition;
    checkTimeout: typeof checkTimeout;
    persistState: typeof persistState;
    loadState: typeof loadState;
    terminateConversation: typeof terminateConversation;
    pauseConversation: typeof pauseConversation;
    resumeConversation: typeof resumeConversation;
};
export default _default;
//# sourceMappingURL=conversationStateManager.d.ts.map