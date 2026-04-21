/**
 * Agent Negotiation Routes
 * Agent优惠协商谈判API路由
 *
 * 提供协商谈判的REST API端点
 */

import { Router } from 'express';
import { z } from 'zod';

import { agentNegotiationService } from '../../services/ai/agentNegotiationService';
import { authenticate as requireAuth } from '../../middleware/auth';
import { validate as _validateRequest } from '../../middleware/validation';
const validateRequest = _validateRequest as any;
import { logger } from '../../utils/logger';
import { AppError } from '../../errors';

const router = Router();

// ===== Validation Schemas =====

const createRoomBodySchema = z.object({
  consumerAgentId: z.string().min(1),
  merchantAgentIds: z.array(z.string()).min(2),
  consumerDemand: z.object({}).passthrough(),
  config: z.object({}).passthrough().optional(),
});

const roomIdParamSchema = z.object({
  roomId: z.string().min(1),
});

const submitOfferBodySchema = z.object({
  merchantId: z.string().min(1),
  offer: z.object({}).passthrough(),
});

const followUpQuestionBodySchema = z.object({
  question: z.string().min(1),
  targetMerchantId: z.string().min(1),
  questionType: z.enum(['discount', 'validity', 'condition', 'hidden_benefit', 'stacking']),
});

const confirmSelectionBodySchema = z.object({
  offerId: z.string().min(1),
  confirmed: z.boolean(),
});

const questionsQuerySchema = z.object({
  merchantId: z.string().optional(),
});

/**
 * @route POST /api/v1/ai/negotiation/rooms
 * @desc 创建协商房间
 * @access Private
 */
