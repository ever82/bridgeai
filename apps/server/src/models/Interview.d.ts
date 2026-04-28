/**
 * Interview Model
 * 面试安排模型
 */
export declare enum InterviewStatus {
    PENDING = "pending",
    PROPOSED = "proposed",
    CONFIRMED = "confirmed",
    RESCHEDULED = "rescheduled",
    CANCELLED = "cancelled",
    COMPLETED = "completed",
    NO_SHOW = "no_show",
    FEEDBACK_PENDING = "feedback_pending",
    CLOSED = "closed"
}
export declare enum InterviewType {
    PHONE = "phone",
    VIDEO = "video",
    ONSITE = "onsite",
    ONLINE_ASSESSMENT = "online_assessment",
    GROUP = "group",
    PANEL = "panel"
}
export declare enum InterviewRound {
    SCREENING = "screening",
    TECHNICAL = "technical",
    BEHAVIORAL = "behavioral",
    CULTURE_FIT = "culture_fit",
    FINAL = "final",
    HR = "hr",
    OFFER_DISCUSSION = "offer_discussion"
}
export interface TimeSlot {
    id: string;
    startTime: Date;
    endTime: Date;
    duration: number;
    timezone: string;
    isAvailable: boolean;
    proposedBy?: string;
}
export interface InterviewSchedule {
    id: string;
    interviewId: string;
    round: InterviewRound;
    type: InterviewType;
    scheduledAt: Date;
    duration: number;
    timezone: string;
    location?: string;
    meetingLink?: string;
    dialInNumber?: string;
    conferenceId?: string;
    reminderSent: boolean;
    reminderSentAt?: Date;
}
export interface InterviewFeedback {
    id: string;
    interviewId: string;
    interviewerId: string;
    submittedAt: Date;
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
export interface Interview {
    id: string;
    jobApplicationId: string;
    jobSeekerId: string;
    employerId: string;
    positionId: string;
    round: InterviewRound;
    roundNumber: number;
    status: InterviewStatus;
    type: InterviewType;
    schedule?: InterviewSchedule;
    proposedSlots: TimeSlot[];
    confirmedSlotId?: string;
    interviewers: string[];
    feedbacks: InterviewFeedback[];
    cancellationReason?: string;
    cancelledBy?: string;
    cancelledAt?: Date;
    notes?: string;
    createdAt: Date;
    updatedAt: Date;
    completedAt?: Date;
    metadata?: Record<string, unknown>;
}
export interface InterviewCreateInput {
    jobApplicationId: string;
    jobSeekerId: string;
    employerId: string;
    positionId: string;
    round: InterviewRound;
    roundNumber?: number;
    type: InterviewType;
    interviewers?: string[];
    notes?: string;
    metadata?: Record<string, unknown>;
}
export interface InterviewUpdateInput {
    status?: InterviewStatus;
    type?: InterviewType;
    schedule?: Partial<InterviewSchedule>;
    confirmedSlotId?: string;
    interviewers?: string[];
    cancellationReason?: string;
    cancelledBy?: string;
    cancelledAt?: Date;
    notes?: string;
    completedAt?: Date;
    proposedSlots?: TimeSlot[];
    feedbacks?: InterviewFeedback[];
    metadata?: Record<string, unknown>;
}
export interface InterviewSeries {
    applicationId: string;
    interviews: Interview[];
    currentRound: InterviewRound;
    nextRound?: InterviewRound;
    totalRounds: number;
    completedRounds: number;
    overallStatus: 'in_progress' | 'completed' | 'cancelled' | 'failed';
}
export interface CalendarEvent {
    id: string;
    interviewId: string;
    calendarProvider: 'google' | 'outlook' | 'apple';
    eventId: string;
    eventLink: string;
    attendees: string[];
    createdAt: Date;
}
export interface InterviewNotification {
    id: string;
    interviewId: string;
    recipientId: string;
    type: 'invitation' | 'reminder' | 'confirmation' | 'cancellation' | 'reschedule' | 'feedback_request';
    channel: 'email' | 'sms' | 'push';
    sentAt: Date;
    openedAt?: Date;
}
export declare function isValidInterviewStatus(status: string): status is InterviewStatus;
export declare function isValidInterviewType(type: string): type is InterviewType;
export declare function isValidInterviewRound(round: string): round is InterviewRound;
export declare function createInterview(input: InterviewCreateInput, generateId: () => string): Interview;
export declare function createTimeSlot(startTime: Date, endTime: Date, timezone: string, generateId: () => string, proposedBy?: string): TimeSlot;
export declare function createInterviewSchedule(interviewId: string, slot: TimeSlot, type: InterviewType, round: InterviewRound, generateId: () => string, options?: {
    location?: string;
    meetingLink?: string;
    dialInNumber?: string;
    conferenceId?: string;
}): InterviewSchedule;
export declare function isInterviewUpcoming(interview: Interview): boolean;
export declare function getInterviewTimeRemaining(interview: Interview): {
    hours: number;
    minutes: number;
} | null;
export declare function canReschedule(interview: Interview): boolean;
export declare function shouldSendReminder(interview: Interview): boolean;
export declare function getNextRound(currentRound: InterviewRound): InterviewRound | null;
export declare function aggregateFeedback(interview: Interview): {
    averageRating: number;
    recommendation: 'hire' | 'no_hire' | 'undecided';
    summary: string;
} | null;
//# sourceMappingURL=Interview.d.ts.map