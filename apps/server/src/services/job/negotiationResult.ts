/**
 * Negotiation Result Service
 * 协商结果处理服务
 */

import {
  NegotiationRoom,
  NegotiationStatus,
  NegotiationMessage,
  NegotiationTopic
} from '../../models/NegotiationRoom';

import { negotiationRoomService } from './negotiationRoom';

export interface NegotiationResult {
  roomId: string;
  status: NegotiationStatus;
  agreedAmount?: number;
  agreedBenefits: string[];
  currency: string;
  agreedByJobSeeker: boolean;
  agreedByEmployer: boolean;
  agreementTimestamp?: Date;
  finalRound: number;
  totalRounds: number;
  duration: number; // in minutes
}

export interface AgreementConfirmation {
  roomId: string;
  party: 'jobseeker' | 'employer';
  confirmed: boolean;
  confirmedAt: Date;
  conditions?: string[];
  notes?: string;
}

export interface RejectionReason {
  roomId: string;
  rejectedBy: 'jobseeker' | 'employer';
  reason: string;
  rejectedAt: Date;
  alternativeProposed?: boolean;
  alternativeAmount?: number;
}

export interface NegotiationExport {
  roomId: string;
  exportType: 'pdf' | 'json' | 'csv';
  exportedAt: Date;
  data: string;
  summary: string;
}

// In-memory storage
const agreementConfirmations = new Map<string, AgreementConfirmation[]>();
const rejectionReasons = new Map<string, RejectionReason[]>();

export class NegotiationResultService {
  /**
   * Confirm agreement from one party
   */
  async confirmAgreement(
    roomId: string,
    party: 'jobseeker' | 'employer',
    conditions?: string[],
    notes?: string
  ): Promise<AgreementConfirmation> {
    const room = await negotiationRoomService.getRoom(roomId);
    if (!room) {
      throw new Error('Room not found');
    }

    if (room.status !== NegotiationStatus.NEGOTIATING &&
        room.status !== NegotiationStatus.ACTIVE) {
      throw new Error('Cannot confirm agreement: negotiation is not active');
    }

    const confirmation: AgreementConfirmation = {
      roomId,
      party,
      confirmed: true,
      confirmedAt: new Date(),
      conditions,
      notes
    };

    // Store confirmation
    const confirmations = agreementConfirmations.get(roomId) || [];
    // Remove existing confirmation from same party
    const filtered = confirmations.filter(c => c.party !== party);
    filtered.push(confirmation);
    agreementConfirmations.set(roomId, filtered);

    // Add system message
    await negotiationRoomService.sendMessage({
      roomId,
      sender: 'system' as any,
      senderId: 'system',
      content: `${party === 'jobseeker' ? 'Job seeker' : 'Employer'} has confirmed the agreement.${conditions ? ` Conditions: ${conditions.join(', ')}` : ''}`,
      metadata: { type: 'agreement_confirmation', party, conditions }
    });

    return confirmation;
  }

  /**
   * Check if both parties have agreed
   */
  async checkMutualAgreement(roomId: string): Promise<{
    agreed: boolean;
    jobseekerConfirmed: boolean;
    employerConfirmed: boolean;
  }> {
    const confirmations = agreementConfirmations.get(roomId) || [];
    const jobseekerConfirmed = confirmations.some(c => c.party === 'jobseeker');
    const employerConfirmed = confirmations.some(c => c.party === 'employer');

    return {
      agreed: jobseekerConfirmed && employerConfirmed,
      jobseekerConfirmed,
      employerConfirmed
    };
  }

  /**
   * Finalize negotiation with agreement
   */
  async finalizeAgreement(
    roomId: string,
    agreedAmount: number,
    agreedBenefits: string[]
  ): Promise<NegotiationResult> {
    const room = await negotiationRoomService.markAsReached(
      roomId,
      agreedAmount,
      agreedBenefits
    );

    if (!room) {
      throw new Error('Failed to finalize agreement: room not found');
    }

    // Calculate duration
    const duration = Math.round(
      (new Date().getTime() - room.createdAt.getTime()) / (1000 * 60)
    );

    const result: NegotiationResult = {
      roomId,
      status: NegotiationStatus.REACHED,
      agreedAmount,
      agreedBenefits,
      currency: room.currency,
      agreedByJobSeeker: true,
      agreedByEmployer: true,
      agreementTimestamp: new Date(),
      finalRound: room.currentRound,
      totalRounds: room.rounds.length,
      duration
    };

    return result;
  }

