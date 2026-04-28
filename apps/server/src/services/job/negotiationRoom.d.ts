/**
 * Negotiation Room Service
 * 协商房间服务
 */
import { NegotiationRoom, NegotiationRoomUpdateInput, NegotiationMessage, NegotiationRound, NegotiationTopic, NegotiationStatus, MessageSender } from '../../models/NegotiationRoom';
export interface CreateRoomRequest {
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
}
export interface SendMessageRequest {
    roomId: string;
    sender: MessageSender;
    senderId: string;
    content: string;
    topic?: NegotiationTopic;
    isCounterOffer?: boolean;
    offerValue?: number;
    metadata?: Record<string, unknown>;
}
export interface RoomFilter {
    jobApplicationId?: string;
    jobSeekerId?: string;
    employerId?: string;
    status?: NegotiationStatus;
}
export declare class NegotiationRoomService {
    /**
     * Create a new negotiation room
     */
    createRoom(request: CreateRoomRequest): Promise<NegotiationRoom>;
    /**
     * Get a room by ID
     */
    getRoom(roomId: string): Promise<NegotiationRoom | null>;
    /**
     * Get rooms by filter
     */
    getRooms(filter: RoomFilter): Promise<NegotiationRoom[]>;
    /**
     * Update a room
     */
    updateRoom(roomId: string, update: NegotiationRoomUpdateInput): Promise<NegotiationRoom | null>;
    /**
     * Start negotiation (change status from PENDING to ACTIVE)
     */
    startNegotiation(roomId: string): Promise<NegotiationRoom | null>;
    /**
     * Send a message in a room
     */
    sendMessage(request: SendMessageRequest): Promise<NegotiationMessage>;
    /**
     * Add message to storage
     */
    private addMessage;
    /**
     * Get messages for a room
     */
    getMessages(roomId: string, round?: number): Promise<NegotiationMessage[]>;
    /**
     * Advance to next round
     */
    advanceRound(roomId: string): Promise<NegotiationRound | null>;
    /**
     * Check and handle handoff to human
     */
    checkHandoff(roomId: string): Promise<{
        should: boolean;
        reason?: string;
    }>;
    /**
     * Mark handoff to human
     */
    handoffToHuman(roomId: string, reason: string): Promise<NegotiationRoom | null>;
    /**
     * Mark negotiation as reached/agreed
     */
    markAsReached(roomId: string, agreedAmount: number, agreedBenefits: string[]): Promise<NegotiationRoom | null>;
    /**
     * Mark negotiation as failed
     */
    markAsFailed(roomId: string): Promise<NegotiationRoom | null>;
    /**
     * Get negotiation progress
     */
    getProgress(roomId: string): Promise<{
        progress: number;
        remainingRounds: number;
        isStale: boolean;
        currentRound: number;
        maxRounds: number;
    } | null>;
    /**
     * Get negotiation history
     */
    getHistory(roomId: string): Promise<{
        room: NegotiationRoom;
        messages: NegotiationMessage[];
    } | null>;
    /**
     * Cancel a negotiation
     */
    cancelRoom(roomId: string, reason?: string): Promise<NegotiationRoom | null>;
    /**
     * Delete a room (admin only)
     */
    deleteRoom(roomId: string): Promise<boolean>;
    /**
     * Clear all rooms and messages (for testing only)
     */
    clearAll(): void;
}
export declare const negotiationRoomService: NegotiationRoomService;
//# sourceMappingURL=negotiationRoom.d.ts.map