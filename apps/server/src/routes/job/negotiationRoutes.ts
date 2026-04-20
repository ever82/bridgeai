/**
 * Negotiation Routes
 * 薪资协商API路由
 */

import { Router, Request, Response } from 'express';

import { negotiationRoomService } from '../../services/job/negotiationRoom';
import { negotiationResultService } from '../../services/job/negotiationResult';
import { humanHandoffService, HandoffType, HandoffTrigger } from '../../services/job/humanHandoff';
import {
  NegotiationStatus,
  NegotiationTopic,
  MessageSender,
  isValidNegotiationStatus,
  isValidNegotiationTopic
} from '../../models/NegotiationRoom';

const router = Router();

/**
 * POST /api/job/negotiations
 * Create a new negotiation room
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      jobApplicationId,
      jobSeekerId,
      jobSeekerAgentId,
      employerId,
      employerAgentId,
      topics,
      maxRounds,
      initialOffer,
      targetRange,
      currency
    } = req.body;

    // Validate required fields
    if (!jobApplicationId || !jobSeekerId || !jobSeekerAgentId ||
        !employerId || !employerAgentId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: jobApplicationId, jobSeekerId, jobSeekerAgentId, employerId, employerAgentId'
      });
    }

    // Validate topics
    const validTopics = topics?.filter((t: string) => isValidNegotiationTopic(t)) || [NegotiationTopic.SALARY];

    const room = await negotiationRoomService.createRoom({
      jobApplicationId,
      jobSeekerId,
      jobSeekerAgentId,
      employerId,
      employerAgentId,
      topics: validTopics,
      maxRounds,
      initialOffer,
      targetRange,
      currency
    });

    return res.status(201).json({
      success: true,
      data: room
    });
  } catch (error) {
    console.error('Failed to create negotiation room:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

/**
 * GET /api/job/negotiations
 * List negotiation rooms
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const {
      jobApplicationId,
      jobSeekerId,
      employerId,
      status
    } = req.query;

    const filter: { jobApplicationId?: string; jobSeekerId?: string; employerId?: string; status?: NegotiationStatus } = {};
    if (jobApplicationId) filter.jobApplicationId = jobApplicationId as string;
    if (jobSeekerId) filter.jobSeekerId = jobSeekerId as string;
    if (employerId) filter.employerId = employerId as string;
    if (status && isValidNegotiationStatus(status as string)) {
      filter.status = status as NegotiationStatus;
    }

    const rooms = await negotiationRoomService.getRooms(filter);

    return res.status(200).json({
      success: true,
      data: rooms
    });
  } catch (error) {
    console.error('Failed to get negotiation rooms:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

/**
 * GET /api/job/negotiations/:id
 * Get a specific negotiation room
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const room = await negotiationRoomService.getRoom(id);

    if (!room) {
      return res.status(404).json({
        success: false,
        error: 'Negotiation room not found'
      });
    }

    return res.status(200).json({
      success: true,
      data: room
    });
  } catch (error) {
    console.error('Failed to get negotiation room:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

/**
 * POST /api/job/negotiations/:id/start
 * Start negotiation
 */
