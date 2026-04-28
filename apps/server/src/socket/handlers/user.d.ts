/**
 * User Event Handlers
 *
 * Handles user-related socket events.
 */
import type { Namespace } from 'socket.io';
import type { AuthenticatedSocket } from '../middleware/auth';
/**
 * Register user event handlers
 */
export declare function registerUserHandlers(socket: AuthenticatedSocket, _nsp: Namespace): void;
declare const _default: {
    registerUserHandlers: typeof registerUserHandlers;
};
export default _default;
//# sourceMappingURL=user.d.ts.map