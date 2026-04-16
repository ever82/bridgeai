/**
 * Chat Routes
 *
 * REST API endpoints for chat history, message search, sync, and room management.
 */
import { Router } from 'express';
import { authenticate, AuthenticatedRequest } from '../../middleware/auth';
import { validate } from '../../middleware/validation';
import { z } from 'zod';
import {
  getMessagesByConversation,
  searchMessages,
  syncMessages,
  getMessageById,
} from '../../services/messageService';
import {
  createRoom,
  getRoomById,
  updateRoom,
  closeRoom,
  getUserRooms,
  searchRooms,
  isUserInRoom,
  resetUnreadCount,
} from '../../services/chat/roomService';
import {
  addParticipant,
  removeParticipant,
  updateParticipant,
  getRoomParticipants,
  transferOwnership,
} from '../../services/chat/participantService';
import { ChatRoomType, ParticipantRole } from '@prisma/client';

const router = Router();

// Validation schemas - Messages
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

// Validation schemas - Rooms
const createRoomSchema = z.object({
  type: z.enum([ChatRoomType.PRIVATE, ChatRoomType.GROUP, ChatRoomType.QUAD]),
  participantIds: z.array(z.string().uuid()).min(1),
  sceneId: z.string().uuid().optional(),
  metadata: z.record(z.any()).optional(),
  settings: z.record(z.any()).optional(),
});

const updateRoomSchema = z.object({
  status: z.enum(['ACTIVE', 'INACTIVE', 'CLOSED']).optional(),
  metadata: z.record(z.any()).optional(),
  settings: z.record(z.any()).optional(),
});

const addParticipantSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum([ParticipantRole.MEMBER, ParticipantRole.ADMIN, ParticipantRole.GUEST]).optional(),
});

const updateParticipantSchema = z.object({
  role: z.enum([ParticipantRole.MEMBER, ParticipantRole.ADMIN, ParticipantRole.GUEST]).optional(),
  permissions: z.record(z.any()).optional(),
});

// ==================== Message Routes ====================

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

// ==================== Room Routes ====================

/**
 * POST /api/v1/chat/rooms
 * 创建聊天房间
 */
router.post(
  '/rooms',
  authenticate,
  validate({ body: createRoomSchema }),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const userId = req.user!.id;
      const room = await createRoom({
        ...req.body,
        createdBy: userId,
      });

      res.status(201).json({
        success: true,
        data: room,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/chat/rooms
 * 获取用户房间列表
 */
router.get('/rooms', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const {
      type,
      status,
      search,
      page = '1',
      limit = '20',
      sortBy = 'lastMessageAt',
      sortOrder = 'desc',
    } = req.query;

    const options = {
      type: type as ChatRoomType | undefined,
      status: status as any,
      search: search as string | undefined,
      page: parseInt(page as string, 10),
      limit: parseInt(limit as string, 10),
      sortBy: sortBy as 'lastMessageAt' | 'createdAt' | 'updatedAt',
      sortOrder: sortOrder as 'asc' | 'desc',
    };

    const result = await getUserRooms(userId, options);

    res.json({
      success: true,
      data: result.rooms,
      meta: {
        total: result.total,
        page: options.page,
        limit: options.limit,
        totalPages: Math.ceil(result.total / options.limit),
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/chat/rooms/search
 * 搜索房间
 */
router.get('/rooms/search', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const { q, ...options } = req.query;

    if (!q) {
      return res.status(400).json({
        success: false,
        error: 'Search query is required',
      });
    }

    const result = await searchRooms(userId, q as string, {
      type: options.type as ChatRoomType | undefined,
      status: options.status as any,
      page: parseInt((options.page as string) || '1', 10),
      limit: parseInt((options.limit as string) || '20', 10),
    });

    res.json({
      success: true,
      data: result.rooms,
      meta: {
        total: result.total,
        page: parseInt((options.page as string) || '1', 10),
        limit: parseInt((options.limit as string) || '20', 10),
        totalPages: Math.ceil(result.total / parseInt((options.limit as string) || '20', 10)),
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/chat/rooms/:id
 * 获取房间详情
 */
router.get('/rooms/:id', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    // 检查用户是否在房间中
    const isMember = await isUserInRoom(id, userId);
    if (!isMember) {
      return res.status(403).json({
        success: false,
        error: 'Access denied: not a room member',
      });
    }

    const room = await getRoomById(id);

    if (!room) {
      return res.status(404).json({
        success: false,
        error: 'Room not found',
      });
    }

    res.json({
      success: true,
      data: room,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/v1/chat/rooms/:id
 * 更新房间
 */
router.patch(
  '/rooms/:id',
  authenticate,
  validate({ body: updateRoomSchema }),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const { id } = req.params;
      const room = await updateRoom(id, req.body);

      res.json({
        success: true,
        data: room,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /api/v1/chat/rooms/:id
 * 关闭房间
 */
router.delete('/rooms/:id', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { id } = req.params;
    const room = await closeRoom(id);

    res.json({
      success: true,
      data: room,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/chat/rooms/:id/read
 * 标记房间已读
 */
router.post('/rooms/:id/read', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    await resetUnreadCount(id, userId);

    res.json({
      success: true,
      message: 'Room marked as read',
    });
  } catch (error) {
    next(error);
  }
});

// ==================== Participants ====================

/**
 * GET /api/v1/chat/rooms/:id/participants
 * 获取房间参与者列表
 */
router.get('/rooms/:id/participants', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    // 检查用户是否在房间中
    const isMember = await isUserInRoom(id, userId);
    if (!isMember) {
      return res.status(403).json({
        success: false,
        error: 'Access denied: not a room member',
      });
    }

    const participants = await getRoomParticipants(id);

    res.json({
      success: true,
      data: participants,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/chat/rooms/:id/participants
 * 添加参与者
 */
router.post(
  '/rooms/:id/participants',
  authenticate,
  validate({ body: addParticipantSchema }),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const userId = req.user!.id;
      const { id } = req.params;
      const { userId: participantId, role } = req.body;

      const participant = await addParticipant({
        roomId: id,
        userId: participantId,
        role,
        addedBy: userId,
      });

      res.status(201).json({
        success: true,
        data: participant,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PATCH /api/v1/chat/rooms/:id/participants/:userId
 * 更新参与者
 */
router.patch(
  '/rooms/:id/participants/:userId',
  authenticate,
  validate({ body: updateParticipantSchema }),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const currentUserId = req.user!.id;
      const { id, userId } = req.params;

      const participant = await updateParticipant(id, userId, req.body, currentUserId);

      res.json({
        success: true,
        data: participant,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /api/v1/chat/rooms/:id/participants/:userId
 * 移除参与者
 */
router.delete('/rooms/:id/participants/:userId', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const currentUserId = req.user!.id;
    const { id, userId } = req.params;

    await removeParticipant(id, userId, currentUserId);

    res.json({
      success: true,
      message: 'Participant removed successfully',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/chat/rooms/:id/transfer-ownership
 * 转移房主权限
 */
router.post('/rooms/:id/transfer-ownership', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const currentUserId = req.user!.id;
    const { id } = req.params;
    const { userId: newOwnerId } = req.body;

    if (!newOwnerId) {
      return res.status(400).json({
        success: false,
        error: 'New owner userId is required',
      });
    }

    await transferOwnership(id, newOwnerId, currentUserId);

    res.json({
      success: true,
      message: 'Ownership transferred successfully',
    });
  } catch (error) {
    next(error);
  }
});

export default router;
