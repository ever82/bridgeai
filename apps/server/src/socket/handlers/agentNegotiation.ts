/**
 * Agent Negotiation Socket Handlers
 * Agent优惠协商谈判Socket事件处理器
 *
 * 处理协商谈判的实时WebSocket通信
 */

import type { Namespace } from 'socket.io';

import type { AuthenticatedSocket } from '../middleware/auth';
import { agentNegotiationService } from '../../services/ai/agentNegotiationService';
import { logger } from '../../utils/logger';

/**
 * 注册Agent协商Socket事件处理器
 */
export function registerAgentNegotiationHandlers(
  socket: AuthenticatedSocket,
  nsp: Namespace
): void {
  /**
   * 创建协商房间
   * Event: negotiation:create_room
   */
  socket.on(
    'negotiation:create_room',
    async (
      data: {
        consumerAgentId: string;
        merchantAgentIds: string[];
        consumerDemand: any;
        config?: any;
      },
      callback
    ) => {
      try {
        if (!socket.user?.id) {
          callback?.({ success: false, error: 'Authentication required' });
          return;
        }

        const { consumerAgentId, merchantAgentIds, consumerDemand, config } = data;

        logger.info('Socket: Creating negotiation room', {
          consumerAgentId,
          merchantCount: merchantAgentIds.length,
          socketId: socket.id,
        });

        // Create agent info objects
        const consumerAgent = {
          id: consumerAgentId,
          type: 'consumer' as const,
          name: '消费者Agent',
          profile: {
            userId: socket.user.id,
            preferences: consumerDemand.category ? [consumerDemand.category] : [],
          },
        };

        const merchantAgents = merchantAgentIds.map((id: string, index: number) => ({
          id,
          type: 'merchant' as const,
          name: `商家Agent ${index + 1}`,
        }));

        // Create room
        const room = await agentNegotiationService.createNegotiationRoom(
          consumerAgent,
          merchantAgents,
          consumerDemand,
          config
        );

        // Join the socket to the room
        socket.join(room.id);

        // Notify all participants
        nsp.to(room.id).emit('negotiation:room_created', {
          roomId: room.id,
          type: room.type,
          status: room.status,
          consumerAgent: room.consumerAgent,
          merchantAgents: room.merchantAgents,
          timestamp: new Date().toISOString(),
        });

        callback?.({
          success: true,
          data: {
            roomId: room.id,
            type: room.type,
            status: room.status,
            merchantCount: room.merchantAgents.length,
          },
        });
      } catch (error) {
        logger.error('Socket: Failed to create negotiation room', { error });
        callback?.({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to create room',
        });
      }
    }
  );

  /**
   * 生成消费者Agent开场白
   * Event: negotiation:generate_introduction
   */
  socket.on('negotiation:generate_introduction', async (data: { roomId: string }, callback) => {
    try {
      if (!socket.user?.id) {
        callback?.({ success: false, error: 'Authentication required' });
        return;
      }

      const { roomId } = data;

      logger.info('Socket: Generating consumer introduction', { roomId });

      const message = await agentNegotiationService.generateConsumerIntroduction(roomId);

      // Broadcast to room
      nsp.to(roomId).emit('negotiation:message', {
        roomId,
        message: {
          id: message.id,
          senderId: message.senderId,
          senderType: message.senderType,
          creditScore: message.creditScore,
          content: message.content,
          messageType: message.messageType,
          timestamp: message.timestamp,
        },
      });

      callback?.({
        success: true,
        data: {
          messageId: message.id,
          content: message.content,
        },
      });
    } catch (error) {
      logger.error('Socket: Failed to generate introduction', { error });
      callback?.({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate introduction',
      });
    }
  });

  /**
   * 提交商家优惠方案
   * Event: negotiation:submit_offer
   */
  socket.on(
    'negotiation:submit_offer',
    async (data: { roomId: string; merchantId: string; offer: any }, callback) => {
      try {
        if (!socket.user?.id) {
          callback?.({ success: false, error: 'Authentication required' });
          return;
        }

        const { roomId, merchantId, offer } = data;

        logger.info('Socket: Submitting merchant offer', { roomId, merchantId, offerId: offer.id });

        const message = await agentNegotiationService.generateMerchantOfferPresentation(
          roomId,
          merchantId,
          offer
        );

        // Broadcast to room
        nsp.to(roomId).emit('negotiation:message', {
          roomId,
          message: {
            id: message.id,
            senderId: message.senderId,
            senderType: message.senderType,
            creditScore: message.creditScore,
            content: message.content,
            messageType: message.messageType,
            offerId: message.metadata?.offerId,
            timestamp: message.timestamp,
          },
        });

        // Notify about offer update
        nsp.to(roomId).emit('negotiation:offer_submitted', {
          roomId,
          merchantId,
          offerId: offer.id,
          timestamp: new Date().toISOString(),
        });

        callback?.({
          success: true,
          data: {
            messageId: message.id,
            offerId: message.metadata?.offerId,
          },
        });
      } catch (error) {
        logger.error('Socket: Failed to submit offer', { error });
        callback?.({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to submit offer',
        });
      }
    }
  );

  /**
   * 生成智能追问问题
   * Event: negotiation:get_questions
   */
  socket.on(
    'negotiation:get_questions',
    async (data: { roomId: string; merchantId?: string }, callback) => {
      try {
        if (!socket.user?.id) {
          callback?.({ success: false, error: 'Authentication required' });
          return;
        }

        const { roomId, merchantId } = data;

        logger.info('Socket: Getting follow-up questions', { roomId, merchantId });

        const room = agentNegotiationService.getRoom(roomId);

        // Find target merchant
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
          callback?.({ success: false, error: 'No merchant with offers found' });
          return;
        }

        const questions = await agentNegotiationService.generateFollowUpQuestions(
          roomId,
          targetMerchantId
        );

        callback?.({
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
        logger.error('Socket: Failed to get questions', { error });
        callback?.({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to get questions',
        });
      }
    }
  );

  /**
   * 执行追问
   * Event: negotiation:ask_question
   */
  socket.on(
    'negotiation:ask_question',
    async (
      data: {
        roomId: string;
        question: string;
        targetMerchantId: string;
        questionType: string;
      },
      callback
    ) => {
      try {
        if (!socket.user?.id) {
          callback?.({ success: false, error: 'Authentication required' });
          return;
        }

        const { roomId, question, targetMerchantId, questionType } = data;

        logger.info('Socket: Asking follow-up question', {
          roomId,
          targetMerchantId,
          questionType,
        });

        const response = await agentNegotiationService.executeFollowUpQuestion(roomId, {
          question,
          targetMerchantId,
          questionType: questionType as any,
          context: '',
        });

        // Broadcast question and response to room
        const room = agentNegotiationService.getRoom(roomId);
        const messages = room.messages.slice(-2); // Get last 2 messages (question + response)

        for (const msg of messages) {
          nsp.to(roomId).emit('negotiation:message', {
            roomId,
            message: {
              id: msg.id,
              senderId: msg.senderId,
              senderType: msg.senderType,
              creditScore: msg.creditScore,
              content: msg.content,
              messageType: msg.messageType,
              timestamp: msg.timestamp,
            },
          });
        }

        callback?.({
          success: true,
          data: {
            response: {
              messageId: response.id,
              content: response.content,
              senderId: response.senderId,
              timestamp: response.timestamp,
            },
          },
        });
      } catch (error) {
        logger.error('Socket: Failed to ask question', { error });
        callback?.({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to ask question',
        });
      }
    }
  );

  /**
   * 执行多方案对比
   * Event: negotiation:compare_offers
   */
  socket.on('negotiation:compare_offers', async (data: { roomId: string }, callback) => {
    try {
      if (!socket.user?.id) {
        callback?.({ success: false, error: 'Authentication required' });
        return;
      }

      const { roomId } = data;

      logger.info('Socket: Comparing offers', { roomId });

      const comparisonResult = await agentNegotiationService.compareOffers(roomId);
      const reportMessage = await agentNegotiationService.generateComparisonReport(
        roomId,
        comparisonResult
      );

      // Broadcast comparison result
      nsp.to(roomId).emit('negotiation:comparison_complete', {
        roomId,
        comparison: {
          offers: comparisonResult.offers,
          summary: comparisonResult.summary,
          bestValueOffer: comparisonResult.bestValueOffer,
          bestMatchOffer: comparisonResult.bestMatchOffer,
        },
        timestamp: new Date().toISOString(),
      });

      // Broadcast comparison report message
      nsp.to(roomId).emit('negotiation:message', {
        roomId,
        message: {
          id: reportMessage.id,
          senderId: reportMessage.senderId,
          senderType: reportMessage.senderType,
          creditScore: reportMessage.creditScore,
          content: reportMessage.content,
          messageType: reportMessage.messageType,
          timestamp: reportMessage.timestamp,
        },
      });

      callback?.({
        success: true,
        data: {
          comparison: {
            offers: comparisonResult.offers,
            summary: comparisonResult.summary,
            bestValueOffer: comparisonResult.bestValueOffer,
            bestMatchOffer: comparisonResult.bestMatchOffer,
          },
        },
      });
    } catch (error) {
      logger.error('Socket: Failed to compare offers', { error });
      callback?.({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to compare offers',
      });
    }
  });

  /**
   * 生成最优方案推荐
   * Event: negotiation:get_recommendation
   */
  socket.on('negotiation:get_recommendation', async (data: { roomId: string }, callback) => {
    try {
      if (!socket.user?.id) {
        callback?.({ success: false, error: 'Authentication required' });
        return;
      }

      const { roomId } = data;

      logger.info('Socket: Getting recommendation', { roomId });

      const recommendation = await agentNegotiationService.generateRecommendation(roomId);
      const message = await agentNegotiationService.generateRecommendationMessage(
        roomId,
        recommendation
      );

      // Broadcast recommendation
      nsp.to(roomId).emit('negotiation:recommendation_ready', {
        roomId,
        recommendation: {
          recommendedOfferId: recommendation.recommendedOfferId,
          recommendedMerchantId: recommendation.recommendedMerchantId,
          recommendationReason: recommendation.recommendationReason,
          alternativeOffers: recommendation.alternativeOffers,
          confidence: recommendation.confidence,
          savingsEstimate: recommendation.savingsEstimate,
        },
        timestamp: new Date().toISOString(),
      });

      // Broadcast recommendation message
      nsp.to(roomId).emit('negotiation:message', {
        roomId,
        message: {
          id: message.id,
          senderId: message.senderId,
          senderType: message.senderType,
          creditScore: message.creditScore,
          content: message.content,
          messageType: message.messageType,
          timestamp: message.timestamp,
        },
      });

      callback?.({
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
        },
      });
    } catch (error) {
      logger.error('Socket: Failed to get recommendation', { error });
      callback?.({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get recommendation',
      });
    }
  });

  /**
   * 确认选择方案
   * Event: negotiation:confirm_selection
   */
  socket.on(
    'negotiation:confirm_selection',
    async (data: { roomId: string; offerId: string; confirmed: boolean }, callback) => {
      try {
        if (!socket.user?.id) {
          callback?.({ success: false, error: 'Authentication required' });
          return;
        }

        const { roomId, offerId, confirmed } = data;

        logger.info('Socket: Confirming selection', { roomId, offerId, confirmed });

        const room = await agentNegotiationService.confirmSelection(roomId, offerId, confirmed);

        // Broadcast confirmation
        nsp.to(roomId).emit('negotiation:selection_confirmed', {
          roomId,
          offerId,
          confirmed,
          status: room.status,
          timestamp: new Date().toISOString(),
        });

        // If confirmed, also broadcast completion message
        if (confirmed) {
          const lastMessage = room.messages[room.messages.length - 1];
          nsp.to(roomId).emit('negotiation:message', {
            roomId,
            message: {
              id: lastMessage.id,
              senderId: lastMessage.senderId,
              senderType: lastMessage.senderType,
              creditScore: lastMessage.creditScore,
              content: lastMessage.content,
              messageType: lastMessage.messageType,
              timestamp: lastMessage.timestamp,
            },
          });
        }

        callback?.({
          success: true,
          data: {
            confirmed,
            status: room.status,
          },
        });
      } catch (error) {
        logger.error('Socket: Failed to confirm selection', { error });
        callback?.({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to confirm selection',
        });
      }
    }
  );

  /**
   * 加入协商房间
   * Event: negotiation:join_room
   */
  socket.on('negotiation:join_room', async (data: { roomId: string }, callback) => {
    try {
      if (!socket.user?.id) {
        callback?.({ success: false, error: 'Authentication required' });
        return;
      }

      const { roomId } = data;

      logger.info('Socket: Joining negotiation room', { roomId, socketId: socket.id });

      // Verify room exists
      const room = agentNegotiationService.getRoom(roomId);

      // Join room
      socket.join(roomId);

      // Get messages
      const messages = agentNegotiationService.getRoomMessages(roomId);

      // Notify others
      socket.to(roomId).emit('negotiation:user_joined', {
        roomId,
        userId: socket.user.id,
        timestamp: new Date().toISOString(),
      });

      callback?.({
        success: true,
        data: {
          room: {
            id: room.id,
            type: room.type,
            status: room.status,
            consumerAgent: room.consumerAgent,
            merchantAgents: room.merchantAgents,
          },
          messages: messages.map(msg => ({
            id: msg.id,
            senderId: msg.senderId,
            senderType: msg.senderType,
            content: msg.content,
            messageType: msg.messageType,
            timestamp: msg.timestamp,
          })),
        },
      });
    } catch (error) {
      logger.error('Socket: Failed to join room', { error });
      callback?.({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to join room',
      });
    }
  });

  /**
   * 离开协商房间
   * Event: negotiation:leave_room
   */
  socket.on('negotiation:leave_room', (data: { roomId: string }, callback) => {
    try {
      const { roomId } = data;

      logger.info('Socket: Leaving negotiation room', { roomId, socketId: socket.id });

      socket.leave(roomId);

      // Notify others
      socket.to(roomId).emit('negotiation:user_left', {
        roomId,
        userId: socket.user?.id,
        timestamp: new Date().toISOString(),
      });

      callback?.({ success: true });
    } catch (error) {
      logger.error('Socket: Failed to leave room', { error });
      callback?.({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to leave room',
      });
    }
  });

  /**
   * 获取房间状态
   * Event: negotiation:get_status
   */
  socket.on('negotiation:get_status', async (data: { roomId: string }, callback) => {
    try {
      if (!socket.user?.id) {
        callback?.({ success: false, error: 'Authentication required' });
        return;
      }

      const { roomId } = data;

      const room = agentNegotiationService.getRoom(roomId);

      callback?.({
        success: true,
        data: {
          roomId: room.id,
          status: room.status,
          merchantCount: room.merchantAgents.length,
          messageCount: room.messages.length,
          currentRound: room.context.negotiationState.currentRound,
          hasComparison: !!room.context.comparisonResult,
          hasRecommendation: !!room.context.recommendation,
          updatedAt: room.updatedAt,
        },
      });
    } catch (error) {
      logger.error('Socket: Failed to get status', { error });
      callback?.({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get status',
      });
    }
  });
}

export default { registerAgentNegotiationHandlers };
