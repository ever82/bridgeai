"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const userService_1 = require("../../services/userService");
const privacy_1 = require("../../types/privacy");
const client_1 = require("../../db/client");
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
        $transaction: jest.fn((ops) => Promise.all(ops)),
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
            client_1.prisma.user.findUnique.mockResolvedValue(mockUser);
            const result = await (0, userService_1.getUserById)('user-1');
            expect(result).toBeDefined();
            expect(result?.id).toBe('user-1');
            expect(result?.email).toBe('test@example.com');
        });
        it('should return null when user does not exist', async () => {
            client_1.prisma.user.findUnique.mockResolvedValue(null);
            const result = await (0, userService_1.getUserById)('non-existent');
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
            client_1.prisma.user.findUnique.mockResolvedValue(mockUser);
            const result = await (0, userService_1.getUserByEmail)('test@example.com');
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
            client_1.prisma.user.update.mockResolvedValue(mockUser);
            const result = await (0, userService_1.updateUser)('user-1', {
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
            client_1.prisma.user.update.mockResolvedValue(mockUser);
            const result = await (0, userService_1.updateAvatar)('user-1', 'https://example.com/avatar.jpg');
            expect(result.avatarUrl).toBe('https://example.com/avatar.jpg');
        });
    });
    describe('getPrivacySettings', () => {
        it('should return default settings when no settings exist', async () => {
            client_1.prisma.user.findUnique.mockResolvedValue({ privacySettings: null });
            const result = await (0, userService_1.getPrivacySettings)('user-1');
            expect(result.profileVisibility).toBe('public');
            expect(result.onlineStatusVisibility).toBe(privacy_1.OnlineStatusVisibility.EVERYONE);
        });
        it('should return saved settings', async () => {
            client_1.prisma.user.findUnique.mockResolvedValue({
                privacySettings: {
                    profileVisibility: 'private',
                    onlineStatusVisibility: privacy_1.OnlineStatusVisibility.NOBODY,
                },
            });
            const result = await (0, userService_1.getPrivacySettings)('user-1');
            expect(result.profileVisibility).toBe('private');
            expect(result.onlineStatusVisibility).toBe(privacy_1.OnlineStatusVisibility.NOBODY);
        });
    });
    describe('updatePrivacySettings', () => {
        it('should update privacy settings', async () => {
            client_1.prisma.user.findUnique.mockResolvedValue({ privacySettings: null });
            client_1.prisma.user.update.mockResolvedValue({
                privacySettings: {
                    profileVisibility: 'friends',
                    onlineStatusVisibility: privacy_1.OnlineStatusVisibility.EVERYONE,
                },
            });
            const result = await (0, userService_1.updatePrivacySettings)('user-1', { profileVisibility: 'friends' });
            expect(result.profileVisibility).toBe('friends');
        });
    });
    describe('blockUser', () => {
        it('should block a user', async () => {
            client_1.prisma.blockedUser.create.mockResolvedValue({});
            await (0, userService_1.blockUser)('user-1', 'user-2', 'Spam');
            expect(client_1.prisma.blockedUser.create).toHaveBeenCalledWith({
                data: {
                    userId: 'user-1',
                    blockedUserId: 'user-2',
                    reason: 'Spam',
                },
            });
        });
        it('should throw error when trying to block self', async () => {
            await expect((0, userService_1.blockUser)('user-1', 'user-1')).rejects.toThrow('Cannot block yourself');
        });
    });
    describe('unblockUser', () => {
        it('should unblock a user', async () => {
            client_1.prisma.blockedUser.deleteMany.mockResolvedValue({ count: 1 });
            await (0, userService_1.unblockUser)('user-1', 'user-2');
            expect(client_1.prisma.blockedUser.deleteMany).toHaveBeenCalledWith({
                where: { userId: 'user-1', blockedUserId: 'user-2' },
            });
        });
    });
    describe('isUserBlocked', () => {
        it('should return true when user is blocked', async () => {
            client_1.prisma.blockedUser.findUnique.mockResolvedValue({ id: 'block-1' });
            const result = await (0, userService_1.isUserBlocked)('user-1', 'user-2');
            expect(result).toBe(true);
        });
        it('should return false when user is not blocked', async () => {
            client_1.prisma.blockedUser.findUnique.mockResolvedValue(null);
            const result = await (0, userService_1.isUserBlocked)('user-1', 'user-2');
            expect(result).toBe(false);
        });
    });
    describe('registerDevice', () => {
        it('should register a new device', async () => {
            client_1.prisma.userDevice.upsert.mockResolvedValue({});
            client_1.prisma.userDevice.updateMany.mockResolvedValue({});
            await (0, userService_1.registerDevice)('user-1', {
                deviceId: 'device-1',
                deviceName: 'iPhone 12',
                deviceType: 'ios',
            });
            expect(client_1.prisma.userDevice.upsert).toHaveBeenCalled();
        });
    });
    describe('getUserDevices', () => {
        it('should return user devices', async () => {
            const mockDevices = [
                { id: 'device-1', deviceName: 'iPhone 12' },
                { id: 'device-2', deviceName: 'iPad' },
            ];
            client_1.prisma.userDevice.findMany.mockResolvedValue(mockDevices);
            const result = await (0, userService_1.getUserDevices)('user-1');
            expect(result).toHaveLength(2);
        });
    });
    describe('removeDevice', () => {
        it('should remove a device', async () => {
            client_1.prisma.userDevice.deleteMany.mockResolvedValue({ count: 1 });
            await (0, userService_1.removeDevice)('user-1', 'device-1');
            expect(client_1.prisma.userDevice.deleteMany).toHaveBeenCalledWith({
                where: { userId: 'user-1', deviceId: 'device-1' },
            });
        });
    });
});
//# sourceMappingURL=userService.test.js.map