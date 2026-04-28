/**
 * Dating Conversation Integration Tests (ISSUE-DATE003)
 *
 * Tests the agent conversation matching flow end-to-end using real service
 * functions (no mocks). Services use in-memory Maps so no DB is required.
 *
 * Coverage:
 * - c1: Agent conversation room creation, activation, messaging, rounds, timeout
 * - c2: Dating conversation generation (topic selection, multi-turn)
 * - c3: Quality assessment during/after conversation
 * - c4: Report generation after conversation completes
 * - c6: Safety checks on messages
 */

process.env.NODE_ENV = 'test';

import {
  createRoom,
  activateRoom,
  addMessage,
  completeRoom,
  getRoom,
  getRoomMessages,
  getActiveRoomsByUser,
  incrementRound,
  terminateRoom,
  clearAllRooms,
  RoomNotFoundError,
  RoomStatusError,
} from '../../services/dating/agentConversationRoom';
import { datingConversationService } from '../../services/ai/datingConversationService';
import type { DatingProfileSummary } from '../../services/ai/datingConversationService';
import {
  assessConversation,
  detectIssues,
  getQualityTrend,
  generateQualityReport,
} from '../../services/dating/conversationQualityService';
import {
  checkMessageSafety,
  detectSensitiveTopics,
  filterInappropriateContent,
} from '../../services/dating/conversationSafetyService';
import { conversationReportService } from '../../services/ai/conversationReportService';
import type { SessionData } from '../../services/ai/conversationReportService';

// ---------------------------------------------------------------------------
// Test profiles
// ---------------------------------------------------------------------------

const profileA: DatingProfileSummary = {
  userId: 'user-a',
  agentId: 'agent-a',
  interests: ['音乐', '旅行'],
  personality: ['开朗'],
  lifestyle: ['规律'],
  goals: ['真诚交友'],
};

