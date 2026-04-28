"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const shared_1 = require("@bridgeai/shared");
const handoffHandler_1 = require("../handlers/handoffHandler");
// Mock socket
const createMockSocket = (userId = 'user-1', roles = ['user']) => {
    const eventHandlers = {};
    return {
        id: `socket-${userId}`,
        user: { id: userId, email: `${userId}@test.com`, roles },
        rooms: new Set(),
        join: jest.fn((room) => {
            eventHandlers[room] = eventHandlers[room] || [];
        }),
        leave: jest.fn(),
        to: jest.fn(() => ({
            emit: jest.fn(),
        })),
        emit: jest.fn(),
        on: jest.fn((event, handler) => {
            eventHandlers[event] = eventHandlers[event] || [];
            eventHandlers[event].push(handler);
        }),
        _trigger: (event, ...args) => {
            const handlers = eventHandlers[event] || [];
            handlers.forEach(h => h(...args));
        },
        _handlers: eventHandlers,
    };
};
// Mock namespace
const createMockNamespace = () => {
    const rooms = {};
    return {
        to: jest.fn((room) => ({
            emit: jest.fn((event, data) => {
                rooms[room] = rooms[room] || [];
                rooms[room].push({ event, data });
            }),
        })),
        _rooms: rooms,
    };
};
describe('Handoff Socket Handler', () => {
    let mockSocket;
    let mockNsp;
    beforeEach(() => {
        mockSocket = createMockSocket('user-1', ['user']);
        mockNsp = createMockNamespace();
        jest.useFakeTimers();
    });
    afterEach(() => {
        jest.useRealTimers();
        jest.clearAllMocks();
        (0, handoffHandler_1.resetHandoffState)();
    });
    describe('registerHandoffHandlers', () => {
        it('should register all handoff event handlers', () => {
            (0, handoffHandler_1.registerHandoffHandlers)(mockSocket, mockNsp);
            expect(mockSocket.on).toHaveBeenCalledWith(shared_1.HandoffSocketEvents.REQUEST_TAKEOVER, expect.any(Function));
            expect(mockSocket.on).toHaveBeenCalledWith(shared_1.HandoffSocketEvents.REQUEST_HANDOFF, expect.any(Function));
            expect(mockSocket.on).toHaveBeenCalledWith(shared_1.HandoffSocketEvents.CONFIRM_HANDOFF, expect.any(Function));
            expect(mockSocket.on).toHaveBeenCalledWith(shared_1.HandoffSocketEvents.REJECT_HANDOFF, expect.any(Function));
            expect(mockSocket.on).toHaveBeenCalledWith(shared_1.HandoffSocketEvents.CANCEL_HANDOFF, expect.any(Function));
        });
    });
    describe('REQUEST_TAKEOVER', () => {
        beforeEach(() => {
            (0, handoffHandler_1.registerHandoffHandlers)(mockSocket, mockNsp);
        });
        it('should create takeover request successfully', async () => {
            const callback = jest.fn();
            const data = { conversationId: 'conv-1', reason: 'Test takeover' };
            mockSocket._trigger(shared_1.HandoffSocketEvents.REQUEST_TAKEOVER, data, callback);
            // Wait for async operations
            await Promise.resolve();
            expect(callback).toHaveBeenCalledWith(expect.objectContaining({
                success: true,
                data: expect.objectContaining({
                    requestId: expect.any(String),
                    status: shared_1.HandoffStatus.PENDING_TAKEOVER,
                    timeoutSeconds: 30,
                }),
            }));
        });
        it('should reject takeover if user not authorized', async () => {
            const unauthorizedSocket = createMockSocket('user-2', ['guest']);
            (0, handoffHandler_1.registerHandoffHandlers)(unauthorizedSocket, mockNsp);
            const callback = jest.fn();
            const data = { conversationId: 'conv-1' };
            unauthorizedSocket._trigger(shared_1.HandoffSocketEvents.REQUEST_TAKEOVER, data, callback);
            await Promise.resolve();
            expect(callback).toHaveBeenCalledWith(expect.objectContaining({
                success: false,
                error: expect.objectContaining({
                    code: shared_1.HandoffErrorCode.UNAUTHORIZED,
                }),
            }));
        });
        it('should reject takeover if already in human mode', async () => {
            // First takeover
            const callback1 = jest.fn();
            mockSocket._trigger(shared_1.HandoffSocketEvents.REQUEST_TAKEOVER, { conversationId: 'conv-2' }, callback1);
            await Promise.resolve();
            // Confirm takeover
            const requestId = callback1.mock.calls[0][0].data.requestId;
            const confirmCallback = jest.fn();
            mockSocket._trigger(shared_1.HandoffSocketEvents.CONFIRM_HANDOFF, { requestId }, confirmCallback);
            await Promise.resolve();
            // Try another takeover
            const callback2 = jest.fn();
            mockSocket._trigger(shared_1.HandoffSocketEvents.REQUEST_TAKEOVER, { conversationId: 'conv-2' }, callback2);
            await Promise.resolve();
            expect(callback2).toHaveBeenCalledWith(expect.objectContaining({
                success: false,
                error: expect.objectContaining({
                    code: shared_1.HandoffErrorCode.INVALID_STATUS,
                }),
            }));
        });
        it('should handle forced takeover for admin users', async () => {
            const adminSocket = createMockSocket('admin-1', ['admin']);
            (0, handoffHandler_1.registerHandoffHandlers)(adminSocket, mockNsp);
            const callback = jest.fn();
            const data = { conversationId: 'conv-3', force: true };
            adminSocket._trigger(shared_1.HandoffSocketEvents.REQUEST_TAKEOVER, data, callback);
            await Promise.resolve();
            expect(callback).toHaveBeenCalledWith(expect.objectContaining({
                success: true,
                data: expect.objectContaining({
                    status: shared_1.HandoffStatus.HUMAN_ACTIVE,
                    forced: true,
                }),
            }));
        });
    });
    describe('REQUEST_HANDOFF', () => {
        beforeEach(() => {
            (0, handoffHandler_1.registerHandoffHandlers)(mockSocket, mockNsp);
        });
        it('should reject handoff if not in human mode', async () => {
            const callback = jest.fn();
            const data = { conversationId: 'conv-1' };
            mockSocket._trigger(shared_1.HandoffSocketEvents.REQUEST_HANDOFF, data, callback);
            await Promise.resolve();
            expect(callback).toHaveBeenCalledWith(expect.objectContaining({
                success: false,
                error: expect.objectContaining({
                    code: shared_1.HandoffErrorCode.INVALID_STATUS,
                }),
            }));
        });
        it('should create handoff request after takeover', async () => {
            // Takeover first
            const takeoverCallback = jest.fn();
            mockSocket._trigger(shared_1.HandoffSocketEvents.REQUEST_TAKEOVER, { conversationId: 'conv-4' }, takeoverCallback);
            await Promise.resolve();
            const requestId = takeoverCallback.mock.calls[0][0].data.requestId;
            // Confirm takeover
            const confirmCallback = jest.fn();
            mockSocket._trigger(shared_1.HandoffSocketEvents.CONFIRM_HANDOFF, { requestId }, confirmCallback);
            await Promise.resolve();
            // Now request handoff
            const handoffCallback = jest.fn();
            mockSocket._trigger(shared_1.HandoffSocketEvents.REQUEST_HANDOFF, { conversationId: 'conv-4' }, handoffCallback);
            await Promise.resolve();
            expect(handoffCallback).toHaveBeenCalledWith(expect.objectContaining({
                success: true,
                data: expect.objectContaining({
                    status: shared_1.HandoffStatus.PENDING_HANDOFF,
                }),
            }));
        });
    });
    describe('CONFIRM_HANDOFF', () => {
        beforeEach(() => {
            (0, handoffHandler_1.registerHandoffHandlers)(mockSocket, mockNsp);
        });
        it('should confirm pending takeover', async () => {
            // Create takeover request
            const takeoverCallback = jest.fn();
            mockSocket._trigger(shared_1.HandoffSocketEvents.REQUEST_TAKEOVER, { conversationId: 'conv-5' }, takeoverCallback);
            await Promise.resolve();
            const requestId = takeoverCallback.mock.calls[0][0].data.requestId;
            // Confirm it
            const confirmCallback = jest.fn();
            mockSocket._trigger(shared_1.HandoffSocketEvents.CONFIRM_HANDOFF, { requestId }, confirmCallback);
            await Promise.resolve();
            expect(confirmCallback).toHaveBeenCalledWith(expect.objectContaining({
                success: true,
                data: expect.objectContaining({
                    status: shared_1.HandoffStatus.HUMAN_ACTIVE,
                }),
            }));
            // Verify state
            const state = (0, handoffHandler_1.getHandoffState)('conv-5');
            expect(state?.currentStatus).toBe(shared_1.HandoffStatus.HUMAN_ACTIVE);
            expect(state?.currentHandlerType).toBe(shared_1.SenderType.HUMAN);
        });
        it('should reject confirmation for non-existent request', async () => {
            const callback = jest.fn();
            mockSocket._trigger(shared_1.HandoffSocketEvents.CONFIRM_HANDOFF, { requestId: 'non-existent' }, callback);
            await Promise.resolve();
            expect(callback).toHaveBeenCalledWith(expect.objectContaining({
                success: false,
                error: expect.objectContaining({
                    code: shared_1.HandoffErrorCode.REQUEST_NOT_FOUND,
                }),
            }));
        });
    });
    describe('REJECT_HANDOFF', () => {
        beforeEach(() => {
            (0, handoffHandler_1.registerHandoffHandlers)(mockSocket, mockNsp);
        });
        it('should reject pending request', async () => {
            // Create request
            const requestCallback = jest.fn();
            mockSocket._trigger(shared_1.HandoffSocketEvents.REQUEST_TAKEOVER, { conversationId: 'conv-6' }, requestCallback);
            await Promise.resolve();
            const requestId = requestCallback.mock.calls[0][0].data.requestId;
            // Reject it
            const rejectCallback = jest.fn();
            mockSocket._trigger(shared_1.HandoffSocketEvents.REJECT_HANDOFF, { requestId, reason: 'Not now' }, rejectCallback);
            await Promise.resolve();
            expect(rejectCallback).toHaveBeenCalledWith(expect.objectContaining({
                success: true,
            }));
            // Verify request is rejected
            const request = (0, handoffHandler_1.getHandoffRequest)(requestId);
            expect(request?.status).toBe(shared_1.HandoffRequestStatus.REJECTED);
        });
    });
    describe('CANCEL_HANDOFF', () => {
        beforeEach(() => {
            (0, handoffHandler_1.registerHandoffHandlers)(mockSocket, mockNsp);
        });
        it('should cancel own pending request', async () => {
            // Create request
            const requestCallback = jest.fn();
            mockSocket._trigger(shared_1.HandoffSocketEvents.REQUEST_TAKEOVER, { conversationId: 'conv-7' }, requestCallback);
            await Promise.resolve();
            const requestId = requestCallback.mock.calls[0][0].data.requestId;
            // Cancel it
            const cancelCallback = jest.fn();
            mockSocket._trigger(shared_1.HandoffSocketEvents.CANCEL_HANDOFF, { requestId }, cancelCallback);
            await Promise.resolve();
            expect(cancelCallback).toHaveBeenCalledWith(expect.objectContaining({
                success: true,
            }));
        });
        it('should reject cancellation by non-requester', async () => {
            // Create request
            const requestCallback = jest.fn();
            mockSocket._trigger(shared_1.HandoffSocketEvents.REQUEST_TAKEOVER, { conversationId: 'conv-8' }, requestCallback);
            await Promise.resolve();
            const requestId = requestCallback.mock.calls[0][0].data.requestId;
            // Try to cancel with different user
            const otherSocket = createMockSocket('user-2', ['user']);
            (0, handoffHandler_1.registerHandoffHandlers)(otherSocket, mockNsp);
            const cancelCallback = jest.fn();
            otherSocket._trigger(shared_1.HandoffSocketEvents.CANCEL_HANDOFF, { requestId }, cancelCallback);
            await Promise.resolve();
            expect(cancelCallback).toHaveBeenCalledWith(expect.objectContaining({
                success: false,
                error: expect.objectContaining({
                    code: shared_1.HandoffErrorCode.UNAUTHORIZED,
                }),
            }));
        });
    });
    describe('Timeout handling', () => {
        beforeEach(() => {
            (0, handoffHandler_1.registerHandoffHandlers)(mockSocket, mockNsp);
        });
        it('should timeout pending request after configured time', async () => {
            // Create request
            const callback = jest.fn();
            mockSocket._trigger(shared_1.HandoffSocketEvents.REQUEST_TAKEOVER, { conversationId: 'conv-9' }, callback);
            await Promise.resolve();
            const requestId = callback.mock.calls[0][0].data.requestId;
            // Fast forward past timeout (30 seconds)
            jest.advanceTimersByTime(31000);
            // Verify request is timed out
            const request = (0, handoffHandler_1.getHandoffRequest)(requestId);
            expect(request?.status).toBe(shared_1.HandoffRequestStatus.TIMEOUT);
        });
    });
});
//# sourceMappingURL=handoffHandler.test.js.map