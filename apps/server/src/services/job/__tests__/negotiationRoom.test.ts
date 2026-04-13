/**
 * @jest-environment node
 */

import {
  NegotiationRoom,
  NegotiationTopic,
  NegotiationStatus,
  MessageSender,
  createNegotiationRoom,
  createNegotiationMessage,
  calculateNegotiationProgress,
  shouldHandoffToHuman
} from '../../../models/NegotiationRoom';
import { NegotiationRoomService } from '../negotiationRoom';

describe('NegotiationRoomService', () => {
  let service: NegotiationRoomService;

  beforeEach(() => {
    service = new NegotiationRoomService();
  });

  describe('createRoom', () => {
    it('should create a new negotiation room', async () => {
      const request = {
        jobApplicationId: 'app_123',
        jobSeekerId: 'seeker_123',
        jobSeekerAgentId: 'agent_seeker_123',
        employerId: 'employer_123',
        employerAgentId: 'agent_employer_123',
        topics: [NegotiationTopic.SALARY, NegotiationTopic.BENEFITS],
        maxRounds: 5,
        initialOffer: 50000,
        targetRange: { min: 45000, max: 60000 },
        currency: 'USD'
      };

      const room = await service.createRoom(request);

      expect(room).toBeDefined();
      expect(room.jobApplicationId).toBe(request.jobApplicationId);
      expect(room.jobSeekerId).toBe(request.jobSeekerId);
      expect(room.employerId).toBe(request.employerId);
      expect(room.status).toBe(NegotiationStatus.PENDING);
      expect(room.topics).toEqual(request.topics);
      expect(room.maxRounds).toBe(request.maxRounds);
      expect(room.initialOffer).toBe(request.initialOffer);
      expect(room.currency).toBe(request.currency);
    });

    it('should create room with default values', async () => {
      const request = {
        jobApplicationId: 'app_123',
        jobSeekerId: 'seeker_123',
        jobSeekerAgentId: 'agent_seeker_123',
        employerId: 'employer_123',
        employerAgentId: 'agent_employer_123'
      };

      const room = await service.createRoom(request);

      expect(room.topics).toEqual([NegotiationTopic.SALARY]);
      expect(room.maxRounds).toBe(5);
      expect(room.currency).toBe('CNY');
      expect(room.currentRound).toBe(0);
    });
  });

  describe('getRoom', () => {
    it('should return room by id', async () => {
      const request = {
        jobApplicationId: 'app_123',
        jobSeekerId: 'seeker_123',
        jobSeekerAgentId: 'agent_seeker_123',
        employerId: 'employer_123',
        employerAgentId: 'agent_employer_123'
      };

      const created = await service.createRoom(request);
      const retrieved = await service.getRoom(created.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(created.id);
    });

    it('should return null for non-existent room', async () => {
      const room = await service.getRoom('non_existent_id');
      expect(room).toBeNull();
    });
  });

  describe('getRooms', () => {
    it('should filter rooms by job application id', async () => {
      const request1 = {
        jobApplicationId: 'app_123',
        jobSeekerId: 'seeker_123',
        jobSeekerAgentId: 'agent_seeker_123',
        employerId: 'employer_123',
        employerAgentId: 'agent_employer_123'
      };

      const request2 = {
        jobApplicationId: 'app_456',
        jobSeekerId: 'seeker_456',
        jobSeekerAgentId: 'agent_seeker_456',
        employerId: 'employer_456',
        employerAgentId: 'agent_employer_456'
      };

      await service.createRoom(request1);
      await service.createRoom(request2);

      const rooms = await service.getRooms({ jobApplicationId: 'app_123' });

      expect(rooms).toHaveLength(1);
      expect(rooms[0].jobApplicationId).toBe('app_123');
    });

    it('should filter rooms by status', async () => {
      const request = {
        jobApplicationId: 'app_123',
        jobSeekerId: 'seeker_123',
        jobSeekerAgentId: 'agent_seeker_123',
        employerId: 'employer_123',
        employerAgentId: 'agent_employer_123'
      };

      await service.createRoom(request);

      const rooms = await service.getRooms({ status: NegotiationStatus.PENDING });

      expect(rooms.length).toBeGreaterThan(0);
      expect(rooms.every(r => r.status === NegotiationStatus.PENDING)).toBe(true);
    });
  });

  describe('startNegotiation', () => {
    it('should start negotiation and change status to active', async () => {
      const request = {
        jobApplicationId: 'app_123',
        jobSeekerId: 'seeker_123',
        jobSeekerAgentId: 'agent_seeker_123',
        employerId: 'employer_123',
        employerAgentId: 'agent_employer_123'
      };

      const room = await service.createRoom(request);
      const started = await service.startNegotiation(room.id);

      expect(started).toBeDefined();
      expect(started?.status).toBe(NegotiationStatus.ACTIVE);
      expect(started?.currentRound).toBe(1);
      expect(started?.rounds).toHaveLength(1);
    });

    it('should throw error if room is not in pending status', async () => {
      const request = {
        jobApplicationId: 'app_123',
        jobSeekerId: 'seeker_123',
        jobSeekerAgentId: 'agent_seeker_123',
        employerId: 'employer_123',
        employerAgentId: 'agent_employer_123'
      };

      const room = await service.createRoom(request);
      await service.startNegotiation(room.id);

      await expect(service.startNegotiation(room.id)).rejects.toThrow();
    });
  });

  describe('sendMessage', () => {
    it('should send a message in the room', async () => {
      const request = {
        jobApplicationId: 'app_123',
        jobSeekerId: 'seeker_123',
        jobSeekerAgentId: 'agent_seeker_123',
        employerId: 'employer_123',
        employerAgentId: 'agent_employer_123'
      };

      const room = await service.createRoom(request);
      await service.startNegotiation(room.id);

      const message = await service.sendMessage({
        roomId: room.id,
        sender: MessageSender.JOBSEEKER_AGENT,
        senderId: 'agent_seeker_123',
        content: 'Hello, I would like to discuss the salary.',
        topic: NegotiationTopic.SALARY
      });

      expect(message).toBeDefined();
      expect(message.content).toBe('Hello, I would like to discuss the salary.');
      expect(message.sender).toBe(MessageSender.JOBSEEKER_AGENT);
      expect(message.round).toBe(1);
    });

    it('should update room status to negotiating on first message', async () => {
      const request = {
        jobApplicationId: 'app_123',
        jobSeekerId: 'seeker_123',
        jobSeekerAgentId: 'agent_seeker_123',
        employerId: 'employer_123',
        employerAgentId: 'agent_employer_123'
      };

      const room = await service.createRoom(request);
      await service.startNegotiation(room.id);

      await service.sendMessage({
        roomId: room.id,
        sender: MessageSender.JOBSEEKER_AGENT,
        senderId: 'agent_seeker_123',
        content: 'Hello!'
      });

      const updatedRoom = await service.getRoom(room.id);
      expect(updatedRoom?.status).toBe(NegotiationStatus.NEGOTIATING);
    });
  });

  describe('advanceRound', () => {
    it('should advance to next round', async () => {
      const request = {
        jobApplicationId: 'app_123',
        jobSeekerId: 'seeker_123',
        jobSeekerAgentId: 'agent_seeker_123',
        employerId: 'employer_123',
        employerAgentId: 'agent_employer_123'
      };

      const room = await service.createRoom(request);
      await service.startNegotiation(room.id);

      const newRound = await service.advanceRound(room.id);

      expect(newRound).toBeDefined();
      expect(newRound?.roundNumber).toBe(2);

      const updatedRoom = await service.getRoom(room.id);
      expect(updatedRoom?.currentRound).toBe(2);
    });

    it('should return null when max rounds reached', async () => {
      const request = {
        jobApplicationId: 'app_123',
        jobSeekerId: 'seeker_123',
        jobSeekerAgentId: 'agent_seeker_123',
        employerId: 'employer_123',
        employerAgentId: 'agent_employer_123',
        maxRounds: 2
      };

      const room = await service.createRoom(request);
      await service.startNegotiation(room.id);
      await service.advanceRound(room.id);

      const newRound = await service.advanceRound(room.id);

      expect(newRound).toBeNull();

      const updatedRoom = await service.getRoom(room.id);
      expect(updatedRoom?.status).toBe(NegotiationStatus.HANDOFF_TO_HUMAN);
    });
  });

  describe('markAsReached', () => {
    it('should mark negotiation as reached with agreement', async () => {
      const request = {
        jobApplicationId: 'app_123',
        jobSeekerId: 'seeker_123',
        jobSeekerAgentId: 'agent_seeker_123',
        employerId: 'employer_123',
        employerAgentId: 'agent_employer_123'
      };

      const room = await service.createRoom(request);
      await service.startNegotiation(room.id);

      const result = await service.markAsReached(room.id, 55000, ['Health insurance', 'Remote work']);

      expect(result).toBeDefined();
      expect(result?.status).toBe(NegotiationStatus.REACHED);
      expect(result?.agreedAmount).toBe(55000);
      expect(result?.agreedBenefits).toEqual(['Health insurance', 'Remote work']);
    });
  });

  describe('getProgress', () => {
    it('should return negotiation progress', async () => {
      const request = {
        jobApplicationId: 'app_123',
        jobSeekerId: 'seeker_123',
        jobSeekerAgentId: 'agent_seeker_123',
        employerId: 'employer_123',
        employerAgentId: 'agent_employer_123',
        maxRounds: 5
      };

      const room = await service.createRoom(request);
      await service.startNegotiation(room.id);

      const progress = await service.getProgress(room.id);

      expect(progress).toBeDefined();
      expect(progress?.currentRound).toBe(1);
      expect(progress?.maxRounds).toBe(5);
      expect(progress?.progress).toBe(20);
      expect(progress?.remainingRounds).toBe(4);
      expect(progress?.isStale).toBe(false);
    });
  });
});

describe('NegotiationRoom Model Helpers', () => {
  describe('createNegotiationRoom', () => {
    it('should create a room with correct initial state', () => {
      const input = {
        jobApplicationId: 'app_123',
        jobSeekerId: 'seeker_123',
        jobSeekerAgentId: 'agent_seeker_123',
        employerId: 'employer_123',
        employerAgentId: 'agent_employer_123'
      };

      const room = createNegotiationRoom(input, () => 'test_id');

      expect(room.id).toBe('test_id');
      expect(room.status).toBe(NegotiationStatus.PENDING);
      expect(room.currentRound).toBe(0);
      expect(room.rounds).toEqual([]);
    });
  });

  describe('createNegotiationMessage', () => {
    it('should create a message with correct properties', () => {
      const message = createNegotiationMessage(
        'room_123',
        MessageSender.JOBSEEKER_AGENT,
        'agent_123',
        'Test message',
        1,
        () => 'msg_id'
      );

      expect(message.id).toBe('msg_id');
      expect(message.roomId).toBe('room_123');
      expect(message.sender).toBe(MessageSender.JOBSEEKER_AGENT);
      expect(message.content).toBe('Test message');
      expect(message.round).toBe(1);
    });
  });

  describe('calculateNegotiationProgress', () => {
    it('should calculate correct progress', () => {
      const room = {
        currentRound: 2,
        maxRounds: 5,
        updatedAt: new Date(),
        status: NegotiationStatus.NEGOTIATING
      } as NegotiationRoom;

      const progress = calculateNegotiationProgress(room);

      expect(progress.progress).toBe(40);
      expect(progress.remainingRounds).toBe(3);
      expect(progress.isStale).toBe(false);
    });

    it('should detect stale negotiation', () => {
      const yesterday = new Date();
      yesterday.setHours(yesterday.getHours() - 25);

      const room = {
        currentRound: 2,
        maxRounds: 5,
        updatedAt: yesterday,
        status: NegotiationStatus.NEGOTIATING
      } as NegotiationRoom;

      const progress = calculateNegotiationProgress(room);

      expect(progress.isStale).toBe(true);
    });
  });

  describe('shouldHandoffToHuman', () => {
    it('should trigger handoff when max rounds reached', () => {
      const room = {
        currentRound: 5,
        maxRounds: 5,
        rounds: [],
        status: NegotiationStatus.NEGOTIATING,
        updatedAt: new Date()
      } as NegotiationRoom;

      const result = shouldHandoffToHuman(room);

      expect(result.should).toBe(true);
      expect(result.reason).toBe('MAX_ROUNDS_REACHED');
    });

    it('should trigger handoff on stalemate detection', () => {
      const room = {
        currentRound: 3,
        maxRounds: 5,
        rounds: [
          { jobSeekerOffer: 50000, employerOffer: 45000 },
          { jobSeekerOffer: 50000, employerOffer: 45000 },
          { jobSeekerOffer: 50000, employerOffer: 45000 }
        ],
        status: NegotiationStatus.NEGOTIATING,
        updatedAt: new Date()
      } as unknown as NegotiationRoom;

      const result = shouldHandoffToHuman(room);

      expect(result.should).toBe(true);
      expect(result.reason).toBe('STALEMATE_DETECTED');
    });

    it('should not trigger handoff during active negotiation', () => {
      const room = {
        currentRound: 2,
        maxRounds: 5,
        rounds: [],
        status: NegotiationStatus.NEGOTIATING,
        updatedAt: new Date()
      } as NegotiationRoom;

      const result = shouldHandoffToHuman(room);

      expect(result.should).toBe(false);
    });
  });
});
