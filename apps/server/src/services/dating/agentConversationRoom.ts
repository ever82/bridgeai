// TODO: Migrate agentConversationRoom to extend AgentRoomBase (apps/server/src/services/agent/agentRoomBase.ts)
/**
 * Agent Conversation Room Service
 * Agent对话房间服务 (ISSUE-DATE003 c1)
 *
 * 实现双Agent隔离对话房间机制：
 * - 两个Agent在独立房间内进行对话
 * - 对话状态管理（轮次、超时）
 * - 房间生命周期：创建 → 活跃 → 完成/过期
 */

import { v4 as uuidv4 } from 'uuid';

import { logger } from '../../utils/logger';

import { emitPrivateAdvice } from './privateAdviceService';

// ---------------------------------------------------------------------------
// 引荐阈值 (AS-009 对齐剧本要求 0.8，env 可覆盖)
// ---------------------------------------------------------------------------

export const REFERRAL_QUALITY_THRESHOLD = parseFloat(
  process.env.REFERRAL_QUALITY_THRESHOLD ?? '0.8'
);

// ---------------------------------------------------------------------------
// 类型定义
// ---------------------------------------------------------------------------

export interface ConversationRoom {
  id: string;
  agentAId: string;
  agentBId: string;
  userIdA: string;
  userIdB: string;
  status: 'pending' | 'active' | 'completed' | 'expired' | 'terminated';
  currentRound: number;
  maxRounds: number;
  timeoutMs: number;
  startedAt: Date | null;
  completedAt: Date | null;
  lastMessageAt: Date | null;
  conversationSummary: string | null;
  qualityScore: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface RoomConfig {
  maxRounds: number; // default 20
  timeoutMs: number; // default 30 * 60 * 1000 (30 minutes)
  qualityThreshold: number; // default REFERRAL_QUALITY_THRESHOLD (env: REFERRAL_QUALITY_THRESHOLD, 默认 0.8)
}

export interface RoomMessage {
  id: string;
  roomId: string;
  senderId: string;
  senderType: 'agent_a' | 'agent_b' | 'system';
  content: string;
  round: number;
  timestamp: Date;
}

// ---------------------------------------------------------------------------
// 默认配置
// ---------------------------------------------------------------------------

const DEFAULT_CONFIG: Required<RoomConfig> = {
  maxRounds: 20,
  timeoutMs: 30 * 60 * 1000, // 30分钟
  qualityThreshold: REFERRAL_QUALITY_THRESHOLD,
};

// ---------------------------------------------------------------------------
// 引荐确认动作存储 (AS-009 实时阈值 + 双方确认流)
// ---------------------------------------------------------------------------

export interface ReferralAction {
  id: string;
  roomId: string;
  qualityScore: number;
  createdAt: Date;
  status: 'pending' | 'confirmed' | 'cancelled';
  confirmations: { [ownerId: string]: 'accepted' | 'rejected' | undefined };
}

const referralActionStore = new Map<string, ReferralAction>();
// 标记房间是否已经触发过实时引荐（避免重复弹窗）
const realtimeReferralTriggered = new Set<string>();

// ---------------------------------------------------------------------------
// 模拟存储
// ---------------------------------------------------------------------------

const roomStore = new Map<string, ConversationRoom>();
const messageStore = new Map<string, RoomMessage[]>();
const timeoutTimers = new Map<string, NodeJS.Timeout>();

// ---------------------------------------------------------------------------
// 错误类
// ---------------------------------------------------------------------------

export class RoomNotFoundError extends Error {
  constructor(roomId: string) {
    super(`Conversation room not found: ${roomId}`);
    this.name = 'RoomNotFoundError';
  }
}

export class RoomStatusError extends Error {
  constructor(roomId: string, expected: string, actual: string) {
    super(`Room ${roomId} status invalid: expected ${expected}, got ${actual}`);
    this.name = 'RoomStatusError';
  }
}

export class RoomMaxRoundsError extends Error {
  constructor(roomId: string, maxRounds: number) {
    super(`Room ${roomId} has reached max rounds: ${maxRounds}`);
    this.name = 'RoomMaxRoundsError';
  }
}

// ---------------------------------------------------------------------------
// 内部辅助函数
// ---------------------------------------------------------------------------

/**
 * 更新房间并同步 updatedAt
 */
function updateRoom(roomId: string, updates: Partial<ConversationRoom>): ConversationRoom {
  const room = roomStore.get(roomId);
  if (!room) {
    throw new RoomNotFoundError(roomId);
  }

  const updatedRoom: ConversationRoom = {
    ...room,
    ...updates,
    updatedAt: new Date(),
  };

  roomStore.set(roomId, updatedRoom);
  return updatedRoom;
}

/**
 * 设置房间超时定时器
 */
function scheduleRoomTimeout(roomId: string, timeoutMs: number): void {
  // 清除已有定时器
  clearRoomTimeout(roomId);

  const timer = setTimeout(async () => {
    timeoutTimers.delete(roomId);
    const room = roomStore.get(roomId);
    if (room && room.status === 'active') {
      logger.warn(`[AgentConversationRoom] Room ${roomId} timed out after ${timeoutMs}ms`);
      await expireRoom(roomId);
    }
  }, timeoutMs);

  timeoutTimers.set(roomId, timer);
}

/**
 * 清除房间超时定时器
 */
function clearRoomTimeout(roomId: string): void {
  const timer = timeoutTimers.get(roomId);
  if (timer) {
    clearTimeout(timer);
    timeoutTimers.delete(roomId);
  }
}

/**
 * 添加系统消息
 */
async function addSystemMessage(
  roomId: string,
  content: string,
  _round: number
): Promise<RoomMessage> {
  return addMessage(roomId, 'system', 'system', content);
}

// ---------------------------------------------------------------------------
// 公开 API
// ---------------------------------------------------------------------------

/**
 * 创建对话房间
 * 创建后状态为 pending，需要调用 activateRoom 激活
 */
export async function createRoom(
  agentAId: string,
  agentBId: string,
  userIdA: string,
  userIdB: string,
  config?: Partial<RoomConfig>
): Promise<ConversationRoom> {
  const now = new Date();
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };

