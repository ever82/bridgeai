/**
 * Agent Dialog Socket Handlers
 * WebSocket事件处理 - Agent实时对话
 */

import { Server as SocketServer, Socket } from 'socket.io';

import { agentDialogService } from '../../services/ai/agentDialogService';
import { logger } from '../../utils/logger';

/**
 * Register dialog namespace handlers
 */
export function registerDialogHandlers(socket: Socket, _nsp: SocketServer): void {
  const userId = socket.user?.id;
  logger.info('[Socket/dialog] Client connected', { socketId: socket.id, userId });

  // Join user room for targeted messages
  socket.join(`user:${userId}`);

  // Join session room if provided
  socket.on('join_session', (sessionId: string) => {
    socket.join(`session:${sessionId}`);
    logger.info('[Socket/dialog] Client joined session', { socketId: socket.id, sessionId });
  });

  // Leave session room
  socket.on('leave_session', (sessionId: string) => {
    socket.leave(`session:${sessionId}`);
    logger.info('[Socket/dialog] Client left session', { socketId: socket.id, sessionId });
  });

  // New message in session - broadcast to session participants
  socket.on('new_message', async (data: { sessionId: string; messageId: string }) => {
    // Broadcast to all in the session room
    socket.to(`session:${data.sessionId}`).emit('message_update', {
      sessionId: data.sessionId,
      messageId: data.messageId,
      timestamp: new Date().toISOString(),
    });
  });

  // Dialog generate - request LLM-driven agent reply (ISSUE-AI004)
  socket.on(
    'dialog:generate',
    async (payload: {
      sessionId?: string;
      agentId?: string;
      content?: string;
      options?: { temperature?: number; maxTokens?: number };
    }) => {
      logger.info('[Socket/dialog] dialog:generate received', {
        socketId: socket.id,
        sessionId: payload?.sessionId,
        agentId: payload?.agentId,
      });

      if (!payload?.sessionId || !payload?.agentId) {
        socket.emit('dialog:generate_error', {
          code: 'INVALID_PAYLOAD',
          message: 'sessionId and agentId are required',
        });
        return;
      }

      try {
        const result = await agentDialogService.generateMessage({
          sessionId: payload.sessionId,
          senderId: payload.agentId,
          senderType: 'agent',
          content: payload.content ?? '',
          options: {
            temperature: payload.options?.temperature ?? 0.8,
            maxTokens: payload.options?.maxTokens ?? 200,
          },
        });

        socket.emit('dialog:generate_result', { sessionId: payload.sessionId, message: result });
        socket.nsp
          .to(`session:${payload.sessionId}`)
          .emit('dialog:new_message', { sessionId: payload.sessionId, message: result });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        const code = /not\s+found/i.test(msg)
          ? 'SESSION_NOT_FOUND'
          : /llm|provider|unavailable|timeout/i.test(msg)
            ? 'LLM_UNAVAILABLE'
            : 'GENERATE_FAILED';
        logger.warn('[Socket/dialog] dialog:generate failed', {
          sessionId: payload.sessionId,
          code,
          err: msg,
        });
        socket.emit('dialog:generate_error', {
          code,
          message: msg,
          sessionId: payload.sessionId,
        });
      }
    }
  );

  // Typing indicator
  socket.on('typing', (data: { sessionId: string; senderId: string; isTyping: boolean }) => {
    socket.to(`session:${data.sessionId}`).emit('typing_indicator', {
      sessionId: data.sessionId,
      senderId: data.senderId,
      isTyping: data.isTyping,
    });
  });

  // Session state update
  socket.on('session_state', (data: { sessionId: string; state: string }) => {
    socket.to(`session:${data.sessionId}`).emit('session_state_update', {
      sessionId: data.sessionId,
      state: data.state,
      updatedAt: new Date().toISOString(),
    });
  });

  // Disconnect
  socket.on('disconnect', (reason: string) => {
    logger.info('[Socket/dialog] Client disconnected', { socketId: socket.id, reason });
  });

  // Acknowledge connection
  socket.emit('connected', {
    namespace: '/dialog',
    socketId: socket.id,
    timestamp: new Date().toISOString(),
  });
}
