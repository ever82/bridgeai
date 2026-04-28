/**
 * Match Subscription Socket Handlers
 *
 * Bridges Socket.IO clients into the QuerySubscriptionManager event stream.
 * Clients can subscribe to FilterDSL queries and receive incremental updates,
 * heartbeats, and lifecycle events for their own subscriptions only.
 */
import { Server as SocketServer, Socket } from 'socket.io';
/**
 * Register match subscription handlers on a connected socket.
 *
 * The socket-level event listener is removed on disconnect to avoid leaking
 * EventEmitter listeners on the long-lived QuerySubscriptionManager.
 */
export declare function registerMatchSubscriptionHandlers(socket: Socket, _nsp: SocketServer): void;
//# sourceMappingURL=matchSubscriptionHandler.d.ts.map