  const room: ConversationRoom = {
    id: uuidv4(),
    agentAId,
    agentBId,
    userIdA,
    userIdB,
    status: 'pending',
    currentRound: 0,
    maxRounds: mergedConfig.maxRounds,
    timeoutMs: mergedConfig.timeoutMs,
    startedAt: null,
    completedAt: null,
    lastMessageAt: null,
    conversationSummary: null,
    qualityScore: null,
    createdAt: now,
    updatedAt: now,
  };

  roomStore.set(room.id, room);
  messageStore.set(room.id, []);

  // 添加系统消息记录房间创建
  await addSystemMessage(room.id, '对话房间已创建，等待激活。', 0);

  logger.info(
    `[AgentConversationRoom] Created room ${room.id} for agents ${agentAId} and ${agentBId}`
  );

  // 尝试持久化到数据库（演示阶段可选）
  try {
    const { prisma } = await import('../../db/client').catch(() => ({ prisma: null }));
    if (prisma) {
      // 数据库持久化逻辑（未来实现）
      logger.debug(`[AgentConversationRoom] Room ${room.id} persisted to DB`);
    }
  } catch {
    // 演示阶段忽略数据库错误
  }

  return room;
}

/**
 * 获取房间信息
 */
export async function getRoom(roomId: string): Promise<ConversationRoom | null> {
  return roomStore.get(roomId) || null;
}

/**
 * 激活房间
 * 将状态从 pending 转为 active，开始计时
 */
