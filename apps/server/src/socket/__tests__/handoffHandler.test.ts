/**
 * Handoff Socket Handler Tests
 */
import { Namespace } from 'socket.io';
import {
  HandoffStatus,
  HandoffRequestStatus,
  SenderType,
  HandoffSocketEvents,
  HandoffErrorCode,
} from '@bridgeai/shared';

import {
  registerHandoffHandlers,
  getHandoffState,
  getHandoffRequest,
} from '../../src/socket/handlers/handoffHandler';
import { AuthenticatedSocket } from '../../src/socket/middleware/auth';

// Mock socket
const createMockSocket = (userId: string = 'user-1', roles: string[] = ['user']) => {
  const eventHandlers: Record<string, (...args: unknown[]) => void> = {};

  return {
    id: `socket-${userId}`,
    user: { id: userId, email: `${userId}@test.com`, roles },
    rooms: new Set(),
    join: jest.fn((room: string) => {
      eventHandlers[room] = eventHandlers[room] || [];
    }),
    leave: jest.fn(),
    to: jest.fn(() => ({
      emit: jest.fn(),
    })),
    emit: jest.fn(),
    on: jest.fn((event: string, handler: (...args: unknown[]) => void) => {
      eventHandlers[event] = eventHandlers[event] || [];
      eventHandlers[event].push(handler);
    }),
    _trigger: (event: string, ...args: unknown[]) => {
      const handlers = eventHandlers[event] || [];
      handlers.forEach(h => h(...args));
    },
    _handlers: eventHandlers,
  } as unknown as AuthenticatedSocket;
};

// Mock namespace
const createMockNamespace = () => {
  const rooms: Record<string, unknown> = {};

  return {
    to: jest.fn((room: string) => ({
      emit: jest.fn((event: string, data: unknown) => {
        rooms[room] = rooms[room] || [];
        rooms[room].push({ event, data });
      }),
    })),
    _rooms: rooms,
  } as unknown as Namespace;
};

