"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const authService_1 = require("../authService");
const client_1 = require("../../db/client");
const logger_1 = require("../../utils/logger");
const cache_1 = require("../cache");
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
// Mock cache
jest.mock('../cache', () => ({
    cacheGet: jest.fn(),
    cacheSet: jest.fn(),
    cacheDel: jest.fn(),
}));
// Mock refresh token service
jest.mock('../auth/refreshToken', () => ({
    createRefreshToken: jest.fn().mockResolvedValue(undefined),
    isRefreshTokenValid: jest.fn().mockResolvedValue(true),
    rotateRefreshToken: jest.fn().mockResolvedValue(undefined),
    revokeAllUserRefreshTokens: jest.fn().mockResolvedValue(0),
    revokeRefreshToken: jest.fn().mockResolvedValue(undefined),
}));
describe('Auth Service', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });
    describe('validatePasswordStrength', () => {
        it('should pass for a strong password', () => {
            const result = (0, authService_1.validatePasswordStrength)('SecurePass123!');
            expect(result.valid).toBe(true);
            expect(result.score).toBe(4);
            expect(result.errors).toHaveLength(0);
        });
        it('should fail for password too short', () => {
            const result = (0, authService_1.validatePasswordStrength)('Short1!');
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('密码长度至少为8位');
        });
        it('should fail for password missing uppercase', () => {
            const result = (0, authService_1.validatePasswordStrength)('securepass123!');
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('密码必须包含大写字母');
        });
        it('should fail for password missing lowercase', () => {
            const result = (0, authService_1.validatePasswordStrength)('SECUREPASS123!');
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('密码必须包含小写字母');
        });
        it('should fail for password missing digit', () => {
            const result = (0, authService_1.validatePasswordStrength)('SecurePass!!!');
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('密码必须包含数字');
        });
        it('should fail for password missing special character', () => {
            const result = (0, authService_1.validatePasswordStrength)('SecurePass123');
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('密码必须包含特殊字符');
        });
        it('should return score 1 for weak password', () => {
            const result = (0, authService_1.validatePasswordStrength)('Secure!!!');
            expect(result.valid).toBe(false);
            expect(result.score).toBe(3);
        });
    });
    describe('hashPassword / comparePassword', () => {
        it('should hash a password', async () => {
            const hash = await (0, authService_1.hashPassword)('password123');
            expect(hash).not.toBe('password123');
            expect(hash).toMatch(/^\$2[aby]\$/);
        });
        it('should compare a password with its hash', async () => {
            const hash = await bcrypt_1.default.hash('password123', 10);
            const match = await (0, authService_1.comparePassword)('password123', hash);
            expect(match).toBe(true);
        });
        it('should fail for wrong password', async () => {
            const hash = await bcrypt_1.default.hash('password123', 10);
            const match = await (0, authService_1.comparePassword)('wrongpassword', hash);
            expect(match).toBe(false);
        });
    });
    describe('checkUserExists', () => {
        it('should return true when user exists', async () => {
            client_1.prisma.user.findFirst.mockResolvedValue({ id: 'user-1' });
            const result = await (0, authService_1.checkUserExists)('test@example.com');
            expect(result).toBe(true);
        });
        it('should return false when user does not exist', async () => {
            client_1.prisma.user.findFirst.mockResolvedValue(null);
            const result = await (0, authService_1.checkUserExists)('test@example.com');
            expect(result).toBe(false);
        });
        it('should return false when no email or phone provided', async () => {
            const result = await (0, authService_1.checkUserExists)();
            expect(result).toBe(false);
            expect(client_1.prisma.user.findFirst).not.toHaveBeenCalled();
        });
    });
    describe('registerUser', () => {
        const validRegisterData = {
            email: 'newuser@example.com',
            password: 'SecurePass123!',
            name: 'New User',
        };
        it('should register a new user successfully', async () => {
            client_1.prisma.user.findFirst.mockResolvedValue(null);
            client_1.prisma.user.create.mockResolvedValue({
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
            const result = await (0, authService_1.registerUser)(validRegisterData);
            expect(result).toBeDefined();
            expect(result.user).toBeDefined();
            expect(result.user.email).toBe('newuser@example.com');
            expect(result.accessToken).toBeDefined();
            expect(result.refreshToken).toBeDefined();
            expect(result.user).not.toHaveProperty('passwordHash');
            expect(logger_1.logger.info).toHaveBeenCalled();
        });
        it('should throw error when user already exists', async () => {
            client_1.prisma.user.findFirst.mockResolvedValue({ id: 'existing' });
            await expect((0, authService_1.registerUser)(validRegisterData)).rejects.toThrow('用户已存在');
        });
        it('should throw error for weak password', async () => {
            await expect((0, authService_1.registerUser)({ ...validRegisterData, password: '123' })).rejects.toThrow('密码强度不足');
        });
        it('should throw error when no email or phone', async () => {
            await expect((0, authService_1.registerUser)({ ...validRegisterData, email: undefined, phone: undefined })).rejects.toThrow('邮箱或手机号至少需要一个');
        });
        it('should throw error for wrong verification code', async () => {
            client_1.prisma.user.findFirst.mockResolvedValue(null);
            cache_1.cacheGet.mockResolvedValue('654321');
            await expect((0, authService_1.registerUser)({ ...validRegisterData, verificationCode: '999999' })).rejects.toThrow('验证码错误或已过期');
        });
        it('should accept valid verification code', async () => {
            client_1.prisma.user.findFirst.mockResolvedValue(null);
            cache_1.cacheGet.mockResolvedValue('123456');
            client_1.prisma.user.create.mockResolvedValue({
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
            const result = await (0, authService_1.registerUser)({ ...validRegisterData, verificationCode: '123456' });
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
            jest.spyOn(bcrypt_1.default, 'compare').mockReset();
            client_1.prisma.loginLog.create.mockResolvedValue({});
        });
        it('should login with valid credentials', async () => {
            client_1.prisma.user.findFirst.mockResolvedValue(mockUser);
            jest.spyOn(bcrypt_1.default, 'compare').mockResolvedValue(true);
            client_1.prisma.user.update.mockResolvedValue(mockUser);
            const result = await (0, authService_1.loginUser)({
                email: 'test@example.com',
                password: 'SecurePass123!',
            });
            expect(result).toBeDefined();
            expect(result.user.email).toBe('test@example.com');
            expect(result.accessToken).toBeDefined();
            expect(result.refreshToken).toBeDefined();
            expect(client_1.prisma.user.update).toHaveBeenCalledWith(expect.objectContaining({
                data: expect.objectContaining({ failedLoginAttempts: 0, lockedUntil: null }),
            }));
        });
        it('should throw error when user is locked', async () => {
            const lockedUser = {
                ...mockUser,
                lockedUntil: new Date(Date.now() + 30 * 60 * 1000),
            };
            client_1.prisma.user.findFirst.mockResolvedValue(lockedUser);
            await expect((0, authService_1.loginUser)({ email: 'test@example.com', password: 'any' })).rejects.toThrow('账户已被锁定');
        });
        it('should throw error for invalid credentials', async () => {
            client_1.prisma.user.findFirst.mockResolvedValue(mockUser);
            jest.spyOn(bcrypt_1.default, 'compare').mockResolvedValue(false);
            client_1.prisma.user.update.mockResolvedValue({});
            await expect((0, authService_1.loginUser)({ email: 'test@example.com', password: 'wrongpassword' })).rejects.toThrow('密码错误');
        });
        it('should lock account after 5 failed attempts', async () => {
            const almostLockedUser = {
                ...mockUser,
                failedLoginAttempts: 4,
            };
            client_1.prisma.user.findFirst.mockResolvedValue(almostLockedUser);
            jest.spyOn(bcrypt_1.default, 'compare').mockResolvedValue(false);
            client_1.prisma.user.update.mockResolvedValue({});
            await expect((0, authService_1.loginUser)({ email: 'test@example.com', password: 'wrongpassword' })).rejects.toThrow('账户已锁定30分钟');
            expect(client_1.prisma.user.update).toHaveBeenCalledWith(expect.objectContaining({
                data: expect.objectContaining({
                    failedLoginAttempts: 5,
                    lockedUntil: expect.any(Date),
                }),
            }));
        });
        it('should login with valid verification code', async () => {
            client_1.prisma.user.findFirst.mockResolvedValue(mockUser);
            client_1.prisma.user.update.mockResolvedValue(mockUser);
            cache_1.cacheGet.mockResolvedValue('123456');
            const result = await (0, authService_1.loginUser)({
                email: 'test@example.com',
                verificationCode: '123456',
            });
            expect(result).toBeDefined();
            expect(result.user.email).toBe('test@example.com');
        });
        it('should throw error for invalid verification code', async () => {
            client_1.prisma.user.findFirst.mockResolvedValue(mockUser);
            cache_1.cacheGet.mockResolvedValue('654321');
            await expect((0, authService_1.loginUser)({ email: 'test@example.com', verificationCode: '999999' })).rejects.toThrow('验证码错误或已过期');
        });
        it('should throw error when user does not exist', async () => {
            client_1.prisma.user.findFirst.mockResolvedValue(null);
            await expect((0, authService_1.loginUser)({ email: 'nobody@example.com', password: 'any' })).rejects.toThrow('邮箱/手机号或密码错误');
        });
        it('should throw error when neither password nor verification code provided', async () => {
            client_1.prisma.user.findFirst.mockResolvedValue(mockUser);
            await expect((0, authService_1.loginUser)({ email: 'test@example.com' })).rejects.toThrow('密码或验证码至少需要一个');
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
            client_1.prisma.user.findUnique.mockResolvedValue(user);
            const refreshToken = (0, authService_1.generateRefreshToken)('user-1');
            const result = await (0, authService_1.refreshAccessToken)(refreshToken);
            expect(result).toBeDefined();
            expect(result.accessToken).toBeDefined();
            expect(result.refreshToken).toBeDefined();
            expect(result.user.id).toBe('user-1');
        });
        it('should throw error for invalid refresh token', async () => {
            await expect((0, authService_1.refreshAccessToken)('invalid.token')).rejects.toThrow('刷新令牌无效或已过期');
        });
        it('should throw error for non-existent user', async () => {
            const refreshToken = (0, authService_1.generateRefreshToken)('nonexistent');
            client_1.prisma.user.findUnique.mockResolvedValue(null);
            await expect((0, authService_1.refreshAccessToken)(refreshToken)).rejects.toThrow('用户不存在');
        });
        it('should throw error for inactive user', async () => {
            const refreshToken = (0, authService_1.generateRefreshToken)('user-1');
            client_1.prisma.user.findUnique.mockResolvedValue({
                id: 'user-1',
                status: 'inactive',
            });
            await expect((0, authService_1.refreshAccessToken)(refreshToken)).rejects.toThrow('账户已被禁用');
        });
    });
    describe('requestPasswordReset', () => {
        it('should generate reset token for existing user', async () => {
            client_1.prisma.user.findFirst.mockResolvedValue({
                id: 'user-1',
                email: 'test@example.com',
            });
            const token = await (0, authService_1.requestPasswordReset)('test@example.com');
            expect(token).toBeDefined();
            expect(typeof token).toBe('string');
            // Verify token is valid JWT
            const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
            expect(decoded.userId).toBe('user-1');
            expect(decoded.type).toBe('password-reset');
        });
        it('should return safely for non-existent user (no enumeration)', async () => {
            client_1.prisma.user.findFirst.mockResolvedValue(null);
            const result = await (0, authService_1.requestPasswordReset)('nobody@example.com');
            expect(result).toBe('no-reset-needed');
        });
        it('should throw error when no email or phone', async () => {
            await expect((0, authService_1.requestPasswordReset)()).rejects.toThrow('邮箱或手机号至少需要一个');
        });
    });
    describe('resetPassword', () => {
        it('should reset password with valid token', async () => {
            const userId = 'user-1';
            const token = jsonwebtoken_1.default.sign({ userId, type: 'password-reset' }, process.env.JWT_SECRET, {
                expiresIn: '15m',
            });
            client_1.prisma.user.update.mockResolvedValue({});
            await (0, authService_1.resetPassword)(token, 'NewSecurePass123!');
            expect(client_1.prisma.user.update).toHaveBeenCalledWith(expect.objectContaining({
                where: { id: userId },
            }));
        });
        it('should throw error for invalid token', async () => {
            await expect((0, authService_1.resetPassword)('invalid.token', 'NewPass123!')).rejects.toThrow('重置令牌无效或已过期');
        });
        it('should throw error for weak new password', async () => {
            const token = jsonwebtoken_1.default.sign({ userId: 'user-1', type: 'password-reset' }, process.env.JWT_SECRET, { expiresIn: '15m' });
            await expect((0, authService_1.resetPassword)(token, '123')).rejects.toThrow('密码强度不足');
        });
    });
    describe('changePassword', () => {
        it('should change password with valid old password', async () => {
            const hash = await bcrypt_1.default.hash('oldpassword', 10);
            client_1.prisma.user.findUnique.mockResolvedValue({
                id: 'user-1',
                passwordHash: hash,
            });
            client_1.prisma.user.update.mockResolvedValue({});
            await (0, authService_1.changePassword)('user-1', 'oldpassword', 'NewSecurePass123!');
            expect(client_1.prisma.user.update).toHaveBeenCalled();
        });
        it('should throw error for wrong old password', async () => {
            const hash = await bcrypt_1.default.hash('oldpassword', 10);
            client_1.prisma.user.findUnique.mockResolvedValue({
                id: 'user-1',
                passwordHash: hash,
            });
            await expect((0, authService_1.changePassword)('user-1', 'wrongpassword', 'NewSecurePass123!')).rejects.toThrow('旧密码错误');
        });
        it('should throw error for weak new password', async () => {
            const hash = await bcrypt_1.default.hash('oldpassword', 10);
            client_1.prisma.user.findUnique.mockResolvedValue({
                id: 'user-1',
                passwordHash: hash,
            });
            await expect((0, authService_1.changePassword)('user-1', 'oldpassword', '123')).rejects.toThrow('密码强度不足');
        });
        it('should throw error when user not found', async () => {
            client_1.prisma.user.findUnique.mockResolvedValue(null);
            await expect((0, authService_1.changePassword)('nonexistent', 'any', 'NewSecurePass123!')).rejects.toThrow('用户不存在');
        });
    });
    describe('getCurrentUser', () => {
        it('should return user without password', async () => {
            client_1.prisma.user.findUnique.mockResolvedValue({
                id: 'user-1',
                email: 'test@example.com',
                passwordHash: 'should-not-be-returned',
                name: 'Test User',
                createdAt: new Date(),
                updatedAt: new Date(),
            });
            const result = await (0, authService_1.getCurrentUser)('user-1');
            expect(result.id).toBe('user-1');
            expect(result.email).toBe('test@example.com');
            expect(result).not.toHaveProperty('passwordHash');
        });
        it('should throw error when user not found', async () => {
            client_1.prisma.user.findUnique.mockResolvedValue(null);
            await expect((0, authService_1.getCurrentUser)('nonexistent')).rejects.toThrow('用户不存在');
        });
    });
});
//# sourceMappingURL=authService.test.js.map