/**
 * Agent Initiated Chat Service
 * Agent主动发起约会对话服务 - 双方Agent启动对话、目标设定、轮次控制
 */
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../../utils/logger';
import { generateOpeningLine } from '../ai/openingLineService';
// ============================================
// 类型定义
// ============================================
export var ChatStatus;
(function (ChatStatus) {
    ChatStatus["PENDING"] = "pending";
    ChatStatus["ACTIVE"] = "active";
    ChatStatus["PAUSED"] = "paused";
    ChatStatus["COMPLETED"] = "completed";
    ChatStatus["FAILED"] = "failed";
})(ChatStatus || (ChatStatus = {}));
const DEFAULT_CONFIG = {
    maxAutoTurns: 4, // 初步交流4轮后暂停
    turnDelayMs: 2000, // 2秒间隔
    pauseAfterHighMatch: true,
    highMatchThreshold: 80,
};
// ============================================
// 存储
// ============================================
const sessionStore = new Map();
// ============================================
// 核心逻辑
// ============================================
/**
 * Agent主动发起对话
 */
export async function initiateChat(params) {
    const config = { ...DEFAULT_CONFIG, ...params.config };
    const sessionId = `dating-chat-${uuidv4()}`;
    // 生成个性化开场白
    const openingLine = generateOpeningLine({
        matchScore: params.matchScore,
        tone: 'friendly',
    });
    // 设定对话目标
    const goals = [
        {
            primary: customGoalOrDefault(params.customGoal, params.matchScore),
            secondary: '发现更多共同点',
            completionCriteria: ['双方都有积极的回应', '发现了至少一个共同话题', '对话自然流畅'],
        },
    ];
    // 构建初始消息
    const firstMessage = {
        id: `msg-${uuidv4()}`,
        sessionId,
        senderAgentId: params.sourceAgentId,
        senderName: 'AI Agent',
        content: openingLine.line,
        timestamp: new Date(),
        metadata: {
            isAiGenerated: true,
            turnNumber: 1,
            basedOnHighlights: openingLine.basedOn,
        },
    };
    const session = {
        id: sessionId,
        matchScore: params.matchScore,
        sourceAgentId: params.sourceAgentId,
        targetAgentId: params.targetAgentId,
        sourceUserId: params.sourceUserId,
        targetUserId: params.targetUserId,
        status: ChatStatus.ACTIVE,
        goals,
        messages: [firstMessage],
        openingLine,
        config,
        createdAt: new Date(),
        updatedAt: new Date(),
    };
    sessionStore.set(sessionId, session);
    logger.info(`Initiated dating chat session ${sessionId}: score=${params.matchScore.totalScore}`);
    return session;
}
/**
 * 生成Agent自动响应
 */
export async function generateAgentResponse(sessionId, respondingAgentId) {
    const session = sessionStore.get(sessionId);
    if (!session || session.status !== ChatStatus.ACTIVE) {
        return null;
    }
    const currentTurn = session.messages.length;
    const autoTurnNumber = Math.ceil(currentTurn / 2); // 每两消息为一轮
    // 检查是否达到最大自动轮次
    if (autoTurnNumber >= session.config.maxAutoTurns) {
        await pauseChatForUserInput(sessionId);
        return null;
    }
    // 生成响应内容
    const lastMessage = session.messages[session.messages.length - 1];
    const responseContent = generateResponseContent(session, lastMessage, respondingAgentId);
    const response = {
        id: `msg-${uuidv4()}`,
        sessionId,
        senderAgentId: respondingAgentId,
        senderName: 'AI Agent',
        content: responseContent,
        timestamp: new Date(),
        metadata: {
            isAiGenerated: true,
            turnNumber: autoTurnNumber + 1,
        },
    };
    session.messages.push(response);
    session.updatedAt = new Date();
    // 检查是否应该暂停
    if (shouldPauseAfterTurn(session, autoTurnNumber + 1)) {
        await pauseChatForUserInput(sessionId);
    }
    return response;
}
/**
 * 暂停对话等待用户输入
 */
