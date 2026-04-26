/**
 * Room Service (In-Memory / Real-Time)
 *
 * Manages ephemeral room lifecycle for real-time socket communication.
 * This service handles transient, in-memory room state for WebSocket-based
 * interactions (join/leave, broadcast, kick/ban, etc.).
 *
 * NOTE: This is separate from `services/chat/roomService.ts` which manages
 * persistent ChatRoom records in the database via Prisma. The in-memory
 * RoomService handles live socket presence and ephemeral rooms, while the
 * chat/roomService handles long-lived room persistence, metadata, and
 * participant records.
 *
 * Relationship:
 * - Socket handlers (roomHandler) use THIS service for real-time operations
 * - REST routes use chat/roomService for persistent room CRUD
 * - A room may exist in both systems: DB record (persistent) + in-memory (live)
 */

import bcrypt from 'bcrypt';

import { presenceService } from './presenceService';

const SALT_ROUNDS = 12;

/**
 * Hash a password using bcrypt
 */
async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Compare a password against a stored hash
 */
async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Room member information
 */
export interface RoomMember {
  userId: string;
  socketId: string;
  joinedAt: Date;
  role: 'owner' | 'admin' | 'member';
  deviceInfo?: Record<string, any>;
}

/**
 * Room information
 */
export interface RoomInfo {
  id: string;
  name: string;
  description?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  isPrivate: boolean;
  passwordHash?: string;
  maxMembers: number;
  metadata?: Record<string, any>;
}

/**
 * Room data structure
 */
interface RoomData {
  info: RoomInfo;
  members: Map<string, RoomMember>; // key: userId
  bannedUsers: Set<string>;
  mutedUsers: Set<string>;
}

/**
 * Room creation options
 */
export interface CreateRoomOptions {
  name: string;
  description?: string;
  isPrivate?: boolean;
  password?: string;
  maxMembers?: number;
  metadata?: Record<string, any>;
}

/**
 * Room join options
 */
export interface JoinRoomOptions {
  userId: string;
  socketId: string;
  role?: 'owner' | 'admin' | 'member';
  deviceInfo?: Record<string, any>;
}

/**
 * Room Service class
 */
/**
 * Sanitize room ID/name to prevent XSS and injection
 */
