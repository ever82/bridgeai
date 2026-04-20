import bcrypt from 'bcryptjs';

import {
  getUserById,
  getUserByEmail,
  updateUser,
  updateAvatar,
  deleteUser,
  updatePrivacySettings,
  getPrivacySettings,
  changePassword,
  updatePhone,
  updateEmail,
  registerDevice,
  getUserDevices,
  removeDevice,
  blockUser,
  unblockUser,
  getBlockedUsers,
  isUserBlocked,
} from '../../services/userService';
import { prisma } from '../../db/client';

// Mock the prisma client
jest.mock('../../db/client', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
    blockedUser: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      deleteMany: jest.fn(),
    },
    userDevice: {
      findMany: jest.fn(),
      upsert: jest.fn(),
      updateMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    $transaction: jest.fn((ops: any[]) => Promise.all(ops)),
  },
}));

describe('User Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getUserById', () => {
    it('should return user profile when user exists', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        emailVerified: true,
        name: 'Test User',
        displayName: 'Test',
        avatarUrl: null,
        bio: null,
        website: null,
        location: null,
        phone: null,
        phoneVerified: false,
        status: 'ACTIVE',
        privacySettings: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const result = await getUserById('user-1');

      expect(result).toBeDefined();
      expect(result?.id).toBe('user-1');
      expect(result?.email).toBe('test@example.com');
    });

    it('should return null when user does not exist', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await getUserById('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('getUserByEmail', () => {
    it('should return user profile when user exists', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        emailVerified: true,
        name: 'Test User',
        displayName: 'Test',
        avatarUrl: null,
        bio: null,
        website: null,
        location: null,
        phone: null,
        phoneVerified: false,
        status: 'ACTIVE',
        privacySettings: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const result = await getUserByEmail('test@example.com');

      expect(result).toBeDefined();
      expect(result?.email).toBe('test@example.com');
    });
  });

  describe('updateUser', () => {
    it('should update user profile', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        emailVerified: true,
        name: 'Updated Name',
        displayName: 'Updated',
        avatarUrl: null,
        bio: 'New bio',
        website: 'https://example.com',
        location: 'New York',
        phone: null,
        phoneVerified: false,
        status: 'ACTIVE',
        privacySettings: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prisma.user.update as jest.Mock).mockResolvedValue(mockUser);

      const result = await updateUser('user-1', {
        name: 'Updated Name',
        displayName: 'Updated',
        bio: 'New bio',
        website: 'https://example.com',
        location: 'New York',
      });

      expect(result.name).toBe('Updated Name');
      expect(result.displayName).toBe('Updated');
      expect(result.bio).toBe('New bio');
    });
  });

  describe('updateAvatar', () => {
    it('should update user avatar', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        emailVerified: true,
        name: 'Test User',
        displayName: 'Test',
        avatarUrl: 'https://example.com/avatar.jpg',
        bio: null,
        website: null,
        location: null,
        phone: null,
        phoneVerified: false,
        status: 'ACTIVE',
        privacySettings: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prisma.user.update as jest.Mock).mockResolvedValue(mockUser);

      const result = await updateAvatar('user-1', 'https://example.com/avatar.jpg');

      expect(result.avatarUrl).toBe('https://example.com/avatar.jpg');
    });
  });

  describe('getPrivacySettings', () => {
    it('should return default settings when no settings exist', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ privacySettings: null });

      const result = await getPrivacySettings('user-1');

      expect(result.profileVisibility).toBe('public');
      expect(result.onlineStatusVisible).toBe(true);
    });

    it('should return saved settings', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        privacySettings: {
          profileVisibility: 'private',
          onlineStatusVisible: false,
        },
      });

      const result = await getPrivacySettings('user-1');

      expect(result.profileVisibility).toBe('private');
      expect(result.onlineStatusVisible).toBe(false);
    });
  });

  describe('updatePrivacySettings', () => {
    it('should update privacy settings', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ privacySettings: null });
      (prisma.user.update as jest.Mock).mockResolvedValue({
        privacySettings: {
          profileVisibility: 'friends',
          onlineStatusVisible: true,
        },
      });

      const result = await updatePrivacySettings('user-1', { profileVisibility: 'friends' });

      expect(result.profileVisibility).toBe('friends');
    });
  });

  describe('blockUser', () => {
    it('should block a user', async () => {
      (prisma.blockedUser.create as jest.Mock).mockResolvedValue({});

      await blockUser('user-1', 'user-2', 'Spam');

      expect(prisma.blockedUser.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          blockedUserId: 'user-2',
          reason: 'Spam',
        },
      });
    });

    it('should throw error when trying to block self', async () => {
      await expect(blockUser('user-1', 'user-1')).rejects.toThrow('Cannot block yourself');
    });
  });

  describe('unblockUser', () => {
    it('should unblock a user', async () => {
      (prisma.blockedUser.deleteMany as jest.Mock).mockResolvedValue({ count: 1 });

      await unblockUser('user-1', 'user-2');

      expect(prisma.blockedUser.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', blockedUserId: 'user-2' },
      });
    });
  });

  describe('isUserBlocked', () => {
    it('should return true when user is blocked', async () => {
      (prisma.blockedUser.findUnique as jest.Mock).mockResolvedValue({ id: 'block-1' });

      const result = await isUserBlocked('user-1', 'user-2');

      expect(result).toBe(true);
    });

    it('should return false when user is not blocked', async () => {
      (prisma.blockedUser.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await isUserBlocked('user-1', 'user-2');

      expect(result).toBe(false);
    });
  });

  describe('registerDevice', () => {
    it('should register a new device', async () => {
      (prisma.userDevice.upsert as jest.Mock).mockResolvedValue({});
      (prisma.userDevice.updateMany as jest.Mock).mockResolvedValue({});

      await registerDevice('user-1', {
        deviceId: 'device-1',
        deviceName: 'iPhone 12',
        deviceType: 'ios',
      });

      expect(prisma.userDevice.upsert).toHaveBeenCalled();
    });
  });

  describe('getUserDevices', () => {
    it('should return user devices', async () => {
      const mockDevices = [
        { id: 'device-1', deviceName: 'iPhone 12' },
        { id: 'device-2', deviceName: 'iPad' },
      ];

      (prisma.userDevice.findMany as jest.Mock).mockResolvedValue(mockDevices);

      const result = await getUserDevices('user-1');

      expect(result).toHaveLength(2);
    });
  });

  describe('removeDevice', () => {
    it('should remove a device', async () => {
      (prisma.userDevice.deleteMany as jest.Mock).mockResolvedValue({ count: 1 });

      await removeDevice('user-1', 'device-1');

      expect(prisma.userDevice.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', deviceId: 'device-1' },
      });
    });
  });
});
