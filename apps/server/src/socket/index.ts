/**
 * Socket.io Server
 *
 * Main Socket.io server configuration and initialization.
 */
import { Server as HttpServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import type { Express } from 'express';
import { createAdapter } from '@socket.io/redis-adapter';
import { socketAuthMiddleware } from './middleware/auth';
import { connectionManager } from './connectionManager';
import { pubClient, subClient } from './adapter';

// Event handlers
import { registerUserHandlers } from './handlers/user';
import { registerChatHandlers } from './handlers/chat';
import { registerSystemHandlers } from './handlers/system';
import { registerGroupHandlers } from './handlers/groupHandler';

/**
 * Socket.io server instance
 */
let io: SocketServer | null = null;

/**
 * Initialize Socket.io server
 */
export async function initializeSocketServer(
  httpServer: HttpServer,
  app: Express
): Promise<SocketServer> {
  // Create Socket.io server with CORS configuration
  io = new SocketServer(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || '*',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    // Ping configuration for heartbeat
    pingTimeout: 60000, // 60 seconds
    pingInterval: 25000, // 25 seconds
    // Transport configuration
    transports: ['websocket', 'polling'],
    // Connection configuration
    connectTimeout: 45000,
    // Upgrade timeout
    upgradeTimeout: 10000,
    // Maximum HTTP buffer size
    maxHttpBufferSize: 1e6, // 1MB
  });

  // Setup Redis adapter for multi-node support
  if (pubClient && subClient) {
    io.adapter(createAdapter(pubClient, subClient));
    console.log('[Socket.io] Redis adapter configured');
  }

  // Apply authentication middleware
  io.use(socketAuthMiddleware);

  // Setup namespaces
  setupNamespaces(io);

  // Setup connection manager
  connectionManager.initialize(io);

  console.log('[Socket.io] Server initialized');
  return io;
}

/**
 * Setup Socket.io namespaces
 */
function setupNamespaces(io: SocketServer): void {
  // Main namespace
  const mainNsp = io.of('/');
  mainNsp.on('connection', (socket) => {
    handleConnection(socket, 'main');
  });

  // Chat namespace for chat-specific events
  const chatNsp = io.of('/chat');
  chatNsp.on('connection', (socket) => {
    handleConnection(socket, 'chat');
    registerChatHandlers(socket, chatNsp);
  });

  // User namespace for user-specific events
  const userNsp = io.of('/user');
  userNsp.on('connection', (socket) => {
    handleConnection(socket, 'user');
    registerUserHandlers(socket, userNsp);
  });

  // System namespace for admin/monitoring
  const systemNsp = io.of('/system');
  systemNsp.use(requireAdminAuth);
  systemNsp.on('connection', (socket) => {
    handleConnection(socket, 'system');
    registerSystemHandlers(socket, systemNsp);
  });

  // Group namespace for group chat events
  const groupNsp = io.of('/group');
  groupNsp.on('connection', (socket) => {
    handleConnection(socket, 'group');
    registerGroupHandlers(socket, groupNsp);
  });
}

/**
 * Handle new connection
 */
function handleConnection(socket: any, namespace: string): void {
  const userId = socket.user?.id;
  const socketId = socket.id;

  console.log(`[Socket.io] Connected: ${socketId} (user: ${userId}, ns: ${namespace})`);

  // Track connection
  connectionManager.addConnection(socket, namespace);

  // Handle disconnection
  socket.on('disconnect', (reason: string) => {
    console.log(`[Socket.io] Disconnected: ${socketId} (reason: ${reason})`);
    connectionManager.removeConnection(socketId);
  });

  // Handle errors
  socket.on('error', (error: Error) => {
    console.error(`[Socket.io] Error on ${socketId}:`, error);
  });

  // Emit connection acknowledgment
  socket.emit('connected', {
    socketId,
    timestamp: new Date().toISOString(),
    namespace,
  });
}

/**
 * Middleware to require admin authentication for system namespace
 */
function requireAdminAuth(socket: any, next: (err?: Error) => void): void {
  const user = socket.user;

  if (!user) {
    next(new Error('Authentication required'));
    return;
  }

  // Check if user has admin role
  if (!user.roles?.includes('admin') && !user.roles?.includes('super_admin')) {
    next(new Error('Admin access required'));
    return;
  }

  next();
}

/**
 * Get Socket.io instance
 */
export function getSocketServer(): SocketServer | null {
  return io;
}

/**
 * Get IO instance for emitting events
 */
export function getIO(): SocketServer {
  if (!io) {
    throw new Error('Socket.io server not initialized');
  }
  return io;
}

/**
 * Emit event to specific user
 */
export function emitToUser(userId: string, event: string, data: any): void {
  if (!io) return;

  // Emit to all sockets of the user across all namespaces
  io.of('/').to(`user:${userId}`).emit(event, data);
  io.of('/chat').to(`user:${userId}`).emit(event, data);
  io.of('/user').to(`user:${userId}`).emit(event, data);
}

/**
 * Emit event to specific room
 */
export function emitToRoom(roomId: string, event: string, data: any, namespace = '/'): void {
  if (!io) return;
  io.of(namespace).to(roomId).emit(event, data);
}

/**
 * Broadcast event to all connected clients
 */
export function broadcast(event: string, data: any, namespace = '/'): void {
  if (!io) return;
  io.of(namespace).emit(event, data);
}

/**
 * Close Socket.io server
 */
export async function closeSocketServer(): Promise<void> {
  if (io) {
    await io.close();
    io = null;
    console.log('[Socket.io] Server closed');
  }
}

export default {
  initializeSocketServer,
  getSocketServer,
  getIO,
  emitToUser,
  emitToRoom,
  broadcast,
  closeSocketServer,
};
