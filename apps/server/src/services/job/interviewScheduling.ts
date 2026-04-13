/**
 * Interview Scheduling Service
 * 面试安排服务
 */

import {
  Interview,
  InterviewCreateInput,
  InterviewUpdateInput,
  InterviewStatus,
  InterviewType,
  InterviewRound,
  TimeSlot,
  InterviewSchedule,
  InterviewFeedback,
  createInterview,
  createTimeSlot,
  createInterviewSchedule,
  isInterviewUpcoming,
  getInterviewTimeRemaining,
  canReschedule,
  shouldSendReminder,
  getNextRound,
  aggregateFeedback,
  isValidInterviewStatus,
  isValidInterviewType,
  isValidInterviewRound
} from '../../models/Interview';

// In-memory storage (replace with database in production)
const interviews = new Map<string, Interview>();
const timeSlots = new Map<string, TimeSlot[]>();
const schedules = new Map<string, InterviewSchedule>();
const feedbacks = new Map<string, InterviewFeedback[]>();

export interface CreateInterviewRequest {
  jobApplicationId: string;
  jobSeekerId: string;
  employerId: string;
  positionId: string;
  round: InterviewRound;
  roundNumber?: number;
  type: InterviewType;
  interviewers?: string[];
  notes?: string;
}

export interface ScheduleInterviewRequest {
  interviewId: string;
  slotId: string;
  location?: string;
  meetingLink?: string;
  dialInNumber?: string;
  conferenceId?: string;
}

export interface ProposeTimeSlotsRequest {
  interviewId: string;
  slots: Array<{
    startTime: Date;
    endTime: Date;
    timezone: string;
    proposedBy: string;
  }>;
}

export interface SubmitFeedbackRequest {
  interviewId: string;
  interviewerId: string;
  rating: number;
  technicalSkills?: number;
  communicationSkills?: number;
  cultureFit?: number;
  strengths: string[];
  weaknesses: string[];
  overallImpression: string;
  recommendation: 'strong_hire' | 'hire' | 'neutral' | 'no_hire' | 'strong_no_hire';
  notes?: string;
}

export interface InterviewFilter {
  jobApplicationId?: string;
  jobSeekerId?: string;
  employerId?: string;
  status?: InterviewStatus;
  type?: InterviewType;
  round?: InterviewRound;
  upcoming?: boolean;
}

