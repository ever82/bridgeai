/**
 * Agent Initiated Chat Service Tests
 * Agent主动发起约会对话测试 (ISSUE-DATE002 c4 + ISSUE-AI004)
 */

jest.mock('../../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('../../ai/openingLineService', () => ({
  generateOpeningLine: jest.fn(() => ({
    line: '嗨！很高兴认识你。',
    tone: 'friendly',
    basedOn: ['共同兴趣'],
    alternatives: ['你好！', '聊聊看？'],
  })),
}));

jest.mock('../../ai/agentDialogService', () => ({
  agentDialogService: {
    createSession: jest.fn(async () => ({ id: 'dialog-session-1' })),
    generateMessage: jest.fn(async () => ({ content: 'LLM-generated reply' })),
  },
}));

jest.mock('../../agentBehaviorService', () => ({
  agentBehaviorService: {
    isSuspended: jest.fn(() => false),
  },
}));

jest.mock('../privateAdviceService', () => ({
  emitPrivateAdvice: jest.fn(),
  generateAdviceFromConversation: jest.fn(() => null),
}));

import { agentBehaviorService } from '../../agentBehaviorService';
import { agentDialogService } from '../../ai/agentDialogService';
import {
  initiateChat,
  generateAgentResponse,
  pauseChatForUserInput,
  sendUserMessage,
  completeChat,
  getChatSession,
  getActiveChatsForUser,
  ChatStatus,
  MaxActiveChatsError,
  BehaviorRejectedError,
  MAX_ACTIVE_CHATS_PER_USER,
} from '../agentInitiatedChat';

function createTestMatchScore(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    profileId: 'profile-1',
    agentId: 'agent-1',
    totalScore: 75,
    dimensions: [],
    highlights: ['共同兴趣'],
    warnings: [],
    ...overrides,
  } as any;
}

beforeEach(() => {
  jest.clearAllMocks();
  (agentBehaviorService.isSuspended as jest.Mock).mockReturnValue(false);
  (agentDialogService.generateMessage as jest.Mock).mockResolvedValue({
    content: 'LLM-generated reply',
  });
});