router.post('/:id/start', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const room = await negotiationRoomService.startNegotiation(id);

    if (!room) {
      return res.status(404).json({
        success: false,
        error: 'Negotiation room not found'
      });
    }

    return res.status(200).json({
      success: true,
      data: room
    });
  } catch (error) {
    console.error('Failed to start negotiation:', error);
    return res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

/**
 * POST /api/job/negotiations/:id/messages
 * Send a message in the negotiation room
 */
router.post('/:id/messages', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { sender, senderId, content, topic, isCounterOffer, offerValue, metadata } = req.body;

    if (!sender || !senderId || !content) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: sender, senderId, content'
      });
    }

    if (!Object.values(MessageSender).includes(sender as MessageSender)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid sender value'
      });
    }

    const message = await negotiationRoomService.sendMessage({
      roomId: id,
      sender: sender as MessageSender,
      senderId,
      content,
      topic: topic as NegotiationTopic,
      isCounterOffer,
      offerValue,
      metadata
    });

    return res.status(201).json({
      success: true,
      data: message
    });
  } catch (error) {
    console.error('Failed to send message:', error);
    return res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

/**
 * GET /api/job/negotiations/:id/messages
 * Get messages in the negotiation room
 */
router.get('/:id/messages', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { round } = req.query;

    const messages = await negotiationRoomService.getMessages(
      id,
      round ? parseInt(round as string, 10) : undefined
    );

    return res.status(200).json({
      success: true,
      data: messages
    });
  } catch (error) {
    console.error('Failed to get messages:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

/**
 * POST /api/job/negotiations/:id/advance
 * Advance to next round
 */
router.post('/:id/advance', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const newRound = await negotiationRoomService.advanceRound(id);

    if (!newRound) {
      return res.status(400).json({
        success: false,
        error: 'Failed to advance round. May be at max rounds or room not found.'
      });
    }

    return res.status(200).json({
      success: true,
      data: newRound
    });
  } catch (error) {
    console.error('Failed to advance round:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

/**
 * GET /api/job/negotiations/:id/progress
 * Get negotiation progress
 */
router.get('/:id/progress', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const progress = await negotiationRoomService.getProgress(id);

    if (!progress) {
      return res.status(404).json({
        success: false,
        error: 'Negotiation room not found'
      });
    }

    return res.status(200).json({
      success: true,
      data: progress
    });
  } catch (error) {
    console.error('Failed to get progress:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

/**
 * GET /api/job/negotiations/:id/history
 * Get negotiation history
 */
router.get('/:id/history', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const history = await negotiationRoomService.getHistory(id);

    if (!history) {
      return res.status(404).json({
        success: false,
        error: 'Negotiation room not found'
      });
    }

    return res.status(200).json({
      success: true,
      data: history
    });
  } catch (error) {
    console.error('Failed to get history:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

/**
 * POST /api/job/negotiations/:id/confirm
 * Confirm agreement
 */
router.post('/:id/confirm', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { party, conditions, notes } = req.body;

    if (!party || (party !== 'jobseeker' && party !== 'employer')) {
      return res.status(400).json({
        success: false,
        error: 'Invalid party. Must be "jobseeker" or "employer"'
      });
    }

    const confirmation = await negotiationResultService.confirmAgreement(
      id,
      party,
      conditions,
      notes
    );

    // Check if both parties have confirmed
    const mutualAgreement = await negotiationResultService.checkMutualAgreement(id);

    return res.status(200).json({
      success: true,
      data: {
        confirmation,
        mutualAgreement
      }
    });
  } catch (error) {
    console.error('Failed to confirm agreement:', error);
    return res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

/**
 * POST /api/job/negotiations/:id/finalize
 * Finalize negotiation with agreement
 */
router.post('/:id/finalize', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { agreedAmount, agreedBenefits } = req.body;

    if (!agreedAmount) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: agreedAmount'
      });
    }

    const result = await negotiationResultService.finalizeAgreement(
      id,
      agreedAmount,
      agreedBenefits || []
    );

    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Failed to finalize negotiation:', error);
    return res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

/**
 * POST /api/job/negotiations/:id/reject
 * Reject the offer
 */
router.post('/:id/reject', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { rejectedBy, reason, alternativeProposed, alternativeAmount } = req.body;

    if (!rejectedBy || !reason) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: rejectedBy, reason'
      });
    }

    const rejection = await negotiationResultService.recordRejection(
      id,
      rejectedBy as 'jobseeker' | 'employer',
      reason,
      alternativeProposed,
      alternativeAmount
    );

    return res.status(200).json({
      success: true,
      data: rejection
    });
  } catch (error) {
    console.error('Failed to record rejection:', error);
    return res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

/**
 * GET /api/job/negotiations/:id/result
 * Get negotiation result
 */
router.get('/:id/result', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await negotiationResultService.getResult(id);

    if (!result) {
      return res.status(404).json({
        success: false,
        error: 'Negotiation result not found or negotiation not completed'
      });
    }

    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Failed to get result:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

/**
 * GET /api/job/negotiations/:id/export
 * Export negotiation
 */
router.get('/:id/export', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { type } = req.query;

    const exportType = (type as 'pdf' | 'json' | 'csv') || 'json';

    const exportData = await negotiationResultService.exportNegotiation(id, exportType);

    res.setHeader('Content-Type', exportType === 'json' ? 'application/json' : 'text/plain');
    res.setHeader('Content-Disposition', `attachment; filename="negotiation_${id}.${exportType}"`);

    return res.send(exportData.data);
  } catch (error) {
    console.error('Failed to export negotiation:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

/**
 * POST /api/job/negotiations/:id/handoff
 * Request human handoff
 */
router.post('/:id/handoff', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { reason, priority, context } = req.body;

    const room = await negotiationRoomService.getRoom(id);
    if (!room) {
      return res.status(404).json({
        success: false,
        error: 'Negotiation room not found'
      });
    }

    const session = await humanHandoffService.requestHandoff({
      type: HandoffType.NEGOTIATION,
      entityId: id,
      trigger: HandoffTrigger.USER_REQUESTED,
      reason: reason || 'User requested human assistance',
      context: context || {
        jobSeekerId: room.jobSeekerId,
        employerId: room.employerId,
        jobApplicationId: room.jobApplicationId
      },
      priority: priority || 'medium'
    });

    return res.status(201).json({
      success: true,
      data: session
    });
  } catch (error) {
    console.error('Failed to request handoff:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

/**
 * POST /api/job/negotiations/:id/cancel
 * Cancel negotiation
 */
router.post('/:id/cancel', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const room = await negotiationResultService.cancelNegotiation(id, reason);

    if (!room) {
      return res.status(404).json({
        success: false,
        error: 'Negotiation room not found'
      });
    }

    return res.status(200).json({
      success: true,
      data: room
    });
  } catch (error) {
    console.error('Failed to cancel negotiation:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

export default router;
