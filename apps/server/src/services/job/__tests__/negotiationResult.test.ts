/**
 * @jest-environment node
 */

import { NegotiationRoom, NegotiationStatus, NegotiationTopic } from '../../../models/NegotiationRoom';
import { NegotiationRoomService } from '../negotiationRoom';
import { NegotiationResultService } from '../negotiationResult';

describe('NegotiationResultService', () => {
  let roomService: NegotiationRoomService;
  let resultService: NegotiationResultService;

  beforeEach(() => {
    roomService = new NegotiationRoomService();
    resultService = new NegotiationResultService();
  });

  async function createAndStartRoom() {
    const request = {
      jobApplicationId: 'app_123',
      jobSeekerId: 'seeker_123',
      jobSeekerAgentId: 'agent_seeker_123',
      employerId: 'employer_123',
      employerAgentId: 'agent_employer_123',
      topics: [NegotiationTopic.SALARY, NegotiationTopic.BENEFITS],
      maxRounds: 5,
      initialOffer: 50000,
      currency: 'USD'
    };

    const room = await roomService.createRoom(request);
    await roomService.startNegotiation(room.id);
    return room;
  }

  describe('confirmAgreement', () => {
    it('should record agreement confirmation from a party', async () => {
      const room = await createAndStartRoom();

      const confirmation = await resultService.confirmAgreement(
        room.id,
        'jobseeker',
        ['Remote work option'],
        'Happy with the offer'
      );

      expect(confirmation).toBeDefined();
      expect(confirmation.party).toBe('jobseeker');
      expect(confirmation.confirmed).toBe(true);
      expect(confirmation.conditions).toEqual(['Remote work option']);
    });

    it('should throw error if room not found', async () => {
      await expect(resultService.confirmAgreement('non_existent', 'jobseeker'))
        .rejects.toThrow('Room not found');
    });

    it('should throw error if negotiation not active', async () => {
      const room = await roomService.createRoom({
        jobApplicationId: 'app_123',
        jobSeekerId: 'seeker_123',
        jobSeekerAgentId: 'agent_seeker_123',
        employerId: 'employer_123',
        employerAgentId: 'agent_employer_123'
      });

      await expect(resultService.confirmAgreement(room.id, 'jobseeker'))
        .rejects.toThrow('Cannot confirm agreement: negotiation is not active');
    });
  });

  describe('checkMutualAgreement', () => {
    it('should return true when both parties have confirmed', async () => {
      const room = await createAndStartRoom();

      await resultService.confirmAgreement(room.id, 'jobseeker');
      await resultService.confirmAgreement(room.id, 'employer');

      const result = await resultService.checkMutualAgreement(room.id);

      expect(result.agreed).toBe(true);
      expect(result.jobseekerConfirmed).toBe(true);
      expect(result.employerConfirmed).toBe(true);
    });

    it('should return false when only one party has confirmed', async () => {
      const room = await createAndStartRoom();

      await resultService.confirmAgreement(room.id, 'jobseeker');

      const result = await resultService.checkMutualAgreement(room.id);

      expect(result.agreed).toBe(false);
      expect(result.jobseekerConfirmed).toBe(true);
      expect(result.employerConfirmed).toBe(false);
    });

    it('should return false when no confirmations', async () => {
      const room = await createAndStartRoom();

      const result = await resultService.checkMutualAgreement(room.id);

      expect(result.agreed).toBe(false);
      expect(result.jobseekerConfirmed).toBe(false);
      expect(result.employerConfirmed).toBe(false);
    });
  });

  describe('finalizeAgreement', () => {
    it('should finalize negotiation with agreed terms', async () => {
      const room = await createAndStartRoom();

      const result = await resultService.finalizeAgreement(
        room.id,
        55000,
        ['Health insurance', '401k matching', 'Remote work']
      );

      expect(result).toBeDefined();
      expect(result.status).toBe(NegotiationStatus.REACHED);
      expect(result.agreedAmount).toBe(55000);
      expect(result.agreedBenefits).toEqual(['Health insurance', '401k matching', 'Remote work']);
      expect(result.agreedByJobSeeker).toBe(true);
      expect(result.agreedByEmployer).toBe(true);
      expect(result.finalRound).toBe(1);
    });

    it('should calculate duration correctly', async () => {
      const room = await createAndStartRoom();

      // Simulate time passing
      const result = await resultService.finalizeAgreement(room.id, 55000, []);

      expect(result.duration).toBeGreaterThanOrEqual(0);
    });
  });

  describe('recordRejection', () => {
    it('should record rejection with reason', async () => {
      const room = await createAndStartRoom();

      const rejection = await resultService.recordRejection(
        room.id,
        'jobseeker',
        'Salary too low for my experience',
        true,
        65000
      );

      expect(rejection).toBeDefined();
      expect(rejection.rejectedBy).toBe('jobseeker');
      expect(rejection.reason).toBe('Salary too low for my experience');
      expect(rejection.alternativeProposed).toBe(true);
      expect(rejection.alternativeAmount).toBe(65000);
    });

    it('should mark room as failed when rejection is recorded', async () => {
      const room = await createAndStartRoom();

      await resultService.recordRejection(room.id, 'employer', 'Not a good fit');

      const updatedRoom = await roomService.getRoom(room.id);
      expect(updatedRoom?.status).toBe(NegotiationStatus.FAILED);
    });
  });

  describe('getResult', () => {
    it('should return null for ongoing negotiation', async () => {
      const room = await createAndStartRoom();

      const result = await resultService.getResult(room.id);

      expect(result).toBeNull();
    });

    it('should return result for finalized negotiation', async () => {
      const room = await createAndStartRoom();

      await resultService.finalizeAgreement(room.id, 55000, ['Benefits']);

      const result = await resultService.getResult(room.id);

      expect(result).toBeDefined();
      expect(result?.status).toBe(NegotiationStatus.REACHED);
      expect(result?.agreedAmount).toBe(55000);
    });

    it('should return result for cancelled negotiation', async () => {
      const room = await createAndStartRoom();

      await resultService.cancelNegotiation(room.id, 'User cancelled');

      const result = await resultService.getResult(room.id);

      expect(result).toBeDefined();
      expect(result?.status).toBe(NegotiationStatus.CANCELLED);
    });
  });

  describe('exportNegotiation', () => {
    it('should export as JSON', async () => {
      const room = await createAndStartRoom();
      await roomService.sendMessage({
        roomId: room.id,
        sender: 'jobseeker_agent' as any,
        senderId: 'agent_123',
        content: 'Test message'
      });

      const exportData = await resultService.exportNegotiation(room.id, 'json');

      expect(exportData).toBeDefined();
      expect(exportData.exportType).toBe('json');
      expect(exportData.data).toContain('room');
      expect(exportData.data).toContain('messages');
    });

    it('should export as CSV', async () => {
      const room = await createAndStartRoom();
      await roomService.sendMessage({
        roomId: room.id,
        sender: 'jobseeker_agent' as any,
        senderId: 'agent_123',
        content: 'Test message'
      });

      const exportData = await resultService.exportNegotiation(room.id, 'csv');

      expect(exportData).toBeDefined();
      expect(exportData.exportType).toBe('csv');
      expect(exportData.data).toContain('Timestamp');
      expect(exportData.data).toContain('Sender');
    });

    it('should throw error if room not found', async () => {
      await expect(resultService.exportNegotiation('non_existent', 'json'))
        .rejects.toThrow('Room not found');
    });
  });

  describe('getRejectionReasons', () => {
    it('should return all rejection reasons for a room', async () => {
      const room = await createAndStartRoom();

      await resultService.recordRejection(room.id, 'jobseeker', 'Too low');

      const reasons = await resultService.getRejectionReasons(room.id);

      expect(reasons).toHaveLength(1);
      expect(reasons[0].rejectedBy).toBe('jobseeker');
    });

    it('should return empty array if no rejections', async () => {
      const room = await createAndStartRoom();

      const reasons = await resultService.getRejectionReasons(room.id);

      expect(reasons).toEqual([]);
    });
  });

  describe('getConfirmations', () => {
    it('should return all confirmations for a room', async () => {
      const room = await createAndStartRoom();

      await resultService.confirmAgreement(room.id, 'jobseeker');
      await resultService.confirmAgreement(room.id, 'employer');

      const confirmations = await resultService.getConfirmations(room.id);

      expect(confirmations).toHaveLength(2);
    });
  });

  describe('checkAgreementConditions', () => {
    it('should check if both parties have confirmed', async () => {
      const room = await createAndStartRoom();

      await resultService.confirmAgreement(room.id, 'jobseeker', ['Remote work']);
      await resultService.confirmAgreement(room.id, 'employer', ['Start date flexibility']);

      const result = await resultService.checkAgreementConditions(room.id);

      expect(result.conditionsMet).toBe(true);
      expect(result.jobseekerConditions).toEqual(['Remote work']);
      expect(result.employerConditions).toEqual(['Start date flexibility']);
    });

    it('should return conditions not met if one party missing', async () => {
      const room = await createAndStartRoom();

      await resultService.confirmAgreement(room.id, 'jobseeker');

      const result = await resultService.checkAgreementConditions(room.id);

      expect(result.conditionsMet).toBe(false);
    });
  });

  describe('getStatistics', () => {
    it('should return negotiation statistics', async () => {
      const room = await createAndStartRoom();

      // Send some messages
      await roomService.sendMessage({
        roomId: room.id,
        sender: 'jobseeker_agent' as any,
        senderId: 'agent_1',
        content: 'Hello'
      });
      await roomService.sendMessage({
        roomId: room.id,
        sender: 'employer_agent' as any,
        senderId: 'agent_2',
        content: 'Hi there'
      });

      const stats = await resultService.getStatistics(room.id);

      expect(stats).toBeDefined();
      expect(stats?.totalMessages).toBe(2);
      expect(stats?.messagesBySender).toBeDefined();
      expect(stats?.averageResponseTime).toBeGreaterThanOrEqual(0);
    });

    it('should return null if room not found', async () => {
      const stats = await resultService.getStatistics('non_existent');

      expect(stats).toBeNull();
    });
  });

  describe('cancelNegotiation', () => {
    it('should cancel the negotiation', async () => {
      const room = await createAndStartRoom();

      const cancelled = await resultService.cancelNegotiation(room.id, 'Candidate withdrew');

      expect(cancelled).toBeDefined();
      expect(cancelled?.status).toBe(NegotiationStatus.CANCELLED);
    });
  });
});
