/**
 * Room Service Unit Tests
 * 聊天房间服务单元测试
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  createRoom,
  getRoomById,
  updateRoom,
  closeRoom,
  getUserRooms,
  searchRooms,
  isUserInRoom,
  resetUnreadCount,
  updateLastMessage,
} from '../roomService';
import { ChatRoomType, ChatRoomStatus, ParticipantRole } from '@prisma/client';

// Mock Prisma
const mockPrisma = {
  chatRoom: {
    create: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    count: vi.fn(),
  },
  roomParticipant: {
    createMany: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    count: vi.fn(),
  },
};

vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn(() => mockPrisma),
  ChatRoomType: {
    PRIVATE: 'PRIVATE',
    GROUP: 'GROUP',
    QUAD: 'QUAD',
  },
  ChatRoomStatus: {
    ACTIVE: 'ACTIVE',
    INACTIVE: 'INACTIVE',
    CLOSED: 'CLOSED',
  },
  ParticipantRole: {
    OWNER: 'OWNER',
    ADMIN: 'ADMIN',
    MEMBER: 'MEMBER',
    GUEST: 'GUEST',
  },
}));

describe('roomService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('createRoom', () => {
    it('should create a private room with 2 participants', async () => {
      const roomData = {
        type: ChatRoomType.PRIVATE,
        participantIds: ['user1', 'user2'],
        createdBy: 'user1',
      };

      const mockRoom = {
        id: 'room-1',
        type: ChatRoomType.PRIVATE,
        participantIds: ['user1', 'user2'],
        status: ChatRoomStatus.ACTIVE,
      };

      mockPrisma.chatRoom.create.mockResolvedValue(mockRoom);
      mockPrisma.chatRoom.findMany.mockResolvedValue([]);

      const room = await createRoom(roomData);

      expect(room).toEqual(mockRoom);
      expect(mockPrisma.chatRoom.create).toHaveBeenCalled();
      expect(mockPrisma.roomParticipant.createMany).toHaveBeenCalled();
    });

    it('should throw error for private room without 2 participants', async () => {
      const roomData = {
        type: ChatRoomType.PRIVATE,
        participantIds: ['user1'],
        createdBy: 'user1',
      };

      await expect(createRoom(roomData)).rejects.toThrow(
        'Private room must have exactly 2 participants'
      );
    });

    it('should create a group room with multiple participants', async () => {
      const roomData = {
        type: ChatRoomType.GROUP,
        participantIds: ['user1', 'user2', 'user3'],
        createdBy: 'user1',
        metadata: { name: 'Test Group' },
      };

      const mockRoom = {
        id: 'room-2',
        type: ChatRoomType.GROUP,
        participantIds: ['user1', 'user2', 'user3'],
        status: ChatRoomStatus.ACTIVE,
        metadata: { name: 'Test Group' },
      };

      mockPrisma.chatRoom.create.mockResolvedValue(mockRoom);

      const room = await createRoom(roomData);

      expect(room).toEqual(mockRoom);
    });

    it('should throw error for group room with less than 2 participants', async () => {
      const roomData = {
        type: ChatRoomType.GROUP,
        participantIds: ['user1'],
        createdBy: 'user1',
      };

      await expect(createRoom(roomData)).rejects.toThrow(
        'Group room must have at least 2 participants'
      );
    });

    it('should return existing private room if already exists', async () => {
      const roomData = {
        type: ChatRoomType.PRIVATE,
        participantIds: ['user1', 'user2'],
        createdBy: 'user1',
      };

      const existingRoom = {
        id: 'existing-room',
        type: ChatRoomType.PRIVATE,
        participantIds: ['user1', 'user2'],
      };

      mockPrisma.chatRoom.findMany.mockResolvedValue([existingRoom]);

      const room = await createRoom(roomData);

      expect(room).toEqual(existingRoom);
      expect(mockPrisma.chatRoom.create).not.toHaveBeenCalled();
    });
  });

  describe('getRoomById', () => {
    it('should return room with participants', async () => {
      const mockRoom = {
        id: 'room-1',
        type: ChatRoomType.PRIVATE,
        participants: [
          {
            id: 'p1',
            userId: 'user1',
            role: ParticipantRole.OWNER,
            user: { id: 'user1', name: 'User 1' },
          },
        ],
      };

      mockPrisma.chatRoom.findUnique.mockResolvedValue(mockRoom);

      const room = await getRoomById('room-1');

      expect(room).toEqual(mockRoom);
      expect(mockPrisma.chatRoom.findUnique).toHaveBeenCalledWith({
        where: { id: 'room-1' },
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
    });

    it('should return null if room not found', async () => {
      mockPrisma.chatRoom.findUnique.mockResolvedValue(null);

      const room = await getRoomById('non-existent');

      expect(room).toBeNull();
    });
  });

  describe('updateRoom', () => {
    it('should update room status', async () => {
      const mockRoom = {
        id: 'room-1',
        status: ChatRoomStatus.INACTIVE,
      };

      mockPrisma.chatRoom.update.mockResolvedValue(mockRoom);

      const room = await updateRoom('room-1', { status: ChatRoomStatus.INACTIVE });

      expect(room).toEqual(mockRoom);
      expect(mockPrisma.chatRoom.update).toHaveBeenCalledWith({
        where: { id: 'room-1' },
        data: { status: ChatRoomStatus.INACTIVE },
      });
    });

    it('should update room settings', async () => {
      const mockRoom = {
        id: 'room-1',
        settings: { notifications: false },
      };

      mockPrisma.chatRoom.update.mockResolvedValue(mockRoom);

      const room = await updateRoom('room-1', { settings: { notifications: false } });

      expect(room).toEqual(mockRoom);
    });
  });

  describe('closeRoom', () => {
    it('should close room', async () => {
      const mockRoom = {
        id: 'room-1',
        status: ChatRoomStatus.CLOSED,
      };

      mockPrisma.chatRoom.update.mockResolvedValue(mockRoom);

      const room = await closeRoom('room-1');

      expect(room.status).toBe(ChatRoomStatus.CLOSED);
    });
  });

  describe('getUserRooms', () => {
    it('should return user rooms with pagination', async () => {
      const mockRooms = [
        { id: 'room-1', type: ChatRoomType.PRIVATE },
        { id: 'room-2', type: ChatRoomType.GROUP },
      ];

      mockPrisma.chatRoom.findMany.mockResolvedValue(mockRooms);
      mockPrisma.chatRoom.count.mockResolvedValue(2);
      mockPrisma.roomParticipant.findUnique.mockResolvedValue({ unreadCount: 5 });

      const result = await getUserRooms('user1', { page: 1, limit: 20 });

      expect(result.rooms).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it('should filter by room type', async () => {
      const mockRooms = [{ id: 'room-1', type: ChatRoomType.PRIVATE }];

      mockPrisma.chatRoom.findMany.mockResolvedValue(mockRooms);
      mockPrisma.chatRoom.count.mockResolvedValue(1);
      mockPrisma.roomParticipant.findUnique.mockResolvedValue({ unreadCount: 0 });

      const result = await getUserRooms('user1', { type: ChatRoomType.PRIVATE });

      expect(result.rooms).toHaveLength(1);
      expect(result.rooms[0].type).toBe(ChatRoomType.PRIVATE);
    });
  });

  describe('searchRooms', () => {
    it('should search rooms by query', async () => {
      const mockRooms = [{ id: 'room-1', metadata: { name: 'Test Room' } }];

      mockPrisma.chatRoom.findMany.mockResolvedValue(mockRooms);
      mockPrisma.chatRoom.count.mockResolvedValue(1);
      mockPrisma.roomParticipant.findUnique.mockResolvedValue({ unreadCount: 0 });

      const result = await searchRooms('user1', 'test');

      expect(result.rooms).toHaveLength(1);
    });
  });

  describe('isUserInRoom', () => {
    it('should return true if user is active participant', async () => {
      mockPrisma.roomParticipant.findUnique.mockResolvedValue({
        isActive: true,
      });

      const result = await isUserInRoom('room-1', 'user1');

      expect(result).toBe(true);
    });

    it('should return false if user is not participant', async () => {
      mockPrisma.roomParticipant.findUnique.mockResolvedValue(null);

      const result = await isUserInRoom('room-1', 'user1');

      expect(result).toBe(false);
    });

    it('should return false if user is inactive participant', async () => {
      mockPrisma.roomParticipant.findUnique.mockResolvedValue({
        isActive: false,
      });

      const result = await isUserInRoom('room-1', 'user1');

      expect(result).toBe(false);
    });
  });

  describe('resetUnreadCount', () => {
    it('should reset unread count for user', async () => {
      mockPrisma.roomParticipant.update.mockResolvedValue({
        unreadCount: 0,
        lastReadAt: new Date(),
      });

      await resetUnreadCount('room-1', 'user1');

      expect(mockPrisma.roomParticipant.update).toHaveBeenCalledWith({
        where: {
          roomId_userId: {
            roomId: 'room-1',
            userId: 'user1',
          },
        },
        data: {
          unreadCount: 0,
          lastReadAt: expect.any(Date),
        },
      });
    });
  });

  describe('updateLastMessage', () => {
    it('should update last message and increment unread count', async () => {
      const message = {
        id: 'msg-1',
        content: 'Hello',
        senderId: 'user1',
        createdAt: new Date(),
      };

      mockPrisma.chatRoom.update.mockResolvedValue({});
      mockPrisma.roomParticipant.updateMany.mockResolvedValue({});

      await updateLastMessage('room-1', message);

      expect(mockPrisma.chatRoom.update).toHaveBeenCalledWith({
        where: { id: 'room-1' },
        data: {
          lastMessage: message,
          lastMessageAt: message.createdAt,
        },
      });

      expect(mockPrisma.roomParticipant.updateMany).toHaveBeenCalledWith({
        where: {
          roomId: 'room-1',
          userId: { not: 'user1' },
          isActive: true,
        },
        data: {
          unreadCount: {
            increment: 1,
          },
        },
      });
    });
  });
});