// eslint-disable-next-line no-control-regex
const CONTROL_CHAR_REGEX = /[\x00-\x1f\x7f]/g;
function sanitizeRoomInput(input: string): string {
  return input
    .replace(CONTROL_CHAR_REGEX, '') // Remove control characters (including null bytes)
    .replace(/\.\./g, '') // Remove path traversal sequences
    .replace(/[<>'"&]/g, '') // Remove HTML/XML special characters
    .trim();
}

export class RoomService {
  private rooms: Map<string, RoomData> = new Map();
  private userRooms: Map<string, Set<string>> = new Map(); // userId -> Set of roomIds

  /**
   * Create a new room
   */
  async createRoom(
    roomId: string,
    createdBy: string,
    options: CreateRoomOptions
  ): Promise<RoomInfo> {
    // Sanitize inputs
    roomId = sanitizeRoomInput(roomId);
    options.name = sanitizeRoomInput(options.name);

    // Validate roomId length
    if (roomId.length < 3) {
      throw new Error('roomId must be at least 3 characters');
    }
    if (roomId.length > 200) {
      throw new Error('roomId must not exceed 200 characters');
    }

    // Validate maxMembers
    if (options.maxMembers !== undefined && options.maxMembers < 1) {
      throw new Error('maxMembers must be at least 1');
    }

    // Check if room already exists
    if (this.rooms.has(roomId)) {
      throw new Error(`Room ${roomId} already exists`);
    }

    const now = new Date();
    const passwordHash =
      options.isPrivate && options.password ? await hashPassword(options.password) : undefined;
    const roomInfo: RoomInfo = {
      id: roomId,
      name: options.name,
      description: options.description,
      createdBy,
      createdAt: now,
      updatedAt: now,
      isPrivate: options.isPrivate ?? false,
      passwordHash,
      maxMembers: options.maxMembers ?? 100,
      metadata: options.metadata,
    };

    const roomData: RoomData = {
      info: roomInfo,
      members: new Map(),
      bannedUsers: new Set(),
      mutedUsers: new Set(),
    };

    this.rooms.set(roomId, roomData);

    console.log(`[RoomService] Created room: ${roomId} by user: ${createdBy}`);
    return roomInfo;
  }

  /**
   * Get room information
   */
  getRoom(roomId: string): RoomInfo | undefined {
    const room = this.rooms.get(roomId);
    return room?.info;
  }

  /**
   * Check if room exists
   */
  roomExists(roomId: string): boolean {
    return this.rooms.has(roomId);
  }

  /**
   * Join a room
   */
  joinRoom(roomId: string, options: JoinRoomOptions): RoomMember {
    const room = this.rooms.get(roomId);
    if (!room) {
      throw new Error(`Room ${roomId} does not exist`);
    }

    const { userId, socketId, role = 'member', deviceInfo } = options;

    // Check if user is banned
    if (room.bannedUsers.has(userId)) {
      throw new Error('User is banned from this room');
    }

    // Check if user is already in room (allow existing member to reconnect even when full)
    const existingMember = room.members.get(userId);
    if (existingMember) {
      // Update socket ID if rejoining with different connection
      existingMember.socketId = socketId;
      existingMember.deviceInfo = deviceInfo;
      return existingMember;
    }

    // Check room capacity for new members
    if (room.members.size >= room.info.maxMembers) {
      throw new Error('Room is full');
    }

    const member: RoomMember = {
      userId,
      socketId,
      joinedAt: new Date(),
      role,
      deviceInfo,
    };

    room.members.set(userId, member);

    // Track user's room membership
    if (!this.userRooms.has(userId)) {
      this.userRooms.set(userId, new Set());
    }
    this.userRooms.get(userId)!.add(roomId);

    // Update room timestamp
    room.info.updatedAt = new Date();

    console.log(`[RoomService] User ${userId} joined room: ${roomId}`);
    return member;
  }

  /**
   * Leave a room
   */
  leaveRoom(roomId: string, userId: string): boolean {
    const room = this.rooms.get(roomId);
    if (!room) {
      return false;
    }

    const member = room.members.get(userId);
    if (!member) {
      return false;
    }

    room.members.delete(userId);

    // Update user's room membership
    const userRoomSet = this.userRooms.get(userId);
    if (userRoomSet) {
      userRoomSet.delete(roomId);
      if (userRoomSet.size === 0) {
        this.userRooms.delete(userId);
      }
    }

    // Update room timestamp
    room.info.updatedAt = new Date();

    console.log(`[RoomService] User ${userId} left room: ${roomId}`);

    // Auto-destroy empty rooms after a delay (except for persistent rooms)
    if (room.members.size === 0 && !this.isPersistentRoom(roomId)) {
      this.scheduleRoomDestruction(roomId);
    }

    return true;
  }

  /**
   * Get room members
   */
  getRoomMembers(roomId: string): RoomMember[] {
    const room = this.rooms.get(roomId);
    if (!room) {
      return [];
    }
    return Array.from(room.members.values());
  }

  /**
   * Get room member count
   */
  getRoomMemberCount(roomId: string): number {
    const room = this.rooms.get(roomId);
    return room?.members.size ?? 0;
  }

  /**
   * Check if user is in room
   */
  isUserInRoom(roomId: string, userId: string): boolean {
    const room = this.rooms.get(roomId);
    return room?.members.has(userId) ?? false;
  }

  /**
   * Get user's role in room
   */
  getUserRole(roomId: string, userId: string): RoomMember['role'] | undefined {
    const room = this.rooms.get(roomId);
    return room?.members.get(userId)?.role;
  }

  /**
   * Get rooms for a user
   */
  getUserRooms(userId: string): RoomInfo[] {
    const roomIds = this.userRooms.get(userId);
    if (!roomIds) {
      return [];
    }
    return Array.from(roomIds)
      .map(id => this.rooms.get(id)?.info)
      .filter(Boolean) as RoomInfo[];
  }

  /**
   * Get all active rooms
   */
  getAllRooms(): RoomInfo[] {
    return Array.from(this.rooms.values()).map(room => room.info);
  }

  /**
   * Update room info
   */
  updateRoom(
    roomId: string,
    updates: Partial<Omit<RoomInfo, 'id' | 'createdBy' | 'createdAt'>>
  ): RoomInfo | undefined {
    const room = this.rooms.get(roomId);
    if (!room) {
      return undefined;
    }

    Object.assign(room.info, updates, { updatedAt: new Date() });
    return room.info;
  }

  /**
   * Destroy a room
   */
  destroyRoom(roomId: string, destroyedBy?: string): boolean {
    const room = this.rooms.get(roomId);
    if (!room) {
      return false;
    }

    // Permission check: only owner/admin can destroy room
    if (destroyedBy) {
      const callerRole = room.members.get(destroyedBy)?.role;
      if (!callerRole || callerRole === 'member') {
        throw new Error('Insufficient permissions to destroy room');
      }
    }

    // Remove room from all users' room lists
    for (const userId of room.members.keys()) {
      const userRoomSet = this.userRooms.get(userId);
      if (userRoomSet) {
        userRoomSet.delete(roomId);
        if (userRoomSet.size === 0) {
          this.userRooms.delete(userId);
        }
      }
    }

    this.rooms.delete(roomId);
    console.log(`[RoomService] Destroyed room: ${roomId}`);
    return true;
  }

  /**
   * Kick a user from a room
   */
  kickUser(roomId: string, userId: string, kickedBy: string): boolean {
    const room = this.rooms.get(roomId);
    if (!room) {
      return false;
    }

    // Check if kicker has permission
    const kickerRole = room.members.get(kickedBy)?.role;
    const targetRole = room.members.get(userId)?.role;

    if (!kickerRole || !targetRole) {
      return false;
    }

    // Owner can kick anyone, admin can kick members
    if (kickerRole === 'member' || (kickerRole === 'admin' && targetRole !== 'member')) {
      throw new Error('Insufficient permissions to kick user');
    }

    // Cannot kick the creator
    if (userId === room.info.createdBy) {
      throw new Error('Cannot kick room creator');
    }

    this.leaveRoom(roomId, userId);
    console.log(`[RoomService] User ${userId} kicked from room ${roomId} by ${kickedBy}`);
    return true;
  }

  /**
   * Ban a user from a room
   */
  banUser(roomId: string, userId: string, bannedBy: string): boolean {
    const room = this.rooms.get(roomId);
    if (!room) {
      return false;
    }

    // Check permissions
    const bannerRole = room.members.get(bannedBy)?.role;
    if (!bannerRole || bannerRole === 'member') {
      throw new Error('Insufficient permissions to ban user');
    }

    // Cannot ban the creator
    if (userId === room.info.createdBy) {
      throw new Error('Cannot ban room creator');
    }

    // Admin cannot ban another admin (only owner can)
    const targetRole = room.members.get(userId)?.role;
    if (targetRole === 'admin' && bannerRole !== 'owner') {
      throw new Error('Only room owner can ban an admin');
    }

    // Add to banned list
    room.bannedUsers.add(userId);

    // Remove from room if currently in it
    if (room.members.has(userId)) {
      this.leaveRoom(roomId, userId);
    }

    console.log(`[RoomService] User ${userId} banned from room ${roomId} by ${bannedBy}`);
    return true;
  }

  /**
   * Unban a user from a room
   */
  unbanUser(roomId: string, userId: string, calledBy?: string): boolean {
    const room = this.rooms.get(roomId);
    if (!room) {
      return false;
    }

    // Permission check: only owner/admin can unban
    if (calledBy) {
      const callerRole = room.members.get(calledBy)?.role;
      if (!callerRole || callerRole === 'member') {
        throw new Error('Insufficient permissions to unban user');
      }
    }

    return room.bannedUsers.delete(userId);
  }

  /**
   * Check if user is banned
   */
  isUserBanned(roomId: string, userId: string): boolean {
    const room = this.rooms.get(roomId);
    return room?.bannedUsers.has(userId) ?? false;
  }

  /**
   * Validate room password for private rooms
   */
  async validateRoomPassword(roomId: string, password?: string): Promise<boolean> {
    const room = this.rooms.get(roomId);
    if (!room) return false;
    if (!room.info.isPrivate) return true;
    if (!room.info.passwordHash) return false;
    return verifyPassword(password ?? '', room.info.passwordHash);
  }

  /**
   * Mute a user in a room
   */
  muteUser(roomId: string, userId: string, mutedBy?: string): boolean {
    const room = this.rooms.get(roomId);
    if (!room) {
      return false;
    }

    if (!room.members.has(userId)) {
      return false;
    }

    // Permission check: only owner/admin can mute
    if (mutedBy) {
      const callerRole = room.members.get(mutedBy)?.role;
      if (!callerRole || callerRole === 'member') {
        throw new Error('Insufficient permissions to mute user');
      }
    }

    room.mutedUsers.add(userId);
    return true;
  }

  /**
   * Unmute a user in a room
   */
  unmuteUser(roomId: string, userId: string): boolean {
    const room = this.rooms.get(roomId);
    if (!room) {
      return false;
    }

    return room.mutedUsers.delete(userId);
  }

  /**
   * Check if user is muted
   */
  isUserMuted(roomId: string, userId: string): boolean {
    const room = this.rooms.get(roomId);
    return room?.mutedUsers.has(userId) ?? false;
  }

  /**
   * Set user role in room
   */
  setUserRole(roomId: string, userId: string, role: RoomMember['role'], setBy: string): boolean {
    const room = this.rooms.get(roomId);
    if (!room) {
      return false;
    }

    const member = room.members.get(userId);
    if (!member) {
      return false;
    }

    // Check if setter has permission
    const setterRole = room.members.get(setBy)?.role;
    if (!setterRole) {
      return false;
    }

    // Only owner can set admin, owner/admin can set member
    if (role === 'admin' && setterRole !== 'owner') {
      throw new Error('Only room owner can set admin role');
    }

    // Only the room owner can set another owner (single-owner model)
    if (role === 'owner') {
      throw new Error('Cannot set owner role; room owner role cannot be transferred');
    }

    // Cannot change creator's role
    if (userId === room.info.createdBy && role !== 'owner') {
      throw new Error("Cannot change room creator's role");
    }

    member.role = role;
    return true;
  }

  /**
   * Get room statistics
   */
  getRoomStats(
    roomId: string
  ): { memberCount: number; onlineCount: number; bannedCount: number } | undefined {
    const room = this.rooms.get(roomId);
    if (!room) {
      return undefined;
    }

    const members = Array.from(room.members.values());
    const onlineCount = members.filter(m => presenceService.isUserOnline(m.userId)).length;

    return {
      memberCount: members.length,
      onlineCount,
      bannedCount: room.bannedUsers.size,
    };
  }

  /**
   * Check if a room is persistent (should not be auto-destroyed)
   */
  private isPersistentRoom(roomId: string): boolean {
    // System rooms are persistent
    return roomId.startsWith('system:') || roomId.startsWith('user:');
  }

  /**
   * Schedule room destruction after a delay
   */
  private scheduleRoomDestruction(roomId: string): void {
    // Destroy empty rooms after 5 minutes
    setTimeout(
      () => {
        const room = this.rooms.get(roomId);
        if (room && room.members.size === 0) {
          this.destroyRoom(roomId);
        }
      },
      5 * 60 * 1000
    );
  }

  /**
   * Clean up all rooms (for testing/shutdown)
   */
  clearAllRooms(): void {
    this.rooms.clear();
    this.userRooms.clear();
    console.log('[RoomService] All rooms cleared');
  }
}

// Export singleton instance
export const roomService = new RoomService();
export default roomService;