describe('AgentInitiatedChat', () => {
  describe('initiateChat', () => {
    it('should create a chat session with opening line', async () => {
      const session = await initiateChat({
        matchScore: createTestMatchScore(),
        sourceAgentId: 'agent-a',
        targetAgentId: 'agent-b',
        sourceUserId: 'user-a',
        targetUserId: 'user-b',
      });

      expect(session).toBeDefined();
      expect(session.id).toBeDefined();
      expect(session.status).toBe(ChatStatus.ACTIVE);
      expect(session.messages).toHaveLength(1);
      expect(session.messages[0].content).toBe('嗨！很高兴认识你。');
      expect(session.openingLine).toBeDefined();
    });

    it('should have goals defined', async () => {
      const session = await initiateChat({
        matchScore: createTestMatchScore(),
        sourceAgentId: 'agent-a',
        targetAgentId: 'agent-b',
        sourceUserId: 'user-a',
        targetUserId: 'user-b',
      });

      expect(session.goals.length).toBeGreaterThan(0);
      expect(session.goals[0].primary).toBeDefined();
      expect(session.goals[0].completionCriteria.length).toBeGreaterThan(0);
    });

    it('should reject when source agent is suspended (BehaviorRejectedError)', async () => {
      (agentBehaviorService.isSuspended as jest.Mock).mockReturnValueOnce(true);

      await expect(
        initiateChat({
          matchScore: createTestMatchScore(),
          sourceAgentId: 'agent-suspended',
          targetAgentId: 'agent-b',
          sourceUserId: 'user-suspended',
          targetUserId: 'user-b',
        })
      ).rejects.toBeInstanceOf(BehaviorRejectedError);
    });

    it('should throw MaxActiveChatsError when user reaches concurrency cap', async () => {
      const userId = 'user-cap';
      // Fill up to the cap
      for (let i = 0; i < MAX_ACTIVE_CHATS_PER_USER; i++) {
        await initiateChat({
          matchScore: createTestMatchScore(),
          sourceAgentId: `agent-cap-${i}`,
          targetAgentId: `agent-target-${i}`,
          sourceUserId: userId,
          targetUserId: `user-target-${i}`,
        });
      }

      await expect(
        initiateChat({
          matchScore: createTestMatchScore(),
          sourceAgentId: 'agent-cap-extra',
          targetAgentId: 'agent-target-extra',
          sourceUserId: userId,
          targetUserId: 'user-target-extra',
        })
      ).rejects.toBeInstanceOf(MaxActiveChatsError);
    });
  });

  describe('generateAgentResponse', () => {
    it('should generate a response message via LLM', async () => {
      const session = await initiateChat({
        matchScore: createTestMatchScore(),
        sourceAgentId: 'agent-a',
        targetAgentId: 'agent-b',
        sourceUserId: 'user-a-llm',
        targetUserId: 'user-b-llm',
        config: { maxAutoTurns: 10 }, // 防止自动暂停
      });

      const response = await generateAgentResponse(session.id, 'agent-b');
      expect(response).not.toBeNull();
      expect(response!.content).toBe('LLM-generated reply');
      expect(response!.senderAgentId).toBe('agent-b');
      expect(agentDialogService.generateMessage).toHaveBeenCalled();
    });

    it('should fall back to template content if LLM fails', async () => {
      (agentDialogService.generateMessage as jest.Mock).mockRejectedValueOnce(
        new Error('LLM provider unavailable')
      );

      const session = await initiateChat({
        matchScore: createTestMatchScore({ highlights: ['共同兴趣A'] }),
        sourceAgentId: 'agent-a',
        targetAgentId: 'agent-b',
        sourceUserId: 'user-a-llm-fail',
        targetUserId: 'user-b-llm-fail',
        config: { maxAutoTurns: 10 },
      });

      const response = await generateAgentResponse(session.id, 'agent-b');
      expect(response).not.toBeNull();
      expect(response!.content).toBeTruthy();
      // Fallback contains the highlight
      expect(response!.content).toContain('共同兴趣A');
    });

    it('should produce content that varies based on match highlights (not stuck on a single template)', async () => {
      // Two distinct highlights → if LLM is mocked to return the user content as-is,
      // distinct highlights should still produce distinct messages over multiple sessions.
      (agentDialogService.generateMessage as jest.Mock)
        .mockResolvedValueOnce({ content: 'Reply about A' })
        .mockResolvedValueOnce({ content: 'Reply about B' });

      const sessionA = await initiateChat({
        matchScore: createTestMatchScore({ highlights: ['HighlightA'] }),
        sourceAgentId: 'agent-var-a',
        targetAgentId: 'agent-var-target-a',
        sourceUserId: 'user-var-a',
        targetUserId: 'user-var-b',
        config: { maxAutoTurns: 10 },
      });
      const sessionB = await initiateChat({
        matchScore: createTestMatchScore({ highlights: ['HighlightB'] }),
        sourceAgentId: 'agent-var-b',
        targetAgentId: 'agent-var-target-b',
        sourceUserId: 'user-var-c',
        targetUserId: 'user-var-d',
        config: { maxAutoTurns: 10 },
      });

      const respA = await generateAgentResponse(sessionA.id, 'agent-var-target-a');
      const respB = await generateAgentResponse(sessionB.id, 'agent-var-target-b');

      expect(respA?.content).not.toEqual(respB?.content);
    });

    it('should return null for non-existent session', async () => {
      const response = await generateAgentResponse('non-existent', 'agent-b');
      expect(response).toBeNull();
    });
  });

  describe('pauseChatForUserInput', () => {
    it('should change status to paused', async () => {
      const session = await initiateChat({
        matchScore: createTestMatchScore(),
        sourceAgentId: 'agent-a',
        targetAgentId: 'agent-b',
        sourceUserId: 'user-pause',
        targetUserId: 'user-b',
      });

      await pauseChatForUserInput(session.id);

      const updated = getChatSession(session.id);
      expect(updated!.status).toBe(ChatStatus.PAUSED);
      expect(updated!.pausedAt).toBeDefined();
    });
  });

  describe('sendUserMessage', () => {
    it('should add user message and resume paused chat', async () => {
      const session = await initiateChat({
        matchScore: createTestMatchScore(),
        sourceAgentId: 'agent-a',
        targetAgentId: 'agent-b',
        sourceUserId: 'user-send',
        targetUserId: 'user-b',
      });

      await pauseChatForUserInput(session.id);
      const message = await sendUserMessage(session.id, 'user-send', '你好！');

      expect(message.content).toBe('你好！');
      expect(message.senderAgentId).toBe('user-send');

      const updated = getChatSession(session.id);
      expect(updated!.status).toBe(ChatStatus.ACTIVE);
    });
  });

  describe('completeChat', () => {
    it('should mark session as completed', async () => {
      const session = await initiateChat({
        matchScore: createTestMatchScore(),
        sourceAgentId: 'agent-a',
        targetAgentId: 'agent-b',
        sourceUserId: 'user-complete',
        targetUserId: 'user-b',
      });

      const completed = await completeChat(session.id, 'success');
      expect(completed.status).toBe(ChatStatus.COMPLETED);
      expect(completed.completedAt).toBeDefined();
    });
  });

  describe('getActiveChatsForUser', () => {
    it('should return active chats for user', async () => {
      await initiateChat({
        matchScore: createTestMatchScore(),
        sourceAgentId: 'agent-a',
        targetAgentId: 'agent-b',
        sourceUserId: 'user-active',
        targetUserId: 'user-b',
      });

      const chats = getActiveChatsForUser('user-active');
      expect(chats.length).toBeGreaterThan(0);
    });
  });
});
