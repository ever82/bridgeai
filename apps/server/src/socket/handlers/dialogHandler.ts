/**
 * Agent Dialog Socket Handlers
 * WebSocket事件处理 - Agent实时对话
 */

import { Server as SocketServer, Socket } from 'socket.io';

import { logger } from '../../utils/logger';

/**
 * Register dialog namespace handlers
 */
export function registerDialogHandlers(socket: Socket, nsp: SocketServer): void {
  const dialogNsp = nsp.of('/dialog');

  dialogNsp.on('connection', (sock: Socket) => {
    const userId = sock.user?.id;
    logger.info('[Socket/dialog] Client connected', { socketId: sock.id, userId });

    // Join user room for targeted messages
    sock.join(`user:${userId}`);

    // Join session room if provided
    sock.on('join_session', (sessionId: string) => {
      sock.join(`session:${sessionId}`);
      logger.info('[Socket/dialog] Client joined session', { socketId: sock.id, sessionId });
    });

    // Leave session room
    sock.on('leave_session', (sessionId: string) => {
      sock.leave(`session:${sessionId}`);
      logger.info('[Socket/dialog] Client left session', { socketId: sock.id, sessionId });
    });

    // New message in session - broadcast to session participants
    sock.on('new_message', async (data: { sessionId: string; messageId: string }) => {
      // Broadcast to all in the session room
      dialogNsp.to(`session:${data.sessionId}`).emit('message_update', {
        sessionId: data.sessionId,
        messageId: data.messageId,
        timestamp: new Date().toISOString(),
      });
    });

    // Typing indicator
    sock.on('typing', (data: { sessionId: string; senderId: string; isTyping: boolean }) => {
      sock.to(`session:${data.sessionId}`).emit('typing_indicator', {
        sessionId: data.sessionId,
        senderId: data.senderId,
        isTyping: data.isTyping,
      });
    });

    // Session state update
    sock.on('session_state', (data: { sessionId: string; state: string }) => {
      dialogNsp.to(`session:${data.sessionId}`).emit('session_state_update', {
        sessionId: data.sessionId,
        state: data.state,
        updatedAt: new Date().toISOString(),
      });
    });

    // Disconnect
    sock.on('disconnect', (reason: string) => {
      logger.info('[Socket/dialog] Client disconnected', { socketId: sock.id, reason });
    });

    // Acknowledge connection
    sock.emit('connected', {
      namespace: '/dialog',
      socketId: sock.id,
      timestamp: new Date().toISOString(),
    });
  });
}