  /**
   * Record rejection
   */
  async recordRejection(
    roomId: string,
    rejectedBy: 'jobseeker' | 'employer',
    reason: string,
    alternativeProposed?: boolean,
    alternativeAmount?: number
  ): Promise<RejectionReason> {
    const room = await negotiationRoomService.getRoom(roomId);
    if (!room) {
      throw new Error('Room not found');
    }

    const rejection: RejectionReason = {
      roomId,
      rejectedBy,
      reason,
      rejectedAt: new Date(),
      alternativeProposed,
      alternativeAmount
    };

    const reasons = rejectionReasons.get(roomId) || [];
    reasons.push(rejection);
    rejectionReasons.set(roomId, reasons);

    // Add system message
    await negotiationRoomService.sendMessage({
      roomId,
      sender: 'system' as any,
      senderId: 'system',
      content: `${rejectedBy === 'jobseeker' ? 'Job seeker' : 'Employer'} has rejected the offer.${reason ? ` Reason: ${reason}` : ''}${alternativeAmount ? ` Alternative proposed: ${alternativeAmount}` : ''}`,
      metadata: { type: 'rejection', rejectedBy, reason, alternativeAmount }
    });

    // If rejection received, mark as failed
    await negotiationRoomService.markAsFailed(roomId);

    return rejection;
  }

  /**
   * Get negotiation result
   */
  async getResult(roomId: string): Promise<NegotiationResult | null> {
    const history = await negotiationRoomService.getHistory(roomId);
    if (!history) return null;

    const { room } = history;

    if (room.status !== NegotiationStatus.REACHED &&
        room.status !== NegotiationStatus.FAILED &&
        room.status !== NegotiationStatus.CANCELLED) {
      return null;
    }

    const duration = Math.round(
      (new Date().getTime() - room.createdAt.getTime()) / (1000 * 60)
    );

    const confirmations = agreementConfirmations.get(roomId) || [];
    const jobseekerConfirmed = confirmations.some(c => c.party === 'jobseeker');
    const employerConfirmed = confirmations.some(c => c.party === 'employer');

    return {
      roomId,
      status: room.status,
      agreedAmount: room.agreedAmount,
      agreedBenefits: room.agreedBenefits || [],
      currency: room.currency,
      agreedByJobSeeker: jobseekerConfirmed,
      agreedByEmployer: employerConfirmed,
      agreementTimestamp: room.completedAt,
      finalRound: room.currentRound,
      totalRounds: room.rounds.length,
      duration
    };
  }

  /**
   * Export negotiation history
   */
  async exportNegotiation(
    roomId: string,
    exportType: 'pdf' | 'json' | 'csv'
  ): Promise<NegotiationExport> {
    const history = await negotiationRoomService.getHistory(roomId);
    if (!history) {
      throw new Error('Room not found');
    }

    const { room, messages } = history;

    let data: string;
    let summary: string;

    switch (exportType) {
      case 'json':
        data = JSON.stringify({ room, messages }, null, 2);
        summary = `Negotiation ${roomId} - ${room.status}`;
        break;
      case 'csv':
        data = this.convertToCSV(messages);
        summary = `Negotiation transcript with ${messages.length} messages`;
        break;
      case 'pdf':
      default:
        data = this.convertToText(room, messages);
        summary = `Negotiation ${roomId} - Final: ${room.agreedAmount || 'No agreement'} ${room.currency}`;
    }

    return {
      roomId,
      exportType,
      exportedAt: new Date(),
      data,
      summary
    };
  }

  /**
   * Get rejection reasons for a room
   */
  async getRejectionReasons(roomId: string): Promise<RejectionReason[]> {
    return rejectionReasons.get(roomId) || [];
  }

  /**
   * Get all confirmations for a room
   */
  async getConfirmations(roomId: string): Promise<AgreementConfirmation[]> {
    return agreementConfirmations.get(roomId) || [];
  }

  /**
   * Cancel negotiation
   */
  async cancelNegotiation(roomId: string, reason?: string): Promise<NegotiationRoom | null> {
    return negotiationRoomService.cancelRoom(roomId, reason);
  }

