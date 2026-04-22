/**
 * Interview Routes
 * 面试安排API路由
 */

import { Router, Request, Response } from 'express';

import { interviewSchedulingService } from '../../services/job/interviewScheduling';
import { humanHandoffService, HandoffType, HandoffTrigger } from '../../services/job/humanHandoff';
import {
  InterviewStatus,
  InterviewType,
  InterviewRound,
  isValidInterviewStatus,
  isValidInterviewType,
  isValidInterviewRound
} from '../../models/Interview';

const router: Router = Router();

/**
 * POST /api/job/interviews
 * Create a new interview
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      jobApplicationId,
      jobSeekerId,
      employerId,
      positionId,
      round,
      roundNumber,
      type,
      interviewers,
      notes
    } = req.body;

    // Validate required fields
    if (!jobApplicationId || !jobSeekerId || !employerId || !positionId || !type) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: jobApplicationId, jobSeekerId, employerId, positionId, type'
      });
    }

    // Validate type
    if (!isValidInterviewType(type)) {
      return res.status(400).json({
        success: false,
        error: `Invalid interview type: ${type}`
      });
    }

    // Validate round
    let validRound: InterviewRound = InterviewRound.SCREENING;
    if (round) {
      if (!isValidInterviewRound(round)) {
        return res.status(400).json({
          success: false,
          error: `Invalid interview round: ${round}`
        });
      }
      validRound = round as InterviewRound;
    }

    const interview = await interviewSchedulingService.createInterview({
      jobApplicationId,
      jobSeekerId,
      employerId,
      positionId,
      round: validRound,
      roundNumber,
      type: type as InterviewType,
      interviewers,
      notes
    });

    return res.status(201).json({
      success: true,
      data: interview
    });
  } catch (error) {
    console.error('Failed to create interview:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

/**
 * GET /api/job/interviews
 * List interviews
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const {
      jobApplicationId,
      jobSeekerId,
      employerId,
      status,
      type,
      round,
      upcoming
    } = req.query;

    const filter: { jobApplicationId?: string; jobSeekerId?: string; employerId?: string; status?: InterviewStatus; type?: InterviewType; round?: InterviewRound; upcoming?: boolean } = {};
    if (jobApplicationId) filter.jobApplicationId = jobApplicationId as string;
    if (jobSeekerId) filter.jobSeekerId = jobSeekerId as string;
    if (employerId) filter.employerId = employerId as string;
    if (status && isValidInterviewStatus(status as string)) {
      filter.status = status as InterviewStatus;
    }
    if (type && isValidInterviewType(type as string)) {
      filter.type = type as InterviewType;
    }
    if (round && isValidInterviewRound(round as string)) {
      filter.round = round as InterviewRound;
    }
    if (upcoming === 'true') filter.upcoming = true;

    const interviews = await interviewSchedulingService.getInterviews(filter);

    return res.status(200).json({
      success: true,
      data: interviews
    });
  } catch (error) {
    console.error('Failed to get interviews:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

/**
 * GET /api/job/interviews/:id
 * Get a specific interview
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const interview = await interviewSchedulingService.getInterview(id);

    if (!interview) {
      return res.status(404).json({
        success: false,
        error: 'Interview not found'
      });
    }

    return res.status(200).json({
      success: true,
      data: interview
    });
  } catch (error) {
    console.error('Failed to get interview:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

/**
 * PUT /api/job/interviews/:id
 * Update an interview
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const update = req.body;

    const interview = await interviewSchedulingService.updateInterview(id, update);

    if (!interview) {
      return res.status(404).json({
        success: false,
        error: 'Interview not found'
      });
    }

    return res.status(200).json({
      success: true,
      data: interview
    });
  } catch (error) {
    console.error('Failed to update interview:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

/**
 * POST /api/job/interviews/:id/slots
 * Propose time slots for an interview
 */
