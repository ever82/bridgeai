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
export declare class RoomService {
    private rooms;
    private userRooms;
    private destructionTimers;
    /**
     * Create a new room
     */
    createRoom(roomId: string, createdBy: string, options: CreateRoomOptions): Promise<RoomInfo>;
    /**
     * Get room information
     */
    getRoom(roomId: string): RoomInfo | undefined;
    /**
     * Check if room exists
     */
    roomExists(roomId: string): boolean;
    /**
     * Join a room
     */
    joinRoom(roomId: string, options: JoinRoomOptions): RoomMember;
    /**
     * Leave a room
     */
    leaveRoom(roomId: string, userId: string): boolean;
    /**
     * Get room members
     */
    getRoomMembers(roomId: string): RoomMember[];
    /**
     * Get room member count
     */
    getRoomMemberCount(roomId: string): number;
    /**
     * Check if user is in room
     */
    isUserInRoom(roomId: string, userId: string): boolean;
    /**
     * Get user's role in room
     */
    getUserRole(roomId: string, userId: string): RoomMember['role'] | undefined;
    /**
     * Get rooms for a user
     */
    getUserRooms(userId: string): RoomInfo[];
    /**
     * Get all active rooms
     */
    getAllRooms(): RoomInfo[];
    /**
     * Update room info
     */
    updateRoom(roomId: string, updates: Partial<Omit<RoomInfo, 'id' | 'createdBy' | 'createdAt'>>): RoomInfo | undefined;
    /**
     * Destroy a room
     */
    destroyRoom(roomId: string, destroyedBy?: string): boolean;
    /**
     * Kick a user from a room
     */
    kickUser(roomId: string, userId: string, kickedBy: string): boolean;
    /**
     * Ban a user from a room
     */
    banUser(roomId: string, userId: string, bannedBy: string): boolean;
    /**
     * Unban a user from a room
     */
    unbanUser(roomId: string, userId: string, calledBy?: string): boolean;
    /**
     * Check if user is banned
     */
    isUserBanned(roomId: string, userId: string): boolean;
    /**
     * Validate room password for private rooms
     */
    validateRoomPassword(roomId: string, password?: string): Promise<boolean>;
    /**
     * Mute a user in a room
     */
    muteUser(roomId: string, userId: string, mutedBy?: string): boolean;
    /**
     * Unmute a user in a room
     */
    unmuteUser(roomId: string, userId: string): boolean;
    /**
     * Check if user is muted
     */
    isUserMuted(roomId: string, userId: string): boolean;
    /**
     * Set user role in room
     */
    setUserRole(roomId: string, userId: string, role: RoomMember['role'], setBy: string): boolean;
    /**
     * Get room statistics
     */
    getRoomStats(roomId: string): {
        memberCount: number;
        onlineCount: number;
        bannedCount: number;
    } | undefined;
    /**
     * Check if a room is persistent (should not be auto-destroyed)
     */
    private isPersistentRoom;
    /**
     * Schedule room destruction after a delay
     */
    private scheduleRoomDestruction;
    /**
     * Cancel a pending room destruction timer
     */
    private cancelRoomDestruction;
    /**
     * Clean up all rooms (for testing/shutdown)
     */
    clearAllRooms(): void;
}
export declare const roomService: RoomService;
export default roomService;
//# sourceMappingURL=roomService.d.ts.map