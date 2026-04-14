/**
 * Human Chat Room Service
 * 真人聊天房间服务
 *
 * 管理真人聊天房间的创建和配置：
 * - 双方同意后自动创建1v1聊天房间
 * - 继承Agent对话上下文
 * - 身份标识切换
 * - 初始欢迎消息生成
 * - 人机切换标记
 */

import { ReferralRecord } from '../../models/ReferralRecord';

export enum ChatRoomType {
  AGENT = 'agent',       // Agent代理聊天
  HUMAN = 'human',       // 真人聊天
  HYBRID = 'hybrid',     // 混合模式
}

export enum ChatRoomStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  CLOSED = 'closed',
  SUSPENDED = 'suspended',
}

export interface ChatRoomParticipant {
  userId: string;
  joinedAt: Date;
  lastReadAt: Date;
  isOnline: boolean;
  nickname?: string;
  avatar?: string;
}

export interface ChatRoom {
  id: string;
  type: ChatRoomType;
  status: ChatRoomStatus;

  // 参与者
  participants: ChatRoomParticipant[];

  // 房间信息
  createdAt: Date;
  createdFromReferralId: string;

  // 上下文继承
  inheritedContext?: {
    agentConversationSummary: string;
    recommendedTopics: string[];
    matchScore: number;
  };

  // 设置
  settings: ChatRoomSettings;

  // 元数据
  metadata: ChatRoomMetadata;
}

export interface ChatRoomSettings {
  allowImages: boolean;
  allowVoice: boolean;
  allowVideo: boolean;
  allowLocation: boolean;
  messageRetentionDays: number;
}

export interface ChatRoomMetadata {
  messageCount: number;
  lastMessageAt?: Date;
  lastMessagePreview?: string;
  unreadCount: Record<string, number>;
}

export interface WelcomeMessage {
  type: 'system' | 'tip' | 'suggestion';
  content: string;
  metadata?: Record<string, any>;
}

// 模拟存储
const chatRoomStore = new Map<string, ChatRoom>();

/**
 * 创建真人聊天房间
 */
export async function createHumanChatRoom(
  referral: ReferralRecord
): Promise<ChatRoom> {
  const now = new Date();

  const room: ChatRoom = {
    id: generateRoomId(),
    type: ChatRoomType.HUMAN,
    status: ChatRoomStatus.ACTIVE,
    participants: [
      {
        userId: referral.userAId,
        joinedAt: now,
        lastReadAt: now,
        isOnline: false,
      },
      {
        userId: referral.userBId,
        joinedAt: now,
        lastReadAt: now,
        isOnline: false,
      },
    ],
    createdAt: now,
    createdFromReferralId: referral.id,
    inheritedContext: {
      agentConversationSummary: referral.matchData.agentConversationSummary,
      recommendedTopics: referral.matchData.recommendedTopics || [],
      matchScore: referral.matchData.matchScore,
    },
    settings: {
      allowImages: true,
      allowVoice: true,
      allowVideo: false,  // 初期禁用视频
      allowLocation: false,  // 初期禁用位置
      messageRetentionDays: 90,
    },
    metadata: {
      messageCount: 0,
      unreadCount: {
        [referral.userAId]: 0,
        [referral.userBId]: 0,
      },
    },
  };

  chatRoomStore.set(room.id, room);

  // 生成并发送欢迎消息
  const welcomeMessages = generateWelcomeMessages(room);
  await sendWelcomeMessages(room.id, welcomeMessages);

  return room;
}

/**
 * 生成欢迎消息
 */