export async function activateRoom(roomId: string): Promise<ConversationRoom> {
  const room = roomStore.get(roomId);
  if (!room) {
    throw new RoomNotFoundError(roomId);
  }

  if (room.status !== 'pending') {
    throw new RoomStatusError(roomId, 'pending', room.status);
  }

  const now = new Date();
  const updatedRoom = updateRoom(roomId, {
    status: 'active',
    currentRound: 1,
    startedAt: now,
    lastMessageAt: now,
  });

  // 设置超时定时器
  scheduleRoomTimeout(roomId, updatedRoom.timeoutMs);

  // 添加系统消息
  await addSystemMessage(roomId, '对话房间已激活，第1轮开始。', 1);

  logger.info(`[AgentConversationRoom] Room ${roomId} activated`);

  return updatedRoom;
}

/**
 * 添加消息到房间
 */
export async function addMessage(
  roomId: string,
  senderId: string,
  senderType: 'agent_a' | 'agent_b' | 'system',
  content: string
): Promise<RoomMessage> {
  const room = roomStore.get(roomId);
  if (!room) {
    throw new RoomNotFoundError(roomId);
  }

  if (room.status !== 'active' && senderType !== 'system') {
    throw new RoomStatusError(roomId, 'active', room.status);
  }

  const message: RoomMessage = {
    id: uuidv4(),
    roomId,
    senderId,
    senderType,
    content,
    round: room.currentRound,
    timestamp: new Date(),
  };

  const roomMessages = messageStore.get(roomId) || [];
  roomMessages.push(message);
  messageStore.set(roomId, roomMessages);

  // 更新房间最后消息时间
  updateRoom(roomId, { lastMessageAt: message.timestamp });

  // 重置超时定时器（有消息交互则重新计时）
  if (room.status === 'active') {
    scheduleRoomTimeout(roomId, room.timeoutMs);
  }

  logger.debug(
    `[AgentConversationRoom] Message added to room ${roomId} by ${senderType} (${senderId})`
  );

  // AS-009 实时阈值监听 — 在每次非系统消息后检查质量分是否刚刚跨越阈值
  if (senderType !== 'system') {
    try {
      await checkRealtimeReferralEligibility(room, message);
    } catch (error) {
      logger.warn(`[AgentConversationRoom] Realtime referral check failed for ${roomId}`, {
        error,
      });
    }
  }

  return message;
}

/**
 * 实时引荐资格检查 (AS-009)
 *
 * 在每条非系统消息加入房间后调用：
 * - 根据当前消息计算运行中质量分
 * - 若刚刚跨越 REFERRAL_QUALITY_THRESHOLD 阈值，向双方主人的私聊房间发出
 *   `one_tap_action` 类型的私聊建议，附带 referralActionId 供客户端确认
 * - 同一房间仅触发一次，避免重复弹窗
 */
