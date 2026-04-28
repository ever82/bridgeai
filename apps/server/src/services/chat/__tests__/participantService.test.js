"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Participant Service Unit Tests
 * 参与者服务单元测试
 */
const globals_1 = require("@jest/globals");
const client_1 = require("@prisma/client");
const participantService_1 = require("../participantService");
const client_2 = require("../../../db/client");
// Mock the prisma client - mock db/client directly since that's what the service imports
globals_1.jest.mock('../../../db/client', () => ({
    prisma: {
        chatRoom: {
            findUnique: globals_1.jest.fn(),
            update: globals_1.jest.fn(),
        },
        roomParticipant: {
            create: globals_1.jest.fn(),
            createMany: globals_1.jest.fn(),
            findUnique: globals_1.jest.fn(),
            findMany: globals_1.jest.fn(),
            update: globals_1.jest.fn(),
            updateMany: globals_1.jest.fn(),
            count: globals_1.jest.fn(),
        },
    },
}));
const mockPrisma = client_2.prisma;
(0, globals_1.describe)('participantService', () => {
    (0, globals_1.beforeEach)(() => {
        globals_1.jest.clearAllMocks();
    });
    (0, globals_1.describe)('addParticipant', () => {
        (0, globals_1.it)('should add participant to room', async () => {
            const roomMock = {
                id: 'room-1',
                type: client_1.ChatRoomType.GROUP,
                metadata: { settings: { maxParticipants: 100 } },
                participants: [{ isActive: true }],
                participantIds: ['user1'],
            };
            const adderMock = {
                id: 'p1',
                userId: 'user1',
                role: client_1.ParticipantRole.OWNER,
                isActive: true,
            };
            const newParticipantMock = {
                id: 'new-p',
                roomId: 'room-1',
                userId: 'user2',
                role: client_1.ParticipantRole.MEMBER,
                isActive: true,
            };
            mockPrisma.chatRoom.findUnique.mockResolvedValue(roomMock);
            mockPrisma.roomParticipant.findUnique
                .mockResolvedValueOnce(adderMock)
                .mockResolvedValueOnce(null);
            mockPrisma.roomParticipant.create.mockResolvedValue(newParticipantMock);
            const result = await (0, participantService_1.addParticipant)({
                roomId: 'room-1',
                userId: 'user2',
                addedBy: 'user1',
            });
            (0, globals_1.expect)(result).toEqual(newParticipantMock);
            (0, globals_1.expect)(mockPrisma.roomParticipant.create).toHaveBeenCalled();
        });
        (0, globals_1.it)('should throw error if room not found', async () => {
            mockPrisma.chatRoom.findUnique.mockResolvedValue(null);
            await (0, globals_1.expect)((0, participantService_1.addParticipant)({
                roomId: 'non-existent',
                userId: 'user2',
                addedBy: 'user1',
            })).rejects.toThrow('Room not found');
        });
        (0, globals_1.it)('should throw error if adder has no permission', async () => {
            const roomMock = {
                id: 'room-1',
                type: client_1.ChatRoomType.GROUP,
                participants: [],
            };
            const adderMock = {
                id: 'p1',
                userId: 'user1',
                role: client_1.ParticipantRole.MEMBER,
                isActive: true,
            };
            mockPrisma.chatRoom.findUnique.mockResolvedValue(roomMock);
            mockPrisma.roomParticipant.findUnique.mockResolvedValue(adderMock);
            await (0, globals_1.expect)((0, participantService_1.addParticipant)({
                roomId: 'room-1',
                userId: 'user2',
                addedBy: 'user1',
            })).rejects.toThrow('Permission denied: cannot add participants');
        });
        (0, globals_1.it)('should throw error if room is full', async () => {
            const roomMock = {
                id: 'room-1',
                type: client_1.ChatRoomType.GROUP,
                metadata: { settings: { maxParticipants: 2 } },
                participants: [{ isActive: true }, { isActive: true }],
            };
            const adderMock = {
                id: 'p1',
                userId: 'user1',
                role: client_1.ParticipantRole.OWNER,
                isActive: true,
            };
            mockPrisma.chatRoom.findUnique.mockResolvedValue(roomMock);
            mockPrisma.roomParticipant.findUnique.mockResolvedValue(adderMock);
            await (0, globals_1.expect)((0, participantService_1.addParticipant)({
                roomId: 'room-1',
                userId: 'user3',
                addedBy: 'user1',
            })).rejects.toThrow('Room has reached maximum participant limit');
        });
        (0, globals_1.it)('should reactivate inactive participant', async () => {
            const roomMock = {
                id: 'room-1',
                type: client_1.ChatRoomType.GROUP,
                participants: [],
            };
            const adderMock = {
                id: 'p1',
                userId: 'user1',
                role: client_1.ParticipantRole.OWNER,
                isActive: true,
            };
            const existingParticipant = {
                id: 'existing-p',
                roomId: 'room-1',
                userId: 'user2',
                isActive: false,
            };
            mockPrisma.chatRoom.findUnique.mockResolvedValue(roomMock);
            mockPrisma.roomParticipant.findUnique
                .mockResolvedValueOnce(adderMock)
                .mockResolvedValueOnce(existingParticipant);
            mockPrisma.roomParticipant.update.mockResolvedValue({
                ...existingParticipant,
                isActive: true,
                role: client_1.ParticipantRole.MEMBER,
            });
            const result = await (0, participantService_1.addParticipant)({
                roomId: 'room-1',
                userId: 'user2',
                addedBy: 'user1',
            });
            (0, globals_1.expect)(result.isActive).toBe(true);
            (0, globals_1.expect)(mockPrisma.roomParticipant.create).not.toHaveBeenCalled();
        });
    });
    (0, globals_1.describe)('removeParticipant', () => {
        (0, globals_1.it)('should allow user to leave room', async () => {
            const removerMock = {
                id: 'p1',
                userId: 'user1',
                role: client_1.ParticipantRole.MEMBER,
                isActive: true,
            };
            const roomMock = {
                id: 'room-1',
                participantIds: ['user1', 'user2'],
                metadata: { settings: { allowLeave: true } },
            };
            mockPrisma.roomParticipant.findUnique.mockResolvedValue(removerMock);
            mockPrisma.chatRoom.findUnique.mockResolvedValue(roomMock);
            await (0, participantService_1.removeParticipant)('room-1', 'user1', 'user1');
            (0, globals_1.expect)(mockPrisma.roomParticipant.update).toHaveBeenCalledWith({
                where: { id: 'p1' },
                data: {
                    isActive: false,
                    leftAt: globals_1.expect.any(Date),
                },
            });
        });
        (0, globals_1.it)('should throw error if user cannot leave room', async () => {
            const removerMock = {
                id: 'p1',
                userId: 'user1',
                role: client_1.ParticipantRole.MEMBER,
                isActive: true,
            };
            const roomMock = {
                id: 'room-1',
                metadata: { settings: { allowLeave: false } },
            };
            mockPrisma.roomParticipant.findUnique.mockResolvedValue(removerMock);
            mockPrisma.chatRoom.findUnique.mockResolvedValue(roomMock);
            await (0, globals_1.expect)((0, participantService_1.removeParticipant)('room-1', 'user1', 'user1')).rejects.toThrow('Cannot leave this room');
        });
        (0, globals_1.it)('should allow admin to remove member', async () => {
            const removerMock = {
                id: 'p1',
                userId: 'admin',
                role: client_1.ParticipantRole.ADMIN,
                isActive: true,
            };
            const targetMock = {
                id: 'p2',
                userId: 'member',
                role: client_1.ParticipantRole.MEMBER,
                isActive: true,
            };
            const roomMock = {
                id: 'room-1',
                participantIds: ['admin', 'member'],
            };
            mockPrisma.roomParticipant.findUnique
                .mockResolvedValueOnce(removerMock)
                .mockResolvedValueOnce(targetMock);
            mockPrisma.chatRoom.findUnique.mockResolvedValue(roomMock);
            await (0, participantService_1.removeParticipant)('room-1', 'member', 'admin');
            (0, globals_1.expect)(mockPrisma.roomParticipant.update).toHaveBeenCalled();
        });
        (0, globals_1.it)('should throw error if remover has no permission', async () => {
            const removerMock = {
                id: 'p1',
                userId: 'member1',
                role: client_1.ParticipantRole.MEMBER,
                isActive: true,
            };
            const targetMock = {
                id: 'p2',
                userId: 'member2',
                role: client_1.ParticipantRole.MEMBER,
                isActive: true,
            };
            mockPrisma.roomParticipant.findUnique
                .mockResolvedValueOnce(removerMock)
                .mockResolvedValueOnce(targetMock);
            await (0, globals_1.expect)((0, participantService_1.removeParticipant)('room-1', 'member2', 'member1')).rejects.toThrow('Permission denied: cannot remove this participant');
        });
    });
    (0, globals_1.describe)('updateParticipant', () => {
        (0, globals_1.it)('should allow user to update their own permissions', async () => {
            const participantMock = {
                id: 'p1',
                userId: 'user1',
                role: client_1.ParticipantRole.MEMBER,
                isActive: true,
            };
            mockPrisma.roomParticipant.findUnique.mockResolvedValue(participantMock);
            mockPrisma.roomParticipant.update.mockResolvedValue({
                ...participantMock,
                permissions: { canPin: true },
            });
            const result = await (0, participantService_1.updateParticipant)('room-1', 'user1', { permissions: { canPin: true } }, 'user1');
            (0, globals_1.expect)(result.permissions).toEqual({ canPin: true });
        });
        (0, globals_1.it)('should throw error if user tries to change own role', async () => {
            const participantMock = {
                id: 'p1',
                userId: 'user1',
                role: client_1.ParticipantRole.MEMBER,
                isActive: true,
            };
            mockPrisma.roomParticipant.findUnique.mockResolvedValue(participantMock);
            await (0, globals_1.expect)((0, participantService_1.updateParticipant)('room-1', 'user1', { role: client_1.ParticipantRole.ADMIN }, 'user1')).rejects.toThrow('Cannot change your own role');
        });
        (0, globals_1.it)('should allow owner to change member role', async () => {
            const updaterMock = {
                id: 'p1',
                userId: 'owner',
                role: client_1.ParticipantRole.OWNER,
                isActive: true,
            };
            const targetMock = {
                id: 'p2',
                userId: 'member',
                role: client_1.ParticipantRole.MEMBER,
                isActive: true,
            };
            mockPrisma.roomParticipant.findUnique
                .mockResolvedValueOnce(updaterMock)
                .mockResolvedValueOnce(targetMock);
            mockPrisma.roomParticipant.update.mockResolvedValue({
                ...targetMock,
                role: client_1.ParticipantRole.ADMIN,
            });
            const result = await (0, participantService_1.updateParticipant)('room-1', 'member', { role: client_1.ParticipantRole.ADMIN }, 'owner');
            (0, globals_1.expect)(result.role).toBe(client_1.ParticipantRole.ADMIN);
        });
    });
    (0, globals_1.describe)('getRoomParticipants', () => {
        (0, globals_1.it)('should return active participants', async () => {
            const participantsMock = [
                {
                    id: 'p1',
                    userId: 'user1',
                    role: client_1.ParticipantRole.OWNER,
                    isActive: true,
                    user: { id: 'user1', name: 'User 1' },
                },
                {
                    id: 'p2',
                    userId: 'user2',
                    role: client_1.ParticipantRole.MEMBER,
                    isActive: true,
                    user: { id: 'user2', name: 'User 2' },
                },
            ];
            mockPrisma.roomParticipant.findMany.mockResolvedValue(participantsMock);
            const result = await (0, participantService_1.getRoomParticipants)('room-1');
            (0, globals_1.expect)(result).toHaveLength(2);
            (0, globals_1.expect)(mockPrisma.roomParticipant.findMany).toHaveBeenCalledWith({
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
    (0, globals_1.describe)('getParticipant', () => {
        (0, globals_1.it)('should return participant with user info', async () => {
            const participantMock = {
                id: 'p1',
                userId: 'user1',
                roomId: 'room-1',
                role: client_1.ParticipantRole.OWNER,
                user: { id: 'user1', name: 'User 1' },
            };
            mockPrisma.roomParticipant.findUnique.mockResolvedValue(participantMock);
            const result = await (0, participantService_1.getParticipant)('room-1', 'user1');
            (0, globals_1.expect)(result).toEqual(participantMock);
        });
        (0, globals_1.it)('should return null if participant not found', async () => {
            mockPrisma.roomParticipant.findUnique.mockResolvedValue(null);
            const result = await (0, participantService_1.getParticipant)('room-1', 'non-existent');
            (0, globals_1.expect)(result).toBeNull();
        });
    });
    (0, globals_1.describe)('transferOwnership', () => {
        (0, globals_1.it)('should transfer ownership successfully', async () => {
            const currentOwnerMock = {
                id: 'p1',
                userId: 'owner',
                role: client_1.ParticipantRole.OWNER,
            };
            const newOwnerMock = {
                id: 'p2',
                userId: 'new-owner',
                role: client_1.ParticipantRole.ADMIN,
                isActive: true,
            };
            mockPrisma.roomParticipant.findUnique
                .mockResolvedValueOnce(currentOwnerMock)
                .mockResolvedValueOnce(newOwnerMock);
            await (0, participantService_1.transferOwnership)('room-1', 'new-owner', 'owner');
            (0, globals_1.expect)(mockPrisma.roomParticipant.update).toHaveBeenCalledTimes(2);
        });
        (0, globals_1.it)('should throw error if current user is not owner', async () => {
            const nonOwnerMock = {
                id: 'p1',
                userId: 'admin',
                role: client_1.ParticipantRole.ADMIN,
            };
            mockPrisma.roomParticipant.findUnique.mockResolvedValue(nonOwnerMock);
            await (0, globals_1.expect)((0, participantService_1.transferOwnership)('room-1', 'new-owner', 'admin')).rejects.toThrow('Only owner can transfer ownership');
        });
        (0, globals_1.it)('should throw error if new owner is not active participant', async () => {
            const currentOwnerMock = {
                id: 'p1',
                userId: 'owner',
                role: client_1.ParticipantRole.OWNER,
            };
            const inactiveUserMock = {
                id: 'p2',
                userId: 'inactive',
                role: client_1.ParticipantRole.MEMBER,
                isActive: false,
            };
            mockPrisma.roomParticipant.findUnique
                .mockResolvedValueOnce(currentOwnerMock)
                .mockResolvedValueOnce(inactiveUserMock);
            await (0, globals_1.expect)((0, participantService_1.transferOwnership)('room-1', 'inactive', 'owner')).rejects.toThrow('New owner must be an active participant');
        });
    });
    (0, globals_1.describe)('getRolePermissions', () => {
        (0, globals_1.it)('should return owner permissions', () => {
            const permissions = (0, participantService_1.getRolePermissions)(client_1.ParticipantRole.OWNER);
            (0, globals_1.expect)(permissions).toContain('room:manage');
            (0, globals_1.expect)(permissions).toContain('room:delete');
            (0, globals_1.expect)(permissions).toContain('participant:add');
        });
        (0, globals_1.it)('should return admin permissions', () => {
            const permissions = (0, participantService_1.getRolePermissions)(client_1.ParticipantRole.ADMIN);
            (0, globals_1.expect)(permissions).toContain('room:manage');
            (0, globals_1.expect)(permissions).toContain('participant:add');
            (0, globals_1.expect)(permissions).not.toContain('room:delete');
        });
        (0, globals_1.it)('should return member permissions', () => {
            const permissions = (0, participantService_1.getRolePermissions)(client_1.ParticipantRole.MEMBER);
            (0, globals_1.expect)(permissions).toContain('message:send');
            (0, globals_1.expect)(permissions).toContain('message:edit:own');
            (0, globals_1.expect)(permissions).not.toContain('room:manage');
        });
        (0, globals_1.it)('should return guest permissions', () => {
            const permissions = (0, participantService_1.getRolePermissions)(client_1.ParticipantRole.GUEST);
            (0, globals_1.expect)(permissions).toEqual(['message:send']);
        });
    });
    (0, globals_1.describe)('hasPermission', () => {
        (0, globals_1.it)('should return true if user has role permission', async () => {
            mockPrisma.roomParticipant.findUnique.mockResolvedValue({
                role: client_1.ParticipantRole.ADMIN,
                isActive: true,
                permissions: null,
            });
            const result = await (0, participantService_1.hasPermission)('room-1', 'user1', 'room:manage');
            (0, globals_1.expect)(result).toBe(true);
        });
        (0, globals_1.it)('should return true if user has custom permission', async () => {
            mockPrisma.roomParticipant.findUnique.mockResolvedValue({
                role: client_1.ParticipantRole.MEMBER,
                isActive: true,
                permissions: { 'custom:permission': true },
            });
            const result = await (0, participantService_1.hasPermission)('room-1', 'user1', 'custom:permission');
            (0, globals_1.expect)(result).toBe(true);
        });
        (0, globals_1.it)('should return false if user is not active participant', async () => {
            mockPrisma.roomParticipant.findUnique.mockResolvedValue(null);
            const result = await (0, participantService_1.hasPermission)('room-1', 'user1', 'message:send');
            (0, globals_1.expect)(result).toBe(false);
        });
        (0, globals_1.it)('should return false if user lacks permission', async () => {
            mockPrisma.roomParticipant.findUnique.mockResolvedValue({
                role: client_1.ParticipantRole.MEMBER,
                isActive: true,
                permissions: {},
            });
            const result = await (0, participantService_1.hasPermission)('room-1', 'user1', 'room:delete');
            (0, globals_1.expect)(result).toBe(false);
        });
    });
});
//# sourceMappingURL=participantService.test.js.map