export async function pauseChatForUserInput(sessionId) {
    const session = sessionStore.get(sessionId);
    if (!session)
        return;
    session.status = ChatStatus.PAUSED;
    session.pausedAt = new Date();
    session.updatedAt = new Date();
    // 添加系统消息提示
    session.messages.push({
        id: `msg-${uuidv4()}`,
        sessionId,
        senderAgentId: 'system',
        senderName: '系统',
        content: 'Agent初步交流已完成，等待用户参与。',
        timestamp: new Date(),
        metadata: { isAiGenerated: false },
    });
    logger.info(`Chat session ${sessionId} paused for user input after ${session.messages.length} messages`);
}
/**
 * 用户发送消息（恢复对话）
 */
export async function sendUserMessage(sessionId, userId, content) {
    const session = sessionStore.get(sessionId);
    if (!session) {
        throw new Error(`Chat session not found: ${sessionId}`);
    }
    if (session.status === ChatStatus.PAUSED) {
        session.status = ChatStatus.ACTIVE;
        session.pausedAt = undefined;
    }
    const message = {
        id: `msg-${uuidv4()}`,
        sessionId,
        senderAgentId: userId,
        senderName: 'User',
        content,
        timestamp: new Date(),
        metadata: { isAiGenerated: false },
    };
    session.messages.push(message);
    session.updatedAt = new Date();
    return message;
}
/**
 * 完成对话
 */
export async function completeChat(sessionId, outcome) {
    const session = sessionStore.get(sessionId);
    if (!session) {
        throw new Error(`Chat session not found: ${sessionId}`);
    }
    session.status = ChatStatus.COMPLETED;
    session.completedAt = new Date();
    session.updatedAt = new Date();
    logger.info(`Chat session ${sessionId} completed: outcome=${outcome}`);
    return session;
}
// ============================================
// 查询
// ============================================
/**
 * 获取对话会话
 */
export function getChatSession(sessionId) {
    return sessionStore.get(sessionId);
}
/**
 * 获取用户的所有活跃对话
 */
export function getActiveChatsForUser(userId) {
    return [...sessionStore.values()].filter(s => ((s.sourceUserId === userId || s.targetUserId === userId) &&
        s.status === ChatStatus.ACTIVE) ||
        s.status === ChatStatus.PAUSED);
}
/**
 * 获取用户的所有对话历史
 */
export function getChatHistoryForUser(userId) {
    return [...sessionStore.values()].filter(s => s.sourceUserId === userId || s.targetUserId === userId);
}
// ============================================
// 辅助函数
// ============================================
function customGoalOrDefault(customGoal, matchScore) {
    if (customGoal)
        return customGoal;
    if (matchScore.totalScore >= 80)
        return '深入了解对方，发现共同话题';
    if (matchScore.totalScore >= 60)
        return '初步交流，探索共同点';
    return '友好交谈，了解彼此';
}
function shouldPauseAfterTurn(session, turnNumber) {
    if (turnNumber >= session.config.maxAutoTurns)
        return true;
    if (session.config.pauseAfterHighMatch &&
        session.matchScore.totalScore >= session.config.highMatchThreshold) {
        return turnNumber >= Math.ceil(session.config.maxAutoTurns / 2);
    }
    return false;
}
function generateResponseContent(session, _lastMessage, _respondingAgentId) {
    const highlights = session.matchScore.highlights;
    const matchScore = session.matchScore.totalScore;
    // 基于对话历史和匹配点生成响应
    const responses = [];
    if (highlights.length > 0) {
        const randomHighlight = highlights[Math.floor(Math.random() * highlights.length)];
        responses.push(`是的！我也注意到了${randomHighlight}。`);
    }
    if (matchScore >= 70) {
        responses.push('感觉我们挺合拍的！');
    }
    responses.push('你觉得呢？');
    responses.push('你平时喜欢做什么？');
    responses.push('说说你的故事吧！');
    responses.push('你有什么有趣的事情想分享吗？');
    // 简单策略：交替使用不同类型的响应
    const turnIndex = session.messages.length;
    return responses[turnIndex % responses.length];
}
export default {
    initiateChat,
    generateAgentResponse,
    pauseChatForUserInput,
    sendUserMessage,
    completeChat,
    getChatSession,
    getActiveChatsForUser,
    getChatHistoryForUser,
};
//# sourceMappingURL=agentInitiatedChat.js.map