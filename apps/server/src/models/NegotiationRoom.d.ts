/**
 * Negotiation Room Model
 * 薪资协商房间模型
 */
export declare enum NegotiationTopic {
    SALARY = "salary",
    BONUS = "bonus",
    WORK_HOURS = "work_hours",
    REMOTE_WORK = "remote_work",
    BENEFITS = "benefits",
    STOCK_OPTIONS = "stock_options",
    VACATION = "vacation",
    OTHER = "other"
}
export declare enum NegotiationStatus {
    PENDING = "pending",
    ACTIVE = "active",
    NEGOTIATING = "negotiating",
    REACHED = "reached",
    FAILED = "failed",
    CANCELLED = "cancelled",
    HANDOFF_TO_HUMAN = "handoff_to_human"
}
export declare enum MessageSender {
    JOBSEEKER_AGENT = "jobseeker_agent",
    EMPLOYER_AGENT = "employer_agent",
    SYSTEM = "system",
    HUMAN = "human"
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
    duration: number;
    topics: NegotiationTopic[];
}
export declare function isValidNegotiationTopic(topic: string): topic is NegotiationTopic;
export declare function isValidNegotiationStatus(status: string): status is NegotiationStatus;
export declare function createNegotiationRoom(input: NegotiationRoomCreateInput, generateId: () => string): NegotiationRoom;
export declare function createNegotiationMessage(roomId: string, sender: MessageSender, senderId: string, content: string, round: number, generateId: () => string, options?: {
    topic?: NegotiationTopic;
    isCounterOffer?: boolean;
    offerValue?: number;
    offerCurrency?: string;
    metadata?: Record<string, unknown>;
}): NegotiationMessage;
export declare function calculateNegotiationProgress(room: NegotiationRoom): {
    progress: number;
    remainingRounds: number;
    isStale: boolean;
};
export declare function shouldHandoffToHuman(room: NegotiationRoom): {
    should: boolean;
    reason?: string;
};
//# sourceMappingURL=NegotiationRoom.d.ts.map