router.post(
  '/rooms',
  requireAuth,
  validateRequest({ body: createRoomBodySchema }),
  async (req, res, next) => {
    try {
      const { consumerAgentId, merchantAgentIds, consumerDemand, config } = req.body;

      logger.info('Creating negotiation room', {
        consumerAgentId,
        merchantCount: merchantAgentIds.length,
        userId: req.user?.id,
      });

      // TODO: Load actual agent info from database
      const consumerAgent = {
        id: consumerAgentId,
        type: 'consumer' as const,
        name: '消费者Agent',
        profile: {
          userId: req.user?.id,
          preferences: consumerDemand.category ? [consumerDemand.category] : [],
        },
      };

      const merchantAgents = merchantAgentIds.map((id: string, index: number) => ({
        id,
        type: 'merchant' as const,
        name: `商家Agent ${index + 1}`,
      }));

      const room = await agentNegotiationService.createNegotiationRoom(
        consumerAgent,
        merchantAgents,
        consumerDemand,
        config
      );

      res.status(201).json({
        success: true,
        data: {
          roomId: room.id,
          type: room.type,
          status: room.status,
          merchantCount: room.merchantAgents.length,
          createdAt: room.createdAt,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route GET /api/v1/ai/negotiation/rooms/:roomId
 * @desc 获取协商房间详情
 * @access Private
 */
router.get(
  '/rooms/:roomId',
  requireAuth,
  validateRequest({ params: roomIdParamSchema }),
  async (req, res, next) => {
    try {
      const { roomId } = req.params;

      const room = agentNegotiationService.getRoom(roomId);

      res.json({
        success: true,
        data: {
          id: room.id,
          type: room.type,
          status: room.status,
          consumerAgent: room.consumerAgent,
          merchantAgents: room.merchantAgents,
          messageCount: room.messages.length,
          createdAt: room.createdAt,
          updatedAt: room.updatedAt,
          context: {
            consumerDemand: room.context.consumerDemand,
            negotiationState: room.context.negotiationState,
            hasComparison: !!room.context.comparisonResult,
            hasRecommendation: !!room.context.recommendation,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route POST /api/v1/ai/negotiation/rooms/:roomId/introduction
 * @desc 生成消费者Agent开场白
 * @access Private
 */
router.post(
  '/rooms/:roomId/introduction',
  requireAuth,
  validateRequest({ params: roomIdParamSchema }),
  async (req, res, next) => {
    try {
      const { roomId } = req.params;

      logger.info('Generating consumer introduction', { roomId });

      const message = await agentNegotiationService.generateConsumerIntroduction(roomId);

      res.json({
        success: true,
        data: {
          messageId: message.id,
          content: message.content,
          senderType: message.senderType,
          timestamp: message.timestamp,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route POST /api/v1/ai/negotiation/rooms/:roomId/offers
 * @desc 提交商家优惠方案
 * @access Private
 */
router.post(
  '/rooms/:roomId/offers',
  requireAuth,
  validateRequest({ params: roomIdParamSchema, body: submitOfferBodySchema }),
  async (req, res, next) => {
    try {
      const { roomId } = req.params;
      const { merchantId, offer } = req.body;

      logger.info('Submitting merchant offer', { roomId, merchantId, offerId: offer.id });

      const message = await agentNegotiationService.generateMerchantOfferPresentation(
        roomId,
        merchantId,
        offer
      );

      res.json({
        success: true,
        data: {
          messageId: message.id,
          content: message.content,
          senderType: message.senderType,
          offerId: message.metadata?.offerId,
          timestamp: message.timestamp,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route GET /api/v1/ai/negotiation/rooms/:roomId/questions
 * @desc 生成智能追问问题
 * @access Private
 */
router.get(
  '/rooms/:roomId/questions',
  requireAuth,
  validateRequest({ params: roomIdParamSchema, query: questionsQuerySchema }),
  async (req, res, next) => {
    try {
      const { roomId } = req.params;
      const { merchantId } = req.query as { merchantId?: string };

      const room = agentNegotiationService.getRoom(roomId);

      // If merchantId not specified, use first merchant with offers
      let targetMerchantId = merchantId;
      if (!targetMerchantId) {
        for (const [mid, offers] of room.context.merchantOffers.entries()) {
          if (offers.length > 0) {
            targetMerchantId = mid;
            break;
          }
        }
      }

      if (!targetMerchantId) {
        throw new AppError('No merchant with offers found', 'NO_MERCHANT', 400);
      }

      const questions = await agentNegotiationService.generateFollowUpQuestions(
        roomId,
        targetMerchantId
      );

      res.json({
        success: true,
        data: {
          merchantId: targetMerchantId,
          questions: questions.map(q => ({
            question: q.question,
            type: q.questionType,
            context: q.context,
          })),
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route POST /api/v1/ai/negotiation/rooms/:roomId/questions
 * @desc 执行追问
 * @access Private
 */
router.post(
  '/rooms/:roomId/questions',
  requireAuth,
  validateRequest({ params: roomIdParamSchema, body: followUpQuestionBodySchema }),
  async (req, res, next) => {
    try {
      const { roomId } = req.params;
      const { question, targetMerchantId, questionType } = req.body;

      logger.info('Executing follow-up question', { roomId, targetMerchantId, questionType });

      const response = await agentNegotiationService.executeFollowUpQuestion(roomId, {
        question,
        targetMerchantId,
        questionType,
        context: '',
      });

      res.json({
        success: true,
        data: {
          questionMessageId: response.id,
          response: {
            messageId: response.id,
            content: response.content,
            senderId: response.senderId,
            timestamp: response.timestamp,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route POST /api/v1/ai/negotiation/rooms/:roomId/compare
 * @desc 执行多方案对比
 * @access Private
 */
router.post(
  '/rooms/:roomId/compare',
  requireAuth,
  validateRequest({ params: roomIdParamSchema }),
  async (req, res, next) => {
    try {
      const { roomId } = req.params;

      logger.info('Comparing offers', { roomId });

      const comparisonResult = await agentNegotiationService.compareOffers(roomId);
      const reportMessage = await agentNegotiationService.generateComparisonReport(
        roomId,
        comparisonResult
      );

      res.json({
        success: true,
        data: {
          comparison: {
            offers: comparisonResult.offers,
            summary: comparisonResult.summary,
            bestValueOffer: comparisonResult.bestValueOffer,
            bestMatchOffer: comparisonResult.bestMatchOffer,
          },
          reportMessage: {
            messageId: reportMessage.id,
            content: reportMessage.content,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route POST /api/v1/ai/negotiation/rooms/:roomId/recommend
 * @desc 生成最优方案推荐
 * @access Private
 */
router.post(
  '/rooms/:roomId/recommend',
  requireAuth,
  validateRequest({ params: roomIdParamSchema }),
  async (req, res, next) => {
    try {
      const { roomId } = req.params;

      logger.info('Generating recommendation', { roomId });

      const recommendation = await agentNegotiationService.generateRecommendation(roomId);
      const message = await agentNegotiationService.generateRecommendationMessage(
        roomId,
        recommendation
      );

      res.json({
        success: true,
        data: {
          recommendation: {
            recommendedOfferId: recommendation.recommendedOfferId,
            recommendedMerchantId: recommendation.recommendedMerchantId,
            recommendationReason: recommendation.recommendationReason,
            alternativeOffers: recommendation.alternativeOffers,
            confidence: recommendation.confidence,
            savingsEstimate: recommendation.savingsEstimate,
          },
          message: {
            messageId: message.id,
            content: message.content,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route POST /api/v1/ai/negotiation/rooms/:roomId/confirm
 * @desc 确认选择方案
 * @access Private
 */
router.post(
  '/rooms/:roomId/confirm',
  requireAuth,
  validateRequest({ params: roomIdParamSchema, body: confirmSelectionBodySchema }),
  async (req, res, next) => {
    try {
      const { roomId } = req.params;
      const { offerId, confirmed } = req.body;

      logger.info('Confirming selection', { roomId, offerId, confirmed });

      const room = await agentNegotiationService.confirmSelection(roomId, offerId, confirmed);

      res.json({
        success: true,
        data: {
          roomId: room.id,
          status: room.status,
          confirmed,
          offerId,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route GET /api/v1/ai/negotiation/rooms/:roomId/messages
 * @desc 获取房间消息历史
 * @access Private
 */
router.get(
  '/rooms/:roomId/messages',
  requireAuth,
  validateRequest({ params: roomIdParamSchema }),
  async (req, res, next) => {
    try {
      const { roomId } = req.params;

      const messages = agentNegotiationService.getRoomMessages(roomId);

      res.json({
        success: true,
        data: {
          messages: messages.map(msg => ({
            id: msg.id,
            senderId: msg.senderId,
            senderType: msg.senderType,
            content: msg.content,
            messageType: msg.messageType,
            timestamp: msg.timestamp,
            metadata: msg.metadata,
          })),
          total: messages.length,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route GET /api/v1/ai/negotiation/rooms
 * @desc 获取所有协商房间
 * @access Private (Admin)
 */
router.get('/rooms', requireAuth, async (req, res, next) => {
  try {
    // TODO: Add admin check
    const rooms = agentNegotiationService.getAllRooms();

    res.json({
      success: true,
      data: {
        rooms: rooms.map(room => ({
          id: room.id,
          type: room.type,
          status: room.status,
          consumerAgentId: room.consumerAgent.id,
          merchantCount: room.merchantAgents.length,
          messageCount: room.messages.length,
          createdAt: room.createdAt,
          updatedAt: room.updatedAt,
        })),
        total: rooms.length,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
