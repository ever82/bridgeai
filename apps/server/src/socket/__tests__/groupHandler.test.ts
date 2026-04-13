/**
 * Group Handler Tests
 */
import { registerGroupHandlers } from '../handlers/groupHandler';
import { connectionManager } from '../connectionManager';

// Mock connection manager
jest.mock('../connectionManager', () => ({
  connectionManager: {
    isUserOnline: jest.fn().mockReturnValue(true),
  },
}));

describe('Group Handler', () => {
  let mockSocket: any;
  let mockNamespace: any;
  let mockCallback: jest.Mock;
  let eventHandlers: Map<string, Function>;

  beforeEach(() => {
    eventHandlers = new Map();
    mockCallback = jest.fn();

    mockSocket = {
      id: 'socket123',
      user: { id: 'user123' },
      join: jest.fn(),
      leave: jest.fn(),
      to: jest.fn().mockReturnThis(),
      emit: jest.fn(),
      on: jest.fn((event: string, handler: Function) => {
        eventHandlers.set(event, handler);
      }),
      rooms: new Set(),
    };

    mockNamespace = {
      to: jest.fn().mockReturnThis(),
      emit: jest.fn(),
    };

    registerGroupHandlers(mockSocket, mockNamespace);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('group:create', () => {
    it('creates a group successfully', () => {
      const handler = eventHandlers.get('group:create');
      expect(handler).toBeDefined();

      handler({ name: 'Test Group', memberIds: ['user456'] }, mockCallback);

      expect(mockSocket.join).toHaveBeenCalled();
      expect(mockCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            groupId: expect.any(String),
            state: expect.any(Object),
          }),
        })
      );
    });

    it('requires authentication', () => {
      mockSocket.user = null;
      const handler = eventHandlers.get('group:create');

      handler({ name: 'Test Group' }, mockCallback);

      expect(mockCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Authentication required',
        })
      );
    });
  });

  describe('group:join', () => {
    it('requires authentication', () => {
      mockSocket.user = null;
      const handler = eventHandlers.get('group:join');

      handler({ groupId: 'group123' }, mockCallback);

      expect(mockCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Authentication required',
        })
      );
    });
  });

  describe('group:leave', () => {
    it('leaves group successfully', () => {
      const handler = eventHandlers.get('group:leave');

      handler({ groupId: 'group123' }, mockCallback);

      expect(mockSocket.leave).toHaveBeenCalledWith('group:group123');
      expect(mockCallback).toHaveBeenCalledWith(
        expect.objectContaining({ success: true })
      );
    });
  });

  describe('group:update_settings', () => {
    it('requires admin or owner role', () => {
      const handler = eventHandlers.get('group:update_settings');

      // First create a group
      const createHandler = eventHandlers.get('group:create');
      createHandler({ name: 'Test Group' }, jest.fn());

      // Try to update settings without being a member
      handler(
        { groupId: 'nonexistent', settings: { allowInvite: false } },
        mockCallback
      );

      expect(mockCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Group not found',
        })
      );
    });

    it('requires authentication', () => {
      mockSocket.user = null;
      const handler = eventHandlers.get('group:update_settings');

      handler({ groupId: 'group123', settings: {} }, mockCallback);

      expect(mockCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Authentication required',
        })
      );
    });
  });

  describe('group:add_member', () => {
    it('requires authentication', () => {
      mockSocket.user = null;
      const handler = eventHandlers.get('group:add_member');

      handler({ groupId: 'group123', userId: 'user456' }, mockCallback);

      expect(mockCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Authentication required',
        })
      );
    });
  });

  describe('group:remove_member', () => {
    it('requires authentication', () => {
      mockSocket.user = null;
      const handler = eventHandlers.get('group:remove_member');

      handler({ groupId: 'group123', userId: 'user456' }, mockCallback);

      expect(mockCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Authentication required',
        })
      );
    });
  });

  describe('disconnect', () => {
    it('handles disconnect event', () => {
      const handler = eventHandlers.get('disconnect');
      expect(handler).toBeDefined();

      // Should not throw
      expect(() => handler()).not.toThrow();
    });
  });
});
