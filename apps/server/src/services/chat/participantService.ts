/**
 * Participant Service
 * 聊天室参与者管理服务
 */
import { RoomParticipant, ParticipantRole, ChatRoomType, ChatRoom } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

import { prisma } from '../../db/client';

export interface AddParticipantInput {
  roomId: string;
  userId: string;
  role?: ParticipantRole;
  addedBy: string;
}

export interface UpdateParticipantInput {
  role?: ParticipantRole;
  permissions?: Record<string, any>;
  isActive?: boolean;
}

export interface ParticipantWithUser extends RoomParticipant {
  user: {
    id: string;
    name: string | null;
    displayName: string | null;
    avatarUrl: string | null;
  };
}

/**
 * 添加参与者到房间
 */
export async function addParticipant(input: AddParticipantInput): Promise<RoomParticipant> {
  const { roomId, userId, role = ParticipantRole.MEMBER, addedBy } = input;

  // 检查房间是否存在
  const room = await prisma.chatRoom.findUnique({
    where: { id: roomId },
    include: { participants: true },
  });

  if (!room) {
    throw new Error('Room not found');
  }

  // 检查添加者是否有权限
  const adder = await prisma.roomParticipant.findUnique({
    where: {
      roomId_userId: {
        roomId,
        userId: addedBy,
      },
    },
  });

  if (!adder || !canManageParticipants(adder.role)) {
    throw new Error('Permission denied: cannot add participants');
  }

  // 检查是否已达到最大人数限制
  if (room.type === ChatRoomType.GROUP && room.settings) {
    const settings = room.settings as Record<string, any>;
    const maxParticipants = settings.maxParticipants || 500;
    const activeCount = room.participants.filter((p) => p.isActive).length;

    if (activeCount >= maxParticipants) {
      throw new Error('Room has reached maximum participant limit');
    }

    // 检查是否需要审批
    if (settings.requireApproval && role !== ParticipantRole.OWNER) {
      // 这里可以添加审批逻辑
    }
  }

  // 检查用户是否已经在房间中
  const existing = await prisma.roomParticipant.findUnique({
    where: {
      roomId_userId: {
        roomId,
        userId,
      },
    },
  });

  if (existing) {
    if (existing.isActive) {
      throw new Error('User is already a participant in this room');
    }
    // 重新激活
    return prisma.roomParticipant.update({
      where: { id: existing.id },
      data: {
        isActive: true,
        role,
        joinedAt: new Date(),
      },
    });
  }

  // 创建新参与者
  const participant = await prisma.roomParticipant.create({
    data: {
      id: uuidv4(),
      roomId,
      userId,
      role,
      isActive: true,
      unreadCount: 0,
    },
  });

  // 更新房间的participantIds
  await prisma.chatRoom.update({
    where: { id: roomId },
    data: {
      participantIds: {
        push: userId,
      },
    },
  });

  return participant;
}

/**
 * 移除参与者
 */
export async function removeParticipant(
  roomId: string,
  userId: string,
  removedBy: string
): Promise<void> {
  // 检查移除者是否有权限
  const remover = await prisma.roomParticipant.findUnique({
    where: {
      roomId_userId: {
        roomId,
        userId: removedBy,
      },
    },
  });

  const target = await prisma.roomParticipant.findUnique({
    where: {
      roomId_userId: {
        roomId,
        userId,
      },
    },
  });

  if (!target) {
    throw new Error('Participant not found');
  }

  // 自己离开房间
  if (userId === removedBy) {
    // 检查是否允许离开
    const room = await prisma.chatRoom.findUnique({
      where: { id: roomId },
    });

    if (room?.settings) {
      const settings = room.settings as Record<string, any>;
      if (settings.allowLeave === false) {
        throw new Error('Cannot leave this room');
      }
    }
  } else {
    // 管理员移除他人
    if (!remover || !canRemoveParticipant(remover.role, target.role)) {
      throw new Error('Permission denied: cannot remove this participant');
    }
  }

  // 标记为离开
  await prisma.roomParticipant.update({
    where: { id: target.id },
    data: {
      isActive: false,
      leftAt: new Date(),
    },
  });

  // 从房间的participantIds中移除
  const room = await prisma.chatRoom.findUnique({
    where: { id: roomId },
  });

  if (room) {
    const updatedIds = room.participantIds.filter((id) => id !== userId);
    await prisma.chatRoom.update({
      where: { id: roomId },
      data: { participantIds: updatedIds },
    });
  }
}

/**
 * 更新参与者信息
 */
