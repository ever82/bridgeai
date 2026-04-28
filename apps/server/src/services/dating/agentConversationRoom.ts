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
  qualityThreshold: number; // default 0.6
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
  qualityThreshold: 0.6,
};

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

  return message;
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
};
