"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Room Service Unit Tests
 * 聊天房间服务单元测试
 */
const globals_1 = require("@jest/globals");
const client_1 = require("@prisma/client");
const roomService_1 = require("../roomService");
const client_2 = require("../../../db/client");
// Mock the prisma client
globals_1.jest.mock('../../../db/client', () => ({
    prisma: {
        chatRoom: {
            create: globals_1.jest.fn(),
            findUnique: globals_1.jest.fn(),
            findMany: globals_1.jest.fn(),
            update: globals_1.jest.fn(),
            updateMany: globals_1.jest.fn(),
            count: globals_1.jest.fn(),
        },
        roomParticipant: {
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
(0, globals_1.describe)('roomService', () => {
    (0, globals_1.beforeEach)(() => {
        globals_1.jest.clearAllMocks();
    });
    (0, globals_1.describe)('createRoom', () => {
        (0, globals_1.it)('should create a private room with 2 participants', async () => {
            const roomData = {
                type: client_1.ChatRoomType.PRIVATE,
                participantIds: ['user1', 'user2'],
                createdBy: 'user1',
            };
            const mockRoom = {
                id: 'room-1',
                type: client_1.ChatRoomType.PRIVATE,
                participantIds: ['user1', 'user2'],
                status: client_1.ChatRoomStatus.ACTIVE,
            };
            mockPrisma.chatRoom.create.mockResolvedValue(mockRoom);
            mockPrisma.chatRoom.findMany.mockResolvedValue([]);
            mockPrisma.roomParticipant.createMany.mockResolvedValue({ count: 2 });
            const room = await (0, roomService_1.createRoom)(roomData);
            (0, globals_1.expect)(room).toEqual(mockRoom);
            (0, globals_1.expect)(mockPrisma.chatRoom.create).toHaveBeenCalled();
        });
        (0, globals_1.it)('should throw error for private room without 2 participants', async () => {
            const roomData = {
                type: client_1.ChatRoomType.PRIVATE,
                participantIds: ['user1'],
                createdBy: 'user1',
            };
            await (0, globals_1.expect)((0, roomService_1.createRoom)(roomData)).rejects.toThrow('Private room must have exactly 2 participants');
        });
        (0, globals_1.it)('should create a group room with multiple participants', async () => {
            const roomData = {
                type: client_1.ChatRoomType.GROUP,
                participantIds: ['user1', 'user2', 'user3'],
                createdBy: 'user1',
                metadata: { name: 'Test Group' },
            };
            const mockRoom = {
                id: 'room-2',
                type: client_1.ChatRoomType.GROUP,
                participantIds: ['user1', 'user2', 'user3'],
                status: client_1.ChatRoomStatus.ACTIVE,
                metadata: { name: 'Test Group' },
            };
            mockPrisma.chatRoom.create.mockResolvedValue(mockRoom);
            mockPrisma.roomParticipant.createMany.mockResolvedValue({ count: 3 });
            const room = await (0, roomService_1.createRoom)(roomData);
            (0, globals_1.expect)(room).toEqual(mockRoom);
        });
        (0, globals_1.it)('should throw error for group room with less than 2 participants', async () => {
            const roomData = {
                type: client_1.ChatRoomType.GROUP,
                participantIds: ['user1'],
                createdBy: 'user1',
            };
            await (0, globals_1.expect)((0, roomService_1.createRoom)(roomData)).rejects.toThrow('Group room must have at least 2 participants');
        });
        (0, globals_1.it)('should return existing private room if already exists', async () => {
            const roomData = {
                type: client_1.ChatRoomType.PRIVATE,
                participantIds: ['user1', 'user2'],
                createdBy: 'user1',
            };
            const existingRoom = {
                id: 'existing-room',
                type: client_1.ChatRoomType.PRIVATE,
                participantIds: ['user1', 'user2'],
            };
            mockPrisma.chatRoom.findMany.mockResolvedValue([existingRoom]);
            const room = await (0, roomService_1.createRoom)(roomData);
            (0, globals_1.expect)(room).toEqual(existingRoom);
            (0, globals_1.expect)(mockPrisma.chatRoom.create).not.toHaveBeenCalled();
        });
    });
    (0, globals_1.describe)('getRoomById', () => {
        (0, globals_1.it)('should return room with participants', async () => {
            const mockRoom = {
                id: 'room-1',
                type: client_1.ChatRoomType.PRIVATE,
                participants: [
                    {
                        id: 'p1',
                        userId: 'user1',
                        role: client_1.ParticipantRole.OWNER,
                        user: { id: 'user1', name: 'User 1' },
                    },
                ],
            };
            mockPrisma.chatRoom.findUnique.mockResolvedValue(mockRoom);
            const room = await (0, roomService_1.getRoomById)('room-1');
            (0, globals_1.expect)(room).toEqual(mockRoom);
        });
        (0, globals_1.it)('should return null if room not found', async () => {
            mockPrisma.chatRoom.findUnique.mockResolvedValue(null);
            const room = await (0, roomService_1.getRoomById)('non-existent');
            (0, globals_1.expect)(room).toBeNull();
        });
    });
    (0, globals_1.describe)('updateRoom', () => {
        (0, globals_1.it)('should update room status', async () => {
            const mockRoom = {
                id: 'room-1',
                status: client_1.ChatRoomStatus.INACTIVE,
            };
            mockPrisma.chatRoom.update.mockResolvedValue(mockRoom);
            const room = await (0, roomService_1.updateRoom)('room-1', { status: client_1.ChatRoomStatus.INACTIVE });
            (0, globals_1.expect)(room).toEqual(mockRoom);
        });
        (0, globals_1.it)('should update room settings', async () => {
            const mockRoom = {
                id: 'room-1',
                settings: { notifications: false },
            };
            mockPrisma.chatRoom.update.mockResolvedValue(mockRoom);
            const room = await (0, roomService_1.updateRoom)('room-1', { settings: { notifications: false } });
            (0, globals_1.expect)(room).toEqual(mockRoom);
        });
    });
    (0, globals_1.describe)('closeRoom', () => {
        (0, globals_1.it)('should close room', async () => {
            const mockRoom = {
                id: 'room-1',
                status: client_1.ChatRoomStatus.CLOSED,
            };
            mockPrisma.chatRoom.update.mockResolvedValue(mockRoom);
            const room = await (0, roomService_1.closeRoom)('room-1');
            (0, globals_1.expect)(room.status).toBe(client_1.ChatRoomStatus.CLOSED);
        });
    });
    (0, globals_1.describe)('getUserRooms', () => {
        (0, globals_1.it)('should return user rooms with pagination', async () => {
            const mockRooms = [
                { id: 'room-1', type: client_1.ChatRoomType.PRIVATE },
                { id: 'room-2', type: client_1.ChatRoomType.GROUP },
            ];
            mockPrisma.chatRoom.findMany.mockResolvedValue(mockRooms);
            mockPrisma.chatRoom.count.mockResolvedValue(2);
            mockPrisma.roomParticipant.findMany.mockResolvedValue([]);
            const result = await (0, roomService_1.getUserRooms)('user1', { page: 1, limit: 20 });
            (0, globals_1.expect)(result.rooms).toHaveLength(2);
            (0, globals_1.expect)(result.total).toBe(2);
        });
        (0, globals_1.it)('should filter by room type', async () => {
            const mockRooms = [{ id: 'room-1', type: client_1.ChatRoomType.PRIVATE }];
            mockPrisma.chatRoom.findMany.mockResolvedValue(mockRooms);
            mockPrisma.chatRoom.count.mockResolvedValue(1);
            mockPrisma.roomParticipant.findMany.mockResolvedValue([]);
            const result = await (0, roomService_1.getUserRooms)('user1', { type: client_1.ChatRoomType.PRIVATE });
            (0, globals_1.expect)(result.rooms).toHaveLength(1);
            (0, globals_1.expect)(result.rooms[0].type).toBe(client_1.ChatRoomType.PRIVATE);
        });
    });
    (0, globals_1.describe)('searchRooms', () => {
        (0, globals_1.it)('should search rooms by query', async () => {
            const mockRooms = [{ id: 'room-1', metadata: { name: 'Test Room' } }];
            mockPrisma.chatRoom.findMany.mockResolvedValue(mockRooms);
            mockPrisma.chatRoom.count.mockResolvedValue(1);
            mockPrisma.roomParticipant.findMany.mockResolvedValue([]);
            const result = await (0, roomService_1.searchRooms)('user1', 'test');
            (0, globals_1.expect)(result.rooms).toHaveLength(1);
        });
    });
    (0, globals_1.describe)('isUserInRoom', () => {
        (0, globals_1.it)('should return true if user is active participant', async () => {
            mockPrisma.roomParticipant.findUnique.mockResolvedValue({
                isActive: true,
            });
            const result = await (0, roomService_1.isUserInRoom)('room-1', 'user1');
            (0, globals_1.expect)(result).toBe(true);
        });
        (0, globals_1.it)('should return false if user is not participant', async () => {
            mockPrisma.roomParticipant.findUnique.mockResolvedValue(null);
            const result = await (0, roomService_1.isUserInRoom)('room-1', 'user1');
            (0, globals_1.expect)(result).toBe(false);
        });
        (0, globals_1.it)('should return false if user is inactive participant', async () => {
            mockPrisma.roomParticipant.findUnique.mockResolvedValue({
                isActive: false,
            });
            const result = await (0, roomService_1.isUserInRoom)('room-1', 'user1');
            (0, globals_1.expect)(result).toBe(false);
        });
    });
    (0, globals_1.describe)('resetUnreadCount', () => {
        (0, globals_1.it)('should reset unread count for user', async () => {
            mockPrisma.roomParticipant.update.mockResolvedValue({
                unreadCount: 0,
                lastReadAt: new Date(),
            });
            await (0, roomService_1.resetUnreadCount)('room-1', 'user1');
            (0, globals_1.expect)(mockPrisma.roomParticipant.update).toHaveBeenCalled();
        });
    });
    (0, globals_1.describe)('updateLastMessage', () => {
        (0, globals_1.it)('should update last message and increment unread count', async () => {
            const message = {
                id: 'msg-1',
                content: 'Hello',
                senderId: 'user1',
                createdAt: new Date(),
            };
            mockPrisma.chatRoom.update.mockResolvedValue({});
            mockPrisma.roomParticipant.updateMany.mockResolvedValue({});
            await (0, roomService_1.updateLastMessage)('room-1', message);
            (0, globals_1.expect)(mockPrisma.chatRoom.update).toHaveBeenCalled();
            (0, globals_1.expect)(mockPrisma.roomParticipant.updateMany).toHaveBeenCalled();
        });
    });
});
//# sourceMappingURL=roomService.test.js.map