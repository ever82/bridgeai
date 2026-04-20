/**
 * Agent Dialog Service Tests
 */

import {
  AgentDialogService,
  DialogParticipant,
} from '../agentDialogService';

describe('AgentDialogService', () => {
  let service: AgentDialogService;

  beforeEach(() => {
    service = new AgentDialogService();
  });

  describe('createSession', () => {
    it('should create a new dialog session', async () => {
      const participants: DialogParticipant[] = [
        { id: 'agent-1', name: 'Agent A', type: 'agent', agentType: 'VISIONSHARE' },
        { id: 'agent-2', name: 'Agent B', type: 'agent', agentType: 'AGENTDATE' },
      ];

      const session = await service.createSession('agent_to_agent', participants, 'dating');

      expect(session).toBeDefined();
      expect(session.id).toMatch(/^dialog-/);
      expect(session.type).toBe('agent_to_agent');
      expect(session.participants).toHaveLength(2);
      expect(session.status).toBe('active');
      expect(session.scene).toBe('dating');
      expect(session.messages).toHaveLength(0);
    });

    it('should create session with initial context', async () => {
      const participants: DialogParticipant[] = [
        { id: 'user-1', name: 'User', type: 'user' },
        { id: 'agent-1', name: 'Agent', type: 'agent' },
      ];

      const session = await service.createSession('agent_to_user', participants, 'general', {
        goals: ['help user find a match'],
        constraints: ['be respectful'],
        userPreferences: { language: 'zh-CN' },
      });

      expect(session.context.goals).toContain('help user find a match');
      expect(session.context.constraints).toContain('be respectful');
      expect(session.context.userPreferences?.language).toBe('zh-CN');
    });

    it('should create negotiation session', async () => {
      const participants: DialogParticipant[] = [
        { id: 'buyer-agent', name: 'Buyer Agent', type: 'agent', agentType: 'AGENTAD' },
        { id: 'seller-agent', name: 'Seller Agent', type: 'agent', agentType: 'AGENTAD' },
      ];

      const session = await service.createSession('negotiation', participants, 'advertising', {
        negotiationState: {
          currentRound: 1,
          agreedTerms: [],
          pendingIssues: ['price', 'delivery'],
        },
      });

      expect(session.type).toBe('negotiation');
      expect(session.context.negotiationState?.pendingIssues).toContain('price');
    });
  });

  describe('getSession', () => {
    it('should return session by id', async () => {
      const participants: DialogParticipant[] = [
        { id: 'agent-1', name: 'Agent A', type: 'agent' },
        { id: 'agent-2', name: 'Agent B', type: 'agent' },
      ];

      const created = await service.createSession('agent_to_agent', participants);
      const found = service.getSession(created.id);

      expect(found).toBeDefined();
      expect(found?.id).toBe(created.id);
    });

    it('should return null for non-existent session', () => {
      const found = service.getSession('non-existent');
      expect(found).toBeNull();
    });
  });

  describe('getSessionsForParticipant', () => {
    it('should return sessions for a participant', async () => {
      const agentId = 'agent-1';
      const participants: DialogParticipant[] = [
        { id: agentId, name: 'Agent A', type: 'agent' },
        { id: 'agent-2', name: 'Agent B', type: 'agent' },
      ];

      await service.createSession('agent_to_agent', participants);
      await service.createSession('agent_to_agent', participants);

      const sessions = service.getSessionsForParticipant(agentId);
      expect(sessions).toHaveLength(2);
    });

    it('should not return archived sessions', async () => {
      const agentId = 'agent-1';
      const participants: DialogParticipant[] = [
        { id: agentId, name: 'Agent A', type: 'agent' },
        { id: 'agent-2', name: 'Agent B', type: 'agent' },
      ];

      const session = await service.createSession('agent_to_agent', participants);
      service.archiveSession(session.id);

      const sessions = service.getSessionsForParticipant(agentId);
      expect(sessions).toHaveLength(0);
    });
  });

  describe('archiveSession', () => {
    it('should archive a session', async () => {
      const participants: DialogParticipant[] = [
        { id: 'agent-1', name: 'Agent A', type: 'agent' },
        { id: 'agent-2', name: 'Agent B', type: 'agent' },
      ];

      const session = await service.createSession('agent_to_agent', participants);
      service.archiveSession(session.id);

      const found = service.getSession(session.id);
      expect(found?.status).toBe('archived');
    });
  });

  describe('updateSessionContext', () => {
    it('should update session context', async () => {
      const participants: DialogParticipant[] = [
        { id: 'agent-1', name: 'Agent A', type: 'agent' },
        { id: 'agent-2', name: 'Agent B', type: 'agent' },
      ];

      const session = await service.createSession('agent_to_agent', participants);

      const updated = service.updateSessionContext(session.id, {
        goals: ['new goal'],
        constraints: ['new constraint'],
      });

      expect(updated.context.goals).toContain('new goal');
      expect(updated.context.constraints).toContain('new constraint');
    });

    it('should throw for non-existent session', () => {
      expect(() => {
        service.updateSessionContext('non-existent', { goals: ['test'] });
      }).toThrow('Session non-existent not found');
    });
  });

  describe('generateMessage', () => {
    it('should throw for non-existent session', async () => {
      await expect(
        service.generateMessage({
          sessionId: 'non-existent',
          senderId: 'agent-1',
          senderType: 'agent',
          content: 'Hello',
        })
      ).rejects.toThrow('Session non-existent not found');
    });

    it('should throw if sender not in session', async () => {
      const participants: DialogParticipant[] = [
        { id: 'agent-1', name: 'Agent A', type: 'agent' },
        { id: 'agent-2', name: 'Agent B', type: 'agent' },
      ];

      const session = await service.createSession('agent_to_agent', participants);

      await expect(
        service.generateMessage({
          sessionId: session.id,
          senderId: 'unknown-agent',
          senderType: 'agent',
          content: 'Hello',
        })
      ).rejects.toThrow('Sender unknown-agent not found in session');
    });

    it('should generate a message and add it to session', async () => {
      const participants: DialogParticipant[] = [
        { id: 'agent-1', name: 'Agent A', type: 'agent', agentType: 'VISIONSHARE' },
        { id: 'agent-2', name: 'Agent B', type: 'agent', agentType: 'AGENTDATE' },
      ];

      const session = await service.createSession('agent_to_agent', participants, 'dating', {
        goals: ['find compatible match'],
        constraints: ['respect privacy'],
      });

      const message = await service.generateMessage({
        sessionId: session.id,
        senderId: 'agent-1',
        senderType: 'agent',
        content: '你好，我是Agent A，很高兴认识你！',
      });

      expect(message).toBeDefined();
      expect(message.id).toMatch(/^msg-/);
      expect(message.sessionId).toBe(session.id);
      expect(message.senderId).toBe('agent-1');
      expect(message.senderType).toBe('agent');
      expect(message.content).toBeDefined();
      expect(message.content.length).toBeGreaterThan(0);

      // Verify message was added to session
      const updatedSession = service.getSession(session.id);
      expect(updatedSession?.messages).toHaveLength(1);
    });
  });

  describe('getSessionMessages', () => {
    it('should return messages with pagination', async () => {
      const participants: DialogParticipant[] = [
        { id: 'agent-1', name: 'Agent A', type: 'agent', agentType: 'VISIONSHARE' },
        { id: 'agent-2', name: 'Agent B', type: 'agent', agentType: 'AGENTDATE' },
      ];

      const session = await service.createSession('agent_to_agent', participants, 'dating', {
        goals: ['find match'],
        constraints: ['be nice'],
      });

      // Generate a few messages
      await service.generateMessage({
        sessionId: session.id,
        senderId: 'agent-1',
        senderType: 'agent',
        content: 'Hello from Agent A',
      });

      await service.generateMessage({
        sessionId: session.id,
        senderId: 'agent-2',
        senderType: 'agent',
        content: 'Hello from Agent B',
      });

      const messages = service.getSessionMessages(session.id);
      expect(messages).toHaveLength(2);

      // With limit
      const limited = service.getSessionMessages(session.id, { limit: 1 });
      expect(limited).toHaveLength(1);
    });

    it('should throw for non-existent session', () => {
      expect(() => {
        service.getSessionMessages('non-existent');
      }).toThrow('Session non-existent not found');
    });
  });

  describe('getVersion', () => {
    it('should return the service version', () => {
      expect(service.getVersion()).toBe('1.0.0');
    });
  });

  describe('getSessionCount', () => {
    it('should return the number of sessions', async () => {
      expect(service.getSessionCount()).toBe(0);

      const participants: DialogParticipant[] = [
        { id: 'agent-1', name: 'Agent A', type: 'agent' },
        { id: 'agent-2', name: 'Agent B', type: 'agent' },
      ];

      await service.createSession('agent_to_agent', participants);
      expect(service.getSessionCount()).toBe(1);

      await service.createSession('agent_to_agent', participants);
      expect(service.getSessionCount()).toBe(2);
    });
  });
});