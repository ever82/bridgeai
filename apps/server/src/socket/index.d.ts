/**
 * Socket.io Server
 *
 * Main Socket.io server configuration and initialization.
 */
import { Server as HttpServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import type { Application } from 'express';
/**
 * Initialize Socket.io server
 */
export declare function initializeSocketServer(httpServer: HttpServer, _app: Application): Promise<SocketServer>;
/**
 * Get Socket.io instance
 */
export declare function getSocketServer(): SocketServer | null;
/**
 * Get IO instance for emitting events
 */
export declare function getIO(): SocketServer;
/**
 * Emit event to specific user
 */
export declare function emitToUser(userId: string, event: string, data: any): void;
/**
 * Emit event to specific room
 */
export declare function emitToRoom(roomId: string, event: string, data: any, namespace?: string): void;
/**
 * Broadcast event to all connected clients
 */
export declare function broadcast(event: string, data: any, namespace?: string): void;
/**
 * Close Socket.io server
 */
export declare function closeSocketServer(): Promise<void>;
declare const _default: {
    initializeSocketServer: typeof initializeSocketServer;
    getSocketServer: typeof getSocketServer;
    getIO: typeof getIO;
    emitToUser: typeof emitToUser;
    emitToRoom: typeof emitToRoom;
    broadcast: typeof broadcast;
    closeSocketServer: typeof closeSocketServer;
};
export default _default;
//# sourceMappingURL=index.d.ts.map