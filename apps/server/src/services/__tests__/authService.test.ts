import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

import {
  validatePasswordStrength,
  generateRefreshToken,
  hashPassword,
  comparePassword,
  checkUserExists,
  registerUser,
  loginUser,
  refreshAccessToken,
  requestPasswordReset,
  resetPassword,
  changePassword,
  getCurrentUser,
} from '../authService';
import { prisma } from '../../db/client';
import { logger } from '../../utils/logger';

// Mock prisma
jest.mock('../../db/client', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    loginLog: {
      create: jest.fn(),
    },
  },
}));

// Mock logger
jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('Auth Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('validatePasswordStrength', () => {
    it('should pass for a strong password', () => {
      const result = validatePasswordStrength('SecurePass123!');
      expect(result.valid).toBe(true);
      expect(result.score).toBe(4);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail for password too short', () => {
      const result = validatePasswordStrength('Short1!');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('密码长度至少为8位');
    });

    it('should fail for password missing uppercase', () => {
      const result = validatePasswordStrength('securepass123!');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('密码必须包含大写字母');
    });

    it('should fail for password missing lowercase', () => {
      const result = validatePasswordStrength('SECUREPASS123!');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('密码必须包含小写字母');
    });

    it('should fail for password missing digit', () => {
      const result = validatePasswordStrength('SecurePass!!!');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('密码必须包含数字');
    });

    it('should fail for password missing special character', () => {
      const result = validatePasswordStrength('SecurePass123');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('密码必须包含特殊字符');
    });

    it('should return score 1 for weak password', () => {
      const result = validatePasswordStrength('Secure!!!');
      expect(result.valid).toBe(false);
      expect(result.score).toBe(3);
    });
  });

  describe('hashPassword / comparePassword', () => {
    it('should hash a password', async () => {
      const hash = await hashPassword('password123');
      expect(hash).not.toBe('password123');
      expect(hash).toMatch(/^\$2[aby]\$/);
    });

    it('should compare a password with its hash', async () => {
      const hash = await bcrypt.hash('password123', 10);
      const match = await comparePassword('password123', hash);
      expect(match).toBe(true);
    });

    it('should fail for wrong password', async () => {
      const hash = await bcrypt.hash('password123', 10);
      const match = await comparePassword('wrongpassword', hash);
      expect(match).toBe(false);
    });
  });

  describe('checkUserExists', () => {
    it('should return true when user exists', async () => {
      (prisma.user.findFirst as jest.Mock).mockResolvedValue({ id: 'user-1' });
      const result = await checkUserExists('test@example.com');
      expect(result).toBe(true);
    });

    it('should return false when user does not exist', async () => {
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);
      const result = await checkUserExists('test@example.com');
      expect(result).toBe(false);
    });

    it('should return false when no email or phone provided', async () => {
      const result = await checkUserExists();
      expect(result).toBe(false);
      expect(prisma.user.findFirst).not.toHaveBeenCalled();
    });
  });

  describe('registerUser', () => {
    const validRegisterData = {
      email: 'newuser@example.com',
      password: 'SecurePass123!',
      name: 'New User',
    };

    it('should register a new user successfully', async () => {
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.user.create as jest.Mock).mockResolvedValue({
        id: 'user-1',
        email: 'newuser@example.com',
        name: 'New User',
        phone: null,
        role: 'user',
        status: 'ACTIVE',
        passwordHash: 'hashed',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await registerUser(validRegisterData);

      expect(result).toBeDefined();
      expect(result.user).toBeDefined();
      expect(result.user.email).toBe('newuser@example.com');
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(result.user).not.toHaveProperty('passwordHash');
      expect(logger.info).toHaveBeenCalled();
    });

    it('should throw error when user already exists', async () => {
      (prisma.user.findFirst as jest.Mock).mockResolvedValue({ id: 'existing' });

      await expect(registerUser(validRegisterData)).rejects.toThrow('用户已存在');
    });

    it('should throw error for weak password', async () => {
      await expect(registerUser({ ...validRegisterData, password: '123' })).rejects.toThrow(
        '密码强度不足'
      );
    });

    it('should throw error when no email or phone', async () => {
      await expect(
        registerUser({ ...validRegisterData, email: undefined, phone: undefined } as any)
      ).rejects.toThrow('邮箱或手机号至少需要一个');
    });

    it('should throw error for wrong verification code', async () => {
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);
      await expect(
        registerUser({ ...validRegisterData, verificationCode: '999999' })
      ).rejects.toThrow('验证码错误');
    });

    it('should accept valid verification code', async () => {
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.user.create as jest.Mock).mockResolvedValue({
        id: 'user-1',
        email: 'newuser@example.com',
        name: 'New User',
        phone: null,
        role: 'user',
        status: 'ACTIVE',
        passwordHash: 'hashed',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await registerUser({ ...validRegisterData, verificationCode: '123456' });
      expect(result.user.email).toBe('newuser@example.com');
    });
  });

  describe('loginUser', () => {
    const mockUser = {
      id: 'user-1',
      email: 'test@example.com',
      passwordHash: '$2b$10$abcdefghijklmnopqrstuv', // bcrypt hash
      name: 'Test User',
      role: 'user',
      status: 'active',
      lockedUntil: null,
      failedLoginAttempts: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    beforeEach(() => {
      jest.spyOn(bcrypt, 'compare').mockReset();
      (prisma.loginLog.create as jest.Mock).mockResolvedValue({});
    });

    it('should login with valid credentials', async () => {
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(mockUser);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as any);
      (prisma.user.update as jest.Mock).mockResolvedValue(mockUser);

      const result = await loginUser({
        email: 'test@example.com',
        password: 'SecurePass123!',
      });

      expect(result).toBeDefined();
      expect(result.user.email).toBe('test@example.com');
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ failedLoginAttempts: 0, lockedUntil: null }),
        })
      );
    });

    it('should throw error when user is locked', async () => {
      const lockedUser = {
        ...mockUser,
        lockedUntil: new Date(Date.now() + 30 * 60 * 1000),
      };
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(lockedUser);

      await expect(loginUser({ email: 'test@example.com', password: 'any' })).rejects.toThrow(
        '账户已被锁定'
      );
    });

    it('should throw error for invalid credentials', async () => {
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(mockUser);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(false as any);
      (prisma.user.update as jest.Mock).mockResolvedValue({});

      await expect(
        loginUser({ email: 'test@example.com', password: 'wrongpassword' })
      ).rejects.toThrow('密码错误');
    });

    it('should lock account after 5 failed attempts', async () => {
      const almostLockedUser = {
        ...mockUser,
        failedLoginAttempts: 4,
      };
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(almostLockedUser);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(false as any);
      (prisma.user.update as jest.Mock).mockResolvedValue({});

      await expect(
        loginUser({ email: 'test@example.com', password: 'wrongpassword' })
      ).rejects.toThrow('账户已锁定30分钟');

      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            failedLoginAttempts: 5,
            lockedUntil: expect.any(Date),
          }),
        })
      );
    });

    it('should login with valid verification code', async () => {
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(mockUser);

      const result = await loginUser({
        email: 'test@example.com',
        verificationCode: '123456',
      });

      expect(result).toBeDefined();
      expect(result.user.email).toBe('test@example.com');
    });

    it('should throw error for invalid verification code', async () => {
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(mockUser);

      await expect(
        loginUser({ email: 'test@example.com', verificationCode: '999999' })
      ).rejects.toThrow('验证码错误');
    });

    it('should throw error when user does not exist', async () => {
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(loginUser({ email: 'nobody@example.com', password: 'any' })).rejects.toThrow(
        '用户不存在'
      );
    });

    it('should throw error when neither password nor verification code provided', async () => {
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(mockUser);

      await expect(loginUser({ email: 'test@example.com' })).rejects.toThrow(
        '密码或验证码至少需要一个'
      );
    });
  });

  describe('refreshAccessToken', () => {
    it('should refresh access token', async () => {
      const user = {
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        role: 'user',
        status: 'ACTIVE',
        passwordHash: 'hash',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(user);

      const refreshToken = generateRefreshToken('user-1');
      const result = await refreshAccessToken(refreshToken);

      expect(result).toBeDefined();
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(result.user.id).toBe('user-1');
    });

    it('should throw error for invalid refresh token', async () => {
      await expect(refreshAccessToken('invalid.token')).rejects.toThrow('刷新令牌无效或已过期');
    });

    it('should throw error for non-existent user', async () => {
      const refreshToken = generateRefreshToken('nonexistent');
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(refreshAccessToken(refreshToken)).rejects.toThrow('用户不存在');
    });

    it('should throw error for inactive user', async () => {
      const refreshToken = generateRefreshToken('user-1');
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'user-1',
        status: 'inactive',
      });

      await expect(refreshAccessToken(refreshToken)).rejects.toThrow('账户已被禁用');
    });
  });

  describe('requestPasswordReset', () => {
    it('should generate reset token for existing user', async () => {
      (prisma.user.findFirst as jest.Mock).mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
      });

      const token = await requestPasswordReset('test@example.com');

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      // Verify token is valid JWT
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as any;
      expect(decoded.userId).toBe('user-1');
      expect(decoded.type).toBe('password-reset');
    });

    it('should throw error for non-existent user', async () => {
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(requestPasswordReset('nobody@example.com')).rejects.toThrow('用户不存在');
    });

    it('should throw error when no email or phone', async () => {
      await expect(requestPasswordReset()).rejects.toThrow('邮箱或手机号至少需要一个');
    });
  });

  describe('resetPassword', () => {
    it('should reset password with valid token', async () => {
      const userId = 'user-1';
      const token = jwt.sign(
        { userId, type: 'password-reset' },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '15m' }
      );
      (prisma.user.update as jest.Mock).mockResolvedValue({});

      await resetPassword(token, 'NewSecurePass123!');

      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: userId },
        })
      );
    });

    it('should throw error for invalid token', async () => {
      await expect(resetPassword('invalid.token', 'NewPass123!')).rejects.toThrow(
        '重置令牌无效或已过期'
      );
    });

    it('should throw error for weak new password', async () => {
      const token = jwt.sign(
        { userId: 'user-1', type: 'password-reset' },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '15m' }
      );

      await expect(resetPassword(token, '123')).rejects.toThrow('密码强度不足');
    });
  });

  describe('changePassword', () => {
    it('should change password with valid old password', async () => {
      const hash = await bcrypt.hash('oldpassword', 10);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'user-1',
        passwordHash: hash,
      });
      (prisma.user.update as jest.Mock).mockResolvedValue({});

      await changePassword('user-1', 'oldpassword', 'NewSecurePass123!');

      expect(prisma.user.update).toHaveBeenCalled();
    });

    it('should throw error for wrong old password', async () => {
      const hash = await bcrypt.hash('oldpassword', 10);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'user-1',
        passwordHash: hash,
      });

      await expect(changePassword('user-1', 'wrongpassword', 'NewSecurePass123!')).rejects.toThrow(
        '旧密码错误'
      );
    });

    it('should throw error for weak new password', async () => {
      const hash = await bcrypt.hash('oldpassword', 10);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'user-1',
        passwordHash: hash,
      });

      await expect(changePassword('user-1', 'oldpassword', '123')).rejects.toThrow('密码强度不足');
    });

    it('should throw error when user not found', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(changePassword('nonexistent', 'any', 'NewSecurePass123!')).rejects.toThrow(
        '用户不存在'
      );
    });
  });

  describe('getCurrentUser', () => {
    it('should return user without password', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        passwordHash: 'should-not-be-returned',
        name: 'Test User',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await getCurrentUser('user-1');

      expect(result.id).toBe('user-1');
      expect(result.email).toBe('test@example.com');
      expect(result).not.toHaveProperty('passwordHash');
    });

    it('should throw error when user not found', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(getCurrentUser('nonexistent')).rejects.toThrow('用户不存在');
    });
  });
});
