/**
 * Agent Initiated Chat Service Tests
 * Agent主动发起约会对话测试 (ISSUE-DATE002 c4)
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

import {
  initiateChat,
  generateAgentResponse,
  pauseChatForUserInput,
  sendUserMessage,
  completeChat,
  getChatSession,
  getActiveChatsForUser,
  ChatStatus,
} from '../agentInitiatedChat';

function createTestMatchScore() {
  return {
    profileId: 'profile-1',
    agentId: 'agent-1',
    totalScore: 75,
    dimensions: [],
    highlights: ['共同兴趣'],
    warnings: [],
  };
}

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
  });

  describe('generateAgentResponse', () => {
    it('should generate a response message', async () => {
      const session = await initiateChat({
        matchScore: createTestMatchScore(),
        sourceAgentId: 'agent-a',
        targetAgentId: 'agent-b',
        sourceUserId: 'user-a',
        targetUserId: 'user-b',
        config: { maxAutoTurns: 10 }, // 防止自动暂停
      });

      const response = await generateAgentResponse(session.id, 'agent-b');
      expect(response).not.toBeNull();
      expect(response!.content).toBeDefined();
      expect(response!.senderAgentId).toBe('agent-b');
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
        sourceUserId: 'user-a',
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
        sourceUserId: 'user-a',
        targetUserId: 'user-b',
      });

      await pauseChatForUserInput(session.id);
      const message = await sendUserMessage(session.id, 'user-a', '你好！');

      expect(message.content).toBe('你好！');
      expect(message.senderAgentId).toBe('user-a');

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
        sourceUserId: 'user-a',
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
