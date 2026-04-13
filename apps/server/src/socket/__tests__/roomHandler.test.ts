/**
 * Room Handler Tests
 */

import { registerRoomHandlers } from '../handlers/roomHandler';
import { roomService } from '../../services/roomService';
import { connectionService } from '../../services/connectionService';
import { presenceService } from '../../services/presenceService';

// Mock the services
jest.mock('../../services/roomService');
jest.mock('../../services/connectionService');
jest.mock('../../services/presenceService');

describe('registerRoomHandlers', () => {
  let mockSocket;
  let mockNamespace;
  let mockTo;
  let mockEmit;

  beforeEach(() => {
    jest.clearAllMocks();

    mockTo = jest.fn().mockReturnThis();
    mockEmit = jest.fn().mockReturnThis();

    mockSocket = {
      id: 'socket-1',
      user: { id: 'user-1' },
      join: jest.fn(),
      leave: jest.fn(),
      to: mockTo,
      emit: mockEmit,
      on: jest.fn(),
      rooms: new Set(['socket-1']),
      handshake: {
        address: '192.168.1.1',
        query: {},
      },
    };

    mockNamespace = {
      to: mockTo,
      emit: mockEmit,
    };

    // Reset mock implementations
    roomService.createRoom.mockReturnValue({
      id: 'room-1',
      name: 'Test Room',
    });
    roomService.roomExists.mockReturnValue(true);
    roomService.joinRoom.mockReturnValue({
      userId: 'user-1',
      role: 'member',
    });
    roomService.isUserInRoom.mockReturnValue(false);
    roomService.isUserBanned.mockReturnValue(false);
    roomService.getRoom.mockReturnValue({
      id: 'room-1',
      isPrivate: false,
      maxMembers: 100,
    });
    roomService.getRoomMembers.mockReturnValue([
      { userId: 'user-1', role: 'member', joinedAt: new Date() },
    ]);
    roomService.getUserRooms.mockReturnValue([
      { id: 'room-1', name: 'Test Room' },
    ]);
    roomService.leaveRoom.mockReturnValue(true);
    roomService.getRoomStats.mockReturnValue({
      memberCount: 1,
      onlineCount: 1,
      bannedCount: 0,
    });
  });

  describe('room:create', () => {
    it('should create room and join as owner', () => {
      registerRoomHandlers(mockSocket, mockNamespace);

      const createHandler = mockSocket.on.mock.calls.find((call) => call[0] === 'room:create')[1];
      const callback = jest.fn();

      createHandler({ roomId: 'room-1', options: { name: 'Test Room' } }, callback);

      expect(roomService.createRoom).toHaveBeenCalledWith('room-1', 'user-1', { name: 'Test Room' });
      expect(roomService.joinRoom).toHaveBeenCalled();
      expect(mockSocket.join).toHaveBeenCalledWith('room-1');
      expect(callback).toHaveBeenCalledWith({
        success: true,
        data: { room: { id: 'room-1', name: 'Test Room' } },
      });
    });

    it('should require authentication', () => {
      mockSocket.user = null;
      registerRoomHandlers(mockSocket, mockNamespace);

      const createHandler = mockSocket.on.mock.calls.find((call) => call[0] === 'room:create')[1];
      const callback = jest.fn();

      createHandler({ roomId: 'room-1', options: { name: 'Test Room' } }, callback);

      expect(callback).toHaveBeenCalledWith({
        success: false,
        error: 'Authentication required',
      });
    });

    it('should handle errors', () => {
      roomService.createRoom.mockImplementation(() => {
        throw new Error('Room already exists');
      });

      registerRoomHandlers(mockSocket, mockNamespace);

      const createHandler = mockSocket.on.mock.calls.find((call) => call[0] === 'room:create')[1];
      const callback = jest.fn();

      createHandler({ roomId: 'room-1', options: { name: 'Test Room' } }, callback);

      expect(callback).toHaveBeenCalledWith({
        success: false,
        error: 'Room already exists',
      });
    });
  });

  describe('room:join', () => {
    it('should allow user to join room', () => {
      registerRoomHandlers(mockSocket, mockNamespace);

      const joinHandler = mockSocket.on.mock.calls.find((call) => call[0] === 'room:join')[1];
      const callback = jest.fn();

      joinHandler({ roomId: 'room-1' }, callback);

      expect(roomService.joinRoom).toHaveBeenCalledWith('room-1', expect.any(Object));
      expect(mockSocket.join).toHaveBeenCalledWith('room-1');
      expect(mockTo).toHaveBeenCalledWith('room-1');
      expect(callback).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        data: expect.objectContaining({ roomId: 'room-1' }),
      }));
    });

    it('should reject if room does not exist', () => {
      roomService.roomExists.mockReturnValue(false);

      registerRoomHandlers(mockSocket, mockNamespace);

      const joinHandler = mockSocket.on.mock.calls.find((call) => call[0] === 'room:join')[1];
      const callback = jest.fn();

      joinHandler({ roomId: 'non-existent' }, callback);

      expect(callback).toHaveBeenCalledWith({
        success: false,
        error: 'Room does not exist',
      });
    });

    it('should reject if user already in room', () => {
      roomService.isUserInRoom.mockReturnValue(true);

      registerRoomHandlers(mockSocket, mockNamespace);

      const joinHandler = mockSocket.on.mock.calls.find((call) => call[0] === 'room:join')[1];
      const callback = jest.fn();

      joinHandler({ roomId: 'room-1' }, callback);

      expect(callback).toHaveBeenCalledWith({
        success: false,
        error: 'Already in room',
      });
    });

    it('should reject if user is banned', () => {
      roomService.isUserBanned.mockReturnValue(true);

      registerRoomHandlers(mockSocket, mockNamespace);

      const joinHandler = mockSocket.on.mock.calls.find((call) => call[0] === 'room:join')[1];
      const callback = jest.fn();

      joinHandler({ roomId: 'room-1' }, callback);

      expect(callback).toHaveBeenCalledWith({
        success: false,
        error: 'You are banned from this room',
      });
    });

    it('should require password for private rooms', () => {
      roomService.getRoom.mockReturnValue({
        id: 'room-1',
        isPrivate: true,
        maxMembers: 100,
      });

      registerRoomHandlers(mockSocket, mockNamespace);

      const joinHandler = mockSocket.on.mock.calls.find((call) => call[0] === 'room:join')[1];
      const callback = jest.fn();

      joinHandler({ roomId: 'room-1' }, callback);

      expect(callback).toHaveBeenCalledWith({
        success: false,
        error: 'Password required for private room',
      });
    });
  });

  describe('room:leave', () => {
    it('should allow user to leave room', () => {
      roomService.isUserInRoom.mockReturnValue(true);

      registerRoomHandlers(mockSocket, mockNamespace);

      const leaveHandler = mockSocket.on.mock.calls.find((call) => call[0] === 'room:leave')[1];
      const callback = jest.fn();

      leaveHandler({ roomId: 'room-1' }, callback);

      expect(roomService.leaveRoom).toHaveBeenCalledWith('room-1', 'user-1');
      expect(mockSocket.leave).toHaveBeenCalledWith('room-1');
      expect(mockTo).toHaveBeenCalledWith('room-1');
      expect(callback).toHaveBeenCalledWith({ success: true });
    });

    it('should reject if not in room', () => {
      roomService.isUserInRoom.mockReturnValue(false);

      registerRoomHandlers(mockSocket, mockNamespace);

      const leaveHandler = mockSocket.on.mock.calls.find((call) => call[0] === 'room:leave')[1];
      const callback = jest.fn();

      leaveHandler({ roomId: 'room-1' }, callback);

      expect(callback).toHaveBeenCalledWith({
        success: false,
        error: 'Not in room',
      });
    });
  });

  describe('room:broadcast', () => {
    beforeEach(() => {
      roomService.isUserInRoom.mockReturnValue(true);
      roomService.isUserMuted.mockReturnValue(false);
    });

    it('should broadcast to room', () => {
      registerRoomHandlers(mockSocket, mockNamespace);

      const broadcastHandler = mockSocket.on.mock.calls.find((call) => call[0] === 'room:broadcast')[1];
      const callback = jest.fn();

      broadcastHandler({
        roomId: 'room-1',
        event: 'chat:message',
        payload: { text: 'Hello' },
      }, callback);

      expect(connectionService.updateActivity).toHaveBeenCalledWith('socket-1');
      expect(presenceService.updateActivity).toHaveBeenCalledWith('user-1');
      expect(callback).toHaveBeenCalledWith({ success: true });
    });

    it('should reject if not in room', () => {
      roomService.isUserInRoom.mockReturnValue(false);

      registerRoomHandlers(mockSocket, mockNamespace);

      const broadcastHandler = mockSocket.on.mock.calls.find((call) => call[0] === 'room:broadcast')[1];
      const callback = jest.fn();

      broadcastHandler({
        roomId: 'room-1',
        event: 'chat:message',
        payload: { text: 'Hello' },
      }, callback);

      expect(callback).toHaveBeenCalledWith({
        success: false,
        error: 'Not in room',
      });
    });

    it('should reject if user is muted', () => {
      roomService.isUserMuted.mockReturnValue(true);

      registerRoomHandlers(mockSocket, mockNamespace);

      const broadcastHandler = mockSocket.on.mock.calls.find((call) => call[0] === 'room:broadcast')[1];
      const callback = jest.fn();

      broadcastHandler({
        roomId: 'room-1',
        event: 'chat:message',
        payload: { text: 'Hello' },
      }, callback);

      expect(callback).toHaveBeenCalledWith({
        success: false,
        error: 'You are muted in this room',
      });
    });
  });

  describe('room:info', () => {
    it('should return room info', () => {
      registerRoomHandlers(mockSocket, mockNamespace);

      const infoHandler = mockSocket.on.mock.calls.find((call) => call[0] === 'room:info')[1];
      const callback = jest.fn();

      infoHandler({ roomId: 'room-1' }, callback);

      expect(callback).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          room: expect.any(Object),
          members: expect.any(Array),
          stats: expect.any(Object),
        }),
      });
    });

    it('should return error for non-existent room', () => {
      roomService.getRoom.mockReturnValue(undefined);

      registerRoomHandlers(mockSocket, mockNamespace);

      const infoHandler = mockSocket.on.mock.calls.find((call) => call[0] === 'room:info')[1];
      const callback = jest.fn();

      infoHandler({ roomId: 'non-existent' }, callback);

      expect(callback).toHaveBeenCalledWith({
        success: false,
        error: 'Room not found',
      });
    });
  });

  describe('room:my_rooms', () => {
    it('should return user rooms', () => {
      registerRoomHandlers(mockSocket, mockNamespace);

      const myRoomsHandler = mockSocket.on.mock.calls.find((call) => call[0] === 'room:my_rooms')[1];
      const callback = jest.fn();

      myRoomsHandler(callback);

      expect(roomService.getUserRooms).toHaveBeenCalledWith('user-1');
      expect(callback).toHaveBeenCalledWith({
        success: true,
        data: { rooms: [{ id: 'room-1', name: 'Test Room' }] },
      });
    });

    it('should require authentication', () => {
      mockSocket.user = null;

      registerRoomHandlers(mockSocket, mockNamespace);

      const myRoomsHandler = mockSocket.on.mock.calls.find((call) => call[0] === 'room:my_rooms')[1];
      const callback = jest.fn();

      myRoomsHandler(callback);

      expect(callback).toHaveBeenCalledWith({
        success: false,
        error: 'Authentication required',
      });
    });
  });

  describe('room:kick', () => {
    beforeEach(() => {
      roomService.kickUser.mockReturnValue(true);
    });

    it('should kick user from room', () => {
      registerRoomHandlers(mockSocket, mockNamespace);

      const kickHandler = mockSocket.on.mock.calls.find((call) => call[0] === 'room:kick')[1];
      const callback = jest.fn();

      kickHandler({ roomId: 'room-1', targetUserId: 'user-2' }, callback);

      expect(roomService.kickUser).toHaveBeenCalledWith('room-1', 'user-2', 'user-1');
      expect(callback).toHaveBeenCalledWith({ success: true });
    });

    it('should handle kick errors', () => {
      roomService.kickUser.mockImplementation(() => {
        throw new Error('Insufficient permissions');
      });

      registerRoomHandlers(mockSocket, mockNamespace);

      const kickHandler = mockSocket.on.mock.calls.find((call) => call[0] === 'room:kick')[1];
      const callback = jest.fn();

      kickHandler({ roomId: 'room-1', targetUserId: 'user-2' }, callback);

      expect(callback).toHaveBeenCalledWith({
        success: false,
        error: 'Insufficient permissions',
      });
    });
  });

  describe('room:ban', () => {
    beforeEach(() => {
      roomService.banUser.mockReturnValue(true);
    });

    it('should ban user from room', () => {
      registerRoomHandlers(mockSocket, mockNamespace);

      const banHandler = mockSocket.on.mock.calls.find((call) => call[0] === 'room:ban')[1];
      const callback = jest.fn();

      banHandler({ roomId: 'room-1', targetUserId: 'user-2' }, callback);

      expect(roomService.banUser).toHaveBeenCalledWith('room-1', 'user-2', 'user-1');
      expect(callback).toHaveBeenCalledWith({ success: true });
    });

    it('should handle ban errors', () => {
      roomService.banUser.mockImplementation(() => {
        throw new Error('Cannot ban room creator');
      });

      registerRoomHandlers(mockSocket, mockNamespace);

      const banHandler = mockSocket.on.mock.calls.find((call) => call[0] === 'room:ban')[1];
      const callback = jest.fn();

      banHandler({ roomId: 'room-1', targetUserId: 'user-2' }, callback);

      expect(callback).toHaveBeenCalledWith({
        success: false,
        error: 'Cannot ban room creator',
      });
    });
  });

  describe('room:set_role', () => {
    beforeEach(() => {
      roomService.setUserRole.mockReturnValue(true);
    });

    it('should set user role', () => {
      registerRoomHandlers(mockSocket, mockNamespace);

      const setRoleHandler = mockSocket.on.mock.calls.find((call) => call[0] === 'room:set_role')[1];
      const callback = jest.fn();

      setRoleHandler({ roomId: 'room-1', targetUserId: 'user-2', role: 'admin' }, callback);

      expect(roomService.setUserRole).toHaveBeenCalledWith('room-1', 'user-2', 'admin', 'user-1');
      expect(callback).toHaveBeenCalledWith({ success: true });
    });

    it('should handle role setting errors', () => {
      roomService.setUserRole.mockImplementation(() => {
        throw new Error('Only room owner can set admin role');
      });

      registerRoomHandlers(mockSocket, mockNamespace);

      const setRoleHandler = mockSocket.on.mock.calls.find((call) => call[0] === 'room:set_role')[1];
      const callback = jest.fn();

      setRoleHandler({ roomId: 'room-1', targetUserId: 'user-2', role: 'admin' }, callback);

      expect(callback).toHaveBeenCalledWith({
        success: false,
        error: 'Only room owner can set admin role',
      });
    });
  });

  describe('disconnect', () => {
    it('should clean up rooms on disconnect', () => {
      roomService.getUserRooms.mockReturnValue([
        { id: 'room-1' },
        { id: 'room-2' },
      ]);

      registerRoomHandlers(mockSocket, mockNamespace);

      const disconnectHandler = mockSocket.on.mock.calls.find((call) => call[0] === 'disconnect')[1];

      disconnectHandler();

      expect(roomService.leaveRoom).toHaveBeenCalledWith('room-1', 'user-1');
      expect(roomService.leaveRoom).toHaveBeenCalledWith('room-2', 'user-1');
    });
  });
});