export function generateWelcomeMessages(room: ChatRoom): WelcomeMessage[] {
  const messages: WelcomeMessage[] = [];

  // 系统欢迎消息
  messages.push({
    type: 'system',
    content: '恭喜！双方已同意开启真人聊天。请保持友善和尊重，享受交流的乐趣！',
  });

  // 人机切换提示
  messages.push({
    type: 'system',
    content: '🤖 ➜ 👤 聊天模式已从Agent代理切换为真人交流',
  });

  // 如果有继承的上下文，添加提示
  if (room.inheritedContext) {
    messages.push({
      type: 'tip',
      content: `你们的匹配度为 ${room.inheritedContext.matchScore}%，Agent对话摘要：${room.inheritedContext.agentConversationSummary}`,
    });

    // 推荐话题
    if (room.inheritedContext.recommendedTopics.length > 0) {
      messages.push({
        type: 'suggestion',
        content: `可以从这些话题开始：${room.inheritedContext.recommendedTopics.join('、')}`,
      });
    }
  }

  // 安全提示
  messages.push({
    type: 'tip',
    content: '💡 安全提示：请保护个人隐私，不要过早分享敏感信息。如遇骚扰请及时举报。',
  });

  return messages;
}

/**
 * 发送欢迎消息
 */
async function sendWelcomeMessages(
  roomId: string,
  messages: WelcomeMessage[]
): Promise<void> {
  // TODO: 调用消息服务发送系统消息
  console.log(`Sending ${messages.length} welcome messages to room ${roomId}`);

  for (const message of messages) {
    console.log(`[${message.type}] ${message.content}`);
  }
}

/**
 * 获取聊天房间
 */
export async function getChatRoom(roomId: string): Promise<ChatRoom | null> {
  return chatRoomStore.get(roomId) || null;
}

/**
 * 获取用户的所有真人聊天房间
 */
export async function getUserHumanChatRooms(userId: string): Promise<ChatRoom[]> {
  const rooms: ChatRoom[] = [];

  for (const room of chatRoomStore.values()) {
    if (room.type === ChatRoomType.HUMAN &&
        room.participants.some(p => p.userId === userId)) {
      rooms.push(room);
    }
  }

  // 按最后消息时间排序
  return rooms.sort((a, b) =>
    (b.metadata.lastMessageAt?.getTime() || 0) -
    (a.metadata.lastMessageAt?.getTime() || 0)
  );
}

/**
 * 用户加入房间
 */
export async function joinRoom(roomId: string, userId: string): Promise<ChatRoom> {
  const room = await getChatRoom(roomId);
  if (!room) {
    throw new ChatRoomNotFoundError('Chat room not found');
  }

  const participant = room.participants.find(p => p.userId === userId);
  if (!participant) {
    throw new NotRoomParticipantError('User is not a participant of this room');
  }

  const now = new Date();
  const updatedRoom: ChatRoom = {
    ...room,
    participants: room.participants.map(p =>
      p.userId === userId
        ? { ...p, joinedAt: now, isOnline: true }
        : p
    ),
  };

  chatRoomStore.set(roomId, updatedRoom);

  // 发送用户上线通知
  await notifyParticipantOnline(roomId, userId);

  return updatedRoom;
}

/**
 * 用户离开房间
 */
export async function leaveRoom(roomId: string, userId: string): Promise<void> {
  const room = await getChatRoom(roomId);
  if (!room) return;

  const updatedRoom: ChatRoom = {
    ...room,
    participants: room.participants.map(p =>
      p.userId === userId
        ? { ...p, isOnline: false }
        : p
    ),
  };

  chatRoomStore.set(roomId, updatedRoom);

  // 发送用户离线通知
  await notifyParticipantOffline(roomId, userId);
}

/**
 * 标记消息已读
 */
export async function markAsRead(
  roomId: string,
  userId: string
): Promise<void> {
  const room = await getChatRoom(roomId);
  if (!room) return;

  const updatedRoom: ChatRoom = {
    ...room,
    participants: room.participants.map(p =>
      p.userId === userId
        ? { ...p, lastReadAt: new Date() }
        : p
    ),
    metadata: {
      ...room.metadata,
      unreadCount: {
        ...room.metadata.unreadCount,
        [userId]: 0,
      },
    },
  };

  chatRoomStore.set(roomId, updatedRoom);
}

