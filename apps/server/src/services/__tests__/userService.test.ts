/**
 * User Service Tests
 * 用户服务测试
 */

import * as userService from '../userService';
import { PrismaClient } from '@prisma/client';

// Mock Prisma
jest.mock('@prisma/client', () => {
  const mockUser = {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  return {
    PrismaClient: jest.fn(() => ({
      user: mockUser,
    })),
  };
});

// Mock logger
jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

describe('UserService', () => {
  const mockUserId = 'user-123';
  const mockUser = {
    id: mockUserId,
    email: 'test@example.com',
    name: 'Test User',
    avatarUrl: null,
    phone: '13800138000',
    status: 'ACTIVE',
    createdAt: new Date(),
    updatedAt: new Date(),
    passwordHash: 'hashed-password',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getUserProfile', () => {
    it('should return user profile successfully', async () => {
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();
      prisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await userService.getUserProfile(mockUserId);

      expect(result).toEqual({
        id: mockUser.id,
        email: mockUser.email,
        name: mockUser.name,
        avatarUrl: mockUser.avatarUrl,
        phone: mockUser.phone,
        status: mockUser.status,
        createdAt: mockUser.createdAt,
        updatedAt: mockUser.updatedAt,
      });
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: mockUserId },
      });
    });

    it('should throw error when user not found', async () => {
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(userService.getUserProfile(mockUserId)).rejects.toThrow('用户不存在');
    });
  });

  describe('updateUserProfile', () => {
    const updateData = {
      name: 'New Name',
      phone: '13900139000',
    };

    it('should update user profile successfully', async () => {
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();
      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.user.findFirst.mockResolvedValue(null);
      prisma.user.update.mockResolvedValue({
        ...mockUser,
        ...updateData,
      });

      const result = await userService.updateUserProfile(mockUserId, updateData);

      expect(result.name).toBe(updateData.name);
      expect(result.phone).toBe(updateData.phone);
    });

    it('should throw error when user not found', async () => {
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(userService.updateUserProfile(mockUserId, updateData)).rejects.toThrow('用户不存在');
    });

    it('should throw error when email already exists', async () => {
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();
      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.user.findUnique.mockResolvedValueOnce(mockUser).mockResolvedValueOnce({ id: 'other-user' });

      await expect(
        userService.updateUserProfile(mockUserId, { email: 'other@example.com' })
      ).rejects.toThrow('邮箱已被使用');
    });

    it('should throw error when phone already exists', async () => {
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();
      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.user.findFirst.mockResolvedValue({ id: 'other-user' });

      await expect(
        userService.updateUserProfile(mockUserId, { phone: '13900139000' })
      ).rejects.toThrow('手机号已被使用');
    });
  });

  describe('updateUserAvatar', () => {
    const avatarUrl = 'https://example.com/avatar.jpg';

    it('should update user avatar successfully', async () => {
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();
      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.user.update.mockResolvedValue({
        ...mockUser,
        avatarUrl,
      });

      const result = await userService.updateUserAvatar(mockUserId, avatarUrl);

      expect(result.avatarUrl).toBe(avatarUrl);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: mockUserId },
        data: { avatarUrl },
      });
    });

    it('should throw error when user not found', async () => {
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(userService.updateUserAvatar(mockUserId, avatarUrl)).rejects.toThrow('用户不存在');
    });
  });

  describe('deleteUserAccount', () => {
    it('should soft delete user account', async () => {
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();
      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.user.update.mockResolvedValue({
        ...mockUser,
        status: 'INACTIVE',
      });

      await userService.deleteUserAccount(mockUserId);

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: mockUserId },
        data: { status: 'INACTIVE' },
      });
    });

    it('should throw error when user not found', async () => {
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(userService.deleteUserAccount(mockUserId)).rejects.toThrow('用户不存在');
    });
  });
});
