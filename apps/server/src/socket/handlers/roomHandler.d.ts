/**
 * Room Event Handlers
 *
 * Handles room-related socket events including join/leave/broadcast operations.
 * Provides room management functionality with authentication and security.
 */
import type { Namespace } from 'socket.io';
import type { AuthenticatedSocket } from '../middleware/auth';
/**
 * Register room event handlers
 */
export declare function registerRoomHandlers(socket: AuthenticatedSocket, nsp: Namespace): void;
declare const _default: {
    registerRoomHandlers: typeof registerRoomHandlers;
};
export default _default;
//# sourceMappingURL=roomHandler.d.ts.map