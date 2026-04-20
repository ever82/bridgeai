/**
 * Room Service Unit Tests
 * 聊天房间服务单元测试
 */
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { ChatRoomType, ChatRoomStatus, ParticipantRole } from '@prisma/client';

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
import { prisma } from '../../../db/client';

// Mock the prisma client
jest.mock('../../../db/client', () => ({
  prisma: {
    chatRoom: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      count: jest.fn(),
    },
    roomParticipant: {
      createMany: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      count: jest.fn(),
    },
  },
}));

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('roomService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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

      (mockPrisma.chatRoom.create as jest.Mock).mockResolvedValue(mockRoom);
      (mockPrisma.chatRoom.findMany as jest.Mock).mockResolvedValue([]);
      (mockPrisma.roomParticipant.createMany as jest.Mock).mockResolvedValue({ count: 2 });

      const room = await createRoom(roomData);

      expect(room).toEqual(mockRoom);
      expect(mockPrisma.chatRoom.create).toHaveBeenCalled();
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

      (mockPrisma.chatRoom.create as jest.Mock).mockResolvedValue(mockRoom);
      (mockPrisma.roomParticipant.createMany as jest.Mock).mockResolvedValue({ count: 3 });

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

      (mockPrisma.chatRoom.findMany as jest.Mock).mockResolvedValue([existingRoom]);

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

      (mockPrisma.chatRoom.findUnique as jest.Mock).mockResolvedValue(mockRoom);

      const room = await getRoomById('room-1');

      expect(room).toEqual(mockRoom);
    });

    it('should return null if room not found', async () => {
      (mockPrisma.chatRoom.findUnique as jest.Mock).mockResolvedValue(null);

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

      (mockPrisma.chatRoom.update as jest.Mock).mockResolvedValue(mockRoom);

      const room = await updateRoom('room-1', { status: ChatRoomStatus.INACTIVE });

      expect(room).toEqual(mockRoom);
    });

    it('should update room settings', async () => {
      const mockRoom = {
        id: 'room-1',
        settings: { notifications: false },
      };

      (mockPrisma.chatRoom.update as jest.Mock).mockResolvedValue(mockRoom);

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

      (mockPrisma.chatRoom.update as jest.Mock).mockResolvedValue(mockRoom);

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

      (mockPrisma.chatRoom.findMany as jest.Mock).mockResolvedValue(mockRooms);
      (mockPrisma.chatRoom.count as jest.Mock).mockResolvedValue(2);

      const result = await getUserRooms('user1', { page: 1, limit: 20 });

      expect(result.rooms).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it('should filter by room type', async () => {
      const mockRooms = [{ id: 'room-1', type: ChatRoomType.PRIVATE }];

      (mockPrisma.chatRoom.findMany as jest.Mock).mockResolvedValue(mockRooms);
      (mockPrisma.chatRoom.count as jest.Mock).mockResolvedValue(1);

      const result = await getUserRooms('user1', { type: ChatRoomType.PRIVATE });

      expect(result.rooms).toHaveLength(1);
      expect(result.rooms[0].type).toBe(ChatRoomType.PRIVATE);
    });
  });

  describe('searchRooms', () => {
    it('should search rooms by query', async () => {
      const mockRooms = [{ id: 'room-1', metadata: { name: 'Test Room' } }];

      (mockPrisma.chatRoom.findMany as jest.Mock).mockResolvedValue(mockRooms);
      (mockPrisma.chatRoom.count as jest.Mock).mockResolvedValue(1);

      const result = await searchRooms('user1', 'test');

      expect(result.rooms).toHaveLength(1);
    });
  });

  describe('isUserInRoom', () => {
    it('should return true if user is active participant', async () => {
      (mockPrisma.roomParticipant.findUnique as jest.Mock).mockResolvedValue({
        isActive: true,
      });

      const result = await isUserInRoom('room-1', 'user1');

      expect(result).toBe(true);
    });

    it('should return false if user is not participant', async () => {
      (mockPrisma.roomParticipant.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await isUserInRoom('room-1', 'user1');

      expect(result).toBe(false);
    });

    it('should return false if user is inactive participant', async () => {
      (mockPrisma.roomParticipant.findUnique as jest.Mock).mockResolvedValue({
        isActive: false,
      });

      const result = await isUserInRoom('room-1', 'user1');

      expect(result).toBe(false);
    });
  });

  describe('resetUnreadCount', () => {
    it('should reset unread count for user', async () => {
      (mockPrisma.roomParticipant.update as jest.Mock).mockResolvedValue({
        unreadCount: 0,
        lastReadAt: new Date(),
      });

      await resetUnreadCount('room-1', 'user1');

      expect(mockPrisma.roomParticipant.update).toHaveBeenCalled();
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

      (mockPrisma.chatRoom.update as jest.Mock).mockResolvedValue({});
      (mockPrisma.roomParticipant.updateMany as jest.Mock).mockResolvedValue({});

      await updateLastMessage('room-1', message);

      expect(mockPrisma.chatRoom.update).toHaveBeenCalled();
      expect(mockPrisma.roomParticipant.updateMany).toHaveBeenCalled();
    });
  });
});
