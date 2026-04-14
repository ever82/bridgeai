import { roomService, RoomService, CreateRoomOptions, JoinRoomOptions } from '../roomService';

describe('RoomService', () => {
  let service: RoomService;

  beforeEach(() => {
    service = new RoomService();
  });

  afterEach(() => {
    service.clearAllRooms();
  });

  describe('createRoom', () => {
    it('should create a room successfully', () => {
      const options: CreateRoomOptions = {
        name: 'Test Room',
        description: 'A test room',
      };

      const room = service.createRoom('room-1', 'user-1', options);

      expect(room.id).toBe('room-1');
      expect(room.name).toBe('Test Room');
      expect(room.description).toBe('A test room');
      expect(room.createdBy).toBe('user-1');
      expect(room.isPrivate).toBe(false);
      expect(room.maxMembers).toBe(100);
    });

    it('should throw error when creating duplicate room', () => {
      service.createRoom('room-1', 'user-1', { name: 'Room' });

      expect(() => {
        service.createRoom('room-1', 'user-2', { name: 'Room 2' });
      }).toThrow('Room room-1 already exists');
    });

    it('should create private room', () => {
      const room = service.createRoom('private-room', 'user-1', {
        name: 'Private Room',
        isPrivate: true,
        maxMembers: 10,
      });

      expect(room.isPrivate).toBe(true);
      expect(room.maxMembers).toBe(10);
    });
  });

  describe('getRoom', () => {
    it('should return room info', () => {
      service.createRoom('room-1', 'user-1', { name: 'Room' });

      const room = service.getRoom('room-1');

      expect(room).toBeDefined();
      expect(room?.id).toBe('room-1');
    });

    it('should return undefined for non-existent room', () => {
      const room = service.getRoom('non-existent');
      expect(room).toBeUndefined();
    });
  });

  describe('roomExists', () => {
    it('should return true for existing room', () => {
      service.createRoom('room-1', 'user-1', { name: 'Room' });
      expect(service.roomExists('room-1')).toBe(true);
    });

    it('should return false for non-existent room', () => {
      expect(service.roomExists('non-existent')).toBe(false);
    });
  });

  describe('joinRoom', () => {
    beforeEach(() => {
      service.createRoom('room-1', 'user-1', { name: 'Room', maxMembers: 3 });
    });

    it('should allow user to join room', () => {
      const member = service.joinRoom('room-1', {
        userId: 'user-2',
        socketId: 'socket-1',
      });

      expect(member.userId).toBe('user-2');
      expect(member.socketId).toBe('socket-1');
      expect(member.role).toBe('member');
    });

    it('should throw error for non-existent room', () => {
      expect(() => {
        service.joinRoom('non-existent', { userId: 'user-2', socketId: 'socket-1' });
      }).toThrow('Room non-existent does not exist');
    });

    it('should throw error when user is banned', () => {
      service.banUser('room-1', 'user-2', 'user-1');

      expect(() => {
        service.joinRoom('room-1', { userId: 'user-2', socketId: 'socket-1' });
      }).toThrow('User is banned from this room');
    });

    it('should throw error when room is full', () => {
      service.joinRoom('room-1', { userId: 'user-2', socketId: 'socket-1' });
      service.joinRoom('room-1', { userId: 'user-3', socketId: 'socket-2' });

      expect(() => {
        service.joinRoom('room-1', { userId: 'user-4', socketId: 'socket-3' });
      }).toThrow('Room is full');
    });

    it('should update socket ID when rejoining', () => {
      service.joinRoom('room-1', { userId: 'user-2', socketId: 'socket-1' });
      const member = service.joinRoom('room-1', { userId: 'user-2', socketId: 'socket-2' });

      expect(member.socketId).toBe('socket-2');
    });
  });

  describe('leaveRoom', () => {
    beforeEach(() => {
      service.createRoom('room-1', 'user-1', { name: 'Room' });
      service.joinRoom('room-1', { userId: 'user-2', socketId: 'socket-1' });
    });

    it('should allow user to leave room', () => {
      const result = service.leaveRoom('room-1', 'user-2');

      expect(result).toBe(true);
      expect(service.isUserInRoom('room-1', 'user-2')).toBe(false);
    });

    it('should return false for non-existent room', () => {
      const result = service.leaveRoom('non-existent', 'user-2');
      expect(result).toBe(false);
    });

    it('should return false when user not in room', () => {
      const result = service.leaveRoom('room-1', 'user-99');
      expect(result).toBe(false);
    });
  });

  describe('getRoomMembers', () => {
    beforeEach(() => {
      service.createRoom('room-1', 'user-1', { name: 'Room' });
    });

    it('should return room members', () => {
      service.joinRoom('room-1', { userId: 'user-2', socketId: 'socket-1' });
      service.joinRoom('room-1', { userId: 'user-3', socketId: 'socket-2' });

      const members = service.getRoomMembers('room-1');

      expect(members).toHaveLength(2);
      expect(members.map((m) => m.userId)).toContain('user-2');
      expect(members.map((m) => m.userId)).toContain('user-3');
    });

    it('should return empty array for non-existent room', () => {
      const members = service.getRoomMembers('non-existent');
      expect(members).toEqual([]);
    });
  });

  describe('kickUser', () => {
    beforeEach(() => {
      service.createRoom('room-1', 'user-1', { name: 'Room' });
      service.joinRoom('room-1', { userId: 'user-1', socketId: 'socket-1', role: 'owner' });
      service.joinRoom('room-1', { userId: 'user-2', socketId: 'socket-2' });
      service.joinRoom('room-1', { userId: 'user-3', socketId: 'socket-3' });
    });

    it('should allow owner to kick member', () => {
      const result = service.kickUser('room-1', 'user-2', 'user-1');

      expect(result).toBe(true);
      expect(service.isUserInRoom('room-1', 'user-2')).toBe(false);
    });

    it('should throw error when member tries to kick', () => {
      service.setUserRole('room-1', 'user-3', 'admin', 'user-1');

      expect(() => {
        service.kickUser('room-1', 'user-2', 'user-2');
      }).toThrow();
    });

    it('should throw error when kicking room creator', () => {
      expect(() => {
        service.kickUser('room-1', 'user-1', 'user-1');
      }).toThrow('Cannot kick room creator');
    });
  });

  describe('banUser', () => {
    beforeEach(() => {
      service.createRoom('room-1', 'user-1', { name: 'Room' });
      service.joinRoom('room-1', { userId: 'user-1', socketId: 'socket-1', role: 'owner' });
      service.joinRoom('room-1', { userId: 'user-2', socketId: 'socket-2' });
    });

    it('should ban user from room', () => {
      const result = service.banUser('room-1', 'user-2', 'user-1');

      expect(result).toBe(true);
      expect(service.isUserBanned('room-1', 'user-2')).toBe(true);
      expect(service.isUserInRoom('room-1', 'user-2')).toBe(false);
    });

    it('should throw error when member tries to ban', () => {
      expect(() => {
        service.banUser('room-1', 'user-2', 'user-2');
      }).toThrow('Insufficient permissions to ban user');
    });

    it('should throw error when banning room creator', () => {
      expect(() => {
        service.banUser('room-1', 'user-1', 'user-1');
      }).toThrow('Cannot ban room creator');
    });
  });

  describe('unbanUser', () => {
    beforeEach(() => {
      service.createRoom('room-1', 'user-1', { name: 'Room' });
      service.joinRoom('room-1', { userId: 'user-1', socketId: 'socket-1', role: 'owner' });
      service.banUser('room-1', 'user-2', 'user-1');
    });

    it('should unban user', () => {
      const result = service.unbanUser('room-1', 'user-2');

      expect(result).toBe(true);
      expect(service.isUserBanned('room-1', 'user-2')).toBe(false);
    });

    it('should return false for non-banned user', () => {
      const result = service.unbanUser('room-1', 'user-3');
      expect(result).toBe(false);
    });
  });

  describe('setUserRole', () => {
    beforeEach(() => {
      service.createRoom('room-1', 'user-1', { name: 'Room' });
      service.joinRoom('room-1', { userId: 'user-1', socketId: 'socket-1', role: 'owner' });
      service.joinRoom('room-1', { userId: 'user-2', socketId: 'socket-2' });
    });

    it('should allow owner to set admin role', () => {
      const result = service.setUserRole('room-1', 'user-2', 'admin', 'user-1');

      expect(result).toBe(true);
      expect(service.getUserRole('room-1', 'user-2')).toBe('admin');
    });

    it('should throw error when admin tries to set admin', () => {
      service.setUserRole('room-1', 'user-2', 'admin', 'user-1');

      expect(() => {
        service.setUserRole('room-1', 'user-2', 'admin', 'user-2');
      }).toThrow('Only room owner can set admin role');
    });

    it('should throw error when changing creator role', () => {
      expect(() => {
        service.setUserRole('room-1', 'user-1', 'member', 'user-1');
      }).toThrow('Cannot change room creator');
    });
  });

  describe('muteUser / unmuteUser', () => {
    beforeEach(() => {
      service.createRoom('room-1', 'user-1', { name: 'Room' });
      service.joinRoom('room-1', { userId: 'user-1', socketId: 'socket-1' });
    });

    it('should mute user', () => {
      service.muteUser('room-1', 'user-1');
      expect(service.isUserMuted('room-1', 'user-1')).toBe(true);
    });

    it('should unmute user', () => {
      service.muteUser('room-1', 'user-1');
      service.unmuteUser('room-1', 'user-1');
      expect(service.isUserMuted('room-1', 'user-1')).toBe(false);
    });
  });

  describe('destroyRoom', () => {
    beforeEach(() => {
      service.createRoom('room-1', 'user-1', { name: 'Room' });
      service.joinRoom('room-1', { userId: 'user-2', socketId: 'socket-1' });
    });

    it('should destroy room', () => {
      const result = service.destroyRoom('room-1');

      expect(result).toBe(true);
      expect(service.roomExists('room-1')).toBe(false);
    });

    it('should return false for non-existent room', () => {
      const result = service.destroyRoom('non-existent');
      expect(result).toBe(false);
    });
  });

  describe('getUserRooms', () => {
    beforeEach(() => {
      service.createRoom('room-1', 'user-1', { name: 'Room 1' });
      service.createRoom('room-2', 'user-1', { name: 'Room 2' });
      service.createRoom('room-3', 'user-2', { name: 'Room 3' });
    });

    it('should return rooms for user', () => {
      service.joinRoom('room-1', { userId: 'user-2', socketId: 'socket-1' });
      service.joinRoom('room-2', { userId: 'user-2', socketId: 'socket-2' });

      const rooms = service.getUserRooms('user-2');

      expect(rooms).toHaveLength(2);
      expect(rooms.map((r) => r.id)).toContain('room-1');
      expect(rooms.map((r) => r.id)).toContain('room-2');
    });

    it('should return empty array when user has no rooms', () => {
      const rooms = service.getUserRooms('user-99');
      expect(rooms).toEqual([]);
    });
  });
});
