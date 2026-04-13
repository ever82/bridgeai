/**
 * Chat Room Service
 * 聊天房间管理服务
 */
import { ChatRoom, ChatRoomType, ChatRoomStatus, RoomParticipant, ParticipantRole } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../../db/client';

export interface CreateRoomInput {
  type: ChatRoomType;
  participantIds: string[];
  sceneId?: string;
  matchId?: string;
  metadata?: Record<string, any>;
  settings?: Record<string, any>;
  createdBy: string;
}

export interface UpdateRoomInput {
  status?: ChatRoomStatus;
  metadata?: Record<string, any>;
  settings?: Record<string, any>;
}

export interface RoomQueryOptions {
  userId?: string;
  type?: ChatRoomType;
  status?: ChatRoomStatus;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: 'lastMessageAt' | 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
}

export interface RoomWithParticipants extends ChatRoom {
  participants: RoomParticipant[];
  unreadCount?: number;
}

/**
 * 创建聊天房间
 */
export async function createRoom(input: CreateRoomInput): Promise<ChatRoom> {
  const { type, participantIds, sceneId, matchId, metadata, settings, createdBy } = input;

  // 验证参与者数量
  if (type === ChatRoomType.PRIVATE && participantIds.length !== 2) {
    throw new Error('Private room must have exactly 2 participants');
  }

  if (type === ChatRoomType.QUAD && participantIds.length !== 4) {
    throw new Error('Quad room must have exactly 4 participants');
  }

  if (type === ChatRoomType.GROUP && participantIds.length < 2) {
    throw new Error('Group room must have at least 2 participants');
  }

  // 检查是否已存在相同的私聊房间
  if (type === ChatRoomType.PRIVATE) {
    const existingRoom = await findPrivateRoom(participantIds);
    if (existingRoom) {
      return existingRoom;
    }
  }

  const room = await prisma.chatRoom.create({
    data: {
      id: uuidv4(),
      type,
      sceneId,
      matchId,
      participantIds,
      metadata: metadata || {},
      settings: settings || getDefaultSettings(type),
      status: ChatRoomStatus.ACTIVE,
    },
  });

  // 创建参与者记录
  await createParticipants(room.id, participantIds, createdBy);

  return room;
}

/**
 * 创建参与者记录
 */
async function createParticipants(
  roomId: string,
  participantIds: string[],
  createdBy: string
): Promise<void> {
  const participants = participantIds.map((userId) => ({
    id: uuidv4(),
    roomId,
    userId,
    role: userId === createdBy ? ParticipantRole.OWNER : ParticipantRole.MEMBER,
    isActive: true,
    unreadCount: 0,
  }));

  await prisma.roomParticipant.createMany({
    data: participants,
  });
}

/**
 * 查找私聊房间（检查是否已存在）
 */
async function findPrivateRoom(participantIds: string[]): Promise<ChatRoom | null> {
  const sortedIds = [...participantIds].sort();

  const rooms = await prisma.chatRoom.findMany({
    where: {
      type: ChatRoomType.PRIVATE,
      participantIds: {
        hasEvery: sortedIds,
      },
    },
  });

  // 找到完全匹配的房间
  return rooms.find((room) => {
    const roomIds = [...room.participantIds].sort();
    return roomIds.length === sortedIds.length &&
      roomIds.every((id, index) => id === sortedIds[index]);
  }) || null;
}

/**
 * 获取默认房间设置
 */
function getDefaultSettings(type: ChatRoomType): Record<string, any> {
  const baseSettings = {
    notifications: true,
    soundEnabled: true,
    showPreview: true,
  };

  switch (type) {
    case ChatRoomType.PRIVATE:
      return {
        ...baseSettings,
        allowInvite: false,
        allowLeave: true,
      };
    case ChatRoomType.GROUP:
      return {
        ...baseSettings,
        allowInvite: true,
        allowLeave: true,
        requireApproval: false,
        maxParticipants: 500,
      };
    case ChatRoomType.QUAD:
      return {
        ...baseSettings,
        allowInvite: false,
        allowLeave: false,
        isFixed: true,
      };
    default:
      return baseSettings;
  }
}

/**
 * 获取房间详情
 */
