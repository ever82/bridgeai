/**
 * Room Event Handlers
 *
 * Handles room-related socket events including join/leave/broadcast operations.
 * Provides room management functionality with authentication and security.
 */

import type { Namespace } from 'socket.io';

import type { AuthenticatedSocket } from '../middleware/auth';
import { roomService, CreateRoomOptions } from '../../services/roomService';
import { connectionService } from '../../services/connectionService';
import { presenceService } from '../../services/presenceService';

/**
 * Room broadcast data
 */
interface BroadcastData {
  roomId: string;
  event: string;
  payload: any;
  excludeSelf?: boolean;
}

/**
 * Multi-room broadcast data
 */
interface MultiRoomBroadcastData {
  roomIds: string[];
  event: string;
  payload: any;
}

/**
 * Register room event handlers
 */
export function registerRoomHandlers(socket: AuthenticatedSocket, nsp: Namespace): void {
  const userId = socket.user?.id;

  // Create room
  socket.on('room:create', (data: { roomId: string; options: CreateRoomOptions }, callback) => {
    try {
      if (!userId) {
        callback?.({ success: false, error: 'Authentication required' });
        return;
      }

      const { roomId, options } = data;

      // Create the room
      const room = roomService.createRoom(roomId, userId, options);

      // Join the room as owner
      roomService.joinRoom(roomId, {
        userId,
        socketId: socket.id,
        role: 'owner',
        deviceInfo: socket.handshake.query as Record<string, any>,
      });

      // Join socket.io room
      socket.join(roomId);

      // Track in connection service
      connectionService.addConnectionRoom(socket.id, roomId);

      callback?.({
        success: true,
        data: { room },
      });
    } catch (error) {
      callback?.({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create room',
      });
    }
  });

  // Join room
  socket.on('room:join', (data: { roomId: string; password?: string }, callback) => {
    try {
      if (!userId) {
        callback?.({ success: false, error: 'Authentication required' });
        return;
      }

      const { roomId, password } = data;

      // Check if room exists
      if (!roomService.roomExists(roomId)) {
        callback?.({ success: false, error: 'Room does not exist' });
        return;
      }

      // Check if already in room
      if (roomService.isUserInRoom(roomId, userId)) {
        callback?.({ success: false, error: 'Already in room' });
        return;
      }

      // Check if user is banned
      if (roomService.isUserBanned(roomId, userId)) {
        callback?.({ success: false, error: 'You are banned from this room' });
        return;
      }

      // Check private room access
      const roomInfo = roomService.getRoom(roomId);
      if (roomInfo?.isPrivate && !password) {
        callback?.({ success: false, error: 'Password required for private room' });
        return;
      }

      // Join room in service
      const member = roomService.joinRoom(roomId, {
        userId,
        socketId: socket.id,
        deviceInfo: socket.handshake.query as Record<string, any>,
      });

      // Join socket.io room
      socket.join(roomId);

      // Track in connection service
      connectionService.addConnectionRoom(socket.id, roomId);

      // Notify others in room
      socket.to(roomId).emit('room:user_joined', {
        roomId,
        userId,
        role: member.role,
        timestamp: new Date().toISOString(),
      });

      // Get room members
      const members = roomService.getRoomMembers(roomId);

      callback?.({
        success: true,
        data: {
          roomId,
          memberCount: members.length,
          members: members.map(m => ({
            userId: m.userId,
            role: m.role,
            joinedAt: m.joinedAt,
          })),
        },
      });
    } catch (error) {
      callback?.({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to join room',
      });
    }
  });

  // Leave room
  socket.on('room:leave', (data: { roomId: string }, callback) => {
    try {
      if (!userId) {
        callback?.({ success: false, error: 'Authentication required' });
        return;
      }

      const { roomId } = data;

      if (!roomService.isUserInRoom(roomId, userId)) {
        callback?.({ success: false, error: 'Not in room' });
        return;
      }

      // Leave room in service
      roomService.leaveRoom(roomId, userId);

      // Leave socket.io room
      socket.leave(roomId);

      // Track in connection service
      connectionService.removeConnectionRoom(socket.id, roomId);

      // Notify others
      socket.to(roomId).emit('room:user_left', {
        roomId,
        userId,
        timestamp: new Date().toISOString(),
      });

      callback?.({ success: true });
    } catch (error) {
      callback?.({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to leave room',
      });
    }
  });

  // Broadcast to room
  socket.on('room:broadcast', (data: BroadcastData, callback) => {
    try {
      if (!userId) {
        callback?.({ success: false, error: 'Authentication required' });
        return;
      }

      const { roomId, event, payload, excludeSelf = false } = data;

      // Verify user is in room
      if (!roomService.isUserInRoom(roomId, userId)) {
        callback?.({ success: false, error: 'Not in room' });
        return;
      }

      // Check if user is muted
      if (roomService.isUserMuted(roomId, userId)) {
        callback?.({ success: false, error: 'You are muted in this room' });
        return;
      }

      // Update activity
      connectionService.updateActivity(socket.id);
      presenceService.updateActivity(userId);

      const messagePayload = {
        ...payload,
        senderId: userId,
        roomId,
        timestamp: new Date().toISOString(),
      };

      if (excludeSelf) {
        // Broadcast to room excluding sender
        socket.to(roomId).emit(event, messagePayload);
      } else {
        // Broadcast to entire room including sender
        nsp.to(roomId).emit(event, messagePayload);
      }

      callback?.({ success: true });
    } catch (error) {
      callback?.({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to broadcast',
      });
    }
  });

  // Broadcast to multiple rooms
  socket.on('room:broadcast_multi', (data: MultiRoomBroadcastData, callback) => {
    try {
      if (!userId) {
        callback?.({ success: false, error: 'Authentication required' });
        return;
      }

      const { roomIds, event, payload } = data;

      // Verify user is in all rooms
      for (const roomId of roomIds) {
        if (!roomService.isUserInRoom(roomId, userId)) {
          callback?.({ success: false, error: `Not in room: ${roomId}` });
          return;
        }
      }

      const messagePayload = {
        ...payload,
        senderId: userId,
        timestamp: new Date().toISOString(),
      };

      // Broadcast to all rooms
      for (const roomId of roomIds) {
        nsp.to(roomId).emit(event, { ...messagePayload, roomId });
      }

      callback?.({ success: true, data: { rooms: roomIds } });
    } catch (error) {
      callback?.({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to broadcast',
      });
    }
  });

  // Get room info
  socket.on('room:info', (data: { roomId: string }, callback) => {
    try {
      const { roomId } = data;
      const room = roomService.getRoom(roomId);

      if (!room) {
        callback?.({ success: false, error: 'Room not found' });
        return;
      }

      const members = roomService.getRoomMembers(roomId);
      const stats = roomService.getRoomStats(roomId);

      callback?.({
        success: true,
        data: {
          room,
          members: members.map(m => ({
            userId: m.userId,
            role: m.role,
            joinedAt: m.joinedAt,
          })),
          stats,
        },
      });
    } catch (error) {
      callback?.({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get room info',
      });
    }
  });

  // Get room members
  socket.on('room:members', (data: { roomId: string }, callback) => {
    try {
      const { roomId } = data;

      if (!roomService.roomExists(roomId)) {
        callback?.({ success: false, error: 'Room not found' });
        return;
      }

      const members = roomService.getRoomMembers(roomId);
      const presenceData = members.map(m => ({
        ...m,
        presence: presenceService.getPresence(m.userId),
      }));

      callback?.({
        success: true,
        data: {
          members: presenceData,
          count: members.length,
        },
      });
    } catch (error) {
      callback?.({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get members',
      });
    }
  });

  // Get my rooms
  socket.on('room:my_rooms', callback => {
    try {
      if (!userId) {
        callback?.({ success: false, error: 'Authentication required' });
        return;
      }

      const rooms = roomService.getUserRooms(userId);

      callback?.({
        success: true,
        data: { rooms },
      });
    } catch (error) {
      callback?.({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get rooms',
      });
    }
  });

  // Kick user from room (admin/owner only)
  socket.on('room:kick', (data: { roomId: string; targetUserId: string }, callback) => {
    try {
      if (!userId) {
        callback?.({ success: false, error: 'Authentication required' });
        return;
      }

      const { roomId, targetUserId } = data;

      // Kick user
      roomService.kickUser(roomId, targetUserId, userId);

      // Notify the kicked user via their personal room
      nsp.to(`user:${targetUserId}`).emit('room:kicked', {
        roomId,
        kickedBy: userId,
        timestamp: new Date().toISOString(),
      });

      // Notify room
      nsp.to(roomId).emit('room:user_kicked', {
        roomId,
        userId: targetUserId,
        kickedBy: userId,
        timestamp: new Date().toISOString(),
      });

      callback?.({ success: true });
    } catch (error) {
      callback?.({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to kick user',
      });
    }
  });

  // Ban user from room (admin/owner only)
  socket.on('room:ban', (data: { roomId: string; targetUserId: string }, callback) => {
    try {
      if (!userId) {
        callback?.({ success: false, error: 'Authentication required' });
        return;
      }

      const { roomId, targetUserId } = data;

      // Ban user
      roomService.banUser(roomId, targetUserId, userId);

      // Notify the banned user
      nsp.to(`user:${targetUserId}`).emit('room:banned', {
        roomId,
        bannedBy: userId,
        timestamp: new Date().toISOString(),
      });

      // Notify room
      nsp.to(roomId).emit('room:user_banned', {
        roomId,
        userId: targetUserId,
        bannedBy: userId,
        timestamp: new Date().toISOString(),
      });

      callback?.({ success: true });
    } catch (error) {
      callback?.({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to ban user',
      });
    }
  });

  // Unban user from room (admin/owner only)
  socket.on('room:unban', (data: { roomId: string; targetUserId: string }, callback) => {
    try {
      if (!userId) {
        callback?.({ success: false, error: 'Authentication required' });
        return;
      }

      const { roomId, targetUserId } = data;

      roomService.unbanUser(roomId, targetUserId);

      callback?.({ success: true });
    } catch (error) {
      callback?.({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to unban user',
      });
    }
  });

  // Set user role (admin/owner only)
  socket.on(
    'room:set_role',
    (data: { roomId: string; targetUserId: string; role: 'admin' | 'member' }, callback) => {
      try {
        if (!userId) {
          callback?.({ success: false, error: 'Authentication required' });
          return;
        }

        const { roomId, targetUserId, role } = data;

        roomService.setUserRole(roomId, targetUserId, role, userId);

        // Notify user
        nsp.to(`user:${targetUserId}`).emit('room:role_changed', {
          roomId,
          role,
          setBy: userId,
          timestamp: new Date().toISOString(),
        });

        // Notify room
        nsp.to(roomId).emit('room:user_role_changed', {
          roomId,
          userId: targetUserId,
          role,
          setBy: userId,
          timestamp: new Date().toISOString(),
        });

        callback?.({ success: true });
      } catch (error) {
        callback?.({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to set role',
        });
      }
    }
  );

  // Handle disconnection - cleanup rooms
  socket.on('disconnect', () => {
    if (userId) {
      // Get user's rooms
      const rooms = roomService.getUserRooms(userId);

      // Leave all rooms
      for (const room of rooms) {
        roomService.leaveRoom(room.id, userId);

        // Notify others
        socket.to(room.id).emit('room:user_left', {
          roomId: room.id,
          userId,
          timestamp: new Date().toISOString(),
          reason: 'disconnected',
        });
      }
    }
  });
}

export default { registerRoomHandlers };