/**
 * 更新房间设置
 */
export async function updateRoomSettings(
  roomId: string,
  settings: Partial<ChatRoomSettings>
): Promise<ChatRoom> {
  const room = await getChatRoom(roomId);
  if (!room) {
    throw new ChatRoomNotFoundError('Chat room not found');
  }

  const updatedRoom: ChatRoom = {
    ...room,
    settings: {
      ...room.settings,
      ...settings,
    },
  };

  chatRoomStore.set(roomId, updatedRoom);
  return updatedRoom;
}

/**
 * 关闭聊天房间
 */
export async function closeRoom(
  roomId: string,
  reason?: string
): Promise<void> {
  const room = await getChatRoom(roomId);
  if (!room) return;

  const updatedRoom: ChatRoom = {
    ...room,
    status: ChatRoomStatus.CLOSED,
  };

  chatRoomStore.set(roomId, updatedRoom);

  // 发送房间关闭通知
  await notifyRoomClosed(roomId, reason);
}

/**
 * 更新未读消息数
 */
export async function incrementUnreadCount(
  roomId: string,
  userId: string
): Promise<void> {
  const room = await getChatRoom(roomId);
  if (!room) return;

  const currentCount = room.metadata.unreadCount[userId] || 0;

  const updatedRoom: ChatRoom = {
    ...room,
    metadata: {
      ...room.metadata,
      unreadCount: {
        ...room.metadata.unreadCount,
        [userId]: currentCount + 1,
      },
    },
  };

  chatRoomStore.set(roomId, updatedRoom);
}

/**
 * 更新最后消息信息
 */
export async function updateLastMessage(
  roomId: string,
  messagePreview: string
): Promise<void> {
  const room = await getChatRoom(roomId);
  if (!room) return;

  const updatedRoom: ChatRoom = {
    ...room,
    metadata: {
      ...room.metadata,
      messageCount: room.metadata.messageCount + 1,
      lastMessageAt: new Date(),
      lastMessagePreview: messagePreview,
    },
  };

  chatRoomStore.set(roomId, updatedRoom);
}

/**
 * 获取房间统计信息
 */
export async function getRoomStats(roomId: string): Promise<{
  totalMessages: number;
  participantActivity: Record<string, {
    lastReadAt: Date;
    isOnline: boolean;
  }>;
}> {
  const room = await getChatRoom(roomId);
  if (!room) {
    throw new ChatRoomNotFoundError('Chat room not found');
  }

  return {
    totalMessages: room.metadata.messageCount,
    participantActivity: room.participants.reduce((acc, p) => ({
      ...acc,
      [p.userId]: {
        lastReadAt: p.lastReadAt,
        isOnline: p.isOnline,
      },
    }), {}),
  };
}

// 通知函数（待实现）
async function notifyParticipantOnline(roomId: string, userId: string): Promise<void> {
  console.log(`User ${userId} is now online in room ${roomId}`);
}

async function notifyParticipantOffline(roomId: string, userId: string): Promise<void> {
  console.log(`User ${userId} is now offline in room ${roomId}`);
}

async function notifyRoomClosed(roomId: string, reason?: string): Promise<void> {
  console.log(`Room ${roomId} has been closed. Reason: ${reason || 'Unknown'}`);
}

/**
 * 生成房间ID
 */
function generateRoomId(): string {
  return `room_human_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 错误类
 */
export class ChatRoomNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ChatRoomNotFoundError';
  }
}

export class NotRoomParticipantError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotRoomParticipantError';
  }
}

export default {
  createHumanChatRoom,
  getChatRoom,
  getUserHumanChatRooms,
  joinRoom,
  leaveRoom,
  markAsRead,
  updateRoomSettings,
  closeRoom,
  generateWelcomeMessages,
};
