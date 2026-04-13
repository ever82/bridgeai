/**
 * Room Authentication Middleware
 *
 * Provides room-level access control including:
 * - Room access permissions
 * - Join room validation
 * - Kick functionality
 * - Room blacklist support
 */

import type { Socket } from 'socket.io';
import type { AuthenticatedSocket } from './auth';
import { roomService } from '../../services/roomService';

/**
 * Room access level
 */
export type RoomAccessLevel = 'none' | 'member' | 'admin' | 'owner';

/**
 * Room permission check result
 */
export interface RoomPermissionResult {
  allowed: boolean;
  level: RoomAccessLevel;
  error?: string;
}

/**
 * Room access options
 */
export interface RoomAccessOptions {
  roomId: string;
  requireRole?: 'member' | 'admin' | 'owner';
  allowBanned?: boolean;
  requirePassword?: boolean;
}

/**
 * Middleware to validate room access
 */
export function roomAccessMiddleware(options: RoomAccessOptions) {
  return (socket: AuthenticatedSocket, next: (err?: Error) => void): void => {
    const userId = socket.user?.id;

    // Public rooms allow access without authentication
    if (!userId && !options.allowBanned) {
      // Check if room requires authentication
      const room = roomService.getRoom(options.roomId);
      if (room?.isPrivate) {
        next(new Error('Authentication required for private room'));
        return;
      }
    }

    if (!userId) {
      next();
      return;
    }

    // Check if user is banned
    if (!options.allowBanned && roomService.isUserBanned(options.roomId, userId)) {
      next(new Error('You are banned from this room'));
      return;
    }

    // Check role requirement
    if (options.requireRole) {
      const userRole = roomService.getUserRole(options.roomId, userId);

      if (!userRole) {
        next(new Error('Not a member of this room'));
        return;
      }

      const roleHierarchy: RoomAccessLevel[] = ['member', 'admin', 'owner'];
      const userLevel = roleHierarchy.indexOf(userRole);
      const requiredLevel = roleHierarchy.indexOf(options.requireRole);

      if (userLevel < requiredLevel) {
        next(new Error(`Requires ${options.requireRole} permissions`));
        return;
      }
    }

    next();
  };
}

/**
 * Check room access permissions
 */
export function checkRoomAccess(
  socket: AuthenticatedSocket,
  roomId: string,
  requireRole?: 'member' | 'admin' | 'owner',
  allowBanned: boolean = false
): RoomPermissionResult {
  const userId = socket.user?.id;

  if (!userId) {
    // Check if room is public
    const room = roomService.getRoom(roomId);
    if (!room) {
      return { allowed: false, level: 'none', error: 'Room not found' };
    }

    if (room.isPrivate) {
      return { allowed: false, level: 'none', error: 'Authentication required' };
    }

    return { allowed: true, level: 'none' };
  }

  // Check if room exists
  if (!roomService.roomExists(roomId)) {
    return { allowed: false, level: 'none', error: 'Room not found' };
  }

  // Check banned
  if (!allowBanned && roomService.isUserBanned(roomId, userId)) {
    return { allowed: false, level: 'none', error: 'You are banned from this room' };
  }

  // Get user role
  const userRole = roomService.getUserRole(roomId, userId);

  if (!userRole) {
    // Not a member
    if (requireRole) {
      return { allowed: false, level: 'none', error: 'Not a member of this room' };
    }
    return { allowed: true, level: 'none' };
  }

  // Check role requirement
  if (requireRole) {
    const roleHierarchy: RoomAccessLevel[] = ['member', 'admin', 'owner'];
    const userLevel = roleHierarchy.indexOf(userRole);
    const requiredLevel = roleHierarchy.indexOf(requireRole);

    if (userLevel < requiredLevel) {
      return {
        allowed: false,
        level: userRole,
        error: `Requires ${requireRole} permissions`,
      };
    }
  }

  return { allowed: true, level: userRole };
}

/**
 * Validate room join request
 */
export function validateRoomJoin(
  socket: AuthenticatedSocket,
  roomId: string,
  password?: string
): { valid: boolean; error?: string } {
  const userId = socket.user?.id;

  // Check authentication
  if (!userId) {
    return { valid: false, error: 'Authentication required' };
  }

  // Check if room exists
  if (!roomService.roomExists(roomId)) {
    return { valid: false, error: 'Room does not exist' };
  }

  // Check if already in room
  if (roomService.isUserInRoom(roomId, userId)) {
    return { valid: false, error: 'Already in room' };
  }

  // Check banned
  if (roomService.isUserBanned(roomId, userId)) {
    return { valid: false, error: 'You are banned from this room' };
  }

  // Check room capacity
  const room = roomService.getRoom(roomId);
  if (room) {
    const memberCount = roomService.getRoomMemberCount(roomId);
    if (memberCount >= room.maxMembers) {
      return { valid: false, error: 'Room is full' };
    }

    // Check private room password
    if (room.isPrivate && !password) {
      return { valid: false, error: 'Password required for private room' };
    }
  }

  return { valid: true };
}

