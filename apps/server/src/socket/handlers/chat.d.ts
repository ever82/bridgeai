/**
 * Chat Event Handlers
 *
 * Handles chat-related socket events with message persistence.
 */
import type { Namespace } from 'socket.io';
import type { AuthenticatedSocket } from '../middleware/auth';
/**
 * Register chat event handlers
 */
export declare function registerChatHandlers(socket: AuthenticatedSocket, nsp: Namespace): void;
declare const _default: {
    registerChatHandlers: typeof registerChatHandlers;
};
export default _default;
//# sourceMappingURL=chat.d.ts.map