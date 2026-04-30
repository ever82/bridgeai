/**
 * Agent Initiated Chat Service
 * Agent主动发起约会对话服务 - 双方Agent启动对话、目标设定、轮次控制
 */

import { v4 as uuidv4 } from 'uuid';

import { agentBehaviorService } from '../../services/agentBehaviorService';
import { logger } from '../../utils/logger';
import { agentDialogService } from '../ai/agentDialogService';
import { generateOpeningLine, type OpeningLineResult } from '../ai/openingLineService';

import type { MatchScore } from './matchAlgorithm';
import { emitPrivateAdvice, generateAdviceFromConversation } from './privateAdviceService';

// ============================================
// 类型定义
// ============================================

export enum ChatStatus {
  PENDING = 'pending', // 等待启动
  ACTIVE = 'active', // 进行中
  PAUSED = 'paused', // 暂停等待用户
  COMPLETED = 'completed', // 已完成
  FAILED = 'failed', // 失败
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
  primary: string; // 主要目标
  secondary?: string; // 次要目标
  completionCriteria: string[]; // 完成标准
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
  maxAutoTurns: number; // 最大自动轮次（之后暂停等用户）
  turnDelayMs: number; // 轮次间隔（毫秒）
  pauseAfterHighMatch: boolean; // 高匹配度后暂停
  highMatchThreshold: number; // 高匹配度阈值
}

const DEFAULT_CONFIG: ChatConfig = {
  maxAutoTurns: 4, // 初步交流4轮后暂停
  turnDelayMs: 2000, // 2秒间隔
  pauseAfterHighMatch: true,
  highMatchThreshold: 80,
};

// ============================================
// 并发限流 (env-overridable)
// ============================================

export const MAX_ACTIVE_CHATS_PER_USER = parseInt(
  process.env.MAX_ACTIVE_CHATS_PER_USER ?? '10',
  10
);
export const MAX_GLOBAL_ACTIVE_SESSIONS = parseInt(
  process.env.MAX_GLOBAL_ACTIVE_SESSIONS ?? '50',
  10
);

// ============================================
// 错误类型
// ============================================

export class MaxActiveChatsError extends Error {
  code = 'MAX_ACTIVE_CHATS' as const;
  constructor(userId: string, limit: number) {
    super(`User ${userId} has reached max active chats limit (${limit})`);
    this.name = 'MaxActiveChatsError';
  }
}

export class MaxGlobalSessionsError extends Error {
  code = 'MAX_GLOBAL_SESSIONS' as const;
  constructor(limit: number) {
    super(`Global active sessions limit reached (${limit})`);
    this.name = 'MaxGlobalSessionsError';
  }
}

export class BehaviorRejectedError extends Error {
  code = 'BEHAVIOR_REJECTED' as const;
  constructor(agentId: string) {
    super(`Agent ${agentId} is suspended by behavior service`);
    this.name = 'BehaviorRejectedError';
  }
}

// ============================================
// 存储
// ============================================

const sessionStore = new Map<string, ChatSession>();

// chatSessionId → dialogSessionId (LLM dialog session)
const dialogSessionMap = new Map<string, string>();

// ============================================
// 核心逻辑
// ============================================

/**
 * Agent主动发起对话
 */
