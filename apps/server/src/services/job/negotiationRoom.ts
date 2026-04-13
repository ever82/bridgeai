/**
 * Negotiation Room Service
 * 协商房间服务
 */

import {
  NegotiationRoom,
  NegotiationRoomCreateInput,
  NegotiationRoomUpdateInput,
  NegotiationMessage,
  NegotiationRound,
  NegotiationTopic,
  NegotiationStatus,
  MessageSender,
  createNegotiationRoom,
  createNegotiationMessage,
  calculateNegotiationProgress,
  shouldHandoffToHuman
} from '../../models/NegotiationRoom';

// In-memory storage (replace with database in production)
const rooms = new Map<string, NegotiationRoom>();
const messages = new Map<string, NegotiationMessage[]>();

export interface CreateRoomRequest {
  jobApplicationId: string;
  jobSeekerId: string;
  jobSeekerAgentId: string;
  employerId: string;
  employerAgentId: string;
  topics?: NegotiationTopic[];
  maxRounds?: number;
  initialOffer?: number;
  targetRange?: { min: number; max: number };
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

function generateId(): string {
  return `neg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function generateMessageId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export class NegotiationRoomService {
  /**
   * Create a new negotiation room
   */
  async createRoom(request: CreateRoomRequest): Promise<NegotiationRoom> {
    const input: NegotiationRoomCreateInput = {
      jobApplicationId: request.jobApplicationId,
      jobSeekerId: request.jobSeekerId,
      jobSeekerAgentId: request.jobSeekerAgentId,
      employerId: request.employerId,
      employerAgentId: request.employerAgentId,
      topics: request.topics,
      maxRounds: request.maxRounds,
      initialOffer: request.initialOffer,
      targetRange: request.targetRange,
      currency: request.currency
    };

    const room = createNegotiationRoom(input, generateId);
    rooms.set(room.id, room);
    messages.set(room.id, []);

    // Add system message for room creation
    const systemMessage = createNegotiationMessage(
      room.id,
      MessageSender.SYSTEM,
      'system',
      'Negotiation room created. Waiting for both parties to join.',
      0,
      generateMessageId
    );

    await this.addMessage(room.id, systemMessage);

    return room;
  }

  /**
   * Get a room by ID
   */
  async getRoom(roomId: string): Promise<NegotiationRoom | null> {
    return rooms.get(roomId) || null;
  }

  /**
   * Get rooms by filter
   */
  async getRooms(filter: RoomFilter): Promise<NegotiationRoom[]> {
    let result = Array.from(rooms.values());

    if (filter.jobApplicationId) {
      result = result.filter(r => r.jobApplicationId === filter.jobApplicationId);
    }
    if (filter.jobSeekerId) {
      result = result.filter(r => r.jobSeekerId === filter.jobSeekerId);
    }
    if (filter.employerId) {
      result = result.filter(r => r.employerId === filter.employerId);
    }
    if (filter.status) {
      result = result.filter(r => r.status === filter.status);
    }

    return result.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * Update a room
   */
  async updateRoom(
    roomId: string,
    update: NegotiationRoomUpdateInput
  ): Promise<NegotiationRoom | null> {
    const room = rooms.get(roomId);
    if (!room) return null;

    const updatedRoom: NegotiationRoom = {
      ...room,
      ...update,
      updatedAt: new Date()
    };

    rooms.set(roomId, updatedRoom);
    return updatedRoom;
  }

  /**
   * Start negotiation (change status from PENDING to ACTIVE)
   */
  async startNegotiation(roomId: string): Promise<NegotiationRoom | null> {
    const room = rooms.get(roomId);
    if (!room) return null;

    if (room.status !== NegotiationStatus.PENDING) {
      throw new Error(`Cannot start negotiation: room status is ${room.status}`);
    }

    const updatedRoom = await this.updateRoom(roomId, {
      status: NegotiationStatus.ACTIVE,
      currentRound: 1
    });

    if (updatedRoom) {
      // Create first round
      const round: NegotiationRound = {
        roundNumber: 1,
        startedAt: new Date(),
        messages: [],
        status: 'active'
      };
      updatedRoom.rounds.push(round);

      // Add system message
      const systemMessage = createNegotiationMessage(
        roomId,
        MessageSender.SYSTEM,
        'system',
        `Round 1 has started. Negotiation topics: ${updatedRoom.topics.join(', ')}`,
        1,
        generateMessageId
      );
      await this.addMessage(roomId, systemMessage);

      rooms.set(roomId, updatedRoom);
    }

    return updatedRoom;
  }

  /**
   * Send a message in a room
   */
  async sendMessage(request: SendMessageRequest): Promise<NegotiationMessage> {
    const room = rooms.get(request.roomId);
    if (!room) {
      throw new Error('Room not found');
    }

    if (room.status !== NegotiationStatus.ACTIVE &&
        room.status !== NegotiationStatus.NEGOTIATING) {
      throw new Error('Cannot send message: negotiation is not active');
    }

    const message = createNegotiationMessage(
      request.roomId,
      request.sender,
      request.senderId,
      request.content,
      room.currentRound,
      generateMessageId,
      {
        topic: request.topic,
        isCounterOffer: request.isCounterOffer,
        offerValue: request.offerValue,
        offerCurrency: room.currency,
        metadata: request.metadata
      }
    );

    await this.addMessage(request.roomId, message);

    // Update room status to NEGOTIATING if first message
    if (room.status === NegotiationStatus.ACTIVE) {
      await this.updateRoom(request.roomId, { status: NegotiationStatus.NEGOTIATING });
    }

    // Update current round with message
    const currentRound = room.rounds.find((r: NegotiationRound) => r.roundNumber === room.currentRound);
    if (currentRound) {
      currentRound.messages.push(message);

      // If this is a counter offer, update the round
      if (request.isCounterOffer && request.offerValue !== undefined) {
        if (request.sender === MessageSender.JOBSEEKER_AGENT) {
          currentRound.jobSeekerOffer = request.offerValue;
        } else if (request.sender === MessageSender.EMPLOYER_AGENT) {
          currentRound.employerOffer = request.offerValue;
        }

        // Update room current offer
        await this.updateRoom(request.roomId, { currentOffer: request.offerValue });
      }
    }

    return message;
  }

  /**
   * Add message to storage
   */
  private async addMessage(roomId: string, message: NegotiationMessage): Promise<void> {
    const roomMessages = messages.get(roomId) || [];
    roomMessages.push(message);
    messages.set(roomId, roomMessages);
  }

  /**
   * Get messages for a room
   */
  async getMessages(roomId: string, round?: number): Promise<NegotiationMessage[]> {
    const roomMessages = messages.get(roomId) || [];

    if (round !== undefined) {
      return roomMessages.filter(m => m.round === round);
    }

    return roomMessages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  /**
   * Advance to next round
   */
  async advanceRound(roomId: string): Promise<NegotiationRound | null> {
    const room = rooms.get(roomId);
    if (!room) return null;

    // Close current round
    const currentRound = room.rounds.find((r: NegotiationRound) => r.roundNumber === room.currentRound);
    if (currentRound) {
      currentRound.endedAt = new Date();
      currentRound.status = 'completed';
    }

    // Check if max rounds reached
    if (room.currentRound >= room.maxRounds) {
      await this.updateRoom(roomId, { status: NegotiationStatus.HANDOFF_TO_HUMAN });
      return null;
    }

    // Create new round
    const newRoundNumber = room.currentRound + 1;
    const newRound: NegotiationRound = {
      roundNumber: newRoundNumber,
      startedAt: new Date(),
      messages: [],
      status: 'active'
    };

    room.rounds.push(newRound);
    await this.updateRoom(roomId, { currentRound: newRoundNumber });

    // Add system message
    const systemMessage = createNegotiationMessage(
      roomId,
      MessageSender.SYSTEM,
      'system',
      `Round ${newRoundNumber} has started.`,
      newRoundNumber,
      generateMessageId
    );
    await this.addMessage(roomId, systemMessage);

    return newRound;
  }

  /**
   * Check and handle handoff to human
   */
  async checkHandoff(roomId: string): Promise<{ should: boolean; reason?: string }> {
    const room = rooms.get(roomId);
    if (!room) return { should: false };

    return shouldHandoffToHuman(room);
  }

  /**
   * Mark handoff to human
   */
  async handoffToHuman(roomId: string, reason: string): Promise<NegotiationRoom | null> {
    const room = await this.updateRoom(roomId, {
      status: NegotiationStatus.HANDOFF_TO_HUMAN,
      handoffReason: reason
    });

    if (room) {
      // Add system message
      const systemMessage = createNegotiationMessage(
        roomId,
        MessageSender.SYSTEM,
        'system',
        `Negotiation handed off to human. Reason: ${reason}`,
        room.currentRound,
        generateMessageId
      );
      await this.addMessage(roomId, systemMessage);
    }

    return room;
  }

  /**
   * Mark negotiation as reached/agreed
   */
  async markAsReached(
    roomId: string,
    agreedAmount: number,
    agreedBenefits: string[]
  ): Promise<NegotiationRoom | null> {
    const room = await this.updateRoom(roomId, {
      status: NegotiationStatus.REACHED,
      agreedAmount,
      agreedBenefits,
      completedAt: new Date()
    });

    if (room) {
      // Add system message
      const systemMessage = createNegotiationMessage(
        roomId,
        MessageSender.SYSTEM,
        'system',
        `Negotiation reached agreement! Agreed amount: ${agreedAmount} ${room.currency}`,
        room.currentRound,
        generateMessageId
      );
      await this.addMessage(roomId, systemMessage);
    }

    return room;
  }

  /**
   * Mark negotiation as failed
   */
  async markAsFailed(roomId: string): Promise<NegotiationRoom | null> {
    const room = await this.updateRoom(roomId, {
      status: NegotiationStatus.FAILED,
      completedAt: new Date()
    });

    if (room) {
      // Add system message
      const systemMessage = createNegotiationMessage(
        roomId,
        MessageSender.SYSTEM,
        'system',
        'Negotiation failed. No agreement reached.',
        room.currentRound,
        generateMessageId
      );
      await this.addMessage(roomId, systemMessage);
    }

    return room;
  }

  /**
   * Get negotiation progress
   */
  async getProgress(roomId: string): Promise<{
    progress: number;
    remainingRounds: number;
    isStale: boolean;
    currentRound: number;
    maxRounds: number;
  } | null> {
    const room = rooms.get(roomId);
    if (!room) return null;

    const { progress, remainingRounds, isStale } = calculateNegotiationProgress(room);

    return {
      progress,
      remainingRounds,
      isStale,
      currentRound: room.currentRound,
      maxRounds: room.maxRounds
    };
  }

  /**
   * Get negotiation history
   */
  async getHistory(roomId: string): Promise<{
    room: NegotiationRoom;
    messages: NegotiationMessage[];
  } | null> {
    const room = rooms.get(roomId);
    if (!room) return null;

    const roomMessages = messages.get(roomId) || [];

    return {
      room,
      messages: roomMessages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
    };
  }

  /**
   * Cancel a negotiation
   */
  async cancelRoom(roomId: string, reason?: string): Promise<NegotiationRoom | null> {
    const room = await this.updateRoom(roomId, {
      status: NegotiationStatus.CANCELLED,
      completedAt: new Date()
    });

    if (room) {
      const systemMessage = createNegotiationMessage(
        roomId,
        MessageSender.SYSTEM,
        'system',
        `Negotiation cancelled. ${reason || ''}`,
        room.currentRound,
        generateMessageId
      );
      await this.addMessage(roomId, systemMessage);
    }

    return room;
  }

  /**
   * Delete a room (admin only)
   */
  async deleteRoom(roomId: string): Promise<boolean> {
    messages.delete(roomId);
    return rooms.delete(roomId);
  }

  /**
   * Clear all rooms and messages (for testing only)
   */
  clearAll(): void {
    rooms.clear();
    messages.clear();
  }
}

// Export singleton instance
export const negotiationRoomService = new NegotiationRoomService();