export async function getRoomById(roomId: string): Promise<RoomWithParticipants | null> {
  const room = await prisma.chatRoom.findUnique({
    where: { id: roomId },
    include: {
      participants: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              displayName: true,
              avatarUrl: true,
            },
          },
        },
      },
    },
  });

  return room as RoomWithParticipants | null;
}

/**
 * 更新房间
 */
export async function updateRoom(
  roomId: string,
  input: UpdateRoomInput
): Promise<ChatRoom> {
  const updateData: any = {};

  if (input.status !== undefined) {
    updateData.status = input.status;
  }

  if (input.metadata !== undefined) {
    updateData.metadata = input.metadata;
  }

  if (input.settings !== undefined) {
    updateData.settings = input.settings;
  }

  return prisma.chatRoom.update({
    where: { id: roomId },
    data: updateData,
  });
}

/**
 * 删除/关闭房间
 */
export async function closeRoom(roomId: string): Promise<ChatRoom> {
  return prisma.chatRoom.update({
    where: { id: roomId },
    data: { status: ChatRoomStatus.CLOSED },
  });
}

/**
 * 获取用户的房间列表
 */
export async function getUserRooms(
  userId: string,
  options: RoomQueryOptions = {}
): Promise<{ rooms: RoomWithParticipants[]; total: number }> {
  const {
    type,
    status = ChatRoomStatus.ACTIVE,
    search,
    page = 1,
    limit = 20,
    sortBy = 'lastMessageAt',
    sortOrder = 'desc',
  } = options;

  const where: any = {
    participants: {
      some: {
        userId,
        isActive: true,
      },
    },
  };

  if (status) {
    where.status = status;
  }

  if (type) {
    where.type = type;
  }

  if (search) {
    where.OR = [
      { metadata: { path: ['name'], string_contains: search } },
      { metadata: { path: ['description'], string_contains: search } },
    ];
  }

  const orderBy: any = {};
  orderBy[sortBy] = sortOrder;

  const [rooms, total] = await Promise.all([
    prisma.chatRoom.findMany({
      where,
      include: {
        participants: {
          where: { isActive: true },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                displayName: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.chatRoom.count({ where }),
  ]);

  // 获取每个房间的未读数
  const roomsWithUnread = await Promise.all(
    rooms.map(async (room) => {
      const participant = await prisma.roomParticipant.findUnique({
        where: {
          roomId_userId: {
            roomId: room.id,
            userId,
          },
        },
      });

      return {
        ...room,
        unreadCount: participant?.unreadCount || 0,
      };
    })
  );

  return { rooms: roomsWithUnread as RoomWithParticipants[], total };
}

/**
 * 搜索房间
 */
export async function searchRooms(
  userId: string,
  query: string,
  options: Omit<RoomQueryOptions, 'search'> = {}
): Promise<{ rooms: RoomWithParticipants[]; total: number }> {
  return getUserRooms(userId, { ...options, search: query });
}

/**
 * 检查用户是否在房间中
 */
export async function isUserInRoom(roomId: string, userId: string): Promise<boolean> {
  const participant = await prisma.roomParticipant.findUnique({
    where: {
      roomId_userId: {
        roomId,
        userId,
      },
    },
  });

  return participant?.isActive ?? false;
}

/**
 * 获取房间成员数量
 */
export async function getRoomParticipantCount(roomId: string): Promise<number> {
  return prisma.roomParticipant.count({
    where: {
      roomId,
      isActive: true,
    },
  });
}

/**
 * 更新最后消息
 */
export async function updateLastMessage(
  roomId: string,
  message: { id: string; content: string; senderId: string; createdAt: Date }
): Promise<void> {
  await prisma.chatRoom.update({
    where: { id: roomId },
    data: {
      lastMessage: message,
      lastMessageAt: message.createdAt,
    },
  });

  // 增加其他参与者的未读数
  await prisma.roomParticipant.updateMany({
    where: {
      roomId,
      userId: { not: message.senderId },
      isActive: true,
    },
    data: {
      unreadCount: {
        increment: 1,
      },
    },
  });
}

/**
 * 重置用户未读数
 */
export async function resetUnreadCount(roomId: string, userId: string): Promise<void> {
  await prisma.roomParticipant.update({
    where: {
      roomId_userId: {
        roomId,
        userId,
      },
    },
    data: {
      unreadCount: 0,
      lastReadAt: new Date(),
    },
  });
}
