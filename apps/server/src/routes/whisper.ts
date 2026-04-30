/**
 * Whisper Routes
 *
 * REST API endpoints for the private "whisper" advice channel
 * (see services/dating/privateAdviceService.ts).
 *
 * Currently exposes the "one-tap adopt" endpoint, which lets a user
 * accept an Agent-generated advice suggestion and immediately have its
 * content posted into the relevant chat room as a regular message.
 */
import { Router } from 'express';
import { z } from 'zod';

import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { AppError } from '../errors/AppError';
import { ApiResponse } from '../utils/response';
import { asyncHandler } from '../middleware/common';
import { createChatRoomMessage } from '../services/messageService';
import { isUserInRoom } from '../services/chat/roomService';

const router: Router = Router();

const adoptSchema = z.object({
  body: z.object({
    adviceId: z.string().min(1),
    roomId: z.string().uuid(),
    content: z.string().min(1).max(4000),
    type: z
      .enum(['topic_suggestion', 'risk_warning', 'intent_analysis', 'one_tap_action'])
      .optional(),
  }),
});

/**
 * POST /api/v1/whisper/adopt
 *
 * Adopt a private advice suggestion: post its content as a chat message
 * into the given room on behalf of the calling user.
 *
 * Body:
 *   - adviceId: client-side identifier of the advice (audit trail only)
 *   - roomId:   the chat room to send the message into
 *   - content:  the advice text to send (mobile owns the rendered string)
 *   - type:     optional advice type for analytics / audit
 */
router.post(
  '/adopt',
  authenticate,
  validate({ body: adoptSchema.shape.body }),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    if (!req.user) {
      throw new AppError('Unauthorized', 'UNAUTHORIZED', 401);
    }

    const userId = req.user.id;
    const { adviceId, roomId, content, type } = req.body as {
      adviceId: string;
      roomId: string;
      content: string;
      type?: string;
    };

    const isMember = await isUserInRoom(roomId, userId);
    if (!isMember) {
      throw new AppError('Access denied: not a room member', 'FORBIDDEN', 403);
    }

    const message = await createChatRoomMessage({
      chatRoomId: roomId,
      senderId: userId,
      content,
      type: 'TEXT',
      metadata: {
        deleted: false,
        whisperAdopted: true,
        adviceId,
        adviceType: type ?? 'one_tap_action',
      },
    });

    res.status(201).json(
      ApiResponse.success({
        message: {
          id: message.id,
          roomId: message.conversationId,
          senderId: message.senderId,
          content: message.content,
          type: message.type,
          status: message.status,
          createdAt: message.createdAt,
        },
        adviceId,
      })
    );
  })
);

export default router;
