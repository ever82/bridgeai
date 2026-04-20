/**
 * Participant Service Unit Tests
 * 参与者服务单元测试
 */
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { ChatRoomType, ParticipantRole } from '@prisma/client';

import {
  addParticipant,
  removeParticipant,
  updateParticipant,
  getRoomParticipants,
  getParticipant,
  transferOwnership,
  hasPermission,
  getRolePermissions,
} from '../participantService';
import { prisma } from '../../../db/client';

// Mock the prisma client - mock db/client directly since that's what the service imports
jest.mock('../../../db/client', () => ({
  prisma: {
    chatRoom: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    roomParticipant: {
      create: jest.fn(),
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

describe('participantService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('addParticipant', () => {
    it('should add participant to room', async () => {
      const roomMock = {
        id: 'room-1',
        type: ChatRoomType.GROUP,
        settings: { maxParticipants: 100 },
        participants: [{ isActive: true }],
        participantIds: ['user1'],
      };

      const adderMock = {
        id: 'p1',
        userId: 'user1',
        role: ParticipantRole.OWNER,
        isActive: true,
      };

      const newParticipantMock = {
        id: 'new-p',
        roomId: 'room-1',
        userId: 'user2',
        role: ParticipantRole.MEMBER,
        isActive: true,
      };

      (mockPrisma.chatRoom.findUnique as jest.Mock).mockResolvedValue(roomMock);
      (mockPrisma.roomParticipant.findUnique as jest.Mock)
        .mockResolvedValueOnce(adderMock)
        .mockResolvedValueOnce(null);
      (mockPrisma.roomParticipant.create as jest.Mock).mockResolvedValue(newParticipantMock);

      const result = await addParticipant({
        roomId: 'room-1',
        userId: 'user2',
        addedBy: 'user1',
      });

      expect(result).toEqual(newParticipantMock);
      expect(mockPrisma.roomParticipant.create).toHaveBeenCalled();
    });

    it('should throw error if room not found', async () => {
      (mockPrisma.chatRoom.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        addParticipant({
          roomId: 'non-existent',
          userId: 'user2',
          addedBy: 'user1',
        })
      ).rejects.toThrow('Room not found');
    });

    it('should throw error if adder has no permission', async () => {
      const roomMock = {
        id: 'room-1',
        type: ChatRoomType.GROUP,
        participants: [],
      };

      const adderMock = {
        id: 'p1',
        userId: 'user1',
        role: ParticipantRole.MEMBER,
        isActive: true,
      };

      (mockPrisma.chatRoom.findUnique as jest.Mock).mockResolvedValue(roomMock);
      (mockPrisma.roomParticipant.findUnique as jest.Mock).mockResolvedValue(adderMock);

      await expect(
        addParticipant({
          roomId: 'room-1',
          userId: 'user2',
          addedBy: 'user1',
        })
      ).rejects.toThrow('Permission denied: cannot add participants');
    });

    it('should throw error if room is full', async () => {
      const roomMock = {
        id: 'room-1',
        type: ChatRoomType.GROUP,
        settings: { maxParticipants: 2 },
        participants: [{ isActive: true }, { isActive: true }],
      };

      const adderMock = {
        id: 'p1',
        userId: 'user1',
        role: ParticipantRole.OWNER,
        isActive: true,
      };

      (mockPrisma.chatRoom.findUnique as jest.Mock).mockResolvedValue(roomMock);
      (mockPrisma.roomParticipant.findUnique as jest.Mock).mockResolvedValue(adderMock);

      await expect(
        addParticipant({
          roomId: 'room-1',
          userId: 'user3',
          addedBy: 'user1',
        })
      ).rejects.toThrow('Room has reached maximum participant limit');
    });

    it('should reactivate inactive participant', async () => {
      const roomMock = {
        id: 'room-1',
        type: ChatRoomType.GROUP,
        participants: [],
      };

      const adderMock = {
        id: 'p1',
        userId: 'user1',
        role: ParticipantRole.OWNER,
        isActive: true,
      };

      const existingParticipant = {
        id: 'existing-p',
        roomId: 'room-1',
        userId: 'user2',
        isActive: false,
      };

      (mockPrisma.chatRoom.findUnique as jest.Mock).mockResolvedValue(roomMock);
      (mockPrisma.roomParticipant.findUnique as jest.Mock)
        .mockResolvedValueOnce(adderMock)
        .mockResolvedValueOnce(existingParticipant);
      (mockPrisma.roomParticipant.update as jest.Mock).mockResolvedValue({
        ...existingParticipant,
        isActive: true,
        role: ParticipantRole.MEMBER,
      });

      const result = await addParticipant({
        roomId: 'room-1',
        userId: 'user2',
        addedBy: 'user1',
      });

      expect(result.isActive).toBe(true);
      expect(mockPrisma.roomParticipant.create).not.toHaveBeenCalled();
    });
  });

  describe('removeParticipant', () => {
    it('should allow user to leave room', async () => {
      const removerMock = {
        id: 'p1',
        userId: 'user1',
        role: ParticipantRole.MEMBER,
        isActive: true,
      };

      const roomMock = {
        id: 'room-1',
        participantIds: ['user1', 'user2'],
        settings: { allowLeave: true },
      };

      (mockPrisma.roomParticipant.findUnique as jest.Mock).mockResolvedValue(removerMock);
      (mockPrisma.chatRoom.findUnique as jest.Mock).mockResolvedValue(roomMock);

      await removeParticipant('room-1', 'user1', 'user1');

      expect(mockPrisma.roomParticipant.update).toHaveBeenCalledWith({
        where: { id: 'p1' },
        data: {
          isActive: false,
          leftAt: expect.any(Date),
        },
      });
    });

    it('should throw error if user cannot leave room', async () => {
      const removerMock = {
        id: 'p1',
        userId: 'user1',
        role: ParticipantRole.MEMBER,
        isActive: true,
      };

      const roomMock = {
        id: 'room-1',
        settings: { allowLeave: false },
      };

      (mockPrisma.roomParticipant.findUnique as jest.Mock).mockResolvedValue(removerMock);
      (mockPrisma.chatRoom.findUnique as jest.Mock).mockResolvedValue(roomMock);

      await expect(removeParticipant('room-1', 'user1', 'user1')).rejects.toThrow(
        'Cannot leave this room'
      );
    });

    it('should allow admin to remove member', async () => {
      const removerMock = {
        id: 'p1',
        userId: 'admin',
        role: ParticipantRole.ADMIN,
        isActive: true,
      };

      const targetMock = {
        id: 'p2',
        userId: 'member',
        role: ParticipantRole.MEMBER,
        isActive: true,
      };

      const roomMock = {
        id: 'room-1',
        participantIds: ['admin', 'member'],
      };

      (mockPrisma.roomParticipant.findUnique as jest.Mock)
        .mockResolvedValueOnce(removerMock)
        .mockResolvedValueOnce(targetMock);
      (mockPrisma.chatRoom.findUnique as jest.Mock).mockResolvedValue(roomMock);

      await removeParticipant('room-1', 'member', 'admin');

      expect(mockPrisma.roomParticipant.update).toHaveBeenCalled();
    });

    it('should throw error if remover has no permission', async () => {
      const removerMock = {
        id: 'p1',
        userId: 'member1',
        role: ParticipantRole.MEMBER,
        isActive: true,
      };

      const targetMock = {
        id: 'p2',
        userId: 'member2',
        role: ParticipantRole.MEMBER,
        isActive: true,
      };

      (mockPrisma.roomParticipant.findUnique as jest.Mock)
        .mockResolvedValueOnce(removerMock)
        .mockResolvedValueOnce(targetMock);

      await expect(
        removeParticipant('room-1', 'member2', 'member1')
      ).rejects.toThrow('Permission denied: cannot remove this participant');
    });
  });

  describe('updateParticipant', () => {
    it('should allow user to update their own permissions', async () => {
      const participantMock = {
        id: 'p1',
        userId: 'user1',
        role: ParticipantRole.MEMBER,
        isActive: true,
      };

      (mockPrisma.roomParticipant.findUnique as jest.Mock).mockResolvedValue(participantMock);
      (mockPrisma.roomParticipant.update as jest.Mock).mockResolvedValue({
        ...participantMock,
        permissions: { canPin: true },
      });

      const result = await updateParticipant('room-1', 'user1', { permissions: { canPin: true } }, 'user1');

      expect(result.permissions).toEqual({ canPin: true });
    });

    it('should throw error if user tries to change own role', async () => {
      const participantMock = {
        id: 'p1',
        userId: 'user1',
        role: ParticipantRole.MEMBER,
        isActive: true,
      };

      (mockPrisma.roomParticipant.findUnique as jest.Mock).mockResolvedValue(participantMock);

      await expect(
        updateParticipant('room-1', 'user1', { role: ParticipantRole.ADMIN }, 'user1')
      ).rejects.toThrow('Cannot change your own role');
    });

    it('should allow owner to change member role', async () => {
      const updaterMock = {
        id: 'p1',
        userId: 'owner',
        role: ParticipantRole.OWNER,
        isActive: true,
      };

      const targetMock = {
        id: 'p2',
        userId: 'member',
        role: ParticipantRole.MEMBER,
        isActive: true,
      };

      (mockPrisma.roomParticipant.findUnique as jest.Mock)
        .mockResolvedValueOnce(updaterMock)
        .mockResolvedValueOnce(targetMock);
      (mockPrisma.roomParticipant.update as jest.Mock).mockResolvedValue({
        ...targetMock,
        role: ParticipantRole.ADMIN,
      });

      const result = await updateParticipant(
        'room-1',
        'member',
        { role: ParticipantRole.ADMIN },
        'owner'
      );

      expect(result.role).toBe(ParticipantRole.ADMIN);
    });
  });

  describe('getRoomParticipants', () => {
    it('should return active participants', async () => {
      const participantsMock = [
        {
          id: 'p1',
          userId: 'user1',
          role: ParticipantRole.OWNER,
          isActive: true,
          user: { id: 'user1', name: 'User 1' },
        },
        {
          id: 'p2',
          userId: 'user2',
          role: ParticipantRole.MEMBER,
          isActive: true,
          user: { id: 'user2', name: 'User 2' },
        },
      ];

      (mockPrisma.roomParticipant.findMany as jest.Mock).mockResolvedValue(participantsMock);

      const result = await getRoomParticipants('room-1');

      expect(result).toHaveLength(2);
      expect(mockPrisma.roomParticipant.findMany).toHaveBeenCalledWith({
        where: {
          roomId: 'room-1',
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
    });
  });

  describe('getParticipant', () => {
    it('should return participant with user info', async () => {
      const participantMock = {
        id: 'p1',
        userId: 'user1',
        roomId: 'room-1',
        role: ParticipantRole.OWNER,
        user: { id: 'user1', name: 'User 1' },
      };

      (mockPrisma.roomParticipant.findUnique as jest.Mock).mockResolvedValue(participantMock);

      const result = await getParticipant('room-1', 'user1');

      expect(result).toEqual(participantMock);
    });

    it('should return null if participant not found', async () => {
      (mockPrisma.roomParticipant.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await getParticipant('room-1', 'non-existent');

      expect(result).toBeNull();
    });
  });

  describe('transferOwnership', () => {
    it('should transfer ownership successfully', async () => {
      const currentOwnerMock = {
        id: 'p1',
        userId: 'owner',
        role: ParticipantRole.OWNER,
      };

      const newOwnerMock = {
        id: 'p2',
        userId: 'new-owner',
        role: ParticipantRole.ADMIN,
        isActive: true,
      };

      (mockPrisma.roomParticipant.findUnique as jest.Mock)
        .mockResolvedValueOnce(currentOwnerMock)
        .mockResolvedValueOnce(newOwnerMock);

      await transferOwnership('room-1', 'new-owner', 'owner');

      expect(mockPrisma.roomParticipant.update).toHaveBeenCalledTimes(2);
    });

    it('should throw error if current user is not owner', async () => {
      const nonOwnerMock = {
        id: 'p1',
        userId: 'admin',
        role: ParticipantRole.ADMIN,
      };

      (mockPrisma.roomParticipant.findUnique as jest.Mock).mockResolvedValue(nonOwnerMock);

      await expect(transferOwnership('room-1', 'new-owner', 'admin')).rejects.toThrow(
        'Only owner can transfer ownership'
      );
    });

    it('should throw error if new owner is not active participant', async () => {
      const currentOwnerMock = {
        id: 'p1',
        userId: 'owner',
        role: ParticipantRole.OWNER,
      };

      const inactiveUserMock = {
        id: 'p2',
        userId: 'inactive',
        role: ParticipantRole.MEMBER,
        isActive: false,
      };

      (mockPrisma.roomParticipant.findUnique as jest.Mock)
        .mockResolvedValueOnce(currentOwnerMock)
        .mockResolvedValueOnce(inactiveUserMock);

      await expect(transferOwnership('room-1', 'inactive', 'owner')).rejects.toThrow(
        'New owner must be an active participant'
      );
    });
  });

  describe('getRolePermissions', () => {
    it('should return owner permissions', () => {
      const permissions = getRolePermissions(ParticipantRole.OWNER);
      expect(permissions).toContain('room:manage');
      expect(permissions).toContain('room:delete');
      expect(permissions).toContain('participant:add');
    });

    it('should return admin permissions', () => {
      const permissions = getRolePermissions(ParticipantRole.ADMIN);
      expect(permissions).toContain('room:manage');
      expect(permissions).toContain('participant:add');
      expect(permissions).not.toContain('room:delete');
    });

    it('should return member permissions', () => {
      const permissions = getRolePermissions(ParticipantRole.MEMBER);
      expect(permissions).toContain('message:send');
      expect(permissions).toContain('message:edit:own');
      expect(permissions).not.toContain('room:manage');
    });

    it('should return guest permissions', () => {
      const permissions = getRolePermissions(ParticipantRole.GUEST);
      expect(permissions).toEqual(['message:send']);
    });
  });

  describe('hasPermission', () => {
    it('should return true if user has role permission', async () => {
      (mockPrisma.roomParticipant.findUnique as jest.Mock).mockResolvedValue({
        role: ParticipantRole.ADMIN,
        isActive: true,
        permissions: null,
      });

      const result = await hasPermission('room-1', 'user1', 'room:manage');

      expect(result).toBe(true);
    });

    it('should return true if user has custom permission', async () => {
      (mockPrisma.roomParticipant.findUnique as jest.Mock).mockResolvedValue({
        role: ParticipantRole.MEMBER,
        isActive: true,
        permissions: { 'custom:permission': true },
      });

      const result = await hasPermission('room-1', 'user1', 'custom:permission');

      expect(result).toBe(true);
    });

    it('should return false if user is not active participant', async () => {
      (mockPrisma.roomParticipant.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await hasPermission('room-1', 'user1', 'message:send');

      expect(result).toBe(false);
    });

    it('should return false if user lacks permission', async () => {
      (mockPrisma.roomParticipant.findUnique as jest.Mock).mockResolvedValue({
        role: ParticipantRole.MEMBER,
        isActive: true,
        permissions: {},
      });

      const result = await hasPermission('room-1', 'user1', 'room:delete');

      expect(result).toBe(false);
    });
  });
});