router.post('/:id/slots', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { slots } = req.body;

    if (!slots || !Array.isArray(slots) || slots.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Missing or invalid slots array'
      });
    }

    // Validate slots
    for (const slot of slots) {
      if (!slot.startTime || !slot.endTime || !slot.timezone || !slot.proposedBy) {
        return res.status(400).json({
          success: false,
          error: 'Each slot must have startTime, endTime, timezone, and proposedBy'
        });
      }
    }

    const createdSlots = await interviewSchedulingService.proposeTimeSlots({
      interviewId: id,
      slots: slots.map(s => ({
        startTime: new Date(s.startTime),
        endTime: new Date(s.endTime),
        timezone: s.timezone,
        proposedBy: s.proposedBy
      }))
    });

    return res.status(201).json({
      success: true,
      data: createdSlots
    });
  } catch (error) {
    console.error('Failed to propose time slots:', error);
    return res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

/**
 * GET /api/job/interviews/:id/slots
 * Get available time slots for an interview
 */
router.get('/:id/slots', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const slots = await interviewSchedulingService.getAvailableSlots(id);

    return res.status(200).json({
      success: true,
      data: slots
    });
  } catch (error) {
    console.error('Failed to get slots:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

/**
 * POST /api/job/interviews/:id/schedule
 * Schedule an interview with a specific slot
 */
router.post('/:id/schedule', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { slotId, location, meetingLink, dialInNumber, conferenceId } = req.body;

    if (!slotId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: slotId'
      });
    }

    const interview = await interviewSchedulingService.scheduleInterview({
      interviewId: id,
      slotId,
      location,
      meetingLink,
      dialInNumber,
      conferenceId
    });

    return res.status(200).json({
      success: true,
      data: interview
    });
  } catch (error) {
    console.error('Failed to schedule interview:', error);
    return res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

/**
 * POST /api/job/interviews/:id/reschedule
 * Reschedule an interview
 */
router.post('/:id/reschedule', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { slotId, reason } = req.body;

    if (!slotId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: slotId'
      });
    }

    const interview = await interviewSchedulingService.rescheduleInterview(id, slotId, reason);

    return res.status(200).json({
      success: true,
      data: interview
    });
  } catch (error) {
    console.error('Failed to reschedule interview:', error);
    return res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

/**
 * POST /api/job/interviews/:id/cancel
 * Cancel an interview
 */
router.post('/:id/cancel', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { cancelledBy, reason } = req.body;

    if (!cancelledBy) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: cancelledBy'
      });
    }

    const interview = await interviewSchedulingService.cancelInterview(id, cancelledBy, reason);

    if (!interview) {
      return res.status(404).json({
        success: false,
        error: 'Interview not found'
      });
    }

    return res.status(200).json({
      success: true,
      data: interview
    });
  } catch (error) {
    console.error('Failed to cancel interview:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

/**
 * POST /api/job/interviews/:id/complete
 * Mark interview as completed
 */
router.post('/:id/complete', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const interview = await interviewSchedulingService.completeInterview(id);

    if (!interview) {
      return res.status(404).json({
        success: false,
        error: 'Interview not found'
      });
    }

    return res.status(200).json({
      success: true,
      data: interview
    });
  } catch (error) {
    console.error('Failed to complete interview:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

/**
 * POST /api/job/interviews/:id/feedback
 * Submit feedback for an interview
 */
router.post('/:id/feedback', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      interviewerId,
      rating,
      technicalSkills,
      communicationSkills,
      cultureFit,
      strengths,
      weaknesses,
      overallImpression,
      recommendation,
      notes
    } = req.body;

    if (!interviewerId || !rating || !strengths || !weaknesses || !overallImpression || !recommendation) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: interviewerId, rating, strengths, weaknesses, overallImpression, recommendation'
      });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        error: 'Rating must be between 1 and 5'
      });
    }

    const validRecommendations = ['strong_hire', 'hire', 'neutral', 'no_hire', 'strong_no_hire'];
    if (!validRecommendations.includes(recommendation)) {
      return res.status(400).json({
        success: false,
        error: `Invalid recommendation. Must be one of: ${validRecommendations.join(', ')}`
      });
    }

    const feedback = await interviewSchedulingService.submitFeedback({
      interviewId: id,
      interviewerId,
      rating,
      technicalSkills,
      communicationSkills,
      cultureFit,
      strengths,
      weaknesses,
      overallImpression,
      recommendation: recommendation as 'strong_hire' | 'hire' | 'neutral' | 'no_hire' | 'strong_no_hire',
      notes
    });

    return res.status(201).json({
      success: true,
      data: feedback
    });
  } catch (error) {
    console.error('Failed to submit feedback:', error);
    return res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

/**
 * GET /api/job/interviews/:id/feedback
 * Get feedback for an interview
 */
router.get('/:id/feedback', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const feedback = await interviewSchedulingService.getFeedback(id);

    return res.status(200).json({
      success: true,
      data: feedback
    });
  } catch (error) {
    console.error('Failed to get feedback:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

/**
 * GET /api/job/interviews/:id/aggregate-feedback
 * Get aggregated feedback for an interview
 */
router.get('/:id/aggregate-feedback', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const aggregate = await interviewSchedulingService.aggregateFeedback(id);

    if (!aggregate) {
      return res.status(404).json({
        success: false,
        error: 'No feedback available for aggregation'
      });
    }

    return res.status(200).json({
      success: true,
      data: aggregate
    });
  } catch (error) {
    console.error('Failed to aggregate feedback:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

/**
 * GET /api/job/interviews/:id/time-remaining
 * Get time remaining until interview
 */
router.get('/:id/time-remaining', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const timeRemaining = await interviewSchedulingService.getTimeRemaining(id);

    if (!timeRemaining) {
      return res.status(404).json({
        success: false,
        error: 'Interview not found or not scheduled'
      });
    }

    return res.status(200).json({
      success: true,
      data: timeRemaining
    });
  } catch (error) {
    console.error('Failed to get time remaining:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

/**
 * GET /api/job/interviews/:id/next-round
 * Get next interview round
 */
router.get('/:id/next-round', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const nextRound = await interviewSchedulingService.getNextRound(id);

    return res.status(200).json({
      success: true,
      data: { nextRound }
    });
  } catch (error) {
    console.error('Failed to get next round:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

/**
 * GET /api/job/applications/:applicationId/interview-series
 * Get interview series for a job application
 */
router.get('/application/:applicationId/series', async (req: Request, res: Response) => {
  try {
    const { applicationId } = req.params;
    const series = await interviewSchedulingService.getInterviewSeries(applicationId);

    return res.status(200).json({
      success: true,
      data: series
    });
  } catch (error) {
    console.error('Failed to get interview series:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

/**
 * POST /api/job/interviews/:id/handoff
 * Request human handoff for interview
 */
router.post('/:id/handoff', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { reason, priority, context } = req.body;

    const interview = await interviewSchedulingService.getInterview(id);
    if (!interview) {
      return res.status(404).json({
        success: false,
        error: 'Interview not found'
      });
    }

    const session = await humanHandoffService.requestHandoff({
      type: HandoffType.INTERVIEW,
      entityId: id,
      trigger: HandoffTrigger.INTERVIEW_SCHEDULING_CONFLICT,
      reason: reason || 'Interview scheduling assistance needed',
      context: context || {
        jobSeekerId: interview.jobSeekerId,
        employerId: interview.employerId,
        jobApplicationId: interview.jobApplicationId
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
 * GET /api/job/interviews/reminders/pending
 * Get interviews needing reminders
 */
router.get('/reminders/pending', async (_req: Request, res: Response) => {
  try {
    const interviews = await interviewSchedulingService.getUpcomingInterviewsNeedingReminders();

    return res.status(200).json({
      success: true,
      data: interviews
    });
  } catch (error) {
    console.error('Failed to get pending reminders:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

/**
 * POST /api/job/interviews/:id/send-reminder
 * Send reminder for an interview
 */
router.post('/:id/send-reminder', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const sent = await interviewSchedulingService.sendReminder(id);

    return res.status(200).json({
      success: sent,
      data: { sent }
    });
  } catch (error) {
    console.error('Failed to send reminder:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

export default router;