describe('Handoff Socket Handler', () => {
  let mockSocket: ReturnType<typeof createMockSocket>;
  let mockNsp: ReturnType<typeof createMockNamespace>;

  beforeEach(() => {
    mockSocket = createMockSocket('user-1', ['user']);
    mockNsp = createMockNamespace();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  describe('registerHandoffHandlers', () => {
    it('should register all handoff event handlers', () => {
      registerHandoffHandlers(mockSocket as AuthenticatedSocket, mockNsp as Namespace);

      expect(mockSocket.on).toHaveBeenCalledWith(
        HandoffSocketEvents.REQUEST_TAKEOVER,
        expect.any(Function)
      );
      expect(mockSocket.on).toHaveBeenCalledWith(
        HandoffSocketEvents.REQUEST_HANDOFF,
        expect.any(Function)
      );
      expect(mockSocket.on).toHaveBeenCalledWith(
        HandoffSocketEvents.CONFIRM_HANDOFF,
        expect.any(Function)
      );
      expect(mockSocket.on).toHaveBeenCalledWith(
        HandoffSocketEvents.REJECT_HANDOFF,
        expect.any(Function)
      );
      expect(mockSocket.on).toHaveBeenCalledWith(
        HandoffSocketEvents.CANCEL_HANDOFF,
        expect.any(Function)
      );
    });
  });

  describe('REQUEST_TAKEOVER', () => {
    beforeEach(() => {
      registerHandoffHandlers(mockSocket as AuthenticatedSocket, mockNsp as Namespace);
    });

    it('should create takeover request successfully', async () => {
      const callback = jest.fn();
      const data = { conversationId: 'conv-1', reason: 'Test takeover' };

      mockSocket._trigger(HandoffSocketEvents.REQUEST_TAKEOVER, data, callback);

      // Wait for async operations
      await Promise.resolve();

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            requestId: expect.any(String),
            status: HandoffStatus.PENDING_TAKEOVER,
            timeoutSeconds: 30,
          }),
        })
      );
    });

    it('should reject takeover if user not authorized', async () => {
      const unauthorizedSocket = createMockSocket('user-2', ['guest']);
      registerHandoffHandlers(unauthorizedSocket as AuthenticatedSocket, mockNsp as Namespace);

      const callback = jest.fn();
      const data = { conversationId: 'conv-1' };

      unauthorizedSocket._trigger(HandoffSocketEvents.REQUEST_TAKEOVER, data, callback);

      await Promise.resolve();

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: HandoffErrorCode.UNAUTHORIZED,
          }),
        })
      );
    });

    it('should reject takeover if already in human mode', async () => {
      // First takeover
      const callback1 = jest.fn();
      mockSocket._trigger(
        HandoffSocketEvents.REQUEST_TAKEOVER,
        { conversationId: 'conv-2' },
        callback1
      );
      await Promise.resolve();

      // Confirm takeover
      const requestId = callback1.mock.calls[0][0].data.requestId;
      const confirmCallback = jest.fn();
      mockSocket._trigger(HandoffSocketEvents.CONFIRM_HANDOFF, { requestId }, confirmCallback);
      await Promise.resolve();

      // Try another takeover
      const callback2 = jest.fn();
      mockSocket._trigger(
        HandoffSocketEvents.REQUEST_TAKEOVER,
        { conversationId: 'conv-2' },
        callback2
      );
      await Promise.resolve();

      expect(callback2).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: HandoffErrorCode.INVALID_STATUS,
          }),
        })
      );
    });

    it('should handle forced takeover for admin users', async () => {
      const adminSocket = createMockSocket('admin-1', ['admin']);
      registerHandoffHandlers(adminSocket as AuthenticatedSocket, mockNsp as Namespace);

      const callback = jest.fn();
      const data = { conversationId: 'conv-3', force: true };

      adminSocket._trigger(HandoffSocketEvents.REQUEST_TAKEOVER, data, callback);

      await Promise.resolve();

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            status: HandoffStatus.HUMAN_ACTIVE,
            forced: true,
          }),
        })
      );
    });
  });

  describe('REQUEST_HANDOFF', () => {
    beforeEach(() => {
      registerHandoffHandlers(mockSocket as AuthenticatedSocket, mockNsp as Namespace);
    });

    it('should reject handoff if not in human mode', async () => {
      const callback = jest.fn();
      const data = { conversationId: 'conv-1' };

      mockSocket._trigger(HandoffSocketEvents.REQUEST_HANDOFF, data, callback);
      await Promise.resolve();

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: HandoffErrorCode.INVALID_STATUS,
          }),
        })
      );
    });

    it('should create handoff request after takeover', async () => {
      // Takeover first
      const takeoverCallback = jest.fn();
      mockSocket._trigger(
        HandoffSocketEvents.REQUEST_TAKEOVER,
        { conversationId: 'conv-4' },
        takeoverCallback
      );
      await Promise.resolve();

      const requestId = takeoverCallback.mock.calls[0][0].data.requestId;

      // Confirm takeover
      const confirmCallback = jest.fn();
      mockSocket._trigger(HandoffSocketEvents.CONFIRM_HANDOFF, { requestId }, confirmCallback);
      await Promise.resolve();

      // Now request handoff
      const handoffCallback = jest.fn();
      mockSocket._trigger(
        HandoffSocketEvents.REQUEST_HANDOFF,
        { conversationId: 'conv-4' },
        handoffCallback
      );
      await Promise.resolve();

      expect(handoffCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            status: HandoffStatus.PENDING_HANDOFF,
          }),
        })
      );
    });
  });

  describe('CONFIRM_HANDOFF', () => {
    beforeEach(() => {
      registerHandoffHandlers(mockSocket as AuthenticatedSocket, mockNsp as Namespace);
    });

    it('should confirm pending takeover', async () => {
      // Create takeover request
      const takeoverCallback = jest.fn();
      mockSocket._trigger(
        HandoffSocketEvents.REQUEST_TAKEOVER,
        { conversationId: 'conv-5' },
        takeoverCallback
      );
      await Promise.resolve();

      const requestId = takeoverCallback.mock.calls[0][0].data.requestId;

      // Confirm it
      const confirmCallback = jest.fn();
      mockSocket._trigger(HandoffSocketEvents.CONFIRM_HANDOFF, { requestId }, confirmCallback);
      await Promise.resolve();

      expect(confirmCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            status: HandoffStatus.HUMAN_ACTIVE,
          }),
        })
      );

      // Verify state
      const state = getHandoffState('conv-5');
      expect(state?.currentStatus).toBe(HandoffStatus.HUMAN_ACTIVE);
      expect(state?.currentHandlerType).toBe(SenderType.HUMAN);
    });

    it('should reject confirmation for non-existent request', async () => {
      const callback = jest.fn();
      mockSocket._trigger(
        HandoffSocketEvents.CONFIRM_HANDOFF,
        { requestId: 'non-existent' },
        callback
      );
      await Promise.resolve();

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: HandoffErrorCode.REQUEST_NOT_FOUND,
          }),
        })
      );
    });
  });

  describe('REJECT_HANDOFF', () => {
    beforeEach(() => {
      registerHandoffHandlers(mockSocket as AuthenticatedSocket, mockNsp as Namespace);
    });

    it('should reject pending request', async () => {
      // Create request
      const requestCallback = jest.fn();
      mockSocket._trigger(
        HandoffSocketEvents.REQUEST_TAKEOVER,
        { conversationId: 'conv-6' },
        requestCallback
      );
      await Promise.resolve();

      const requestId = requestCallback.mock.calls[0][0].data.requestId;

      // Reject it
      const rejectCallback = jest.fn();
      mockSocket._trigger(
        HandoffSocketEvents.REJECT_HANDOFF,
        { requestId, reason: 'Not now' },
        rejectCallback
      );
      await Promise.resolve();

      expect(rejectCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
        })
      );

      // Verify request is rejected
      const request = getHandoffRequest(requestId);
      expect(request?.status).toBe(HandoffRequestStatus.REJECTED);
    });
  });

  describe('CANCEL_HANDOFF', () => {
    beforeEach(() => {
      registerHandoffHandlers(mockSocket as AuthenticatedSocket, mockNsp as Namespace);
    });

    it('should cancel own pending request', async () => {
      // Create request
      const requestCallback = jest.fn();
      mockSocket._trigger(
        HandoffSocketEvents.REQUEST_TAKEOVER,
        { conversationId: 'conv-7' },
        requestCallback
      );
      await Promise.resolve();

      const requestId = requestCallback.mock.calls[0][0].data.requestId;

      // Cancel it
      const cancelCallback = jest.fn();
      mockSocket._trigger(HandoffSocketEvents.CANCEL_HANDOFF, { requestId }, cancelCallback);
      await Promise.resolve();

      expect(cancelCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
        })
      );
    });

    it('should reject cancellation by non-requester', async () => {
      // Create request
      const requestCallback = jest.fn();
      mockSocket._trigger(
        HandoffSocketEvents.REQUEST_TAKEOVER,
        { conversationId: 'conv-8' },
        requestCallback
      );
      await Promise.resolve();

      const requestId = requestCallback.mock.calls[0][0].data.requestId;

      // Try to cancel with different user
      const otherSocket = createMockSocket('user-2', ['user']);
      registerHandoffHandlers(otherSocket as AuthenticatedSocket, mockNsp as Namespace);

      const cancelCallback = jest.fn();
      otherSocket._trigger(HandoffSocketEvents.CANCEL_HANDOFF, { requestId }, cancelCallback);
      await Promise.resolve();

      expect(cancelCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: HandoffErrorCode.UNAUTHORIZED,
          }),
        })
      );
    });
  });

  describe('Timeout handling', () => {
    beforeEach(() => {
      registerHandoffHandlers(mockSocket as AuthenticatedSocket, mockNsp as Namespace);
    });

    it('should timeout pending request after configured time', async () => {
      // Create request
      const callback = jest.fn();
      mockSocket._trigger(
        HandoffSocketEvents.REQUEST_TAKEOVER,
        { conversationId: 'conv-9' },
        callback
      );
      await Promise.resolve();

      const requestId = callback.mock.calls[0][0].data.requestId;

      // Fast forward past timeout (30 seconds)
      jest.advanceTimersByTime(31000);

      // Verify request is timed out
      const request = getHandoffRequest(requestId);
      expect(request?.status).toBe(HandoffRequestStatus.TIMEOUT);
    });
  });
});
