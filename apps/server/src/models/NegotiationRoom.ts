/**
 * Negotiation Room Model
 * 薪资协商房间模型
 */

export enum NegotiationTopic {
  SALARY = 'salary',
  BONUS = 'bonus',
  WORK_HOURS = 'work_hours',
  REMOTE_WORK = 'remote_work',
  BENEFITS = 'benefits',
  STOCK_OPTIONS = 'stock_options',
  VACATION = 'vacation',
  OTHER = 'other'
}

export enum NegotiationStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  NEGOTIATING = 'negotiating',
  REACHED = 'reached',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  HANDOFF_TO_HUMAN = 'handoff_to_human'
}

export enum MessageSender {
  JOBSEEKER_AGENT = 'jobseeker_agent',
  EMPLOYER_AGENT = 'employer_agent',
  SYSTEM = 'system',
  HUMAN = 'human'
}

export interface NegotiationMessage {
  id: string;
  roomId: string;
  sender: MessageSender;
  senderId: string;
  content: string;
  topic?: NegotiationTopic;
  timestamp: Date;
  round: number;
  isCounterOffer?: boolean;
  offerValue?: number;
  offerCurrency?: string;
  metadata?: Record<string, unknown>;
}

export interface NegotiationRound {
  roundNumber: number;
  startedAt: Date;
  endedAt?: Date;
  jobSeekerOffer?: number;
  employerOffer?: number;
  messages: NegotiationMessage[];
  status: 'active' | 'completed' | 'stalled';
}

export interface NegotiationRoom {
  id: string;
  jobApplicationId: string;
  jobSeekerId: string;
  jobSeekerAgentId: string;
  employerId: string;
  employerAgentId: string;
  status: NegotiationStatus;
  topics: NegotiationTopic[];
  currentRound: number;
  maxRounds: number;
  initialOffer?: number;
  currentOffer?: number;
  targetRange?: {
    min: number;
    max: number;
  };
  currency: string;
  rounds: NegotiationRound[];
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  agreedAmount?: number;
  agreedBenefits?: string[];
  handoffReason?: string;
  metadata?: Record<string, unknown>;
}

export interface NegotiationRoomCreateInput {
  jobApplicationId: string;
  jobSeekerId: string;
  jobSeekerAgentId: string;
  employerId: string;
  employerAgentId: string;
  topics?: NegotiationTopic[];
  maxRounds?: number;
  initialOffer?: number;
  targetRange?: {
    min: number;
    max: number;
  };
  currency?: string;
  metadata?: Record<string, unknown>;
}

export interface NegotiationRoomUpdateInput {
  status?: NegotiationStatus;
  currentRound?: number;
  currentOffer?: number;
  agreedAmount?: number;
  agreedBenefits?: string[];
  handoffReason?: string;
  completedAt?: Date;
  metadata?: Record<string, unknown>;
}

export interface NegotiationHistory {
  roomId: string;
  totalRounds: number;
  finalStatus: NegotiationStatus;
  agreedAmount?: number;
  messages: NegotiationMessage[];
  duration: number; // in minutes
  topics: NegotiationTopic[];
}

// Validation helpers
export function isValidNegotiationTopic(topic: string): topic is NegotiationTopic {
  return Object.values(NegotiationTopic).includes(topic as NegotiationTopic);
}

export function isValidNegotiationStatus(status: string): status is NegotiationStatus {
  return Object.values(NegotiationStatus).includes(status as NegotiationStatus);
}

export function createNegotiationRoom(
  input: NegotiationRoomCreateInput,
  generateId: () => string
): NegotiationRoom {
  const now = new Date();
  return {
    id: generateId(),
    jobApplicationId: input.jobApplicationId,
    jobSeekerId: input.jobSeekerId,
    jobSeekerAgentId: input.jobSeekerAgentId,
    employerId: input.employerId,
    employerAgentId: input.employerAgentId,
    status: NegotiationStatus.PENDING,
    topics: input.topics || [NegotiationTopic.SALARY],
    currentRound: 0,
    maxRounds: input.maxRounds || 5,
    initialOffer: input.initialOffer,
    currentOffer: input.initialOffer,
    targetRange: input.targetRange,
    currency: input.currency || 'CNY',
    rounds: [],
    createdAt: now,
    updatedAt: now,
    metadata: input.metadata
  };
}

export function createNegotiationMessage(
  roomId: string,
  sender: MessageSender,
  senderId: string,
  content: string,
  round: number,
  generateId: () => string,
  options?: {
    topic?: NegotiationTopic;
    isCounterOffer?: boolean;
    offerValue?: number;
    offerCurrency?: string;
    metadata?: Record<string, unknown>;
  }
): NegotiationMessage {
  return {
    id: generateId(),
    roomId,
    sender,
    senderId,
    content,
    topic: options?.topic,
    timestamp: new Date(),
    round,
    isCounterOffer: options?.isCounterOffer,
    offerValue: options?.offerValue,
    offerCurrency: options?.offerCurrency,
    metadata: options?.metadata
  };
}

export function calculateNegotiationProgress(room: NegotiationRoom): {
  progress: number;
  remainingRounds: number;
  isStale: boolean;
} {
  const progress = (room.currentRound / room.maxRounds) * 100;
  const remainingRounds = room.maxRounds - room.currentRound;

  // Check if negotiation is stale (no activity for 24 hours)
  const lastUpdate = new Date(room.updatedAt);
  const now = new Date();
  const hoursSinceUpdate = (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60);
  const isStale = hoursSinceUpdate > 24 && room.status === NegotiationStatus.NEGOTIATING;

  return { progress, remainingRounds, isStale };
}

export function shouldHandoffToHuman(room: NegotiationRoom): { should: boolean; reason?: string } {
  // Handoff conditions
  if (room.currentRound >= room.maxRounds) {
    return { should: true, reason: 'MAX_ROUNDS_REACHED' };
  }

  const { isStale } = calculateNegotiationProgress(room);
  if (isStale) {
    return { should: true, reason: 'NEGOTIATION_STALE' };
  }

  if (room.status === NegotiationStatus.FAILED) {
    return { should: true, reason: 'NEGOTIATION_FAILED' };
  }

  // Check for repeated counter-offers (stalemate detection)
  const lastRound = room.rounds[room.rounds.length - 1];
  if (lastRound && room.rounds.length >= 3) {
    const recentRounds = room.rounds.slice(-3);
    const allSameOffers = recentRounds.every(
      r => r.jobSeekerOffer === recentRounds[0].jobSeekerOffer &&
           r.employerOffer === recentRounds[0].employerOffer
    );
    if (allSameOffers) {
      return { should: true, reason: 'STALEMATE_DETECTED' };
    }
  }

  return { should: false };
}
