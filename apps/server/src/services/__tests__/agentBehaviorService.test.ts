import {
  AgentMessage,
  AgentMessageType,
  AgentType,
  MessagePriority,
  AgentProtocolErrorCode,
} from '@bridgeai/shared';

import { AgentBehaviorService } from '../agentBehaviorService';

describe('AgentBehaviorService', () => {
  let service: AgentBehaviorService;
  let mockMessage: AgentMessage;
  const agentId = 'agent_test_123';

  beforeEach(() => {
    service = new AgentBehaviorService();
    mockMessage = {
      id: 'msg_test_123',
      type: AgentMessageType.DIRECT,
      sender: {
        agentId,
        displayName: 'Test Agent',
        type: AgentType.PERSONAL,
        ownerId: 'user_456',
        ownerName: 'Test User',
        trustScore: 95,
        isVerified: true,
        capabilities: ['chat'],
      },
      recipientId: 'user_789',
      content: { text: 'Hello' },
      metadata: {
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        priority: MessagePriority.NORMAL,
        requireAck: false,
        ttl: 0,
        traceId: 'trace_123',
      },
    };
  });

  describe('checkBehavior', () => {
    it('should allow valid message', async () => {
      const result = await service.checkBehavior(agentId, mockMessage);
      expect(result.allowed).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject message from suspended agent', async () => {
      // Create violations to suspend agent
      for (let i = 0; i < 10; i++) {
        const spamMessage = {
          ...mockMessage,
          id: `msg_spam_${i}`,
          content: { text: 'spam spam spam' },
        };
        await service.checkBehavior(agentId, spamMessage);
      }

      const result = await service.checkBehavior(agentId, mockMessage);
      expect(result.allowed).toBe(false);
      expect(result.error?.code).toBe(AgentProtocolErrorCode.UNAUTHORIZED);
    });

    it('should reject restricted agent sending group messages', async () => {
      // Create violations to restrict agent
      for (let i = 0; i < 3; i++) {
        const badMessage = {
          ...mockMessage,
          id: `msg_bad_${i}`,
          content: { text: 'inappropriate content' },
        };
        await service.checkBehavior(agentId, badMessage);
      }

      const groupMessage = {
        ...mockMessage,
        type: AgentMessageType.GROUP,
      };

      const result = await service.checkBehavior(agentId, groupMessage);
      expect(result.allowed).toBe(false);
      expect(result.error?.code).toBe(AgentProtocolErrorCode.UNAUTHORIZED);
    });

    it('should reject message exceeding rate limit', async () => {
      // Send 61 messages (limit is 60/min for DIRECT)
      for (let i = 0; i < 61; i++) {
        const msg = {
          ...mockMessage,
          id: `msg_rate_${i}`,
        };
        await service.checkBehavior(agentId, msg);
      }

      const result = await service.checkBehavior(agentId, mockMessage);
      expect(result.allowed).toBe(false);
      expect(result.error?.code).toBe(AgentProtocolErrorCode.RATE_LIMITED);
    });

    it('should reject message with prohibited content', async () => {
      const badMessage = {
        ...mockMessage,
        content: { text: 'This is a spam message with phishing link' },
      };

      const result = await service.checkBehavior(agentId, badMessage);
      expect(result.allowed).toBe(false);
      expect(result.error?.code).toBe(AgentProtocolErrorCode.CONTENT_VIOLATION);
    });

    it('should reject spam content', async () => {
      const spamMessage = {
        ...mockMessage,
        content: { text: 'BUY NOW!!! BUY NOW!!! BUY NOW!!!' },
      };

      const result = await service.checkBehavior(agentId, spamMessage);
      expect(result.allowed).toBe(false);
      expect(result.error?.code).toBe(AgentProtocolErrorCode.CONTENT_VIOLATION);
    });

    it('should reject excessive caps', async () => {
      const capsMessage = {
        ...mockMessage,
        content: { text: 'HELLO THIS IS ALL CAPS AND VERY LONG MESSAGE HERE' },
      };

      const result = await service.checkBehavior(agentId, capsMessage);
      expect(result.allowed).toBe(false);
    });

    it('should reject repetitive messages', async () => {
      // Send same message 6 times (limit is 5)
      const repetitiveMessage = {
        ...mockMessage,
        content: { text: 'Same message content here' },
      };

      for (let i = 0; i < 6; i++) {
        await service.checkBehavior(agentId, {
          ...repetitiveMessage,
          id: `msg_repeat_${i}`,
        });
      }

      const result = await service.checkBehavior(agentId, repetitiveMessage);
      expect(result.allowed).toBe(false);
      expect(result.error?.code).toBe(AgentProtocolErrorCode.CONTENT_VIOLATION);
    });
  });

  describe('getViolations', () => {
    it('should return empty array for clean agent', () => {
      const violations = service.getViolations(agentId);
      expect(violations).toHaveLength(0);
    });

    it('should return recorded violations', async () => {
      // Trigger a violation
      const badMessage = {
        ...mockMessage,
        content: { text: 'This is spam content' },
      };
      await service.checkBehavior(agentId, badMessage);

      const violations = service.getViolations(agentId);
      expect(violations.length).toBeGreaterThan(0);
      expect(violations[0].type).toBe('CONTENT_VIOLATION');
    });
  });

  describe('getAllViolations', () => {
    it('should return all violations sorted by timestamp', async () => {
      const agentId2 = 'agent_test_456';

      // Create violations for both agents
      const badMessage = {
        ...mockMessage,
        content: { text: 'spam content' },
      };

      await service.checkBehavior(agentId, badMessage);
      await service.checkBehavior(agentId2, badMessage);

      const allViolations = service.getAllViolations();
      expect(allViolations.length).toBeGreaterThanOrEqual(2);

      // Check sorted by timestamp (newest first)
      for (let i = 1; i < allViolations.length; i++) {
        const prev = new Date(allViolations[i - 1].timestamp).getTime();
        const curr = new Date(allViolations[i].timestamp).getTime();
        expect(prev).toBeGreaterThanOrEqual(curr);
      }
    });
  });

  describe('isRestricted', () => {
    it('should return false for clean agent', () => {
      expect(service.isRestricted(agentId)).toBe(false);
    });

    it('should return true for restricted agent', async () => {
      // Create violations to restrict
      for (let i = 0; i < 3; i++) {
        const badMessage = {
          ...mockMessage,
          content: { text: 'inappropriate content' },
        };
        await service.checkBehavior(agentId, badMessage);
      }

      expect(service.isRestricted(agentId)).toBe(true);
    });
  });

  describe('isSuspended', () => {
    it('should return false for clean agent', () => {
      expect(service.isSuspended(agentId)).toBe(false);
    });

    it('should return true for suspended agent', async () => {
      // Create violations to suspend
      for (let i = 0; i < 10; i++) {
        const badMessage = {
          ...mockMessage,
          content: { text: 'spam' },
        };
        await service.checkBehavior(agentId, badMessage);
      }

      expect(service.isSuspended(agentId)).toBe(true);
    });
  });

  describe('liftRestriction', () => {
    it('should remove agent from restricted list', async () => {
      // Restrict agent first
      for (let i = 0; i < 3; i++) {
        const badMessage = {
          ...mockMessage,
          content: { text: 'bad content' },
        };
        await service.checkBehavior(agentId, badMessage);
      }

      expect(service.isRestricted(agentId)).toBe(true);

      service.liftRestriction(agentId);
      expect(service.isRestricted(agentId)).toBe(false);
    });
  });

  describe('liftSuspension', () => {
    it('should remove agent from suspended list', async () => {
      // Suspend agent first
      for (let i = 0; i < 10; i++) {
        const badMessage = {
          ...mockMessage,
          content: { text: 'spam' },
        };
        await service.checkBehavior(agentId, badMessage);
      }

      expect(service.isSuspended(agentId)).toBe(true);

      service.liftSuspension(agentId);
      expect(service.isSuspended(agentId)).toBe(false);
    });
  });

  describe('clearViolations', () => {
    it('should clear all violations for agent', async () => {
      // Create violations
      const badMessage = {
        ...mockMessage,
        content: { text: 'spam content' },
      };
      await service.checkBehavior(agentId, badMessage);

      expect(service.getViolations(agentId).length).toBeGreaterThan(0);

      service.clearViolations(agentId);
      expect(service.getViolations(agentId)).toHaveLength(0);
    });

    it('should also lift restrictions', async () => {
      // Restrict agent
      for (let i = 0; i < 3; i++) {
        const badMessage = {
          ...mockMessage,
          content: { text: 'bad' },
        };
        await service.checkBehavior(agentId, badMessage);
      }

      expect(service.isRestricted(agentId)).toBe(true);

      service.clearViolations(agentId);
      expect(service.isRestricted(agentId)).toBe(false);
    });
  });
});
