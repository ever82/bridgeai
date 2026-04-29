/**
 * Agent Initiated Chat Service
 * Agent主动发起约会对话服务 - 双方Agent启动对话、目标设定、轮次控制
 */
import { type OpeningLineResult } from '../ai/openingLineService';
import type { MatchScore } from './matchAlgorithm';
export declare enum ChatStatus {
    PENDING = "pending",// 等待启动
    ACTIVE = "active",// 进行中
    PAUSED = "paused",// 暂停等待用户
    COMPLETED = "completed",// 已完成
    FAILED = "failed"
}
export interface ChatMessage {
    id: string;
    sessionId: string;
    senderAgentId: string;
    senderName: string;
    content: string;
    timestamp: Date;
    metadata?: {
        isAiGenerated?: boolean;
        turnNumber?: number;
        basedOnHighlights?: string[];
    };
}
export interface ChatGoal {
    primary: string;
    secondary?: string;
    completionCriteria: string[];
}
export interface ChatSession {
    id: string;
    matchScore: MatchScore;
    sourceAgentId: string;
    targetAgentId: string;
    sourceUserId: string;
    targetUserId: string;
    status: ChatStatus;
    goals: ChatGoal[];
    messages: ChatMessage[];
    openingLine?: OpeningLineResult;
    config: ChatConfig;
    createdAt: Date;
    updatedAt: Date;
    pausedAt?: Date;
    completedAt?: Date;
}
export interface ChatConfig {
    maxAutoTurns: number;
    turnDelayMs: number;
    pauseAfterHighMatch: boolean;
    highMatchThreshold: number;
}
/**
 * Agent主动发起对话
 */
export declare function initiateChat(params: {
    matchScore: MatchScore;
    sourceAgentId: string;
    targetAgentId: string;
    sourceUserId: string;
    targetUserId: string;
    config?: Partial<ChatConfig>;
    customGoal?: string;
}): Promise<ChatSession>;
/**
 * 生成Agent自动响应
 */
export declare function generateAgentResponse(sessionId: string, respondingAgentId: string): Promise<ChatMessage | null>;
/**
 * 暂停对话等待用户输入
 */
export declare function pauseChatForUserInput(sessionId: string): Promise<void>;
/**
 * 用户发送消息（恢复对话）
 */
export declare function sendUserMessage(sessionId: string, userId: string, content: string): Promise<ChatMessage>;
/**
 * 完成对话
 */
export declare function completeChat(sessionId: string, outcome: 'success' | 'no_interest' | 'timeout'): Promise<ChatSession>;
/**
 * 获取对话会话
 */
export declare function getChatSession(sessionId: string): ChatSession | undefined;
/**
 * 获取用户的所有活跃对话
 */
export declare function getActiveChatsForUser(userId: string): ChatSession[];
/**
 * 获取用户的所有对话历史
 */
export declare function getChatHistoryForUser(userId: string): ChatSession[];
declare const _default: {
    initiateChat: typeof initiateChat;
    generateAgentResponse: typeof generateAgentResponse;
    pauseChatForUserInput: typeof pauseChatForUserInput;
    sendUserMessage: typeof sendUserMessage;
    completeChat: typeof completeChat;
    getChatSession: typeof getChatSession;
    getActiveChatsForUser: typeof getActiveChatsForUser;
    getChatHistoryForUser: typeof getChatHistoryForUser;
};
export default _default;
//# sourceMappingURL=agentInitiatedChat.d.ts.map