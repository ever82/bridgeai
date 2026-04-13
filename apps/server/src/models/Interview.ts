/**
 * Interview Model
 * 面试安排模型
 */

export enum InterviewStatus {
  PENDING = 'pending',
  PROPOSED = 'proposed',
  CONFIRMED = 'confirmed',
  RESCHEDULED = 'rescheduled',
  CANCELLED = 'cancelled',
  COMPLETED = 'completed',
  NO_SHOW = 'no_show',
  FEEDBACK_PENDING = 'feedback_pending',
  CLOSED = 'closed'
}

export enum InterviewType {
  PHONE = 'phone',
  VIDEO = 'video',
  ONSITE = 'onsite',
  ONLINE_ASSESSMENT = 'online_assessment',
  GROUP = 'group',
  PANEL = 'panel'
}

export enum InterviewRound {
  SCREENING = 'screening',
  TECHNICAL = 'technical',
  BEHAVIORAL = 'behavioral',
  CULTURE_FIT = 'culture_fit',
  FINAL = 'final',
  HR = 'hr',
  OFFER_DISCUSSION = 'offer_discussion'
}

export interface TimeSlot {
  id: string;
  startTime: Date;
  endTime: Date;
  duration: number; // in minutes
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
  rating: number; // 1-5
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
  notes?: string;
  completedAt?: Date;
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

// Calendar integration types
export interface CalendarEvent {
  id: string;
  interviewId: string;
  calendarProvider: 'google' | 'outlook' | 'apple';
  eventId: string;
  eventLink: string;
  attendees: string[];
  createdAt: Date;
}

// Notification types
export interface InterviewNotification {
  id: string;
  interviewId: string;
  recipientId: string;
  type: 'invitation' | 'reminder' | 'confirmation' | 'cancellation' | 'reschedule' | 'feedback_request';
  channel: 'email' | 'sms' | 'push';
  sentAt: Date;
  openedAt?: Date;
}

// Validation helpers
export function isValidInterviewStatus(status: string): status is InterviewStatus {
  return Object.values(InterviewStatus).includes(status as InterviewStatus);
}

export function isValidInterviewType(type: string): type is InterviewType {
  return Object.values(InterviewType).includes(type as InterviewType);
}

export function isValidInterviewRound(round: string): round is InterviewRound {
  return Object.values(InterviewRound).includes(round as InterviewRound);
}

export function createInterview(
  input: InterviewCreateInput,
  generateId: () => string
): Interview {
  const now = new Date();
  return {
    id: generateId(),
    jobApplicationId: input.jobApplicationId,
    jobSeekerId: input.jobSeekerId,
    employerId: input.employerId,
    positionId: input.positionId,
    round: input.round,
    roundNumber: input.roundNumber || 1,
    status: InterviewStatus.PENDING,
    type: input.type,
    proposedSlots: [],
    interviewers: input.interviewers || [],
    feedbacks: [],
    createdAt: now,
    updatedAt: now,
    notes: input.notes,
    metadata: input.metadata
  };
}

export function createTimeSlot(
  startTime: Date,
  endTime: Date,
  timezone: string,
  generateId: () => string,
  proposedBy?: string
): TimeSlot {
  const duration = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60));
  return {
    id: generateId(),
    startTime,
    endTime,
    duration,
    timezone,
    isAvailable: true,
    proposedBy
  };
}

export function createInterviewSchedule(
  interviewId: string,
  slot: TimeSlot,
  type: InterviewType,
  round: InterviewRound,
  generateId: () => string,
  options?: {
    location?: string;
    meetingLink?: string;
    dialInNumber?: string;
    conferenceId?: string;
  }
): InterviewSchedule {
  return {
    id: generateId(),
    interviewId,
    round,
    type,
    scheduledAt: slot.startTime,
    duration: slot.duration,
    timezone: slot.timezone,
    location: options?.location,
    meetingLink: options?.meetingLink,
    dialInNumber: options?.dialInNumber,
    conferenceId: options?.conferenceId,
    reminderSent: false
  };
}

export function isInterviewUpcoming(interview: Interview): boolean {
  if (!interview.schedule) return false;
  const now = new Date();
  const interviewTime = new Date(interview.schedule.scheduledAt);
  return interviewTime > now && interview.status === InterviewStatus.CONFIRMED;
}

export function getInterviewTimeRemaining(interview: Interview): { hours: number; minutes: number } | null {
  if (!interview.schedule) return null;
  const now = new Date();
  const interviewTime = new Date(interview.schedule.scheduledAt);
  const diffMs = interviewTime.getTime() - now.getTime();

  if (diffMs <= 0) return { hours: 0, minutes: 0 };

  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  return { hours, minutes };
}

export function canReschedule(interview: Interview): boolean {
  const allowedStatuses = [
    InterviewStatus.PENDING,
    InterviewStatus.PROPOSED,
    InterviewStatus.CONFIRMED
  ];
  return allowedStatuses.includes(interview.status);
}

export function shouldSendReminder(interview: Interview): boolean {
  if (!interview.schedule || interview.schedule.reminderSent) return false;
  if (interview.status !== InterviewStatus.CONFIRMED) return false;

  const timeRemaining = getInterviewTimeRemaining(interview);
  if (!timeRemaining) return false;

  // Send reminder 24 hours before
  return timeRemaining.hours <= 24 && timeRemaining.hours > 0;
}

export function getNextRound(currentRound: InterviewRound): InterviewRound | null {
  const roundOrder: InterviewRound[] = [
    InterviewRound.SCREENING,
    InterviewRound.TECHNICAL,
    InterviewRound.BEHAVIORAL,
    InterviewRound.CULTURE_FIT,
    InterviewRound.FINAL,
    InterviewRound.HR,
    InterviewRound.OFFER_DISCUSSION
  ];

  const currentIndex = roundOrder.indexOf(currentRound);
  if (currentIndex === -1 || currentIndex === roundOrder.length - 1) return null;

  return roundOrder[currentIndex + 1];
}

export function aggregateFeedback(interview: Interview): {
  averageRating: number;
  recommendation: 'hire' | 'no_hire' | 'undecided';
  summary: string;
} | null {
  if (interview.feedbacks.length === 0) return null;

  const totalRating = interview.feedbacks.reduce((sum, f) => sum + f.rating, 0);
  const averageRating = totalRating / interview.feedbacks.length;

  const recommendations = interview.feedbacks.map(f => f.recommendation);
  const hireCount = recommendations.filter(r => r === 'strong_hire' || r === 'hire').length;
  const noHireCount = recommendations.filter(r => r === 'no_hire' || r === 'strong_no_hire').length;

  let recommendation: 'hire' | 'no_hire' | 'undecided';
  if (hireCount > noHireCount) recommendation = 'hire';
  else if (noHireCount > hireCount) recommendation = 'no_hire';
  else recommendation = 'undecided';

  const strengths = [...new Set(interview.feedbacks.flatMap(f => f.strengths))];
  const weaknesses = [...new Set(interview.feedbacks.flatMap(f => f.weaknesses))];

  const summary = `Strengths: ${strengths.join(', ')}. Areas for improvement: ${weaknesses.join(', ')}`;

  return { averageRating, recommendation, summary };
}