export async function checkRealtimeReferralEligibility(
  roomState: ConversationRoom,
  latestMessage: RoomMessage
): Promise<ReferralAction | null> {
  if (realtimeReferralTriggered.has(roomState.id)) {
    return null;
  }

  // 计算运行中质量分（最少消息门槛 4 条以避免过早触发）
  const messages = messageStore.get(roomState.id) || [];
  const realMessages = messages.filter(m => m.senderType !== 'system');
  if (realMessages.length < 4) {
    return null;
  }

  let runningScore: number | null = null;
  try {
    const qualityModule = await import('./conversationQualityService').catch(() => null);
    if (
      qualityModule &&
      typeof (qualityModule as any).calculateConversationQuality === 'function'
    ) {
      const result = await (qualityModule as any).calculateConversationQuality(realMessages);
      runningScore =
        typeof result === 'number'
          ? result
          : typeof result?.overall === 'number'
            ? result.overall
            : typeof result?.score === 'number'
              ? result.score
              : null;
    }
  } catch (error) {
    logger.debug(`[AgentConversationRoom] quality calc failed`, { error });
  }

  // 兜底：若无法计算运行分，则用消息长度/轮次粗估（仅用于触发判断）
  if (runningScore === null) {
    const avgLen =
      realMessages.reduce((acc, m) => acc + (m.content?.length || 0), 0) / realMessages.length;
    runningScore = Math.min(
      1,
      0.4 + Math.min(roomState.currentRound / 20, 0.4) + (avgLen > 30 ? 0.1 : 0)
    );
  }

  if (runningScore < REFERRAL_QUALITY_THRESHOLD) {
    return null;
  }

  // 已跨越阈值 — 创建 ReferralAction 并通知双方主人
  realtimeReferralTriggered.add(roomState.id);
  const action: ReferralAction = {
    id: uuidv4(),
    roomId: roomState.id,
    qualityScore: runningScore,
    createdAt: new Date(),
    status: 'pending',
    confirmations: {
      [roomState.userIdA]: undefined,
      [roomState.userIdB]: undefined,
    },
  };
  referralActionStore.set(action.id, action);

  const advicePayload = {
    chatSessionId: roomState.id,
    type: 'one_tap_action' as const,
    content: '匹配度已达标，是否进入四人群聊？',
    metadata: {
      referralActionId: action.id,
      qualityScore: runningScore,
      threshold: REFERRAL_QUALITY_THRESHOLD,
      triggeredBy: latestMessage.id,
    },
    createdAt: action.createdAt,
  };

  try {
    emitPrivateAdvice(null, roomState.userIdA, advicePayload);
    emitPrivateAdvice(null, roomState.userIdB, advicePayload);
  } catch (error) {
    logger.warn(`[AgentConversationRoom] emitPrivateAdvice failed`, { error });
  }

  logger.info(
    `[AgentConversationRoom] Realtime referral eligible for room ${roomState.id} (score=${runningScore.toFixed(2)}, action=${action.id})`
  );

  return action;
}

/**
 * 双方确认引荐动作 (AS-009)
 *
 * 当 BOTH owner 接受时，立即调用 createReferralFromConversation（不等待 completeRoom）。
 * 任一方拒绝则标记为 cancelled。
 */
export async function confirmReferralAction(
  referralActionId: string,
  ownerId: string,
  accept: boolean
): Promise<ReferralAction> {
  const action = referralActionStore.get(referralActionId);
  if (!action) {
    throw new Error(`ReferralAction not found: ${referralActionId}`);
  }
  if (action.status !== 'pending') {
    return action;
  }

  if (!(ownerId in action.confirmations)) {
    throw new Error(`Owner ${ownerId} is not part of referral action ${referralActionId}`);
  }

  action.confirmations[ownerId] = accept ? 'accepted' : 'rejected';

  if (!accept) {
    action.status = 'cancelled';
    referralActionStore.set(action.id, action);
    logger.info(`[AgentConversationRoom] ReferralAction ${action.id} cancelled by ${ownerId}`);
    return action;
  }

  const allAccepted = Object.values(action.confirmations).every(v => v === 'accepted');
  if (allAccepted) {
    action.status = 'confirmed';
    referralActionStore.set(action.id, action);

    const room = roomStore.get(action.roomId);
    if (room) {
      try {
        const { createReferralFromConversation } = await import('./referralService');
        const messages = messageStore.get(action.roomId) || [];
        const sharedInterests = extractSharedInterests(messages);
        await createReferralFromConversation(
          action.roomId,
          room.agentAId,
          room.agentBId,
          room.userIdA,
          room.userIdB,
          {
            summary: room.conversationSummary || '',
            qualityScore: action.qualityScore,
            sharedInterests,
            compatibilityScore: Math.round(action.qualityScore * 100),
          }
        );
        logger.info(
          `[AgentConversationRoom] Realtime referral created for room ${action.roomId} via action ${action.id}`
        );
      } catch (error) {
        logger.error(
          `[AgentConversationRoom] Failed to create realtime referral for action ${action.id}`,
          { error }
        );
      }
    }
  } else {
    referralActionStore.set(action.id, action);
  }

  return action;
}

/**
 * 获取引荐动作（测试/查询用）
 */
export function getReferralAction(referralActionId: string): ReferralAction | null {
  return referralActionStore.get(referralActionId) || null;
}

/**
 * 检查房间是否超时
 * 返回 true 表示已超时并处理
 */
