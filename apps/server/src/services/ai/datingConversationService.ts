/**
 * Dating Conversation Service
 * 约会对话生成服务 (ISSUE-DATE003 c2)
 *
 * 功能：
 * - 基于用户画像生成匹配的约会对话
 * - 话题引导与建议
 * - 角色一致性维护
 * - 多轮上下文记忆
 * - 与AgentDialogService集成
 */

import { v4 as uuidv4 } from 'uuid';

import { logger } from '../../utils/logger';

import type { AgentPersona } from './agentDialogService';

// ============================================
// Interfaces
// ============================================

/**
 * 约会对话配置
 */
export interface DatingConversationConfig {
  maxRounds: number; // 最大轮次，默认20
  turnTimeoutMs: number; // 单轮超时(ms)，默认60000
  personaConsistencyThreshold: number; // 角色一致性阈值，默认0.8
  topicDepthLevels: number; // 话题深度等级，默认3
}

/**
 * 约会画像摘要
 */
export interface DatingProfileSummary {
  userId: string;
  agentId: string;
  interests: string[];
  personality: string[];
  lifestyle: string[];
  goals: string[];
  description?: string;
}

/**
 * 会话状态
 */
export type SessionStatus = 'active' | 'completed' | 'error';

/**
 * 话题类别
 */
export type TopicCategory = 'icebreaker' | 'interest' | 'value' | 'lifestyle' | 'deep';

/**
 * 对话话题
 */
export interface ConversationTopic {
  id: string;
  name: string;
  category: TopicCategory;
  relevanceScore: number; // 0-1，与双方的匹配度
  questions: string[]; // 该话题下的问题列表
  explored: boolean; // 是否已探索
}

/**
 * 对话记忆
 */
export interface ConversationMemory {
  sharedInterests: string[]; // 共同兴趣
  discussedTopics: string[]; // 已讨论话题
  highlights: string[]; // 高光时刻
  connectionPoints: string[]; // 连接点
  redFlags: string[]; // 警示信号
}

/**
 * 约会对话会话
 */
export interface DatingConversationSession {
  id: string;
  roomId: string;
  agentAId: string;
  agentBId: string;
  userIdA: string;
  userIdB: string;
  profileA: DatingProfileSummary;
  profileB: DatingProfileSummary;
  topics: ConversationTopic[];
  currentTopicIndex: number;
  round: number;
  status: SessionStatus;
  personaA: AgentPersona;
  personaB: AgentPersona;
  context: ConversationMemory;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// Default Config
// ============================================

const DEFAULT_CONFIG: DatingConversationConfig = {
  maxRounds: 20,
  turnTimeoutMs: 60000,
  personaConsistencyThreshold: 0.8,
  topicDepthLevels: 3,
};

// ============================================
// Topic Templates
// ============================================

const ICEBREAKER_QUESTIONS = [
  '最近有什么有趣的事吗？',
  '周末一般怎么安排？',
  '最近有没有追什么剧或综艺？',
  '平时喜欢什么类型的音乐？',
  '去过最好玩的地方是哪里？',
];

const _INTEREST_QUESTIONS = [
  '你空闲时间一般做什么？',
  '有什么兴趣爱好是一直坚持的？',
  '有没有特别想学的东西？',
  '平时会看什么类型的书或文章？',
];

const VALUE_QUESTIONS = [
  '你觉得什么样的关系最舒服？',
  '生活中什么对你来说最重要？',
  '你对未来的生活有什么期待？',
  '有什么是你绝对不能接受的？',
];

const LIFESTYLE_QUESTIONS = [
  '平时生活习惯是怎样的？',
  '饮食上有什么偏好吗？',
  '会经常运动或健身吗？',
  '作息时间一般是什么样？',
];

const DEEP_QUESTIONS = [
  '你理想中的伴侣是什么样的？',
  '在感情中最看重什么？',
  '你觉得两个人在一起最重要的什么？',
  '对未来有什么规划？',
];

// ============================================
// Service Class
// ============================================

export class DatingConversationService {
  private sessions: Map<string, DatingConversationSession> = new Map();
  private defaultConfig: DatingConversationConfig;

