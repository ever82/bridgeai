/**
 * Interview Scheduling Service
 * 面试安排服务
 */
import { Interview, InterviewUpdateInput, InterviewStatus, InterviewType, InterviewRound, TimeSlot, InterviewFeedback } from '../../models/Interview';
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
export declare class InterviewSchedulingService {
    /**
     * Create a new interview
     */
    createInterview(request: CreateInterviewRequest): Promise<Interview>;
    /**
     * Get interview by ID
     */
    getInterview(interviewId: string): Promise<Interview | null>;
    /**
     * Get interviews by filter
     */
    getInterviews(filter: InterviewFilter): Promise<Interview[]>;
    /**
     * Update interview
     */
    updateInterview(interviewId: string, update: InterviewUpdateInput): Promise<Interview | null>;
    /**
     * Propose time slots for an interview
     */
    proposeTimeSlots(request: ProposeTimeSlotsRequest): Promise<TimeSlot[]>;
    /**
     * Schedule an interview with a specific time slot
     */
    scheduleInterview(request: ScheduleInterviewRequest): Promise<Interview>;
    /**
     * Reschedule an interview
     */
    rescheduleInterview(interviewId: string, newSlotId: string, reason?: string): Promise<Interview>;
    /**
     * Cancel an interview
     */
    cancelInterview(interviewId: string, cancelledBy: string, reason?: string): Promise<Interview | null>;
    /**
     * Mark interview as completed
     */
    completeInterview(interviewId: string): Promise<Interview | null>;
    /**
     * Submit feedback for an interview
     */
    submitFeedback(request: SubmitFeedbackRequest): Promise<InterviewFeedback>;
    /**
     * Get feedback for an interview
     */
    getFeedback(interviewId: string): Promise<InterviewFeedback[]>;
    /**
     * Aggregate feedback for an interview
     */
    aggregateFeedback(interviewId: string): Promise<{
        averageRating: number;
        recommendation: 'hire' | 'no_hire' | 'undecided';
        summary: string;
    } | null>;
    /**
     * Send reminder for an interview
     */
    sendReminder(interviewId: string): Promise<boolean>;
    /**
     * Get upcoming interviews that need reminders
     */
    getUpcomingInterviewsNeedingReminders(): Promise<Interview[]>;
    /**
     * Get time remaining until interview
     */
    getTimeRemaining(interviewId: string): Promise<{
        hours: number;
        minutes: number;
    } | null>;
    /**
     * Get next interview round
     */
    getNextRound(interviewId: string): Promise<InterviewRound | null>;
    /**
     * Get interview series for an application
     */
    getInterviewSeries(jobApplicationId: string): Promise<{
        applicationId: string;
        interviews: Interview[];
        currentRound: InterviewRound | null;
        nextRound: InterviewRound | null;
        totalRounds: number;
        completedRounds: number;
        overallStatus: 'in_progress' | 'completed' | 'cancelled' | 'failed';
    }>;
    /**
     * Get available time slots for an interview
     */
    getAvailableSlots(interviewId: string): Promise<TimeSlot[]>;
    /**
     * Delete an interview (admin only)
     */
    deleteInterview(interviewId: string): Promise<boolean>;
    /**
     * Clear all interviews and related data (for testing only)
     */
    clearAll(): void;
}
export declare const interviewSchedulingService: InterviewSchedulingService;
//# sourceMappingURL=interviewScheduling.d.ts.map