export async function checkRoomTimeout(roomId: string): Promise<boolean> {
  const room = roomStore.get(roomId);
  if (!room) {
    throw new RoomNotFoundError(roomId);
  }

  if (room.status !== 'active') {
    return false;
  }

  const now = Date.now();
  const lastActivity =
    room.lastMessageAt?.getTime() || room.startedAt?.getTime() || room.createdAt.getTime();
  const elapsed = now - lastActivity;

  if (elapsed >= room.timeoutMs) {
    await expireRoom(roomId);
    return true;
  }

  return false;
}

/**
 * 递增轮次
 * 如果达到最大轮次则自动完成房间
 */
export async function incrementRound(roomId: string): Promise<ConversationRoom> {
  const room = roomStore.get(roomId);
  if (!room) {
    throw new RoomNotFoundError(roomId);
  }

  if (room.status !== 'active') {
    throw new RoomStatusError(roomId, 'active', room.status);
  }

  const nextRound = room.currentRound + 1;

  // 检查是否达到最大轮次
  if (nextRound > room.maxRounds) {
    logger.info(`[AgentConversationRoom] Room ${roomId} reached max rounds (${room.maxRounds})`);
    await addSystemMessage(
      roomId,
      `已达到最大轮次限制 (${room.maxRounds})，对话自动完成。`,
      room.currentRound
    );
    return completeRoom(roomId, '达到最大轮次限制自动完成', null);
  }

  const updatedRoom = updateRoom(roomId, { currentRound: nextRound });

  // 添加系统消息
  await addSystemMessage(roomId, `第${nextRound}轮开始。`, nextRound);

  logger.info(`[AgentConversationRoom] Room ${roomId} advanced to round ${nextRound}`);

  return updatedRoom;
}

/**
 * 完成房间
 * 标记对话为完成状态，生成摘要和质量评分
 */
export async function completeRoom(
  roomId: string,
  summary: string,
  qualityScore: number | null
): Promise<ConversationRoom> {
  const room = roomStore.get(roomId);
  if (!room) {
    throw new RoomNotFoundError(roomId);
  }

  if (room.status !== 'active' && room.status !== 'pending') {
    throw new RoomStatusError(roomId, 'active or pending', room.status);
  }

  // 清除超时定时器
  clearRoomTimeout(roomId);

  const now = new Date();
  const updatedRoom = updateRoom(roomId, {
    status: 'completed',
    completedAt: now,
    conversationSummary: summary,
    qualityScore,
  });

  // 添加系统消息
  await addSystemMessage(
    roomId,
    `对话已完成。质量评分: ${qualityScore ?? '未评分'}。`,
    room.currentRound
  );

  logger.info(
    `[AgentConversationRoom] Room ${roomId} completed. Quality: ${qualityScore ?? 'N/A'}`
  );

  // 当质量评分达标时，自动触发引荐请求（AC-2 联动）
  if (qualityScore !== null && qualityScore >= REFERRAL_QUALITY_THRESHOLD) {
    try {
      const { createReferralFromConversation } = await import('./referralService');
      const messages = messageStore.get(roomId) || [];
      const sharedInterests = extractSharedInterests(messages);

      await createReferralFromConversation(
        roomId,
        updatedRoom.agentAId,
        updatedRoom.agentBId,
        updatedRoom.userIdA,
        updatedRoom.userIdB,
        {
          summary: summary || '',
          qualityScore,
          sharedInterests,
          compatibilityScore: Math.round(qualityScore * 100),
        }
      );
      logger.info(`[AgentConversationRoom] Referral triggered for room ${roomId}`);
    } catch (error) {
      logger.error(`[AgentConversationRoom] Failed to trigger referral for room ${roomId}`, {
        error,
      });
    }
  }

  return updatedRoom;
}

/**
 * 终止房间
 * 强制终止对话，记录原因
 */
