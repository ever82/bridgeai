"use strict";
/**
 * Agent Conversation Room Service Tests
 * Agent对话房间服务测试 (ISSUE-DATE003 c1)
 */
Object.defineProperty(exports, "__esModule", { value: true });
jest.mock('../../../utils/logger', () => ({
    logger: {
        info: jest.fn(),
        debug: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
    },
}));
jest.mock('../../../db/client', () => ({
    prisma: null,
}));
// Must import after mocks
const agentConversationRoom_1 = require("../agentConversationRoom");
describe('AgentConversationRoom', () => {
    beforeEach(() => {
        (0, agentConversationRoom_1.clearAllRooms)();
    });
    afterEach(() => {
        (0, agentConversationRoom_1.clearAllRooms)();
    });
    describe('createRoom', () => {
        it('should create a room with correct defaults', async () => {
            const room = await (0, agentConversationRoom_1.createRoom)('agent-a', 'agent-b', 'user-a', 'user-b');
            expect(room).toBeDefined();
            expect(room.id).toBeDefined();
            expect(room.agentAId).toBe('agent-a');
            expect(room.agentBId).toBe('agent-b');
            expect(room.userIdA).toBe('user-a');
            expect(room.userIdB).toBe('user-b');
            expect(room.status).toBe('pending');
            expect(room.currentRound).toBe(0);
            expect(room.maxRounds).toBe(20);
            expect(room.timeoutMs).toBe(30 * 60 * 1000);
            expect(room.startedAt).toBeNull();
            expect(room.completedAt).toBeNull();
            expect(room.conversationSummary).toBeNull();
            expect(room.qualityScore).toBeNull();
            expect(room.createdAt).toBeInstanceOf(Date);
            expect(room.updatedAt).toBeInstanceOf(Date);
        });
        it('should create a room with custom config', async () => {
            const room = await (0, agentConversationRoom_1.createRoom)('agent-a', 'agent-b', 'user-a', 'user-b', {
                maxRounds: 10,
                timeoutMs: 60000,
                qualityThreshold: 0.8,
            });
            expect(room.maxRounds).toBe(10);
            expect(room.timeoutMs).toBe(60000);
        });
    });
    describe('getRoom', () => {
        it('should return room by id', async () => {
            const created = await (0, agentConversationRoom_1.createRoom)('agent-a', 'agent-b', 'user-a', 'user-b');
            const room = await (0, agentConversationRoom_1.getRoom)(created.id);
            expect(room).toBeDefined();
            expect(room?.id).toBe(created.id);
            expect(room?.agentAId).toBe('agent-a');
        });
        it('should return null for non-existent room', async () => {
            const room = await (0, agentConversationRoom_1.getRoom)('non-existent-id');
            expect(room).toBeNull();
        });
    });
    describe('activateRoom', () => {
        it('should change status to active', async () => {
            const room = await (0, agentConversationRoom_1.createRoom)('agent-a', 'agent-b', 'user-a', 'user-b');
            const activated = await (0, agentConversationRoom_1.activateRoom)(room.id);
            expect(activated.status).toBe('active');
            expect(activated.currentRound).toBe(1);
            expect(activated.startedAt).toBeInstanceOf(Date);
            expect(activated.lastMessageAt).toBeInstanceOf(Date);
        });
        it('should throw RoomNotFoundError for invalid room id', async () => {
            await expect((0, agentConversationRoom_1.activateRoom)('invalid-id')).rejects.toThrow(agentConversationRoom_1.RoomNotFoundError);
        });
        it('should throw RoomStatusError if not pending', async () => {
            const room = await (0, agentConversationRoom_1.createRoom)('agent-a', 'agent-b', 'user-a', 'user-b');
            await (0, agentConversationRoom_1.activateRoom)(room.id);
            await expect((0, agentConversationRoom_1.activateRoom)(room.id)).rejects.toThrow(agentConversationRoom_1.RoomStatusError);
        });
    });
    describe('addMessage', () => {
        it('should add message and increment round context', async () => {
            const room = await (0, agentConversationRoom_1.createRoom)('agent-a', 'agent-b', 'user-a', 'user-b');
            await (0, agentConversationRoom_1.activateRoom)(room.id);
            const message = await (0, agentConversationRoom_1.addMessage)(room.id, 'agent-a', 'agent_a', 'Hello, how are you?');
            expect(message).toBeDefined();
            expect(message.id).toBeDefined();
            expect(message.roomId).toBe(room.id);
            expect(message.senderId).toBe('agent-a');
            expect(message.senderType).toBe('agent_a');
            expect(message.content).toBe('Hello, how are you?');
            expect(message.round).toBe(1);
            expect(message.timestamp).toBeInstanceOf(Date);
        });
        it('should allow system messages in pending status', async () => {
            const room = await (0, agentConversationRoom_1.createRoom)('agent-a', 'agent-b', 'user-a', 'user-b');
            const message = await (0, agentConversationRoom_1.addMessage)(room.id, 'system', 'system', 'System message');
            expect(message).toBeDefined();
            expect(message.senderType).toBe('system');
        });
        it('should throw RoomNotFoundError for invalid room', async () => {
            await expect((0, agentConversationRoom_1.addMessage)('invalid-id', 'agent-a', 'agent_a', 'test')).rejects.toThrow(agentConversationRoom_1.RoomNotFoundError);
        });
        it('should throw RoomStatusError for non-active non-system messages', async () => {
            const room = await (0, agentConversationRoom_1.createRoom)('agent-a', 'agent-b', 'user-a', 'user-b');
            await expect((0, agentConversationRoom_1.addMessage)(room.id, 'agent-a', 'agent_a', 'test')).rejects.toThrow(agentConversationRoom_1.RoomStatusError);
        });
    });
    describe('completeRoom', () => {
        it('should mark as completed with summary', async () => {
            const room = await (0, agentConversationRoom_1.createRoom)('agent-a', 'agent-b', 'user-a', 'user-b');
            await (0, agentConversationRoom_1.activateRoom)(room.id);
            const completed = await (0, agentConversationRoom_1.completeRoom)(room.id, 'Great conversation!', 0.85);
            expect(completed.status).toBe('completed');
            expect(completed.completedAt).toBeInstanceOf(Date);
            expect(completed.conversationSummary).toBe('Great conversation!');
            expect(completed.qualityScore).toBe(0.85);
        });
        it('should throw RoomNotFoundError for invalid room', async () => {
            await expect((0, agentConversationRoom_1.completeRoom)('invalid-id', 'summary', null)).rejects.toThrow(agentConversationRoom_1.RoomNotFoundError);
        });
        it('should allow completing from pending status', async () => {
            const room = await (0, agentConversationRoom_1.createRoom)('agent-a', 'agent-b', 'user-a', 'user-b');
            const completed = await (0, agentConversationRoom_1.completeRoom)(room.id, 'summary', null);
            expect(completed.status).toBe('completed');
        });
    });
    describe('terminateRoom', () => {
        it('should mark as terminated', async () => {
            const room = await (0, agentConversationRoom_1.createRoom)('agent-a', 'agent-b', 'user-a', 'user-b');
            await (0, agentConversationRoom_1.activateRoom)(room.id);
            const terminated = await (0, agentConversationRoom_1.terminateRoom)(room.id, 'User requested termination');
            expect(terminated.status).toBe('terminated');
            expect(terminated.completedAt).toBeInstanceOf(Date);
        });
        it('should throw RoomStatusError if already completed', async () => {
            const room = await (0, agentConversationRoom_1.createRoom)('agent-a', 'agent-b', 'user-a', 'user-b');
            await (0, agentConversationRoom_1.activateRoom)(room.id);
            await (0, agentConversationRoom_1.completeRoom)(room.id, 'summary', null);
            await expect((0, agentConversationRoom_1.terminateRoom)(room.id, 'reason')).rejects.toThrow(agentConversationRoom_1.RoomStatusError);
        });
        it('should allow terminating a pending room', async () => {
            const room = await (0, agentConversationRoom_1.createRoom)('agent-a', 'agent-b', 'user-a', 'user-b');
            const terminated = await (0, agentConversationRoom_1.terminateRoom)(room.id, 'reason');
            expect(terminated.status).toBe('terminated');
        });
    });
    describe('checkRoomTimeout', () => {
        it('should detect expired rooms', async () => {
            const room = await (0, agentConversationRoom_1.createRoom)('agent-a', 'agent-b', 'user-a', 'user-b', {
                timeoutMs: 1, // 1ms timeout - timer will auto-expire the room
            });
            await (0, agentConversationRoom_1.activateRoom)(room.id);
            // Wait for the scheduled timeout timer to fire
            await new Promise(resolve => setTimeout(resolve, 50));
            // The room should have been auto-expired by the timer
            const updatedRoom = await (0, agentConversationRoom_1.getRoom)(room.id);
            expect(updatedRoom?.status).toBe('expired');
        });
        it('should return false for non-active rooms', async () => {
            const room = await (0, agentConversationRoom_1.createRoom)('agent-a', 'agent-b', 'user-a', 'user-b');
            const isExpired = await (0, agentConversationRoom_1.checkRoomTimeout)(room.id);
            expect(isExpired).toBe(false);
        });
        it('should return false for active rooms within timeout', async () => {
            const room = await (0, agentConversationRoom_1.createRoom)('agent-a', 'agent-b', 'user-a', 'user-b', {
                timeoutMs: 60000, // Long timeout
            });
            await (0, agentConversationRoom_1.activateRoom)(room.id);
            const isExpired = await (0, agentConversationRoom_1.checkRoomTimeout)(room.id);
            expect(isExpired).toBe(false);
        });
        it('should throw RoomNotFoundError for invalid room', async () => {
            await expect((0, agentConversationRoom_1.checkRoomTimeout)('invalid-id')).rejects.toThrow(agentConversationRoom_1.RoomNotFoundError);
        });
    });
    describe('getActiveRoomsByUser', () => {
        it('should return rooms for a user', async () => {
            const room1 = await (0, agentConversationRoom_1.createRoom)('agent-a', 'agent-b', 'user-a', 'user-b');
            const _room2 = await (0, agentConversationRoom_1.createRoom)('agent-c', 'agent-d', 'user-a', 'user-c');
            const _room3 = await (0, agentConversationRoom_1.createRoom)('agent-e', 'agent-f', 'user-b', 'user-c');
            await (0, agentConversationRoom_1.activateRoom)(room1.id);
            const activeRooms = await (0, agentConversationRoom_1.getActiveRoomsByUser)('user-a');
            expect(activeRooms.length).toBeGreaterThanOrEqual(1);
            const userARooms = activeRooms.filter(r => r.userIdA === 'user-a' || r.userIdB === 'user-a');
            expect(userARooms.length).toBeGreaterThanOrEqual(1);
        });
        it('should return empty array for user with no rooms', async () => {
            const rooms = await (0, agentConversationRoom_1.getActiveRoomsByUser)('non-existent-user');
            expect(rooms).toEqual([]);
        });
        it('should not return completed or expired rooms', async () => {
            const room = await (0, agentConversationRoom_1.createRoom)('agent-a', 'agent-b', 'user-a', 'user-b');
            await (0, agentConversationRoom_1.activateRoom)(room.id);
            await (0, agentConversationRoom_1.completeRoom)(room.id, 'summary', null);
            const rooms = await (0, agentConversationRoom_1.getActiveRoomsByUser)('user-a');
            const matchingRoom = rooms.find(r => r.id === room.id);
            expect(matchingRoom).toBeUndefined();
        });
    });
    describe('incrementRound', () => {
        it('should increment round', async () => {
            const room = await (0, agentConversationRoom_1.createRoom)('agent-a', 'agent-b', 'user-a', 'user-b');
            await (0, agentConversationRoom_1.activateRoom)(room.id);
            const updated = await (0, agentConversationRoom_1.incrementRound)(room.id);
            expect(updated.currentRound).toBe(2);
        });
        it('should auto-complete when reaching max rounds', async () => {
            const room = await (0, agentConversationRoom_1.createRoom)('agent-a', 'agent-b', 'user-a', 'user-b', {
                maxRounds: 2,
            });
            await (0, agentConversationRoom_1.activateRoom)(room.id);
            await (0, agentConversationRoom_1.incrementRound)(room.id);
            const updated = await (0, agentConversationRoom_1.incrementRound)(room.id);
            expect(updated.status).toBe('completed');
            expect(updated.currentRound).toBe(2);
        });
    });
    describe('clearAllRooms', () => {
        it('should clear all rooms', async () => {
            await (0, agentConversationRoom_1.createRoom)('agent-a', 'agent-b', 'user-a', 'user-b');
            await (0, agentConversationRoom_1.createRoom)('agent-c', 'agent-d', 'user-c', 'user-d');
            (0, agentConversationRoom_1.clearAllRooms)();
            const rooms = await (0, agentConversationRoom_1.getActiveRoomsByUser)('user-a');
            expect(rooms).toEqual([]);
        });
    });
});
//# sourceMappingURL=agentConversationRoom.test.js.map