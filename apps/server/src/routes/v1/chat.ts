/**
 * Chat Routes
 *
 * REST API endpoints for chat history, message search, and sync.
 */
import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { validate } from '../../middleware/validation';
import { z } from 'zod';
import {
  getMessagesByConversation,
  searchMessages,
  syncMessages,
  getMessageById,
} from '../../services/messageService';

const router = Router();

// Validation schemas
const getHistorySchema = z.object({
  query: z.object({
    limit: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 50)),
    before: z.string().datetime().optional(),
    after: z.string().datetime().optional(),
    cursor: z.string().optional(),
  }),
  params: z.object({
    roomId: z.string().uuid(),
  }),
});

const syncMessagesSchema = z.object({
  query: z.object({
    lastSequenceId: z.string().optional(),
    limit: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 100)),
  }),
  params: z.object({
    roomId: z.string().uuid(),
  }),
});

const searchMessagesSchema = z.object({
  query: z.object({
    q: z.string().min(1).max(500),
    limit: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 20)),
  }),
  params: z.object({
    roomId: z.string().uuid(),
  }),
});

const getMessageSchema = z.object({
  params: z.object({
    messageId: z.string().uuid(),
  }),
});

/**
 * GET /api/v1/chat/rooms/:roomId/messages
 * Get message history for a room
 */
router.get(
  '/rooms/:roomId/messages',
  authenticate,
  validate({
    query: getHistorySchema.query,
    params: getHistorySchema.params,
  }),
  async (req, res, next) => {
    try {
      const { roomId } = req.params;
      const { limit, before, after, cursor } = req.query as {
        limit?: string;
        before?: string;
        after?: string;
        cursor?: string;
      };

      const messages = await getMessagesByConversation({
        conversationId: roomId,
        limit: limit ? parseInt(limit, 10) : 50,
        before: before ? new Date(before) : undefined,
        after: after ? new Date(after) : undefined,
        cursor: cursor || undefined,
      });

      res.json({
        success: true,
        data: {
          messages: messages.map((msg) => ({
            id: msg.id,
            roomId: msg.conversationId,
            senderId: msg.senderId,
            sender: msg.sender,
            content: msg.content,
            type: msg.type.toLowerCase(),
            attachments: msg.attachments,
            metadata: msg.metadata,
            status: msg.status,
            sequenceId: msg.sequenceId.toString(),
            readReceipts: msg.readReceipts,
            editedAt: msg.editedAt?.toISOString(),
            createdAt: msg.createdAt.toISOString(),
          })),
          pagination: {
            hasMore: messages.length === (limit ? parseInt(limit, 10) : 50),
            cursor: messages.length > 0
              ? messages[messages.length - 1].sequenceId.toString()
              : null,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/chat/rooms/:roomId/sync
 * Sync messages (incremental sync)
 */
router.get(
  '/rooms/:roomId/sync',
  authenticate,
  validate({
    query: syncMessagesSchema.query,
    params: syncMessagesSchema.params,
  }),
  async (req, res, next) => {
    try {
      const { roomId } = req.params;
      const { lastSequenceId, limit } = req.query as {
        lastSequenceId?: string;
        limit?: string;
      };

      const result = await syncMessages({
        conversationId: roomId,
        lastSequenceId: lastSequenceId ? BigInt(lastSequenceId) : BigInt(0),
        limit: limit ? parseInt(limit, 10) : 100,
      });

      res.json({
        success: true,
        data: {
          messages: result.messages.map((msg) => ({
            id: msg.id,
            roomId: msg.conversationId,
            senderId: msg.senderId,
            sender: msg.sender,
            content: msg.content,
            type: msg.type.toLowerCase(),
            attachments: msg.attachments,
            metadata: msg.metadata,
            status: msg.status,
            sequenceId: msg.sequenceId.toString(),
            readReceipts: msg.readReceipts,
            editedAt: msg.editedAt?.toISOString(),
            createdAt: msg.createdAt.toISOString(),
          })),
          sync: {
            lastSequenceId: result.lastSequenceId.toString(),
            hasMore: result.hasMore,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/chat/rooms/:roomId/search
 * Search messages in a room
 */
router.get(
  '/rooms/:roomId/search',
  authenticate,
  validate({
    query: searchMessagesSchema.query,
    params: searchMessagesSchema.params,
  }),
  async (req, res, next) => {
    try {
      const { roomId } = req.params;
      const { q, limit } = req.query as {
        q: string;
        limit?: string;
      };

      const messages = await searchMessages(
        roomId,
        q,
        limit ? parseInt(limit, 10) : 20
      );

      res.json({
        success: true,
        data: {
          messages: messages.map((msg) => ({
            id: msg.id,
            roomId: msg.conversationId,
            senderId: msg.senderId,
            sender: msg.sender,
            content: msg.content,
            type: msg.type.toLowerCase(),
            attachments: msg.attachments,
            metadata: msg.metadata,
            status: msg.status,
            sequenceId: msg.sequenceId.toString(),
            editedAt: msg.editedAt?.toISOString(),
            createdAt: msg.createdAt.toISOString(),
          })),
          query: q,
          total: messages.length,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/chat/messages/:messageId
 * Get a specific message
 */
router.get(
  '/messages/:messageId',
  authenticate,
  validate({
    params: getMessageSchema.params,
  }),
  async (req, res, next) => {
    try {
      const { messageId } = req.params;

      const message = await getMessageById(messageId);

      if (!message) {
        return res.status(404).json({
          success: false,
          error: 'Message not found',
        });
      }

      res.json({
        success: true,
        data: {
          message: {
            id: message.id,
            roomId: message.conversationId,
            senderId: message.senderId,
            sender: message.sender,
            content: message.content,
            type: message.type.toLowerCase(),
            attachments: message.attachments,
            metadata: message.metadata,
            status: message.status,
            sequenceId: message.sequenceId.toString(),
            readReceipts: message.readReceipts,
            editedAt: message.editedAt?.toISOString(),
            createdAt: message.createdAt.toISOString(),
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