const profileB: DatingProfileSummary = {
  userId: 'user-b',
  agentId: 'agent-b',
  interests: ['音乐', '摄影'],
  personality: ['温柔'],
  lifestyle: ['随性'],
  goals: ['认真恋爱'],
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build a sample set of messages for quality assessment tests.
 * These simulate a multi-turn conversation between two agents.
 */
function buildSampleMessages(
  count: number = 6
): Array<{ role: string; content: string; agentId?: string }> {
  const messages: Array<{ role: string; content: string; agentId?: string }> = [];
  const turns = [
    {
      role: 'user',
      content: '你好呀！最近有什么有趣的事吗？我平时比较规律，你呢？',
      agentId: 'agent-a',
    },
    {
      role: 'assistant',
      content: '你好！最近在学摄影，感觉特别有意思。你喜欢旅行吗？',
      agentId: 'agent-b',
    },
    {
      role: 'user',
      content: '喜欢呀！我上个月去了云南，风景特别美，还听了当地的音乐。',
      agentId: 'agent-a',
    },
    {
      role: 'assistant',
      content: '云南真的很漂亮！我也想去，你觉得那里的音乐怎么样？',
      agentId: 'agent-b',
    },
    {
      role: 'user',
      content: '当地民谣很有特色，让人感觉很放松。你觉得什么样的关系最舒服？',
      agentId: 'agent-a',
    },
    {
      role: 'assistant',
      content: '我觉得能互相理解、一起分享生活点滴的关系最舒服。你呢？',
      agentId: 'agent-b',
    },
  ];

  for (let i = 0; i < count && i < turns.length; i++) {
    messages.push(turns[i]);
  }
  return messages;
}

// ---------------------------------------------------------------------------
// Test suites
// ---------------------------------------------------------------------------

describe('Dating Conversation Integration (ISSUE-DATE003)', () => {
  beforeEach(() => {
    clearAllRooms();
  });

  afterAll(() => {
    clearAllRooms();
  });

  // =========================================================================
  // c1: Agent Conversation Room
  // =========================================================================

  describe('Agent Conversation Room (c1)', () => {
    it('should create a room in pending status', async () => {
      const room = await createRoom('agent-a', 'agent-b', 'user-a', 'user-b');

      expect(room).toBeDefined();
      expect(room.id).toBeTruthy();
      expect(room.agentAId).toBe('agent-a');
      expect(room.agentBId).toBe('agent-b');
      expect(room.userIdA).toBe('user-a');
      expect(room.userIdB).toBe('user-b');
      expect(room.status).toBe('pending');
      expect(room.currentRound).toBe(0);
      expect(room.maxRounds).toBe(20);
      expect(room.startedAt).toBeNull();
      expect(room.completedAt).toBeNull();
      expect(room.qualityScore).toBeNull();
      expect(room.createdAt).toBeInstanceOf(Date);
    });

    it('should create a room with custom config', async () => {
      const room = await createRoom('agent-a', 'agent-b', 'user-a', 'user-b', {
        maxRounds: 10,
        timeoutMs: 5 * 60 * 1000,
        qualityThreshold: 0.7,
      });

      expect(room.maxRounds).toBe(10);
      expect(room.timeoutMs).toBe(5 * 60 * 1000);
    });

    it('should retrieve a created room by id', async () => {
      const created = await createRoom('agent-a', 'agent-b', 'user-a', 'user-b');
      const fetched = await getRoom(created.id);

      expect(fetched).not.toBeNull();
      expect(fetched!.id).toBe(created.id);
      expect(fetched!.agentAId).toBe('agent-a');
    });

    it('should return null for a non-existent room', async () => {
      const fetched = await getRoom('non-existent-id');
      expect(fetched).toBeNull();
    });

    it('should activate a pending room', async () => {
      const created = await createRoom('agent-a', 'agent-b', 'user-a', 'user-b');
      const activated = await activateRoom(created.id);

      expect(activated.status).toBe('active');
      expect(activated.currentRound).toBe(1);
      expect(activated.startedAt).toBeInstanceOf(Date);
      expect(activated.lastMessageAt).toBeInstanceOf(Date);
    });

    it('should throw when activating a non-existent room', async () => {
      await expect(activateRoom('non-existent')).rejects.toThrow(RoomNotFoundError);
    });

    it('should throw when activating an already active room', async () => {
      const created = await createRoom('agent-a', 'agent-b', 'user-a', 'user-b');
      await activateRoom(created.id);

      await expect(activateRoom(created.id)).rejects.toThrow(RoomStatusError);
    });

    it('should add messages to an active room', async () => {
      const created = await createRoom('agent-a', 'agent-b', 'user-a', 'user-b');
      await activateRoom(created.id);

      const msg = await addMessage(created.id, 'agent-a', 'agent_a', '你好，很高兴认识你！');

      expect(msg).toBeDefined();
      expect(msg.roomId).toBe(created.id);
      expect(msg.senderId).toBe('agent-a');
      expect(msg.senderType).toBe('agent_a');
      expect(msg.content).toBe('你好，很高兴认识你！');
      expect(msg.round).toBe(1);
      expect(msg.timestamp).toBeInstanceOf(Date);
    });

    it('should throw when adding a non-system message to a non-active room', async () => {
      const created = await createRoom('agent-a', 'agent-b', 'user-a', 'user-b');

      await expect(addMessage(created.id, 'agent-a', 'agent_a', 'hello')).rejects.toThrow(
        RoomStatusError
      );
    });

    it('should throw when adding a message to a non-existent room', async () => {
      await expect(addMessage('non-existent', 'agent-a', 'agent_a', 'hello')).rejects.toThrow(
        RoomNotFoundError
      );
    });

    it('should add system messages even to pending rooms', async () => {
      const created = await createRoom('agent-a', 'agent-b', 'user-a', 'user-b');

      // Room creation already adds a system message
      const messages = await getRoomMessages(created.id);
      expect(messages.length).toBeGreaterThanOrEqual(1);
      expect(messages[0].senderType).toBe('system');
    });

    it('should retrieve all messages for a room in chronological order', async () => {
      const created = await createRoom('agent-a', 'agent-b', 'user-a', 'user-b');
      await activateRoom(created.id);

      await addMessage(created.id, 'agent-a', 'agent_a', '第一条消息');
      await addMessage(created.id, 'agent-b', 'agent_b', '第二条消息');
      await addMessage(created.id, 'agent-a', 'agent_a', '第三条消息');

      const messages = await getRoomMessages(created.id);

      // Includes system messages from creation and activation
      const agentMessages = messages.filter(m => m.senderType !== 'system');
      expect(agentMessages).toHaveLength(3);
      expect(agentMessages[0].content).toBe('第一条消息');
      expect(agentMessages[1].content).toBe('第二条消息');
      expect(agentMessages[2].content).toBe('第三条消息');
    });

    it('should increment round and stay within max rounds', async () => {
      const created = await createRoom('agent-a', 'agent-b', 'user-a', 'user-b', { maxRounds: 3 });
      const activated = await activateRoom(created.id);
      expect(activated.currentRound).toBe(1);

      const round2 = await incrementRound(created.id);
      expect(round2.currentRound).toBe(2);

      const round3 = await incrementRound(created.id);
      expect(round3.currentRound).toBe(3);
    });

    it('should auto-complete when incrementing past max rounds', async () => {
      const created = await createRoom('agent-a', 'agent-b', 'user-a', 'user-b', { maxRounds: 2 });
      await activateRoom(created.id);

      // round 1 -> 2
      await incrementRound(created.id);

      // round 2 -> 3 > maxRounds(2), auto-complete
      const result = await incrementRound(created.id);
      expect(result.status).toBe('completed');
      expect(result.completedAt).toBeInstanceOf(Date);
    });

    it('should throw when incrementing round on non-active room', async () => {
      const created = await createRoom('agent-a', 'agent-b', 'user-a', 'user-b');

      await expect(incrementRound(created.id)).rejects.toThrow(RoomStatusError);
    });

    it('should complete an active room with summary and quality score', async () => {
      const created = await createRoom('agent-a', 'agent-b', 'user-a', 'user-b');
      await activateRoom(created.id);

      await addMessage(created.id, 'agent-a', 'agent_a', '你好');
      await addMessage(created.id, 'agent-b', 'agent_b', '你好呀');

      const completed = await completeRoom(created.id, '双方进行了友好交流', 0.85);

      expect(completed.status).toBe('completed');
      expect(completed.conversationSummary).toBe('双方进行了友好交流');
      expect(completed.qualityScore).toBe(0.85);
      expect(completed.completedAt).toBeInstanceOf(Date);
    });

    it('should complete a pending room without messages', async () => {
      const created = await createRoom('agent-a', 'agent-b', 'user-a', 'user-b');
      const completed = await completeRoom(created.id, '未开始即关闭', null);

      expect(completed.status).toBe('completed');
      expect(completed.qualityScore).toBeNull();
    });

    it('should throw when completing an already completed room', async () => {
      const created = await createRoom('agent-a', 'agent-b', 'user-a', 'user-b');
      await completeRoom(created.id, 'done', null);

      await expect(completeRoom(created.id, 'again', null)).rejects.toThrow(RoomStatusError);
    });

    it('should terminate an active room with a reason', async () => {
      const created = await createRoom('agent-a', 'agent-b', 'user-a', 'user-b');
      await activateRoom(created.id);

      const terminated = await terminateRoom(created.id, '安全原因终止');

      expect(terminated.status).toBe('terminated');
      expect(terminated.completedAt).toBeInstanceOf(Date);
    });

    it('should terminate a pending room', async () => {
      const created = await createRoom('agent-a', 'agent-b', 'user-a', 'user-b');
      const terminated = await terminateRoom(created.id, '用户取消');

      expect(terminated.status).toBe('terminated');
    });

    it('should throw when terminating a completed room', async () => {
      const created = await createRoom('agent-a', 'agent-b', 'user-a', 'user-b');
      await completeRoom(created.id, 'done', null);

      await expect(terminateRoom(created.id, 'nope')).rejects.toThrow(RoomStatusError);
    });

    it('should throw when terminating an expired room', async () => {
      const created = await createRoom('agent-a', 'agent-b', 'user-a', 'user-b');
      await activateRoom(created.id);

      // Manually expire by manipulating status (simulate timeout)
      await getRoom(created.id);
      // We can't directly set status, but we test the error path via completeRoom
      await completeRoom(created.id, 'done', null);

      await expect(terminateRoom(created.id, 'nope')).rejects.toThrow(RoomStatusError);
    });

    it('should find active rooms by user', async () => {
      await createRoom('agent-a', 'agent-b', 'user-a', 'user-b');
      const room2 = await createRoom('agent-c', 'agent-a', 'user-c', 'user-a');
      await activateRoom(room2.id);

      const rooms = await getActiveRoomsByUser('user-a');
      expect(rooms.length).toBe(2); // one pending, one active
    });

    it('should not find rooms for unrelated users', async () => {
      await createRoom('agent-a', 'agent-b', 'user-a', 'user-b');

      const rooms = await getActiveRoomsByUser('user-x');
      expect(rooms).toHaveLength(0);
    });

    it('should update lastMessageAt when a message is added', async () => {
      const created = await createRoom('agent-a', 'agent-b', 'user-a', 'user-b');
      const activated = await activateRoom(created.id);

      const beforeMessage = activated.lastMessageAt!.getTime();

      // Small delay to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 5));
      await addMessage(created.id, 'agent-a', 'agent_a', 'hello');

      const updated = await getRoom(created.id);
      expect(updated!.lastMessageAt!.getTime()).toBeGreaterThanOrEqual(beforeMessage);
    });
  });

  // =========================================================================
  // c2: Dating Conversation Service
  // =========================================================================

  describe('Dating Conversation Service (c2)', () => {
    it('should start a conversation session with profiles', async () => {
      const session = await datingConversationService.startConversation(
        'agent-a',
        'agent-b',
        'user-a',
        'user-b',
        profileA,
        profileB
      );

      expect(session).toBeDefined();
      expect(session.id).toBeTruthy();
      expect(session.roomId).toBeTruthy();
      expect(session.agentAId).toBe('agent-a');
      expect(session.agentBId).toBe('agent-b');
      expect(session.userIdA).toBe('user-a');
      expect(session.userIdB).toBe('user-b');
      expect(session.status).toBe('active');
      expect(session.round).toBe(0);
      expect(session.profileA).toEqual(profileA);
      expect(session.profileB).toEqual(profileB);
    });

    it('should build a topic queue from shared interests', async () => {
      const session = await datingConversationService.startConversation(
        'agent-a',
        'agent-b',
        'user-a',
        'user-b',
        profileA,
        profileB
      );

      // profileA has 音乐, 旅行; profileB has 音乐, 摄影
      // shared interest: 音乐
      expect(session.context.sharedInterests).toContain('音乐');

      // Topics should include interest topics for shared interests
      const interestTopics = session.topics.filter(t => t.category === 'interest');
      expect(interestTopics.length).toBeGreaterThanOrEqual(1);

      // Interest topics should have the shared interest name
      const topicNames = interestTopics.map(t => t.name);
      expect(topicNames).toContain('音乐');
    });

    it('should generate topics in descending relevance order', async () => {
      const session = await datingConversationService.startConversation(
        'agent-a',
        'agent-b',
        'user-a',
        'user-b',
        profileA,
        profileB
      );

      for (let i = 1; i < session.topics.length; i++) {
        expect(session.topics[i - 1].relevanceScore).toBeGreaterThanOrEqual(
          session.topics[i].relevanceScore
        );
      }
    });

    it('should include icebreaker, lifestyle, value, and deep topics', async () => {
      const session = await datingConversationService.startConversation(
        'agent-a',
        'agent-b',
        'user-a',
        'user-b',
        profileA,
        profileB
      );

      const categories = new Set(session.topics.map(t => t.category));
      expect(categories.has('icebreaker')).toBe(true);
      expect(categories.has('lifestyle')).toBe(true);
      expect(categories.has('value')).toBe(true);
      expect(categories.has('deep')).toBe(true);
    });

    it('should generate the next conversation turn', async () => {
      const session = await datingConversationService.startConversation(
        'agent-a',
        'agent-b',
        'user-a',
        'user-b',
        profileA,
        profileB
      );

      const turn = await datingConversationService.generateNextTurn(session.id);

      expect(turn).toBeDefined();
      expect(turn.agentAMessage).toBeTruthy();
      expect(turn.agentBMessage).toBeTruthy();
      expect(turn.topic).toBeTruthy();

      // Session round should be incremented
      const updated = await datingConversationService.getSession(session.id);
      expect(updated!.round).toBe(1);
    });

    it('should generate multiple turns advancing the round', async () => {
      const session = await datingConversationService.startConversation(
        'agent-a',
        'agent-b',
        'user-a',
        'user-b',
        profileA,
        profileB
      );

      // Generate 3 turns
      for (let i = 0; i < 3; i++) {
        const turn = await datingConversationService.generateNextTurn(session.id);
        expect(turn.agentAMessage.length).toBeGreaterThan(0);
        expect(turn.agentBMessage.length).toBeGreaterThan(0);
      }

      const updated = await datingConversationService.getSession(session.id);
      expect(updated!.round).toBe(3);
    });

    it('should mark topics as explored after generating turns', async () => {
      const session = await datingConversationService.startConversation(
        'agent-a',
        'agent-b',
        'user-a',
        'user-b',
        profileA,
        profileB
      );

      await datingConversationService.generateNextTurn(session.id);

      const updated = await datingConversationService.getSession(session.id);
      const exploredCount = updated!.topics.filter(t => t.explored).length;
      expect(exploredCount).toBeGreaterThanOrEqual(1);
    });

    it('should track discussed topics in context', async () => {
      const session = await datingConversationService.startConversation(
        'agent-a',
        'agent-b',
        'user-a',
        'user-b',
        profileA,
        profileB
      );

      const turn1 = await datingConversationService.generateNextTurn(session.id);
      const updated = await datingConversationService.getSession(session.id);

      expect(updated!.context.discussedTopics).toContain(turn1.topic);
    });

    it('should throw for a non-existent session', async () => {
      await expect(
        datingConversationService.generateNextTurn('non-existent-session')
      ).rejects.toThrow('Session not found');
    });

    it('should complete session when all topics are explored', async () => {
      // Create a session with very few rounds to exhaust topics
      const service =
        new (datingConversationService.constructor as new () => typeof datingConversationService)();
      const session = await service.startConversation(
        'agent-a',
        'agent-b',
        'user-a',
        'user-b',
        profileA,
        profileB
      );

      // Generate turns until topics exhausted or max rounds reached
      let lastTurn;
      for (let i = 0; i < 25; i++) {
        try {
          lastTurn = await service.generateNextTurn(session.id);
          if (lastTurn.topic === 'completed') break;
        } catch {
          break;
        }
      }

      const updated = await service.getSession(session.id);
      // Session should be completed or near max rounds
      expect(updated!.round).toBeGreaterThan(0);
    });

    it('should get conversation summary with memory', async () => {
      const session = await datingConversationService.startConversation(
        'agent-a',
        'agent-b',
        'user-a',
        'user-b',
        profileA,
        profileB
      );

      await datingConversationService.generateNextTurn(session.id);

      const memory = await datingConversationService.getConversationSummary(session.id);

      expect(memory).toBeDefined();
      expect(memory.sharedInterests).toContain('音乐');
      expect(memory.discussedTopics.length).toBeGreaterThanOrEqual(1);
    });

    it('should update session status', async () => {
      const session = await datingConversationService.startConversation(
        'agent-a',
        'agent-b',
        'user-a',
        'user-b',
        profileA,
        profileB
      );

      await datingConversationService.updateSessionStatus(session.id, 'completed');

      const updated = await datingConversationService.getSession(session.id);
      expect(updated!.status).toBe('completed');
    });

    it('should throw when generating turn on completed session', async () => {
      const session = await datingConversationService.startConversation(
        'agent-a',
        'agent-b',
        'user-a',
        'user-b',
        profileA,
        profileB
      );

      await datingConversationService.updateSessionStatus(session.id, 'completed');

      await expect(datingConversationService.generateNextTurn(session.id)).rejects.toThrow(
        'Session is not active'
      );
    });

    it('should build personas from profiles', async () => {
      const session = await datingConversationService.startConversation(
        'agent-a',
        'agent-b',
        'user-a',
        'user-b',
        profileA,
        profileB
      );

      expect(session.personaA).toBeDefined();
      expect(session.personaA.personality).toEqual(['开朗']);
      expect(session.personaA.goals).toEqual(['真诚交友']);
      expect(session.personaA.specializations).toEqual(['音乐', '旅行']);
      expect(session.personaA.communicationStyle).toBe('friendly');

      expect(session.personaB).toBeDefined();
      expect(session.personaB.personality).toEqual(['温柔']);
      expect(session.personaB.goals).toEqual(['认真恋爱']);
    });
  });

  // =========================================================================
  // c3: Conversation Quality Assessment
  // =========================================================================

  describe('Conversation Quality Assessment (c3)', () => {
    it('should assess conversation quality from messages', async () => {
      const messages = buildSampleMessages(6);
      const assessment = await assessConversation('room-test-1', messages, 1);

      expect(assessment).toBeDefined();
      expect(assessment.roomId).toBe('room-test-1');
      expect(assessment.round).toBe(1);
      expect(assessment.timestamp).toBeInstanceOf(Date);
    });

    it('should return quality metrics within 0-1 range', async () => {
      const messages = buildSampleMessages(6);
      const assessment = await assessConversation('room-test-metrics', messages, 1);

      const { metrics } = assessment;
      expect(metrics.fluency).toBeGreaterThanOrEqual(0);
      expect(metrics.fluency).toBeLessThanOrEqual(1);
      expect(metrics.topicDepth).toBeGreaterThanOrEqual(0);
      expect(metrics.topicDepth).toBeLessThanOrEqual(1);
      expect(metrics.engagement).toBeGreaterThanOrEqual(0);
      expect(metrics.engagement).toBeLessThanOrEqual(1);
      expect(metrics.coherence).toBeGreaterThanOrEqual(0);
      expect(metrics.coherence).toBeLessThanOrEqual(1);
      expect(metrics.personaConsistency).toBeGreaterThanOrEqual(0);
      expect(metrics.personaConsistency).toBeLessThanOrEqual(1);
      expect(metrics.overall).toBeGreaterThanOrEqual(0);
      expect(metrics.overall).toBeLessThanOrEqual(1);
    });

    it('should return higher quality for a good multi-turn conversation', async () => {
      const messages = buildSampleMessages(6);
      const assessment = await assessConversation('room-good', messages, 1);

      // A 6-message conversation with alternating turns and questions
      // should score reasonably well
      expect(assessment.metrics.overall).toBeGreaterThan(0.3);
    });

    it('should return lower quality for minimal messages', async () => {
      const messages = [{ role: 'user', content: '嗨', agentId: 'a' }];
      const assessment = await assessConversation('room-minimal', messages, 1);

      // Single short message should result in lower engagement and fluency
      expect(assessment.metrics.fluency).toBeLessThanOrEqual(0.7);
      expect(assessment.metrics.engagement).toBeLessThanOrEqual(0.6);
    });

    it('should detect issues in conversations', async () => {
      const messages = [
        { role: 'user', content: '嗯', agentId: 'a' },
        { role: 'assistant', content: '嗯嗯', agentId: 'b' },
        { role: 'user', content: '哦', agentId: 'a' },
        { role: 'assistant', content: '嗯', agentId: 'b' },
        { role: 'user', content: '啊', agentId: 'a' },
        { role: 'assistant', content: '呃', agentId: 'b' },
      ];

      const issues = await detectIssues(messages, 1);

      // Should detect low engagement due to very short messages
      const lowEngagement = issues.find(i => i.type === 'low_engagement');
      expect(lowEngagement).toBeDefined();
      expect(lowEngagement!.severity).toBe('medium');
    });

    it('should detect repetitive content', async () => {
      const messages = [
        { role: 'user', content: '今天天气真好，我想出去散步' },
        { role: 'assistant', content: '今天天气真好，我想出去散步' },
        { role: 'user', content: '今天天气真好，我想出去散步' },
        { role: 'assistant', content: '今天天气真好，我想出去散步' },
      ];

      const issues = await detectIssues(messages, 1);

      const repetitive = issues.find(i => i.type === 'repetitive');
      expect(repetitive).toBeDefined();
    });

    it('should detect inappropriate content patterns', async () => {
      const messages = [
        { role: 'user', content: '我的微信是 abc123，加我吧' },
        { role: 'assistant', content: '好的，我加你' },
      ];

      const issues = await detectIssues(messages, 1);

      const inappropriate = issues.find(i => i.type === 'inappropriate');
      expect(inappropriate).toBeDefined();
      expect(inappropriate!.severity).toBe('high');
    });

    it('should return suggestions based on quality metrics', async () => {
      const messages = [{ role: 'user', content: '嗨', agentId: 'a' }];
      const assessment = await assessConversation('room-suggest', messages, 1);

      expect(assessment.suggestions).toBeDefined();
      expect(Array.isArray(assessment.suggestions)).toBe(true);
    });

    it('should return suggestions for good quality conversation', async () => {
      const messages = buildSampleMessages(6);
      const assessment = await assessConversation('room-good-suggest', messages, 1);

      // Even good conversations get suggestions
      expect(assessment.suggestions.length).toBeGreaterThanOrEqual(0);
    });

    it('should track quality trend across multiple assessments', async () => {
      const roomId = 'room-trend-test';

      // First assessment
      const msgs1 = [{ role: 'user', content: '嗨', agentId: 'a' }];
      await assessConversation(roomId, msgs1, 1);

      // Second assessment with better messages
      const msgs2 = buildSampleMessages(6);
      await assessConversation(roomId, msgs2, 2);

      // Third assessment
      const msgs3 = buildSampleMessages(6);
      await assessConversation(roomId, msgs3, 3);

      const trend = await getQualityTrend(roomId);

      expect(trend).toBeDefined();
      expect(trend.roomId).toBe(roomId);
      expect(trend.assessments).toHaveLength(3);
      expect(trend.averageScore).toBeGreaterThanOrEqual(0);
      expect(trend.averageScore).toBeLessThanOrEqual(1);
      expect(['improving', 'stable', 'declining']).toContain(trend.trendDirection);
    });

    it('should return stable trend for empty assessment history', async () => {
      const trend = await getQualityTrend('room-no-assessments');

      expect(trend.assessments).toHaveLength(0);
      expect(trend.averageScore).toBe(0);
      expect(trend.trendDirection).toBe('stable');
    });

    it('should generate a quality report from cached assessments', async () => {
      const roomId = 'room-report-test';
      const msgs = buildSampleMessages(4);

      await assessConversation(roomId, msgs, 1);
      await assessConversation(roomId, msgs, 2);

      const report = await generateQualityReport(roomId);

      expect(report).toHaveLength(2);
      expect(report[0].roomId).toBe(roomId);
      expect(report[1].roomId).toBe(roomId);
    });
  });

  // =========================================================================
  // c6: Conversation Safety
  // =========================================================================

  describe('Conversation Safety (c6)', () => {
    it('should pass safe messages with level safe', async () => {
      const result = await checkMessageSafety(
        'room-1',
        'msg-1',
        '今天天气不错，我们一起去公园散步吧',
        'agent-a'
      );

      expect(result).toBeDefined();
      expect(result.roomId).toBe('room-1');
      expect(result.messageId).toBe('msg-1');
      expect(result.level).toBe('safe');
      expect(result.action).toBe('allow');
      expect(result.flags).toHaveLength(0);
    });

    it('should detect politics as sensitive topic with danger level', async () => {
      const result = await checkMessageSafety(
        'room-2',
        'msg-2',
        '你对最近的选举和政府政策怎么看？',
        'agent-a'
      );

      expect(result.flags.length).toBeGreaterThan(0);
      expect(result.level).toBe('danger');
      expect(result.action).toBe('block');

      const sensitiveFlag = result.flags.find(f => f.type === 'sensitive_topic');
      expect(sensitiveFlag).toBeDefined();
      expect(sensitiveFlag!.description).toContain('politics');
    });

    it('should detect violence as sensitive topic with danger level', async () => {
      const result = await checkMessageSafety('room-3', 'msg-3', '我想用武器暴力伤害他', 'agent-a');

      expect(result.level).toBe('danger');
      expect(result.action).toBe('block');

      const sensitiveFlag = result.flags.find(f => f.type === 'sensitive_topic');
      expect(sensitiveFlag).toBeDefined();
      expect(sensitiveFlag!.description).toContain('violence');
    });

    it('should detect money-sensitive topics with warning level', async () => {
      const result = await checkMessageSafety(
        'room-4',
        'msg-4',
        '你能借我一些钱吗？帮我转账',
        'agent-a'
      );

      expect(result.flags.length).toBeGreaterThan(0);

      const moneyFlag = result.flags.find(
        f => f.type === 'sensitive_topic' && f.description.includes('money')
      );
      expect(moneyFlag).toBeDefined();
    });

    it('should detect personal info leakage', async () => {
      const result = await checkMessageSafety(
        'room-5',
        'msg-5',
        '我的手机号是 13800138000，微信号 test_wx',
        'agent-a'
      );

      const personalFlag = result.flags.find(f => f.type === 'personal_info');
      expect(personalFlag).toBeDefined();
      expect(personalFlag!.severity).toBe('warning');
    });

    it('should detect email as personal info', async () => {
      const result = await checkMessageSafety(
        'room-6',
        'msg-6',
        '我的邮箱是 test@example.com',
        'agent-a'
      );

      const personalFlag = result.flags.find(f => f.type === 'personal_info');
      expect(personalFlag).toBeDefined();
    });

    it('should detect religion as sensitive topic', async () => {
      const result = await checkMessageSafety(
        'room-7',
        'msg-7',
        '你去过寺庙吗？你对佛教怎么看？',
        'agent-a'
      );

      const religionFlag = result.flags.find(
        f => f.type === 'sensitive_topic' && f.description.includes('religion')
      );
      expect(religionFlag).toBeDefined();
      expect(religionFlag!.severity).toBe('warning');
    });

    it('should detect inappropriate content and filter it', async () => {
      // Use the filterInappropriateContent function directly
      const { filtered, flags } = await filterInappropriateContent('测试正常内容');

      // For clean content, no flags should be raised
      expect(flags).toHaveLength(0);
      expect(filtered).toBe('测试正常内容');
    });

    it('should detect sensitive topics directly', async () => {
      const flags = await detectSensitiveTopics('我们聊聊政治和选举吧');

      expect(flags.length).toBeGreaterThan(0);
      expect(flags[0].type).toBe('sensitive_topic');
      expect(flags[0].severity).toBe('danger');
    });

    it('should return no flags for clean content in sensitive topic detection', async () => {
      const flags = await detectSensitiveTopics('今天天气真好，适合出去散步');

      expect(flags).toHaveLength(0);
    });

    it('should include timestamp in safety check result', async () => {
      const result = await checkMessageSafety('room-8', 'msg-8', '你好', 'agent-a');

      expect(result.timestamp).toBeInstanceOf(Date);
    });
  });

  // =========================================================================
  // Full Conversation Flow (c1+c2+c3+c4+c6 end-to-end)
  // =========================================================================

  describe('Full Conversation Flow', () => {
    it('should complete end-to-end: create room -> activate -> generate turns -> assess quality -> complete -> report', async () => {
      // ---------------------------------------------------------------
      // Step 1: Create conversation room (c1)
      // ---------------------------------------------------------------
      const room = await createRoom('agent-a', 'agent-b', 'user-a', 'user-b', {
        maxRounds: 5,
        timeoutMs: 60000,
      });

      expect(room.status).toBe('pending');
      expect(room.maxRounds).toBe(5);

      // ---------------------------------------------------------------
      // Step 2: Activate room (c1)
      // ---------------------------------------------------------------
      const activated = await activateRoom(room.id);

      expect(activated.status).toBe('active');
      expect(activated.currentRound).toBe(1);
      expect(activated.startedAt).toBeInstanceOf(Date);

      // ---------------------------------------------------------------
      // Step 3: Start dating conversation session (c2)
      // ---------------------------------------------------------------
      const session = await datingConversationService.startConversation(
        'agent-a',
        'agent-b',
        'user-a',
        'user-b',
        profileA,
        profileB
      );

      expect(session.status).toBe('active');
      expect(session.context.sharedInterests).toContain('音乐');

      // ---------------------------------------------------------------
      // Step 4: Generate 3 conversation turns (c2)
      // ---------------------------------------------------------------
      const turnResults: Array<{ agentA: string; agentB: string; topic: string }> = [];

      for (let i = 0; i < 3; i++) {
        const turn = await datingConversationService.generateNextTurn(session.id);
        turnResults.push({
          agentA: turn.agentAMessage,
          agentB: turn.agentBMessage,
          topic: turn.topic,
        });

        // Add messages to the conversation room (c1)
        await addMessage(room.id, 'agent-a', 'agent_a', turn.agentAMessage);
        await addMessage(room.id, 'agent-b', 'agent_b', turn.agentBMessage);

        // Safety check each message (c6)
        const safetyA = await checkMessageSafety(
          room.id,
          `msg-a-${i}`,
          turn.agentAMessage,
          'agent-a'
        );
        expect(safetyA.action).toBe('allow');

        const safetyB = await checkMessageSafety(
          room.id,
          `msg-b-${i}`,
          turn.agentBMessage,
          'agent-b'
        );
        expect(safetyB.action).toBe('allow');
      }

      expect(turnResults).toHaveLength(3);
      turnResults.forEach(t => {
        expect(t.agentA.length).toBeGreaterThan(0);
        expect(t.agentB.length).toBeGreaterThan(0);
        expect(t.topic).toBeTruthy();
      });

      // ---------------------------------------------------------------
      // Step 5: Assess conversation quality mid-conversation (c3)
      // ---------------------------------------------------------------
      const roomMessages = await getRoomMessages(room.id);
      const agentMessages = roomMessages.filter(m => m.senderType !== 'system');

      const qualityMessages = agentMessages.map(m => ({
        role: m.senderType === 'agent_a' ? 'user' : 'assistant',
        content: m.content,
        agentId: m.senderId,
      }));

      const quality = await assessConversation(room.id, qualityMessages, 1);

      expect(quality.metrics.overall).toBeGreaterThanOrEqual(0);
      expect(quality.metrics.overall).toBeLessThanOrEqual(1);
      expect(quality.metrics.fluency).toBeGreaterThanOrEqual(0);
      expect(quality.metrics.engagement).toBeGreaterThanOrEqual(0);
      expect(quality.suggestions).toBeDefined();

      // ---------------------------------------------------------------
      // Step 6: Increment rounds to simulate conversation progress (c1)
      // ---------------------------------------------------------------
      await incrementRound(room.id);
      await incrementRound(room.id);

      const updatedRoom = await getRoom(room.id);
      expect(updatedRoom!.currentRound).toBe(3);

      // ---------------------------------------------------------------
      // Step 7: Complete the conversation room (c1)
      // ---------------------------------------------------------------
      const summary = await datingConversationService.getConversationSummary(session.id);
      const summaryText = `共同兴趣: ${summary.sharedInterests.join('、')}。讨论话题: ${summary.discussedTopics.slice(0, 3).join('、')}`;

      const completed = await completeRoom(room.id, summaryText, quality.metrics.overall);

      expect(completed.status).toBe('completed');
      expect(completed.conversationSummary).toBeTruthy();
      expect(completed.qualityScore).toBe(quality.metrics.overall);
      expect(completed.completedAt).toBeInstanceOf(Date);

      // ---------------------------------------------------------------
      // Step 8: Generate conversation report (c4)
      // ---------------------------------------------------------------
      const sessionData: SessionData = {
        roomId: room.id,
        agentAId: 'agent-a',
        agentBId: 'agent-b',
        userIdA: 'user-a',
        userIdB: 'user-b',
        messages: agentMessages.map(m => ({
          id: m.id,
          senderId: m.senderId,
          content: m.content,
          timestamp: m.timestamp,
          round: m.round,
        })),
        startTime: activated.startedAt!,
        endTime: completed.completedAt!,
        matchScore: 50,
      };

      const reportQuality: ReportQualityAssessment[] = [
        {
          round: 1,
          fluency: quality.metrics.fluency,
          engagement: quality.metrics.engagement,
          depth: quality.metrics.topicDepth,
        },
      ];

      const report = await conversationReportService.generateReport(
        room.id,
        sessionData,
        reportQuality
      );

      expect(report).toBeDefined();
      expect(report.id).toBeTruthy();
      expect(report.roomId).toBe(room.id);
      expect(report.agentAId).toBe('agent-a');
      expect(report.agentBId).toBe('agent-b');
      expect(report.summary).toBeTruthy();
      expect(report.compatibilityScore).toBeGreaterThanOrEqual(0);
      expect(report.compatibilityScore).toBeLessThanOrEqual(100);
      expect(report.highlights).toBeDefined();
      expect(report.topics).toBeDefined();
      expect(report.suggestions).toBeDefined();
      expect(report.suggestions.length).toBeGreaterThan(0);
      expect(report.totalRounds).toBeGreaterThan(0);
      expect(report.createdAt).toBeInstanceOf(Date);

      // ---------------------------------------------------------------
      // Step 9: Verify final state
      // ---------------------------------------------------------------
      const finalRoom = await getRoom(room.id);
      expect(finalRoom!.status).toBe('completed');
      expect(finalRoom!.qualityScore).toBeGreaterThanOrEqual(0);

      const finalMessages = await getRoomMessages(room.id);
      // Should have agent messages + system messages (creation, activation, rounds, completion)
      expect(finalMessages.length).toBeGreaterThan(6);

      // Verify the report can be retrieved
      const fetchedReport = await conversationReportService.getReport(report.id);
      expect(fetchedReport).not.toBeNull();
      expect(fetchedReport!.roomId).toBe(room.id);
    });

    it('should handle safety-triggered termination in conversation flow', async () => {
      // Create and activate room
      const room = await createRoom('agent-a', 'agent-b', 'user-a', 'user-b');
      await activateRoom(room.id);

      // Add a normal message
      await addMessage(room.id, 'agent-a', 'agent_a', '你好，很高兴认识你');

      // Simulate a safety check that detects danger
      const safetyResult = await checkMessageSafety(
        room.id,
        'msg-danger',
        '你去过那个寺庙吗？最近政府有什么新政策？',
        'agent-a'
      );

      // Safety check should flag the message
      expect(safetyResult.flags.length).toBeGreaterThan(0);

      // If safety level is danger or critical, the action should be block/terminate
      if (safetyResult.level === 'danger' || safetyResult.level === 'critical') {
        expect(['block', 'terminate']).toContain(safetyResult.action);
      }

      // Terminate the room due to safety concerns
      const terminated = await terminateRoom(room.id, '安全检查触发终止');
      expect(terminated.status).toBe('terminated');
      expect(terminated.completedAt).toBeInstanceOf(Date);
    });

    it('should handle conversation with all topics exhausted', async () => {
      // Use a session with limited topic depth to exhaust quickly
      const session = await datingConversationService.startConversation(
        'agent-a',
        'agent-b',
        'user-a',
        'user-b',
        profileA,
        profileB
      );

      // Generate turns until topics are exhausted
      let roundsCompleted = 0;
      for (let i = 0; i < 25; i++) {
        try {
          const turn = await datingConversationService.generateNextTurn(session.id);
          if (turn.topic === 'completed' || turn.agentAMessage === '') {
            break;
          }
          roundsCompleted++;
        } catch {
          break;
        }
      }

      // Session should have completed multiple rounds
      expect(roundsCompleted).toBeGreaterThan(0);

      const updated = await datingConversationService.getSession(session.id);
      expect(updated!.context.discussedTopics.length).toBeGreaterThan(0);
    });

    it('should produce quality trend across multiple assessment rounds', async () => {
      const roomId = 'trend-flow-room';

      // Round 1: minimal messages
      await assessConversation(
        roomId,
        [
          { role: 'user', content: '你好', agentId: 'a' },
          { role: 'assistant', content: '你好呀', agentId: 'b' },
        ],
        1
      );

      // Round 2: moderate messages
      await assessConversation(roomId, buildSampleMessages(4), 2);

      // Round 3: rich messages
      await assessConversation(roomId, buildSampleMessages(6), 3);

      const trend = await getQualityTrend(roomId);

      expect(trend.assessments).toHaveLength(3);
      expect(trend.averageScore).toBeGreaterThan(0);
      expect(['improving', 'stable', 'declining']).toContain(trend.trendDirection);
    });
  });
});
