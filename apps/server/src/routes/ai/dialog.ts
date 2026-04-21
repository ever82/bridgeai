/**
 * Agent Dialog Routes
 * Agent对话生成服务API端点
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';

import { authenticate as authenticateToken } from '../../middleware/auth';
import { validate as _validate } from '../../middleware/validation';
const validate = _validate as any;
import { logger } from '../../utils/logger';
import {
  agentDialogService,
  DialogParticipant,
  DialogType,
} from '../../services/ai/agentDialogService';

const router = Router();

// Sub-schemas
const personaSchema = z.object({
  name: z.string(),
  role: z.string(),
  personality: z.array(z.string()),
  goals: z.array(z.string()),
  communicationStyle: z.enum(['formal', 'casual', 'friendly', 'professional']),
  specializations: z.array(z.string()).optional(),
});

const participantSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(['agent', 'user']),
  agentType: z.string().optional(),
  persona: personaSchema.optional(),
});

// Request schemas
const createSessionSchema = z.object({
  type: z.enum(['agent_to_agent', 'agent_to_user', 'negotiation', 'matching']),
  participants: z.array(participantSchema).min(2),
  scene: z.string().optional(),
  initialContext: z.object({
    goals: z.array(z.string()).optional(),
    constraints: z.array(z.string()).optional(),
    userPreferences: z.record(z.any()).optional(),
    negotiationState: z.object({
      currentRound: z.number(),
      agreedTerms: z.array(z.string()),
      pendingIssues: z.array(z.string()),
    }).optional(),
    matchingCriteria: z.object({
      requirements: z.array(z.string()),
      preferences: z.array(z.string()),
      dealBreakers: z.array(z.string()),
    }).optional(),
  }).optional(),
});

const generateMessageSchema = z.object({
  senderId: z.string(),
  senderType: z.enum(['agent', 'user']),
  content: z.string().min(1),
  options: z.object({
    temperature: z.number().min(0).max(2).optional(),
    maxTokens: z.number().positive().max(4000).optional(),
  }).optional(),
});

const agentDialogSchema = z.object({
  senderAgentId: z.string(),
  receiverAgentId: z.string(),
  content: z.string().min(1),
  scene: z.string(),
  context: z.object({
    goals: z.array(z.string()).optional(),
    constraints: z.array(z.string()).optional(),
  }).optional(),
});

const userDialogSchema = z.object({
  userId: z.string(),
  agentId: z.string(),
  content: z.string().min(1),
  scene: z.string(),
});

/**
 * @route   POST /api/v1/ai/dialog/sessions
 * @desc    创建新的对话会话
 * @access  Private
 */
router.post(
  '/sessions',
  authenticateToken,
  validate(createSessionSchema),
  async (req: Request, res: Response) => {
    try {
      const { type, participants, scene, initialContext } = req.body;

      const session = await agentDialogService.createSession(
        type as DialogType,
        participants as DialogParticipant[],
        scene,
        initialContext
      );

      res.status(201).json({
        success: true,
        data: {
          session,
        },
      });
    } catch (error) {
      logger.error('Failed to create dialog session', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to create dialog session',
      });
    }
  }
);

/**
 * @route   GET /api/v1/ai/dialog/sessions/:sessionId
 * @desc    获取对话会话详情
 * @access  Private
 */
router.get(
  '/sessions/:sessionId',
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const { sessionId } = req.params;
      const session = agentDialogService.getSession(sessionId);

      if (!session) {
        return res.status(404).json({
          success: false,
          error: 'Session not found',
        });
      }

      res.json({
        success: true,
        data: { session },
      });
    } catch (error) {
      logger.error('Failed to get session', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to get session',
      });
    }
  }
);

/**
 * @route   GET /api/v1/ai/dialog/sessions/:sessionId/messages
 * @desc    获取会话消息历史
 * @access  Private
 */
router.get(
  '/sessions/:sessionId/messages',
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const { sessionId } = req.params;
      const { limit, offset } = req.query;

      const messages = agentDialogService.getSessionMessages(sessionId, {
        limit: limit ? parseInt(limit as string) : undefined,
        offset: offset ? parseInt(offset as string) : undefined,
      });

      res.json({
        success: true,
        data: { messages },
      });
    } catch (error) {
      logger.error('Failed to get messages', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to get messages',
      });
    }
  }
);

