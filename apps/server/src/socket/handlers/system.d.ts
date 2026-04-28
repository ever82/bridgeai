/**
 * System Event Handlers
 *
 * Handles admin system monitoring events.
 */
import type { Namespace } from 'socket.io';
import type { AuthenticatedSocket } from '../middleware/auth';
/**
 * Register system event handlers
 */
export declare function registerSystemHandlers(socket: AuthenticatedSocket, nsp: Namespace): void;
declare const _default: {
    registerSystemHandlers: typeof registerSystemHandlers;
};
export default _default;
//# sourceMappingURL=system.d.ts.map