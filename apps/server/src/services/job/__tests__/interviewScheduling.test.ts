/**
 * @jest-environment node
 */

import {
  Interview,
  InterviewStatus,
  InterviewType,
  InterviewRound,
  createInterview,
  createTimeSlot,
  createInterviewSchedule,
  isInterviewUpcoming,
  getInterviewTimeRemaining,
  canReschedule,
  shouldSendReminder,
  getNextRound,
  aggregateFeedback
} from '../../../models/Interview';
import { InterviewSchedulingService } from '../interviewScheduling';

describe('InterviewSchedulingService', () => {
  let service: InterviewSchedulingService;

  beforeEach(() => {
    service = new InterviewSchedulingService();
    service.clearAll();
  });

  describe('createInterview', () => {
    it('should create a new interview', async () => {
      const request = {
        jobApplicationId: 'app_123',
        jobSeekerId: 'seeker_123',
        employerId: 'employer_123',
        positionId: 'pos_123',
        round: InterviewRound.TECHNICAL,
        roundNumber: 1,
        type: InterviewType.VIDEO,
        interviewers: ['interviewer_1', 'interviewer_2'],
        notes: 'Technical interview'
      };

      const interview = await service.createInterview(request);

      expect(interview).toBeDefined();
      expect(interview.jobApplicationId).toBe(request.jobApplicationId);
      expect(interview.jobSeekerId).toBe(request.jobSeekerId);
      expect(interview.employerId).toBe(request.employerId);
      expect(interview.status).toBe(InterviewStatus.PENDING);
      expect(interview.type).toBe(request.type);
      expect(interview.round).toBe(request.round);
      expect(interview.roundNumber).toBe(request.roundNumber);
      expect(interview.interviewers).toEqual(request.interviewers);
    });

    it('should create interview with default values', async () => {
      const request = {
        jobApplicationId: 'app_123',
        jobSeekerId: 'seeker_123',
        employerId: 'employer_123',
        positionId: 'pos_123',
        round: InterviewRound.SCREENING,
        type: InterviewType.PHONE
      };

      const interview = await service.createInterview(request);

      expect(interview.roundNumber).toBe(1);
      expect(interview.proposedSlots).toEqual([]);
      expect(interview.interviewers).toEqual([]);
    });
  });

  describe('getInterview', () => {
    it('should return interview by id', async () => {
      const request = {
        jobApplicationId: 'app_123',
        jobSeekerId: 'seeker_123',
        employerId: 'employer_123',
        positionId: 'pos_123',
        round: InterviewRound.TECHNICAL,
        type: InterviewType.VIDEO
      };

      const created = await service.createInterview(request);
      const retrieved = await service.getInterview(created.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(created.id);
    });

    it('should return null for non-existent interview', async () => {
      const interview = await service.getInterview('non_existent_id');
      expect(interview).toBeNull();
    });
  });

  describe('getInterviews', () => {
    it('should filter interviews by job application id', async () => {
      const request1 = {
        jobApplicationId: 'app_123',
        jobSeekerId: 'seeker_123',
        employerId: 'employer_123',
        positionId: 'pos_123',
        round: InterviewRound.TECHNICAL,
        type: InterviewType.VIDEO
      };

      const request2 = {
        jobApplicationId: 'app_456',
        jobSeekerId: 'seeker_456',
        employerId: 'employer_456',
        positionId: 'pos_456',
        round: InterviewRound.SCREENING,
        type: InterviewType.PHONE
      };

      await service.createInterview(request1);
      await service.createInterview(request2);

      const interviews = await service.getInterviews({ jobApplicationId: 'app_123' });

      expect(interviews).toHaveLength(1);
      expect(interviews[0].jobApplicationId).toBe('app_123');
    });

    it('should filter interviews by status', async () => {
      const request = {
        jobApplicationId: 'app_123',
        jobSeekerId: 'seeker_123',
        employerId: 'employer_123',
        positionId: 'pos_123',
        round: InterviewRound.TECHNICAL,
        type: InterviewType.VIDEO
      };

      await service.createInterview(request);

      const interviews = await service.getInterviews({ status: InterviewStatus.PENDING });

      expect(interviews.length).toBeGreaterThan(0);
      expect(interviews.every(i => i.status === InterviewStatus.PENDING)).toBe(true);
    });
  });

  describe('proposeTimeSlots', () => {
    it('should propose time slots for an interview', async () => {
      const interviewRequest = {
        jobApplicationId: 'app_123',
        jobSeekerId: 'seeker_123',
        employerId: 'employer_123',
        positionId: 'pos_123',
        round: InterviewRound.TECHNICAL,
        type: InterviewType.VIDEO
      };

      const interview = await service.createInterview(interviewRequest);

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const slots = await service.proposeTimeSlots({
        interviewId: interview.id,
        slots: [
          {
            startTime: tomorrow,
            endTime: new Date(tomorrow.getTime() + 60 * 60 * 1000),
            timezone: 'UTC',
            proposedBy: 'employer_123'
          }
        ]
      });

      expect(slots).toHaveLength(1);
      expect(slots[0].duration).toBe(60);
      expect(slots[0].isAvailable).toBe(true);

      const updatedInterview = await service.getInterview(interview.id);
      expect(updatedInterview?.proposedSlots).toHaveLength(1);
      expect(updatedInterview?.status).toBe(InterviewStatus.PROPOSED);
    });

    it('should throw error if interview not found', async () => {
      await expect(service.proposeTimeSlots({
        interviewId: 'non_existent',
        slots: []
      })).rejects.toThrow('Interview not found');
    });
  });

  describe('scheduleInterview', () => {
    it('should schedule an interview with a time slot', async () => {
      const interviewRequest = {
        jobApplicationId: 'app_123',
        jobSeekerId: 'seeker_123',
        employerId: 'employer_123',
        positionId: 'pos_123',
        round: InterviewRound.TECHNICAL,
        type: InterviewType.VIDEO
      };

      const interview = await service.createInterview(interviewRequest);

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const [slot] = await service.proposeTimeSlots({
        interviewId: interview.id,
        slots: [{
          startTime: tomorrow,
          endTime: new Date(tomorrow.getTime() + 60 * 60 * 1000),
          timezone: 'UTC',
          proposedBy: 'employer_123'
        }]
      });

      const scheduled = await service.scheduleInterview({
        interviewId: interview.id,
        slotId: slot.id,
        meetingLink: 'https://meet.example.com/123'
      });

      expect(scheduled.status).toBe(InterviewStatus.CONFIRMED);
      expect(scheduled.schedule).toBeDefined();
      expect(scheduled.schedule?.meetingLink).toBe('https://meet.example.com/123');
      expect(scheduled.confirmedSlotId).toBe(slot.id);
    });
  });

  describe('rescheduleInterview', () => {
    it('should reschedule an interview', async () => {
      const interviewRequest = {
        jobApplicationId: 'app_123',
        jobSeekerId: 'seeker_123',
        employerId: 'employer_123',
        positionId: 'pos_123',
        round: InterviewRound.TECHNICAL,
        type: InterviewType.VIDEO
      };

      const interview = await service.createInterview(interviewRequest);

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const [slot1, slot2] = await service.proposeTimeSlots({
        interviewId: interview.id,
        slots: [
          {
            startTime: tomorrow,
            endTime: new Date(tomorrow.getTime() + 60 * 60 * 1000),
            timezone: 'UTC',
            proposedBy: 'employer_123'
          },
          {
            startTime: new Date(tomorrow.getTime() + 2 * 60 * 60 * 1000),
            endTime: new Date(tomorrow.getTime() + 3 * 60 * 60 * 1000),
            timezone: 'UTC',
            proposedBy: 'employer_123'
          }
        ]
      });

      await service.scheduleInterview({
        interviewId: interview.id,
        slotId: slot1.id
      });

      const rescheduled = await service.rescheduleInterview(
        interview.id,
        slot2.id,
        'Conflict with another meeting'
      );

      expect(rescheduled.status).toBe(InterviewStatus.RESCHEDULED);
      expect(rescheduled.confirmedSlotId).toBe(slot2.id);
    });
  });

  describe('cancelInterview', () => {
    it('should cancel an interview', async () => {
      const interviewRequest = {
        jobApplicationId: 'app_123',
        jobSeekerId: 'seeker_123',
        employerId: 'employer_123',
        positionId: 'pos_123',
        round: InterviewRound.TECHNICAL,
        type: InterviewType.VIDEO
      };

      const interview = await service.createInterview(interviewRequest);
      const cancelled = await service.cancelInterview(interview.id, 'seeker_123', 'Got another offer');

      expect(cancelled).toBeDefined();
      expect(cancelled?.status).toBe(InterviewStatus.CANCELLED);
      expect(cancelled?.cancellationReason).toBe('Got another offer');
      expect(cancelled?.cancelledBy).toBe('seeker_123');
    });
  });

  describe('submitFeedback', () => {
    it('should submit feedback for an interview', async () => {
      const interviewRequest = {
        jobApplicationId: 'app_123',
        jobSeekerId: 'seeker_123',
        employerId: 'employer_123',
        positionId: 'pos_123',
        round: InterviewRound.TECHNICAL,
        type: InterviewType.VIDEO,
        interviewers: ['interviewer_1']
      };

      const interview = await service.createInterview(interviewRequest);

      const feedback = await service.submitFeedback({
        interviewId: interview.id,
        interviewerId: 'interviewer_1',
        rating: 4,
        technicalSkills: 4,
        communicationSkills: 5,
        cultureFit: 4,
        strengths: ['Strong technical knowledge', 'Good problem solving'],
        weaknesses: ['Could improve communication'],
        overallImpression: 'Great candidate, would recommend hiring',
        recommendation: 'hire'
      });

      expect(feedback).toBeDefined();
      expect(feedback.rating).toBe(4);
      expect(feedback.recommendation).toBe('hire');

      const updatedInterview = await service.getInterview(interview.id);
      expect(updatedInterview?.feedbacks).toHaveLength(1);
    });
  });

  describe('getInterviewSeries', () => {
    it('should return interview series for an application', async () => {
      const baseRequest = {
        jobApplicationId: 'app_123',
        jobSeekerId: 'seeker_123',
        employerId: 'employer_123',
        positionId: 'pos_123'
      };

      await service.createInterview({
        ...baseRequest,
        round: InterviewRound.SCREENING,
        roundNumber: 1,
        type: InterviewType.PHONE
      });

      await service.createInterview({
        ...baseRequest,
        round: InterviewRound.TECHNICAL,
        roundNumber: 2,
        type: InterviewType.VIDEO
      });

      const series = await service.getInterviewSeries('app_123');

      expect(series.applicationId).toBe('app_123');
      expect(series.interviews).toHaveLength(2);
      expect(series.totalRounds).toBe(2);
      expect(series.completedRounds).toBe(0);
      expect(series.overallStatus).toBe('in_progress');
    });
  });
});

describe('Interview Model Helpers', () => {
  describe('createInterview', () => {
    it('should create an interview with correct initial state', () => {
      const input = {
        jobApplicationId: 'app_123',
        jobSeekerId: 'seeker_123',
        employerId: 'employer_123',
        positionId: 'pos_123',
        round: InterviewRound.TECHNICAL,
        type: InterviewType.VIDEO
      };

      const interview = createInterview(input, () => 'test_id');

      expect(interview.id).toBe('test_id');
      expect(interview.status).toBe(InterviewStatus.PENDING);
      expect(interview.roundNumber).toBe(1);
      expect(interview.proposedSlots).toEqual([]);
      expect(interview.feedbacks).toEqual([]);
    });
  });

  describe('createTimeSlot', () => {
    it('should create a time slot with correct duration', () => {
      const startTime = new Date('2026-01-01T10:00:00Z');
      const endTime = new Date('2026-01-01T11:00:00Z');

      const slot = createTimeSlot(startTime, endTime, 'UTC', () => 'slot_id');

      expect(slot.id).toBe('slot_id');
      expect(slot.duration).toBe(60);
      expect(slot.isAvailable).toBe(true);
    });
  });

  describe('isInterviewUpcoming', () => {
    it('should return true for confirmed future interview', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const interview = {
        status: InterviewStatus.CONFIRMED,
        schedule: {
          scheduledAt: tomorrow
        }
      } as Interview;

      expect(isInterviewUpcoming(interview)).toBe(true);
    });

    it('should return false for past interview', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const interview = {
        status: InterviewStatus.CONFIRMED,
        schedule: {
          scheduledAt: yesterday
        }
      } as Interview;

      expect(isInterviewUpcoming(interview)).toBe(false);
    });
  });

  describe('canReschedule', () => {
    it('should allow rescheduling pending interviews', () => {
      const interview = { status: InterviewStatus.PENDING } as Interview;
      expect(canReschedule(interview)).toBe(true);
    });

    it('should allow rescheduling confirmed interviews', () => {
      const interview = { status: InterviewStatus.CONFIRMED } as Interview;
      expect(canReschedule(interview)).toBe(true);
    });

    it('should not allow rescheduling cancelled interviews', () => {
      const interview = { status: InterviewStatus.CANCELLED } as Interview;
      expect(canReschedule(interview)).toBe(false);
    });
  });

  describe('getNextRound', () => {
    it('should return next round after screening', () => {
      const nextRound = getNextRound(InterviewRound.SCREENING);
      expect(nextRound).toBe(InterviewRound.TECHNICAL);
    });

    it('should return null for final round', () => {
      const nextRound = getNextRound(InterviewRound.OFFER_DISCUSSION);
      expect(nextRound).toBeNull();
    });
  });

  describe('aggregateFeedback', () => {
    it('should return null for interview with no feedback', () => {
      const interview = { id: 'test', feedbacks: [] } as unknown as Interview;
      expect(aggregateFeedback(interview)).toBeNull();
    });

    it('should aggregate multiple feedbacks', () => {
      const interview = {
        id: 'test',
        feedbacks: [
          { rating: 4, recommendation: 'hire' as const, strengths: ['Good'], weaknesses: ['None'] },
          { rating: 5, recommendation: 'strong_hire' as const, strengths: ['Excellent'], weaknesses: ['Minor'] }
        ]
      } as unknown as Interview;

      const result = aggregateFeedback(interview);

      expect(result).toBeDefined();
      expect(result?.averageRating).toBe(4.5);
      expect(result?.recommendation).toBe('hire');
    });
  });
});
