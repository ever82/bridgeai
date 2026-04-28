/**
 * Group Event Handlers
 *
 * Handles group chat-related socket events including
 * group state synchronization, member management, and settings.
 */
import type { Namespace } from 'socket.io';
import type { AuthenticatedSocket } from '../middleware/auth';
/**
 * Register group event handlers
 */
export declare function registerGroupHandlers(socket: AuthenticatedSocket, nsp: Namespace): void;
declare const _default: {
    registerGroupHandlers: typeof registerGroupHandlers;
};
export default _default;
//# sourceMappingURL=groupHandler.d.ts.map