export async function initiateChat(params: {
  matchScore: MatchScore;
  sourceAgentId: string;
  targetAgentId: string;
  sourceUserId: string;
  targetUserId: string;
  config?: Partial<ChatConfig>;
  customGoal?: string;
}): Promise<ChatSession> {
  // ===== 并发限流检查 =====
  const userActiveCount = countActiveSessionsForUser(params.sourceUserId);
  if (userActiveCount >= MAX_ACTIVE_CHATS_PER_USER) {
    throw new MaxActiveChatsError(params.sourceUserId, MAX_ACTIVE_CHATS_PER_USER);
  }

  const globalActiveCount = countGlobalActiveSessions();
  if (globalActiveCount >= MAX_GLOBAL_ACTIVE_SESSIONS) {
    throw new MaxGlobalSessionsError(MAX_GLOBAL_ACTIVE_SESSIONS);
  }

  // ===== 行为闸门 =====
  try {
    if (agentBehaviorService.isSuspended(params.sourceAgentId)) {
      throw new BehaviorRejectedError(params.sourceAgentId);
    }
  } catch (err) {
    if (err instanceof BehaviorRejectedError) throw err;
    logger.warn('agentBehaviorService.isSuspended failed; allowing chat', {
      err: err instanceof Error ? err.message : String(err),
    });
  }

  const config = { ...DEFAULT_CONFIG, ...params.config };
  const sessionId = `dating-chat-${uuidv4()}`;

  // 生成个性化开场白
  const openingLine = generateOpeningLine({
    matchScore: params.matchScore,
    tone: 'friendly',
  });

  // 设定对话目标
  const goals: ChatGoal[] = [
    {
      primary: customGoalOrDefault(params.customGoal, params.matchScore),
      secondary: '发现更多共同点',
      completionCriteria: ['双方都有积极的回应', '发现了至少一个共同话题', '对话自然流畅'],
    },
  ];

  // 构建初始消息
  const firstMessage: ChatMessage = {
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

  const session: ChatSession = {
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
export async function generateAgentResponse(
  sessionId: string,
  respondingAgentId: string
): Promise<ChatMessage | null> {
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
  const responseContent = await generateResponseContent(session, lastMessage, respondingAgentId);

  const response: ChatMessage = {
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

  // ===== 私聊建议 (AS-008) =====
  try {
    const advice = generateAdviceFromConversation(session, respondingAgentId);
    if (advice) {
      // 仅向双方主人各自的私聊房间推送，不会泄露给对方 Agent
      emitPrivateAdvice(null, session.sourceUserId, advice);
      emitPrivateAdvice(null, session.targetUserId, advice);
    }
  } catch (err) {
    logger.warn('emitPrivateAdvice failed (non-fatal)', {
      err: err instanceof Error ? err.message : String(err),
    });
  }

  // 检查是否应该暂停
  if (shouldPauseAfterTurn(session, autoTurnNumber + 1)) {
    await pauseChatForUserInput(sessionId);
  }

  return response;
}

/**
 * 暂停对话等待用户输入
 */
export async function pauseChatForUserInput(sessionId: string): Promise<void> {
  const session = sessionStore.get(sessionId);
  if (!session) return;

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

  logger.info(
    `Chat session ${sessionId} paused for user input after ${session.messages.length} messages`
  );
}

/**
 * 用户发送消息（恢复对话）
 */
export async function sendUserMessage(
  sessionId: string,
  userId: string,
  content: string
): Promise<ChatMessage> {
  const session = sessionStore.get(sessionId);
  if (!session) {
    throw new Error(`Chat session not found: ${sessionId}`);
  }

  if (session.status === ChatStatus.PAUSED) {
    session.status = ChatStatus.ACTIVE;
    session.pausedAt = undefined;
  }

  const message: ChatMessage = {
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
export async function completeChat(
  sessionId: string,
  outcome: 'success' | 'no_interest' | 'timeout'
): Promise<ChatSession> {
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
export function getChatSession(sessionId: string): ChatSession | undefined {
  return sessionStore.get(sessionId);
}

/**
 * 获取用户的所有活跃对话
 */
export function getActiveChatsForUser(userId: string): ChatSession[] {
  return Array.from(sessionStore.values()).filter(
    s => s.sourceUserId === userId || s.targetUserId === userId
  );
}

/**
 * 获取用户的所有对话历史
 */
export function getChatHistoryForUser(userId: string): ChatSession[] {
  return Array.from(sessionStore.values()).filter(
    s => s.sourceUserId === userId || s.targetUserId === userId
  );
}

// ============================================
// 辅助函数
// ============================================

function customGoalOrDefault(customGoal: string | undefined, matchScore: MatchScore): string {
  if (customGoal) return customGoal;
  if (matchScore.totalScore >= 80) return '深入了解对方，发现共同话题';
  if (matchScore.totalScore >= 60) return '初步交流，探索共同点';
  return '友好交谈，了解彼此';
}

function shouldPauseAfterTurn(session: ChatSession, turnNumber: number): boolean {
  if (turnNumber >= session.config.maxAutoTurns) return true;
  if (
    session.config.pauseAfterHighMatch &&
    session.matchScore.totalScore >= session.config.highMatchThreshold
  ) {
    return turnNumber >= Math.ceil(session.config.maxAutoTurns / 2);
  }
  return false;
}

function isSessionLive(s: ChatSession): boolean {
  return s.status === ChatStatus.ACTIVE || s.status === ChatStatus.PENDING;
}

function countActiveSessionsForUser(userId: string): number {
  let count = 0;
  for (const s of sessionStore.values()) {
    if ((s.sourceUserId === userId || s.targetUserId === userId) && isSessionLive(s)) {
      count++;
    }
  }
  return count;
}

function countGlobalActiveSessions(): number {
  let count = 0;
  for (const s of sessionStore.values()) {
    if (isSessionLive(s)) count++;
  }
  return count;
}

function fallbackResponse(session: ChatSession): string {
  const highlights = session.matchScore.highlights;
  if (highlights.length > 0) {
    return `是的！我也注意到了${highlights[0]}。你怎么看？`;
  }
  return '你觉得呢？';
}

async function generateResponseContent(
  session: ChatSession,
  lastMessage: ChatMessage,
  respondingAgentId: string
): Promise<string> {
  try {
    // 复用同一 chat session 的 dialog session
    let dialogSessionId = dialogSessionMap.get(session.id);
    if (!dialogSessionId) {
      const dialogSession = await agentDialogService.createSession(
        'agent_to_agent',
        [
          {
            id: session.sourceAgentId,
            type: 'agent',
            name: 'Source Agent',
            persona: undefined,
          },
          {
            id: session.targetAgentId,
            type: 'agent',
            name: 'Target Agent',
            persona: undefined,
          },
        ],
        'dating',
        {
          goals: session.goals.map(g => g.primary),
          sharedKnowledge: {
            highlights: session.matchScore.highlights,
            matchScore: session.matchScore.totalScore,
          },
        }
      );
      dialogSessionId = dialogSession.id;
      dialogSessionMap.set(session.id, dialogSessionId);
    }

    const result = await agentDialogService.generateMessage({
      sessionId: dialogSessionId,
      senderId: respondingAgentId,
      senderType: 'agent',
      content: lastMessage.content,
      options: {
        temperature: 0.8,
        maxTokens: 200,
      },
    });

    return result.content || fallbackResponse(session);
  } catch (err) {
    logger.warn('LLM generateMessage failed; using fallback', {
      err: err instanceof Error ? err.message : String(err),
      sessionId: session.id,
    });
    return fallbackResponse(session);
  }
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