  /**
   * Check if agreement conditions are met
   */
  async checkAgreementConditions(roomId: string): Promise<{
    conditionsMet: boolean;
    pendingConditions: string[];
    jobseekerConditions: string[];
    employerConditions: string[];
  }> {
    const confirmations = agreementConfirmations.get(roomId) || [];
    const jobseekerConfirmation = confirmations.find(c => c.party === 'jobseeker');
    const employerConfirmation = confirmations.find(c => c.party === 'employer');

    const jobseekerConditions = jobseekerConfirmation?.conditions || [];
    const employerConditions = employerConfirmation?.conditions || [];

    // Check if conditions are compatible (simplified logic)
    const pendingConditions: string[] = [];

    // Both parties must confirm
    const conditionsMet = !!jobseekerConfirmation && !!employerConfirmation;

    return {
      conditionsMet,
      pendingConditions,
      jobseekerConditions,
      employerConditions
    };
  }

  /**
   * Get negotiation statistics
   */
  async getStatistics(roomId: string): Promise<{
    totalMessages: number;
    messagesBySender: Record<string, number>;
    averageResponseTime: number;
    offerProgression: number[];
    topicsDiscussed: NegotiationTopic[];
  } | null> {
    const history = await negotiationRoomService.getHistory(roomId);
    if (!history) return null;

    const { messages, room } = history;

    const messagesBySender: Record<string, number> = {};
    messages.forEach(m => {
      messagesBySender[m.sender] = (messagesBySender[m.sender] || 0) + 1;
    });

    // Calculate average response time
    let totalResponseTime = 0;
    let responseCount = 0;
    for (let i = 1; i < messages.length; i++) {
      if (messages[i].sender !== messages[i - 1].sender) {
        const timeDiff = messages[i].timestamp.getTime() - messages[i - 1].timestamp.getTime();
        totalResponseTime += timeDiff;
        responseCount++;
      }
    }
    const averageResponseTime = responseCount > 0
      ? Math.round(totalResponseTime / responseCount / 1000)
      : 0;

    // Get offer progression
    const offerProgression = room.rounds
      .filter(r => r.employerOffer || r.jobSeekerOffer)
      .map(r => r.employerOffer || r.jobSeekerOffer || 0);

    // Get topics discussed
    const topicsDiscussed = [...new Set(messages.filter(m => m.topic).map(m => m.topic as NegotiationTopic))];

    return {
      totalMessages: messages.length,
      messagesBySender,
      averageResponseTime,
      offerProgression,
      topicsDiscussed
    };
  }

  private convertToCSV(messages: NegotiationMessage[]): string {
    const headers = ['Timestamp', 'Sender', 'Round', 'Content', 'Topic', 'Offer Value'];
    const rows = messages.map(m => [
      m.timestamp.toISOString(),
      m.sender,
      m.round.toString(),
      `"${m.content.replace(/"/g, '""')}"`,
      m.topic || '',
      m.offerValue?.toString() || ''
    ]);

    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  }

  private convertToText(room: NegotiationRoom, messages: NegotiationMessage[]): string {
    let text = `NEGOTIATION TRANSCRIPT\n`;
    text += `=====================\n\n`;
    text += `Room ID: ${room.id}\n`;
    text += `Status: ${room.status}\n`;
    text += `Created: ${room.createdAt.toISOString()}\n`;
    text += `Completed: ${room.completedAt?.toISOString() || 'N/A'}\n`;
    text += `Rounds: ${room.currentRound}/${room.maxRounds}\n`;
    text += `Topics: ${room.topics.join(', ')}\n`;
    text += `Currency: ${room.currency}\n`;
    text += `Agreed Amount: ${room.agreedAmount || 'N/A'}\n\n`;
    text += `--- CONVERSATION ---\n\n`;

    messages.forEach(m => {
      text += `[${m.timestamp.toISOString()}] Round ${m.round} - ${m.sender}:\n`;
      text += `${m.content}\n`;
      if (m.offerValue) {
        text += `[Offer: ${m.offerValue} ${m.offerCurrency}]\n`;
      }
      text += '\n';
    });

    return text;
  }
}

// Export singleton instance
export const negotiationResultService = new NegotiationResultService();
