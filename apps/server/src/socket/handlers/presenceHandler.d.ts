/**
 * Presence Socket Event Handlers
 *
 * Handles user online/offline presence tracking and broadcasting.
 * Uses PresenceService as the single source of truth for presence state.
 */
import type { Namespace, Socket } from 'socket.io';
import { type PresenceStatus } from '../../services/presenceService';
/**
 * Register presence event handlers
 */
export declare function registerPresenceHandlers(socket: Socket, nsp: Namespace): void;
/**
 * Get presence state for a user (delegates to PresenceService)
 */
export declare function getPresenceState(userId: string): {
    userId: string;
    status: PresenceStatus;
    lastSeen: Date;
    customMessage: string;
};
declare const _default: {
    registerPresenceHandlers: typeof registerPresenceHandlers;
    getPresenceState: typeof getPresenceState;
};
export default _default;
//# sourceMappingURL=presenceHandler.d.ts.map