/**
 * Validate room creation
 */
export function validateRoomCreate(
  socket: AuthenticatedSocket,
  roomId: string
): { valid: boolean; error?: string } {
  const userId = socket.user?.id;

  if (!userId) {
    return { valid: false, error: 'Authentication required' };
  }

  // Check room ID format
  if (!roomId || roomId.length < 3) {
    return { valid: false, error: 'Room ID must be at least 3 characters' };
  }

  // Check if room already exists
  if (roomService.roomExists(roomId)) {
    return { valid: false, error: 'Room already exists' };
  }

  return { valid: true };
}

/**
 * Middleware to require room membership
 */
export function requireRoomMember(socket: AuthenticatedSocket, next: (err?: Error) => void): void {
  // This is a dynamic middleware - room ID needs to be in the event data
  // Use checkRoomAccess in the event handler instead
  next();
}

/**
 * Middleware to require room admin
 */
export function requireRoomAdmin(roomId: string) {
  return (socket: AuthenticatedSocket, next: (err?: Error) => void): void => {
    const userId = socket.user?.id;

    if (!userId) {
      next(new Error('Authentication required'));
      return;
    }

    const userRole = roomService.getUserRole(roomId, userId);

    if (!userRole || (userRole !== 'admin' && userRole !== 'owner')) {
      next(new Error('Admin permissions required'));
      return;
    }

    next();
  };
}

/**
 * Middleware to require room owner
 */
export function requireRoomOwner(roomId: string) {
  return (socket: AuthenticatedSocket, next: (err?: Error) => void): void => {
    const userId = socket.user?.id;

    if (!userId) {
      next(new Error('Authentication required'));
      return;
    }

    const userRole = roomService.getUserRole(roomId, userId);

    if (userRole !== 'owner') {
      next(new Error('Room owner permissions required'));
      return;
    }

    next();
  };
}

/**
 * Check if user can kick another user
 */
export function canKickUser(
  roomId: string,
  kickerId: string,
  targetId: string
): { canKick: boolean; error?: string } {
  const kickerRole = roomService.getUserRole(roomId, kickerId);
  const targetRole = roomService.getUserRole(roomId, targetId);
  const room = roomService.getRoom(roomId);

  if (!kickerRole) {
    return { canKick: false, error: 'Not a member of this room' };
  }

  if (!targetRole) {
    return { canKick: false, error: 'Target user is not in this room' };
  }

  // Cannot kick the room creator
  if (targetId === room?.createdBy) {
    return { canKick: false, error: 'Cannot kick room creator' };
  }

  // Owner can kick anyone
  if (kickerRole === 'owner') {
    return { canKick: true };
  }

  // Admin can kick members only
  if (kickerRole === 'admin' && targetRole === 'member') {
    return { canKick: true };
  }

  return { canKick: false, error: 'Insufficient permissions to kick user' };
}

/**
 * Check if user can ban another user
 */
export function canBanUser(
  roomId: string,
  bannerId: string,
  targetId: string
): { canBan: boolean; error?: string } {
  const bannerRole = roomService.getUserRole(roomId, bannerId);
  const room = roomService.getRoom(roomId);

  if (!bannerRole || bannerRole === 'member') {
    return { canBan: false, error: 'Admin permissions required' };
  }

  // Cannot ban the room creator
  if (targetId === room?.createdBy) {
    return { canBan: false, error: 'Cannot ban room creator' };
  }

  return { canBan: true };
}

/**
 * Get room blacklist
 */
export function getRoomBlacklist(roomId: string): string[] {
  const room = roomService.getRoom(roomId);
  if (!room) {
    return [];
  }

  // Get banned users from room service
  const bannedUsers: string[] = [];
  // This would require exposing banned users from roomService
  // For now, return empty array
  return bannedUsers;
}

/**
 * Check if user is in room blacklist
 */
export function isUserBlacklisted(roomId: string, userId: string): boolean {
  return roomService.isUserBanned(roomId, userId);
}

export default {
  roomAccessMiddleware,
  checkRoomAccess,
  validateRoomJoin,
  validateRoomCreate,
  requireRoomMember,
  requireRoomAdmin,
  requireRoomOwner,
  canKickUser,
  canBanUser,
  getRoomBlacklist,
  isUserBlacklisted,
};