/**
 * @route   POST /api/v1/ai/dialog/sessions/:sessionId/messages
 * @desc    在会话中生成新消息
 * @access  Private
 */
router.post(
  '/sessions/:sessionId/messages',
  authenticateToken,
  validate(generateMessageSchema),
  async (req: Request, res: Response) => {
    try {
      const { sessionId } = req.params;
      const { senderId, senderType, content, options } = req.body;

      const message = await agentDialogService.generateMessage({
        sessionId,
        senderId,
        senderType: senderType as 'agent' | 'user',
        content,
        options,
      });

      res.status(201).json({
        success: true,
        data: { message },
      });
    } catch (error) {
      logger.error('Failed to generate message', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to generate message',
      });
    }
  }
);

/**
 * @route   POST /api/v1/ai/dialog/agent-to-agent
 * @desc    Agent之间的对话
 * @access  Private
 */
router.post(
  '/agent-to-agent',
  authenticateToken,
  validate(agentDialogSchema),
  async (req: Request, res: Response) => {
    try {
      const { senderAgentId, receiverAgentId, content, scene, context } = req.body;

      const message = await agentDialogService.agentToAgentDialog({
        senderAgentId,
        receiverAgentId,
        content,
        scene,
        context,
      });

      res.status(201).json({
        success: true,
        data: { message },
      });
    } catch (error) {
      logger.error('Agent-to-agent dialog failed', { error });
      res.status(500).json({
        success: false,
        error: 'Agent-to-agent dialog failed',
      });
    }
  }
);

/**
 * @route   POST /api/v1/ai/dialog/user-to-agent
 * @desc    用户与Agent的对话
 * @access  Private
 */
router.post(
  '/user-to-agent',
  authenticateToken,
  validate(userDialogSchema),
  async (req: Request, res: Response) => {
    try {
      const { userId, agentId, content, scene } = req.body;

      const message = await agentDialogService.userToAgentDialog({
        userId,
        agentId,
        content,
        scene,
      });

      res.status(201).json({
        success: true,
        data: { message },
      });
    } catch (error) {
      logger.error('User-to-agent dialog failed', { error });
      res.status(500).json({
        success: false,
        error: 'User-to-agent dialog failed',
      });
    }
  }
);

/**
 * @route   GET /api/v1/ai/dialog/participants/:participantId/sessions
 * @desc    获取参与者的所有会话
 * @access  Private
 */
router.get(
  '/participants/:participantId/sessions',
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const { participantId } = req.params;

      const sessions = agentDialogService.getSessionsForParticipant(participantId);

      res.json({
        success: true,
        data: { sessions },
      });
    } catch (error) {
      logger.error('Failed to get participant sessions', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to get participant sessions',
      });
    }
  }
);

/**
 * @route   PUT /api/v1/ai/dialog/sessions/:sessionId/context
 * @desc    更新会话上下文
 * @access  Private
 */
router.put(
  '/sessions/:sessionId/context',
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const { sessionId } = req.params;
      const contextUpdates = req.body;

      const session = agentDialogService.updateSessionContext(sessionId, contextUpdates);

      res.json({
        success: true,
        data: { session },
      });
    } catch (error) {
      logger.error('Failed to update session context', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to update session context',
      });
    }
  }
);

/**
 * @route   POST /api/v1/ai/dialog/sessions/:sessionId/archive
 * @desc    归档会话
 * @access  Private
 */
router.post(
  '/sessions/:sessionId/archive',
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const { sessionId } = req.params;

      agentDialogService.archiveSession(sessionId);

      res.json({
        success: true,
        message: 'Session archived',
      });
    } catch (error) {
      logger.error('Failed to archive session', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to archive session',
      });
    }
  }
);

/**
 * @route   GET /api/v1/ai/dialog/stats
 * @desc    获取对话服务统计
 * @access  Private
 */
router.get(
  '/stats',
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      res.json({
        success: true,
        data: {
          sessionCount: agentDialogService.getSessionCount(),
          version: agentDialogService.getVersion(),
        },
      });
    } catch (error) {
      logger.error('Failed to get stats', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to get stats',
      });
    }
  }
);

export default router;