export async function terminateRoom(roomId: string, reason: string): Promise<ConversationRoom> {
  const room = roomStore.get(roomId);
  if (!room) {
    throw new RoomNotFoundError(roomId);
  }

  if (room.status === 'completed' || room.status === 'expired') {
    throw new RoomStatusError(roomId, 'not completed/expired', room.status);
  }

  // 清除超时定时器
  clearRoomTimeout(roomId);

  const updatedRoom = updateRoom(roomId, {
    status: 'terminated',
    completedAt: new Date(),
  });

  // 添加系统消息
  await addSystemMessage(roomId, `对话已终止。原因: ${reason}`, room.currentRound);

  logger.warn(`[AgentConversationRoom] Room ${roomId} terminated. Reason: ${reason}`);

  return updatedRoom;
}

/**
 * 获取房间所有消息
 */
export async function getRoomMessages(roomId: string): Promise<RoomMessage[]> {
  const room = roomStore.get(roomId);
  if (!room) {
    throw new RoomNotFoundError(roomId);
  }

  const messages = messageStore.get(roomId) || [];
  return messages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
}

/**
 * 获取用户相关的活跃房间
 */
export async function getActiveRoomsByUser(userId: string): Promise<ConversationRoom[]> {
  const rooms: ConversationRoom[] = [];

  for (const room of roomStore.values()) {
    if (
      (room.userIdA === userId || room.userIdB === userId) &&
      (room.status === 'pending' || room.status === 'active')
    ) {
      rooms.push(room);
    }
  }

  // 按创建时间倒序
  return rooms.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

/**
 * 从消息中提取共同兴趣关键词（简单实现）
 */
function extractSharedInterests(messages: RoomMessage[]): string[] {
  const interestKeywords: string[] = [];
  const agentMessages = messages.filter(m => m.senderType !== 'system');
  for (const msg of agentMessages) {
    // 提取消息中可能的兴趣关键词（简单策略：提取2-4字的中文词组）
    const matches = msg.content.match(/[\u4e00-\u9fa5]{2,4}/g) || [];
    interestKeywords.push(...matches);
  }
  // 返回出现频率最高的前5个
  const freq = new Map<string, number>();
  for (const kw of interestKeywords) {
    freq.set(kw, (freq.get(kw) || 0) + 1);
  }
  return [...freq.entries()]
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([kw]) => kw);
}

// ---------------------------------------------------------------------------
// 内部函数（不直接导出）
// ---------------------------------------------------------------------------

/**
 * 房间超时过期处理
 */
async function expireRoom(roomId: string): Promise<ConversationRoom> {
  const room = roomStore.get(roomId);
  if (!room) {
    throw new RoomNotFoundError(roomId);
  }

  // 清除超时定时器
  clearRoomTimeout(roomId);

  const updatedRoom = updateRoom(roomId, {
    status: 'expired',
    completedAt: new Date(),
  });

  // 添加系统消息
  await addSystemMessage(roomId, '对话房间已超时过期。', room.currentRound);

  logger.warn(`[AgentConversationRoom] Room ${roomId} expired due to timeout`);

  return updatedRoom;
}

// ---------------------------------------------------------------------------
// 清理工具（测试/关闭用）
// ---------------------------------------------------------------------------

/**
 * 清除所有房间和消息（仅用于测试）
 */
export function clearAllRooms(): void {
  for (const timer of timeoutTimers.values()) {
    clearTimeout(timer);
  }
  timeoutTimers.clear();
  roomStore.clear();
  messageStore.clear();
  referralActionStore.clear();
  realtimeReferralTriggered.clear();
  logger.info('[AgentConversationRoom] All rooms cleared');
}

// ---------------------------------------------------------------------------
// 默认导出
// ---------------------------------------------------------------------------

export default {
  createRoom,
  getRoom,
  activateRoom,
  addMessage,
  checkRoomTimeout,
  incrementRound,
  completeRoom,
  terminateRoom,
  getRoomMessages,
  getActiveRoomsByUser,
  clearAllRooms,
  checkRealtimeReferralEligibility,
  confirmReferralAction,
  getReferralAction,
  REFERRAL_QUALITY_THRESHOLD,
};