function generateId(): string {
  return `int_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export class InterviewSchedulingService {
  /**
   * Create a new interview
   */
  async createInterview(request: CreateInterviewRequest): Promise<Interview> {
    const input: InterviewCreateInput = {
      jobApplicationId: request.jobApplicationId,
      jobSeekerId: request.jobSeekerId,
      employerId: request.employerId,
      positionId: request.positionId,
      round: request.round,
      roundNumber: request.roundNumber,
      type: request.type,
      interviewers: request.interviewers,
      notes: request.notes
    };

    const interview = createInterview(input, generateId);
    interviews.set(interview.id, interview);
    timeSlots.set(interview.id, []);
    feedbacks.set(interview.id, []);

    return interview;
  }

  /**
   * Get interview by ID
   */
  async getInterview(interviewId: string): Promise<Interview | null> {
    return interviews.get(interviewId) || null;
  }

  /**
   * Get interviews by filter
   */
  async getInterviews(filter: InterviewFilter): Promise<Interview[]> {
    let result = Array.from(interviews.values());

    if (filter.jobApplicationId) {
      result = result.filter(i => i.jobApplicationId === filter.jobApplicationId);
    }
    if (filter.jobSeekerId) {
      result = result.filter(i => i.jobSeekerId === filter.jobSeekerId);
    }
    if (filter.employerId) {
      result = result.filter(i => i.employerId === filter.employerId);
    }
    if (filter.status) {
      result = result.filter(i => i.status === filter.status);
    }
    if (filter.type) {
      result = result.filter(i => i.type === filter.type);
    }
    if (filter.round) {
      result = result.filter(i => i.round === filter.round);
    }
    if (filter.upcoming) {
      result = result.filter(i => isInterviewUpcoming(i));
    }

    return result.sort((a, b) => {
      const aTime = a.schedule?.scheduledAt ? new Date(a.schedule.scheduledAt).getTime() : 0;
      const bTime = b.schedule?.scheduledAt ? new Date(b.schedule.scheduledAt).getTime() : 0;
      return bTime - aTime;
    });
  }

  /**
   * Update interview
   */
  async updateInterview(
    interviewId: string,
    update: InterviewUpdateInput
  ): Promise<Interview | null> {
    const interview = interviews.get(interviewId);
    if (!interview) return null;

    const updatedInterview: Interview = {
      ...interview,
      ...update,
      updatedAt: new Date()
    } as Interview;

    interviews.set(interviewId, updatedInterview);
    return updatedInterview;
  }

  /**
   * Propose time slots for an interview
   */
  async proposeTimeSlots(request: ProposeTimeSlotsRequest): Promise<TimeSlot[]> {
    const interview = interviews.get(request.interviewId);
    if (!interview) {
      throw new Error('Interview not found');
    }

    if (!canReschedule(interview)) {
      throw new Error('Cannot propose slots for this interview');
    }

    const slots: TimeSlot[] = [];
    for (const slotData of request.slots) {
      const slot = createTimeSlot(
        slotData.startTime,
        slotData.endTime,
        slotData.timezone,
        generateId,
        slotData.proposedBy
      );
      slots.push(slot);
    }

    // Add to interview's proposed slots
    interview.proposedSlots.push(...slots);
    await this.updateInterview(request.interviewId, {
      proposedSlots: interview.proposedSlots,
      status: InterviewStatus.PROPOSED
    });

    // Store in time slots map
    const existingSlots = timeSlots.get(request.interviewId) || [];
    timeSlots.set(request.interviewId, [...existingSlots, ...slots]);

    return slots;
  }

  /**
   * Schedule an interview with a specific time slot
   */
  async scheduleInterview(request: ScheduleInterviewRequest): Promise<Interview> {
    const interview = interviews.get(request.interviewId);
    if (!interview) {
      throw new Error('Interview not found');
    }

    // Find the slot
    const slot = interview.proposedSlots.find(s => s.id === request.slotId);
    if (!slot) {
      throw new Error('Time slot not found');
    }

    // Create schedule
    const schedule = createInterviewSchedule(
      interview.id,
      slot,
      interview.type,
      interview.round,
      generateId,
      {
        location: request.location,
        meetingLink: request.meetingLink,
        dialInNumber: request.dialInNumber,
        conferenceId: request.conferenceId
      }
    );

    schedules.set(interview.id, schedule);

    // Update interview
    const updatedInterview = await this.updateInterview(request.interviewId, {
      schedule,
      confirmedSlotId: request.slotId,
      status: InterviewStatus.CONFIRMED
    });

    if (!updatedInterview) {
      throw new Error('Failed to update interview');
    }

    return updatedInterview;
  }

  /**
   * Reschedule an interview
   */
  async rescheduleInterview(
    interviewId: string,
    newSlotId: string,
    reason?: string
  ): Promise<Interview> {
    const interview = interviews.get(interviewId);
    if (!interview) {
      throw new Error('Interview not found');
    }

    if (!canReschedule(interview)) {
      throw new Error('Cannot reschedule this interview');
    }

    const slot = interview.proposedSlots.find(s => s.id === newSlotId);
    if (!slot) {
      throw new Error('Time slot not found');
    }

    // Create new schedule
    const schedule = createInterviewSchedule(
      interview.id,
      slot,
      interview.type,
      interview.round,
      generateId,
      {
        location: interview.schedule?.location,
        meetingLink: interview.schedule?.meetingLink
      }
    );

    schedules.set(interview.id, schedule);

    const updatedInterview = await this.updateInterview(interviewId, {
      schedule,
      confirmedSlotId: newSlotId,
      status: InterviewStatus.RESCHEDULED,
      notes: reason ? `Rescheduled: ${reason}` : interview.notes
    });

    if (!updatedInterview) {
      throw new Error('Failed to reschedule interview');
    }

    return updatedInterview;
  }

  /**
   * Cancel an interview
   */
  async cancelInterview(
    interviewId: string,
    cancelledBy: string,
    reason?: string
  ): Promise<Interview | null> {
    const updatedInterview = await this.updateInterview(interviewId, {
      status: InterviewStatus.CANCELLED,
      cancelledBy,
      cancellationReason: reason,
      cancelledAt: new Date()
    });

    return updatedInterview;
  }

  /**
   * Mark interview as completed
   */
  async completeInterview(interviewId: string): Promise<Interview | null> {
    const interview = await this.updateInterview(interviewId, {
      status: InterviewStatus.FEEDBACK_PENDING,
      completedAt: new Date()
    });

    return interview;
  }

  /**
   * Submit feedback for an interview
   */
  async submitFeedback(request: SubmitFeedbackRequest): Promise<InterviewFeedback> {
    const interview = interviews.get(request.interviewId);
    if (!interview) {
      throw new Error('Interview not found');
    }

    const feedback: InterviewFeedback = {
      id: generateId(),
      interviewId: request.interviewId,
      interviewerId: request.interviewerId,
      submittedAt: new Date(),
      rating: request.rating,
      technicalSkills: request.technicalSkills,
      communicationSkills: request.communicationSkills,
      cultureFit: request.cultureFit,
      strengths: request.strengths,
      weaknesses: request.weaknesses,
      overallImpression: request.overallImpression,
      recommendation: request.recommendation,
      notes: request.notes
    };

    // Add to interview feedbacks
    interview.feedbacks.push(feedback);

    // Store in feedbacks map
    const existingFeedbacks = feedbacks.get(request.interviewId) || [];
    feedbacks.set(request.interviewId, [...existingFeedbacks, feedback]);

    // Update interview
    await this.updateInterview(request.interviewId, {
      feedbacks: interview.feedbacks
    });

    // If all interviewers have submitted feedback, mark as closed
    if (interview.interviewers.length > 0 &&
        interview.feedbacks.length >= interview.interviewers.length) {
      await this.updateInterview(request.interviewId, {
        status: InterviewStatus.CLOSED
      });
    }

    return feedback;
  }

  /**
   * Get feedback for an interview
   */
  async getFeedback(interviewId: string): Promise<InterviewFeedback[]> {
    const interview = interviews.get(interviewId);
    if (!interview) return [];

    return interview.feedbacks;
  }

  /**
   * Aggregate feedback for an interview
   */
  async aggregateFeedback(interviewId: string): Promise<{
    averageRating: number;
    recommendation: 'hire' | 'no_hire' | 'undecided';
    summary: string;
  } | null> {
    const interview = interviews.get(interviewId);
    if (!interview) return null;

    return aggregateFeedback(interview);
  }

  /**
   * Send reminder for an interview
   */
  async sendReminder(interviewId: string): Promise<boolean> {
    const interview = interviews.get(interviewId);
    if (!interview || !interview.schedule) return false;

    if (!shouldSendReminder(interview)) {
      return false;
    }

    // Update schedule to mark reminder as sent
    interview.schedule.reminderSent = true;
    interview.schedule.reminderSentAt = new Date();

    await this.updateInterview(interviewId, {
      schedule: interview.schedule
    });

    // TODO: Actually send the notification (email/SMS/push)
    console.log(`Reminder sent for interview ${interviewId}`);

    return true;
  }

  /**
   * Get upcoming interviews that need reminders
   */
  async getUpcomingInterviewsNeedingReminders(): Promise<Interview[]> {
    const allInterviews = Array.from(interviews.values());

    return allInterviews.filter(interview => {
      return shouldSendReminder(interview);
    });
  }

  /**
   * Get time remaining until interview
   */
  async getTimeRemaining(interviewId: string): Promise<{ hours: number; minutes: number } | null> {
    const interview = interviews.get(interviewId);
    if (!interview) return null;

    return getInterviewTimeRemaining(interview);
  }

  /**
   * Get next interview round
   */
  async getNextRound(interviewId: string): Promise<InterviewRound | null> {
    const interview = interviews.get(interviewId);
    if (!interview) return null;

    return getNextRound(interview.round);
  }

  /**
   * Get interview series for an application
   */
  async getInterviewSeries(jobApplicationId: string): Promise<{
    applicationId: string;
    interviews: Interview[];
    currentRound: InterviewRound | null;
    nextRound: InterviewRound | null;
    totalRounds: number;
    completedRounds: number;
    overallStatus: 'in_progress' | 'completed' | 'cancelled' | 'failed';
  }> {
    const applicationInterviews = await this.getInterviews({ jobApplicationId });

    const totalRounds = applicationInterviews.length;
    const completedRounds = applicationInterviews.filter(
      i => i.status === InterviewStatus.COMPLETED || i.status === InterviewStatus.CLOSED
    ).length;

    const cancelledCount = applicationInterviews.filter(
      i => i.status === InterviewStatus.CANCELLED
    ).length;

    let overallStatus: 'in_progress' | 'completed' | 'cancelled' | 'failed' = 'in_progress';
    if (cancelledCount > 0) {
      overallStatus = 'failed';
    } else if (completedRounds === totalRounds && totalRounds > 0) {
      overallStatus = 'completed';
    }

    const currentRound = applicationInterviews.length > 0
      ? applicationInterviews[applicationInterviews.length - 1].round
      : null;

    const nextRound = currentRound ? getNextRound(currentRound) : null;

    return {
      applicationId: jobApplicationId,
      interviews: applicationInterviews,
      currentRound,
      nextRound,
      totalRounds,
      completedRounds,
      overallStatus
    };
  }

  /**
   * Get available time slots for an interview
   */
  async getAvailableSlots(interviewId: string): Promise<TimeSlot[]> {
    const slots = timeSlots.get(interviewId) || [];
    return slots.filter(s => s.isAvailable);
  }

  /**
   * Delete an interview (admin only)
   */
  async deleteInterview(interviewId: string): Promise<boolean> {
    timeSlots.delete(interviewId);
    schedules.delete(interviewId);
    feedbacks.delete(interviewId);
    return interviews.delete(interviewId);
  }

  /**
   * Clear all interviews and related data (for testing only)
   */
  clearAll(): void {
    interviews.clear();
    timeSlots.clear();
    schedules.clear();
    feedbacks.clear();
  }
}

// Export singleton instance
export const interviewSchedulingService = new InterviewSchedulingService();
