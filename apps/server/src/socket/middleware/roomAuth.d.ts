/**
 * Room Authentication Middleware
 *
 * Provides room-level access control including:
 * - Room access permissions
 * - Join room validation
 * - Kick functionality
 * - Room blacklist support
 */
import type { AuthenticatedSocket } from './auth';
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
export declare function roomAccessMiddleware(options: RoomAccessOptions): (socket: AuthenticatedSocket, next: (err?: Error) => void) => void;
/**
 * Check room access permissions
 */
export declare function checkRoomAccess(socket: AuthenticatedSocket, roomId: string, requireRole?: 'member' | 'admin' | 'owner', allowBanned?: boolean): RoomPermissionResult;
/**
 * Validate room join request
 */
export declare function validateRoomJoin(socket: AuthenticatedSocket, roomId: string, password?: string): Promise<{
    valid: boolean;
    error?: string;
}>;
/**
 * Validate room creation
 */
export declare function validateRoomCreate(socket: AuthenticatedSocket, roomId: string): {
    valid: boolean;
    error?: string;
};
/**
 * Middleware to require room membership
 */
export declare function requireRoomMember(socket: AuthenticatedSocket, next: (err?: Error) => void): void;
/**
 * Middleware to require room admin
 */
export declare function requireRoomAdmin(roomId: string): (socket: AuthenticatedSocket, next: (err?: Error) => void) => void;
/**
 * Middleware to require room owner
 */
export declare function requireRoomOwner(roomId: string): (socket: AuthenticatedSocket, next: (err?: Error) => void) => void;
/**
 * Check if user can kick another user
 */
export declare function canKickUser(roomId: string, kickerId: string, targetId: string): {
    canKick: boolean;
    error?: string;
};
/**
 * Check if user can ban another user
 */
export declare function canBanUser(roomId: string, bannerId: string, targetId: string): {
    canBan: boolean;
    error?: string;
};
/**
 * Get room blacklist
 */
export declare function getRoomBlacklist(roomId: string): string[];
/**
 * Check if user is in room blacklist
 */
export declare function isUserBlacklisted(roomId: string, userId: string): boolean;
declare const _default: {
    roomAccessMiddleware: typeof roomAccessMiddleware;
    checkRoomAccess: typeof checkRoomAccess;
    validateRoomJoin: typeof validateRoomJoin;
    validateRoomCreate: typeof validateRoomCreate;
    requireRoomMember: typeof requireRoomMember;
    requireRoomAdmin: typeof requireRoomAdmin;
    requireRoomOwner: typeof requireRoomOwner;
    canKickUser: typeof canKickUser;
    canBanUser: typeof canBanUser;
    getRoomBlacklist: typeof getRoomBlacklist;
    isUserBlacklisted: typeof isUserBlacklisted;
};
export default _default;
//# sourceMappingURL=roomAuth.d.ts.map