export async function updateParticipant(
  roomId: string,
  userId: string,
  input: UpdateParticipantInput,
  updatedBy: string
): Promise<RoomParticipant> {
  // 检查更新者权限
  const updater = await prisma.roomParticipant.findUnique({
    where: {
      roomId_userId: {
        roomId,
        userId: updatedBy,
      },
    },
  });

  const target = await prisma.roomParticipant.findUnique({
    where: {
      roomId_userId: {
        roomId,
        userId,
      },
    },
  });

  if (!target) {
    throw new Error('Participant not found');
  }

  // 自己更新或管理员更新
  if (userId !== updatedBy) {
    if (!updater || !canManageParticipants(updater.role)) {
      throw new Error('Permission denied');
    }

    // 不能修改权限更高的用户
    if (getRoleLevel(target.role) >= getRoleLevel(updater.role)) {
      throw new Error('Cannot modify participant with equal or higher role');
    }
  } else {
    // 自己只能更新部分字段
    if (input.role !== undefined) {
      throw new Error('Cannot change your own role');
    }
  }

  return prisma.roomParticipant.update({
    where: { id: target.id },
    data: input,
  });
}

/**
 * 获取房间的所有参与者
 */
export async function getRoomParticipants(roomId: string): Promise<ParticipantWithUser[]> {
  const participants = await prisma.roomParticipant.findMany({
    where: {
      roomId,
      isActive: true,
    },
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
    orderBy: {
      joinedAt: 'asc',
    },
  });

  return participants as ParticipantWithUser[];
}

/**
 * 获取参与者的房间
 */
export async function getParticipantRooms(userId: string): Promise<RoomParticipant[]> {
  return prisma.roomParticipant.findMany({
    where: {
      userId,
      isActive: true,
    },
    include: {
      room: true,
    },
  });
}

/**
 * 获取单个参与者信息
 */
export async function getParticipant(
  roomId: string,
  userId: string
): Promise<ParticipantWithUser | null> {
  const participant = await prisma.roomParticipant.findUnique({
    where: {
      roomId_userId: {
        roomId,
        userId,
      },
    },
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
  });

  return participant as ParticipantWithUser | null;
}

/**
 * 转移房主权限
 */
export async function transferOwnership(
  roomId: string,
  newOwnerId: string,
  currentOwnerId: string
): Promise<void> {
  const currentOwner = await prisma.roomParticipant.findUnique({
    where: {
      roomId_userId: {
        roomId,
        userId: currentOwnerId,
      },
    },
  });

  if (!currentOwner || currentOwner.role !== ParticipantRole.OWNER) {
    throw new Error('Only owner can transfer ownership');
  }

  const newOwner = await prisma.roomParticipant.findUnique({
    where: {
      roomId_userId: {
        roomId,
        userId: newOwnerId,
      },
    },
  });

  if (!newOwner || !newOwner.isActive) {
    throw new Error('New owner must be an active participant');
  }

  // 更新原房主为管理员
  await prisma.roomParticipant.update({
    where: { id: currentOwner.id },
    data: { role: ParticipantRole.ADMIN },
  });

  // 更新新房主
  await prisma.roomParticipant.update({
    where: { id: newOwner.id },
    data: { role: ParticipantRole.OWNER },
  });
}

/**
 * 检查角色是否有管理参与者的权限
 */
function canManageParticipants(role: ParticipantRole): boolean {
  return role === ParticipantRole.OWNER || role === ParticipantRole.ADMIN;
}

/**
 * 检查是否有权限移除参与者
 */
function canRemoveParticipant(removerRole: ParticipantRole, targetRole: ParticipantRole): boolean {
  return getRoleLevel(removerRole) > getRoleLevel(targetRole);
}

/**
 * 获取角色等级（用于权限比较）
 */
function getRoleLevel(role: ParticipantRole): number {
  const levels: Record<ParticipantRole, number> = {
    [ParticipantRole.OWNER]: 4,
    [ParticipantRole.ADMIN]: 3,
    [ParticipantRole.MEMBER]: 2,
    [ParticipantRole.GUEST]: 1,
  };
  return levels[role] || 0;
}

/**
 * 获取角色权限
 */
export function getRolePermissions(role: ParticipantRole): string[] {
  const permissions: Record<ParticipantRole, string[]> = {
    [ParticipantRole.OWNER]: [
      'room:manage',
      'room:delete',
      'participant:add',
      'participant:remove',
      'participant:role',
      'message:delete:any',
      'message:pin',
      'settings:edit',
    ],
    [ParticipantRole.ADMIN]: [
      'room:manage',
      'participant:add',
      'participant:remove:member',
      'message:delete',
      'message:pin',
      'settings:edit',
    ],
    [ParticipantRole.MEMBER]: [
      'message:send',
      'message:edit:own',
      'message:delete:own',
    ],
    [ParticipantRole.GUEST]: [
      'message:send',
    ],
  };

  return permissions[role] || [];
}

/**
 * 检查用户是否有特定权限
 */
export async function hasPermission(
  roomId: string,
  userId: string,
  permission: string
): Promise<boolean> {
  const participant = await prisma.roomParticipant.findUnique({
    where: {
      roomId_userId: {
        roomId,
        userId,
      },
    },
  });

  if (!participant || !participant.isActive) {
    return false;
  }

  const rolePermissions = getRolePermissions(participant.role);

  // 检查自定义权限
  const customPermissions = (participant.permissions as Record<string, boolean>) || {};

  return rolePermissions.includes(permission) || customPermissions[permission] === true;
}