  constructor(config?: Partial<DatingConversationConfig>) {
    this.defaultConfig = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * 创建默认角色画像
   */
  private buildDefaultPersona(agentId: string, profile: DatingProfileSummary): AgentPersona {
    return {
      name: `Agent-${agentId.slice(0, 8)}`,
      role: 'dating_match',
      personality: profile.personality,
      goals: profile.goals,
      communicationStyle: 'friendly',
      specializations: profile.interests,
    };
  }

  /**
   * 启动新对话会话
   */
  async startConversation(
    agentAId: string,
    agentBId: string,
    userIdA: string,
    userIdB: string,
    profileA: DatingProfileSummary,
    profileB: DatingProfileSummary
  ): Promise<DatingConversationSession> {
    const sessionId = `dating-${uuidv4()}`;
    const roomId = `room-${uuidv4()}`;

    // 构建话题队列
    const topics = this.buildTopicQueue(profileA, profileB);

    // 计算初始记忆（共同兴趣）
    const sharedInterests = this.findSharedInterests(profileA, profileB);

    const session: DatingConversationSession = {
      id: sessionId,
      roomId,
      agentAId,
      agentBId,
      userIdA,
      userIdB,
      profileA,
      profileB,
      topics,
      currentTopicIndex: 0,
      round: 0,
      status: 'active',
      personaA: this.buildDefaultPersona(agentAId, profileA),
      personaB: this.buildDefaultPersona(agentBId, profileB),
      context: {
        sharedInterests,
        discussedTopics: [],
        highlights: [],
        connectionPoints: [],
        redFlags: [],
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.sessions.set(sessionId, session);

    logger.info('Dating conversation session started', {
      sessionId,
      agentAId,
      agentBId,
      topicCount: topics.length,
      sharedInterestCount: sharedInterests.length,
    });

    return session;
  }

  /**
   * 生成下一轮对话（双方各一条消息）
   */
  async generateNextTurn(
    sessionId: string
  ): Promise<{ agentAMessage: string; agentBMessage: string; topic: string }> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    if (session.status !== 'active') {
      throw new Error(`Session is not active: ${session.status}`);
    }

    if (session.round >= this.defaultConfig.maxRounds) {
      session.status = 'completed';
      throw new Error('Max rounds reached');
    }

    // 选择当前话题
    const topic = this.selectNextTopic(session);
    if (!topic) {
      session.status = 'completed';
      return { agentAMessage: '', agentBMessage: '', topic: 'completed' };
    }

    // 标记话题为已探索
    topic.explored = true;
    session.context.discussedTopics = session.context.discussedTopics || [];
    session.context.discussedTopics.push(topic.name);

    // 生成双方消息
    const agentAMessage = await this.generateAgentResponse(sessionId, session.agentAId, topic);
    const agentBMessage = await this.generateAgentResponse(sessionId, session.agentBId, topic);

    session.round += 1;
    session.updatedAt = new Date();

    logger.info('Generated next turn', {
      sessionId,
      round: session.round,
      topic: topic.name,
      messageLengthA: agentAMessage.length,
      messageLengthB: agentBMessage.length,
    });

    return { agentAMessage, agentBMessage, topic: topic.name };
  }

  /**
   * 生成单个Agent的回复
   */
  async generateAgentResponse(
    sessionId: string,
    agentId: string,
    topic?: ConversationTopic
  ): Promise<string> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    const targetTopic = topic || this.selectNextTopic(session);
    if (!targetTopic) {
      return '';
    }

    const prompt = this.buildConversationPrompt(session, agentId, targetTopic);

    // 懒加载LLM服务
    const { llmService } = await import('./llmService').catch(() => ({
      llmService: null,
    }));

    if (!llmService) {
      logger.warn('LLM service not available, generating fallback response');
      return this.generateFallbackResponse(session, agentId, targetTopic);
    }

    try {
      const response = await llmService.chat({
        messages: [
          { role: 'system', content: this.buildSystemPrompt(session, agentId) },
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
        maxTokens: 300,
      });

      const message = response.content?.[0]?.text || '';
      return message;
    } catch (error) {
      logger.error('Failed to generate agent response', { sessionId, agentId, error });
      return this.generateFallbackResponse(session, agentId, targetTopic);
    }
  }

  /**
   * 构建话题队列
   */
  private buildTopicQueue(
    profileA: DatingProfileSummary,
    profileB: DatingProfileSummary
  ): ConversationTopic[] {
    const topics: ConversationTopic[] = [];
    const shared = this.findSharedInterests(profileA, profileB);

    // 1. Icebreaker - 先从轻松话题开始
    ICEBREAKER_QUESTIONS.forEach((q, i) => {
      topics.push({
        id: `icebreaker-${i}`,
        name: `破冰话题${i + 1}`,
        category: 'icebreaker',
        relevanceScore: 0.6,
        questions: [q],
        explored: false,
      });
    });

    // 2. Interest - 共同兴趣优先
    shared.forEach((interest, i) => {
      topics.push({
        id: `interest-${i}`,
        name: interest,
        category: 'interest',
        relevanceScore: 0.9,
        questions: [`你喜欢${interest}多久了？`, `是什么让你喜欢上${interest}的？`],
        explored: false,
      });
    });

    // 3. Lifestyle - 生活习惯
    LIFESTYLE_QUESTIONS.forEach((q, i) => {
      topics.push({
        id: `lifestyle-${i}`,
        name: `生活习惯话题${i + 1}`,
        category: 'lifestyle',
        relevanceScore: 0.7,
        questions: [q],
        explored: false,
      });
    });

    // 4. Value - 价值观
    VALUE_QUESTIONS.forEach((q, i) => {
      topics.push({
        id: `value-${i}`,
        name: `价值观话题${i + 1}`,
        category: 'value',
        relevanceScore: 0.8,
        questions: [q],
        explored: false,
      });
    });

    // 5. Deep - 深度话题放最后
    DEEP_QUESTIONS.forEach((q, i) => {
      topics.push({
        id: `deep-${i}`,
        name: `深度话题${i + 1}`,
        category: 'deep',
        relevanceScore: 0.75,
        questions: [q],
        explored: false,
      });
    });

    // 按relevanceScore降序排列
    return topics.sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

  /**
   * 选择下一个话题
   */
  private selectNextTopic(session: DatingConversationSession): ConversationTopic | null {
    const unExplored = session.topics.filter(t => !t.explored);
    if (unExplored.length === 0) {
      return null;
    }

    // 优先选择相关性高的未探索话题
    return unExplored.sort((a, b) => b.relevanceScore - a.relevanceScore)[0];
  }

  /**
   * 构建对话提示词
   */
  private buildConversationPrompt(
    session: DatingConversationSession,
    agentId: string,
    topic: ConversationTopic
  ): string {
    const isAgentA = agentId === session.agentAId;
    const _profile = isAgentA ? session.profileA : session.profileB;
    const otherProfile = isAgentA ? session.profileB : session.profileA;
    const persona = isAgentA ? session.personaA : session.personaB;

    const question = topic.questions[0] || '随便聊聊？';

    return `你是${persona.name}，性格特点：${persona.personality.join('、')}。

你的目标：${persona.goals.join('、')}

对方信息：
- 兴趣：${otherProfile.interests.join('、')}
- 性格：${otherProfile.personality.join('、')}
- 生活方式：${otherProfile.lifestyle.join('、')}

当前话题：${topic.name}
请回答这个问题：${question}

注意：
1. 保持自然、友好的聊天风格
2. 结合你自己的兴趣和经历来回答
3. 可以适当提问，保持对话的互动性
4. 不要太长，控制在100字以内
5. 不要编造具体的个人隐私信息

请用一句话回答这个问题。`;
  }

  /**
   * 构建系统提示词
   */
  private buildSystemPrompt(session: DatingConversationSession, agentId: string): string {
    const isAgentA = agentId === session.agentAId;
    const profile = isAgentA ? session.profileA : session.profileB;
    const persona = isAgentA ? session.personaA : session.personaB;

    return `你是一个友好的相亲助手，扮演${persona.name}这个角色。

角色信息：
- 性格：${persona.personality.join('、')}
- 目标：${persona.goals.join('、')}
- 沟通风格：${persona.communicationStyle}
- 兴趣：${profile.interests.join('、')}

请用自然、友好、有趣的方式回复，保持角色一致性。`;
  }

  /**
   * 生成备用回复（当LLM不可用时）
   */
  private generateFallbackResponse(
    session: DatingConversationSession,
    agentId: string,
    topic: ConversationTopic
  ): string {
    const isAgentA = agentId === session.agentAId;
    const profile = isAgentA ? session.profileA : session.profileB;
    const otherProfile = isAgentA ? session.profileB : session.profileA;

    const question = topic.questions[0] || '最近怎么样？';

    // 基于profile生成简单回复
    const interest = profile.interests[0] || '聊天';
    const _style = profile.personality[0] || '友好';

    if (topic.category === 'icebreaker') {
      return `你好呀！${question} 我平时${profile.lifestyle[0] || '比较随意'}，你呢？`;
    }

    if (topic.category === 'interest') {
      return `我挺喜欢${interest}的，${question}`;
    }

    if (topic.category === 'value') {
      return `我觉得${profile.goals[0] || '真诚'}- ${question}`;
    }

    return `${question} 我${profile.lifestyle[0] || '生活方式'}- ${otherProfile.interests[0] || '也还好'}。`;
  }

  /**
   * 分析角色一致性分数
   */
  private analyzePersonaConsistency(
    session: DatingConversationSession,
    agentId: string,
    message: string
  ): number {
    const persona = agentId === session.agentAId ? session.personaA : session.personaB;

    // 简单的一致性检查：消息中是否包含角色关键词
    const personaKeywords = [
      ...persona.personality,
      ...persona.goals,
      ...(persona.specializations || []),
    ];

    if (personaKeywords.length === 0) {
      return 0.5; // 无persona数据时返回中等分数
    }

    const messageLower = message.toLowerCase();
    let matchCount = 0;

    for (const keyword of personaKeywords) {
      if (messageLower.includes(keyword.toLowerCase())) {
        matchCount += 1;
      }
    }

    const score = matchCount / personaKeywords.length;
    return Math.min(score, 1.0);
  }

  /**
   * 获取对话摘要
   */
  async getConversationSummary(sessionId: string): Promise<ConversationMemory> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    // 如果有讨论过的话题，更新摘要
    if (session.context.discussedTopics.length > 0) {
      // 基于讨论过的话题和共同兴趣，更新连接点
      const connectionPoints: string[] = [];

      for (const topic of session.context.discussedTopics) {
        const matchingInterest = session.context.sharedInterests.find(interest =>
          topic.toLowerCase().includes(interest.toLowerCase())
        );
        if (matchingInterest) {
          connectionPoints.push(`双方都对${matchingInterest}感兴趣`);
        }
      }

      session.context.connectionPoints = connectionPoints;
    }

    return session.context;
  }

  /**
   * 获取会话详情
   */
  async getSession(sessionId: string): Promise<DatingConversationSession | null> {
    return this.sessions.get(sessionId) || null;
  }

  /**
   * 查找共同兴趣
   */
  private findSharedInterests(
    profileA: DatingProfileSummary,
    profileB: DatingProfileSummary
  ): string[] {
    const setA = new Set(profileA.interests.map(i => i.toLowerCase()));
    const setB = new Set(profileB.interests.map(i => i.toLowerCase()));

    const shared: string[] = [];
    setA.forEach(interest => {
      if (setB.has(interest)) {
        // 还原原始大小写
        const original = profileA.interests.find(i => i.toLowerCase() === interest);
        if (original) {
          shared.push(original);
        }
      }
    });

    return shared;
  }

  /**
   * 更新会话状态
   */
  async updateSessionStatus(sessionId: string, status: SessionStatus): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    session.status = status;
    session.updatedAt = new Date();

    logger.info('Session status updated', { sessionId, status });
  }

  /**
   * 清理过期会话
   */
  async cleanupExpiredSessions(): Promise<number> {
    const now = Date.now();
    const timeout = this.defaultConfig.turnTimeoutMs * 2;
    let cleanedCount = 0;

    for (const [sessionId, session] of this.sessions.entries()) {
      const age = now - session.updatedAt.getTime();
      if (age > timeout && session.status === 'active') {
        session.status = 'completed';
        cleanedCount += 1;
        logger.info('Cleaned up expired session', { sessionId, ageMs: age });
      }
    }

    return cleanedCount;
  }
}

// ============================================
// Singleton Export
// ============================================

export const datingConversationService = new DatingConversationService();
