/**
 * Agent Dialog Service
 * Agent对话生成服务 - 为AI Agent提供智能对话能力
 *
 * 支持:
 * - Agent间的自主沟通、协商、匹配对话
 * - Agent与用户的交互对话
 * - 上下文记忆和个性化回复能力
 */

import { v4 as uuidv4 } from 'uuid';

import { logger } from '../../utils/logger';
import {
  getMemoriesForAgent,
  AgentMemoryRecord,
  AgentMemoryType,
} from '../dating/agentMemoryService';

import { persistPersona, detectDrift, PersonalityFingerprint } from './agentPersonaService';

/** Run drift detection every N agent messages within a session. */
const PERSONA_DRIFT_CHECK_INTERVAL = 5;

// Dialog message types
export type MessageSender = 'agent' | 'user' | 'system';
export type DialogType = 'agent_to_agent' | 'agent_to_user' | 'negotiation' | 'matching';

/**
 * Negotiation state machine states for agent-agent negotiations.
 * Tracks the lifecycle of a negotiation beyond simple message-count heuristics.
 */
export enum NegotiationState {
  PROPOSED = 'proposed',
  COUNTER = 'counter',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
  STALEMATE = 'stalemate',
}

/** Maximum rounds before declaring stalemate */
const STALEMATE_ROUND_THRESHOLD = 12;

/** Keywords indicating acceptance in negotiation */
const ACCEPTANCE_KEYWORDS = [
  '接受',
  '同意',
  '可以',
  'deal',
  'agree',
  'accepted',
  '成交',
  '赞同',
  '确认',
  'approve',
];
/** Keywords indicating rejection in negotiation */
const REJECTION_KEYWORDS = [
  '拒绝',
  '不同意',
  'no ',
  'reject',
  '不行',
  '无法接受',
  '不同意',
  'refuse',
  'decline',
];

/**
 * Dialog message interface
 */
export interface DialogMessage {
  id: string;
  sessionId: string;
  senderId: string;
  senderType: MessageSender;
  senderName: string;
  content: string;
  timestamp: Date;
  metadata?: {
    agentType?: string;
    scene?: string;
    intent?: string;
    confidence?: number;
    contextSummary?: string;
  };
}

/**
 * Dialog participant (Agent or User)
 */
export interface DialogParticipant {
  id: string;
  name: string;
  type: 'agent' | 'user';
  agentType?: string;
  profile?: Record<string, any>;
  persona?: AgentPersona;
}

/**
 * Agent persona for dialog generation
 */
export interface AgentPersona {
  name: string;
  role: string;
  personality: string[];
  goals: string[];
  communicationStyle: 'formal' | 'casual' | 'friendly' | 'professional';
  specializations?: string[];
}

/**
 * Dialog session
 */
export interface DialogSession {
  id: string;
  type: DialogType;
  participants: DialogParticipant[];
  scene?: string;
  context: DialogContext;
  messages: DialogMessage[];
  status: 'active' | 'completed' | 'archived';
  dialogPhase: 'intro' | 'exploring' | 'negotiating' | 'closing';
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, any>;
}

/**
 * Dialog context for maintaining conversation memory
 */
export interface DialogContext {
  topic?: string;
  goals: string[];
  constraints: string[];
  relevantHistory: DialogMessage[];
  sharedKnowledge: Record<string, any>;
  userPreferences?: Record<string, any>;
  negotiationState?: {
    currentRound: number;
    agreedTerms: string[];
    pendingIssues: string[];
    /** Negotiation lifecycle state (proposed/counter/accepted/rejected/stalemate) */
    state?: NegotiationState;
    /** Per-field bottom-line limits, e.g. { salary: 22000 }. Violations trigger auto counter-proposal. */
    bottomLine?: Record<string, number>;
  };
  matchingCriteria?: {
    requirements: string[];
    preferences: string[];
    dealBreakers: string[];
  };
}

/**
 * Dialog request
 */
export interface GenerateDialogRequest {
  sessionId: string;
  senderId: string;
  senderType: MessageSender;
  content: string;
  options?: {
    temperature?: number;
    maxTokens?: number;
    persona?: AgentPersona;
    includeContext?: boolean;
  };
}

/**
 * Agent-to-Agent dialog request
 */
export interface AgentDialogRequest {
  senderAgentId: string;
  receiverAgentId: string;
  content: string;
  scene: string;
  context?: Partial<DialogContext>;
}

/**
 * User-to-Agent dialog request
 */
export interface UserDialogRequest {
  userId: string;
  agentId: string;
  content: string;
  scene: string;
}

/**
 * Dialog generation options
 */
export interface DialogGenerationOptions {
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  includeContextSummary?: boolean;
}

/**
 * Agent Dialog Service
 */
export class AgentDialogService {
  private version = '1.0.0';
  private sessions: Map<string, DialogSession> = new Map();
  private defaultMaxHistory = 20;
  private defaultTemperature = 0.7;
  private defaultMaxTokens = 500;

  /**
   * Create a new dialog session
   */
  async createSession(
    type: DialogType,
    participants: DialogParticipant[],
    scene?: string,
    initialContext?: Partial<DialogContext>
  ): Promise<DialogSession> {
    const sessionId = `dialog-${uuidv4()}`;

    const session: DialogSession = {
      id: sessionId,
      type,
      participants,
      scene,
      context: {
        goals: initialContext?.goals || [],
        constraints: initialContext?.constraints || [],
        relevantHistory: [],
        sharedKnowledge: initialContext?.sharedKnowledge || {},
        userPreferences: initialContext?.userPreferences,
        negotiationState: initialContext?.negotiationState,
        matchingCriteria: initialContext?.matchingCriteria,
      },
      messages: [],
      status: 'active',
      dialogPhase: 'intro',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.sessions.set(sessionId, session);

    // Persist to database
    await this.persistSession(session);

    // Persist a persona snapshot for each agent participant so each
    // session has a fingerprint baseline for drift detection.
    for (const p of participants) {
      if (p.type === 'agent' && p.persona) {
        const fingerprint: PersonalityFingerprint = {
          traits: p.persona.personality,
          communicationStyle: p.persona.communicationStyle,
          goals: p.persona.goals,
          specializations: p.persona.specializations,
        };
        // Fire-and-forget: never block session creation on snapshot write.
        void persistPersona(p.id, fingerprint, scene);
      }
    }

    logger.info('Dialog session created', {
      sessionId,
      type,
      participantCount: participants.length,
      scene,
    });

    return session;
  }

  /**
   * Generate a dialog message (agent-to-agent or agent-to-user)
   */
  async generateMessage(request: GenerateDialogRequest): Promise<DialogMessage> {
    const session = await this.getSessionAsync(request.sessionId);
    if (!session) {
      throw new Error(`Session ${request.sessionId} not found`);
    }

    const sender = session.participants.find(p => p.id === request.senderId);
    if (!sender) {
      throw new Error(`Sender ${request.senderId} not found in session`);
    }

    const startTime = Date.now();

    // Fetch structured long-term memories for the sender agent
    const { textBlock: structuredMemoryText } = await this.buildStructuredMemoryBlock(
      request.senderId
    );

    // Build prompt based on dialog type and context
    const prompt = this.buildDialogPrompt(session, sender, request, structuredMemoryText);

    // Generate response using LLM
    const { llmService } = await this.getLLMService();
    let response: { text: string; provider?: string; model?: string };
    try {
      response = await llmService.generateText(prompt, {
        temperature: request.options?.temperature ?? this.defaultTemperature,
        maxTokens: request.options?.maxTokens ?? this.defaultMaxTokens,
      });
    } catch (err) {
      logger.error('LLM generateText failed', {
        sessionId: request.sessionId,
        error: (err as Error)?.message,
      });
      throw new Error(`LLM service unavailable: ${(err as Error)?.message}`);
    }

    // Create message
    const message: DialogMessage = {
      id: `msg-${uuidv4()}`,
      sessionId: request.sessionId,
      senderId: request.senderId,
      senderType: request.senderType,
      senderName: sender.name,
      content: response.text.trim(),
      timestamp: new Date(),
      metadata: {
        agentType: sender.agentType,
        scene: session.scene,
        confidence: 0.85,
        intent: await this.recognizeIntent(request.content, session),
      },
    };

    // Update dialog phase based on conversation progress
    this.updateDialogPhase(session, message);

    // Add to session
    session.messages.push(message);
    const appendedSeq = session.messages.length - 1;
    session.updatedAt = new Date();

    // Append-only durable log (in addition to the JSON column on
    // DialogSessionRecord). Best-effort; failures are logged.
    void this.appendMessageToDb(session.id, message, appendedSeq);

    // Periodic persona drift detection — non-blocking. Runs every N
    // messages on agent senders only.
    if (
      request.senderType === 'agent' &&
      session.messages.length % PERSONA_DRIFT_CHECK_INTERVAL === 0 &&
      sender.persona
    ) {
      const currentFingerprint: PersonalityFingerprint = {
        traits: sender.persona.personality,
        communicationStyle: sender.persona.communicationStyle,
        goals: sender.persona.goals,
        specializations: sender.persona.specializations,
      };
      void detectDrift(request.senderId, message.content, currentFingerprint).catch(err => {
        logger.warn('Persona drift detection failed', {
          sessionId: session.id,
          senderId: request.senderId,
          error: (err as Error)?.message,
        });
      });
    }

    // Prune old messages if needed
    await this.pruneHistory(session);

    // Persist session to database
    await this.persistSession(session);

    logger.info('Dialog message generated', {
      sessionId: request.sessionId,
      senderId: request.senderId,
      messageId: message.id,
      latencyMs: Date.now() - startTime,
    });

    return message;
  }

  /**
   * Agent-to-Agent communication
   */
  async agentToAgentDialog(request: AgentDialogRequest): Promise<DialogMessage> {
    const senderAgent = await this.getAgentById(request.senderAgentId);
    const receiverAgent = await this.getAgentById(request.receiverAgentId);

    if (!senderAgent || !receiverAgent) {
      throw new Error('Agent not found');
    }

    // Create or get existing session
    let session = this.findExistingSession(request.senderAgentId, request.receiverAgentId);

    if (!session) {
      session = await this.createSession(
        'agent_to_agent',
        [
          {
            id: senderAgent.id,
            name: senderAgent.name,
            type: 'agent',
            agentType: senderAgent.type,
            persona: this.buildPersona(senderAgent),
          },
          {
            id: receiverAgent.id,
            name: receiverAgent.name,
            type: 'agent',
            agentType: receiverAgent.type,
            persona: this.buildPersona(receiverAgent),
          },
        ],
        request.scene,
        request.context
      );
    }

    return this.generateMessage({
      sessionId: session.id,
      senderId: request.senderAgentId,
      senderType: 'agent',
      content: request.content,
    });
  }

  /**
   * User-to-Agent conversation
   */
  async userToAgentDialog(request: UserDialogRequest): Promise<DialogMessage> {
    const agent = await this.getAgentById(request.agentId);
    if (!agent) {
      throw new Error('Agent not found');
    }

    // Resolve real user name
    const { getUserById } = await import('../../services/userService').catch(() => ({
      getUserById: null as (() => Promise<{ name?: string; displayName?: string } | null>) | null,
    }));
    const user = getUserById ? await getUserById(request.userId) : null;

    // Create or get existing session
    let session = this.findExistingSession(request.userId, request.agentId);

    if (!session) {
      session = await this.createSession(
        'agent_to_user',
        [
          {
            id: request.userId,
            name: user?.name || user?.displayName || 'User',
            type: 'user',
          },
          {
            id: agent.id,
            name: agent.name,
            type: 'agent',
            agentType: agent.type,
            persona: this.buildPersona(agent),
          },
        ],
        request.scene
      );
    }

    return this.generateMessage({
      sessionId: session.id,
      senderId: request.agentId,
      senderType: 'agent',
      content: request.content,
    });
  }

  /**
   * Get session messages
   */
  async getSessionMessages(
    sessionId: string,
    options?: { limit?: number; offset?: number }
  ): Promise<DialogMessage[]> {
    const session = await this.getSessionAsync(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    const messages = [...session.messages];
    const offset = options?.offset || 0;
    const limit = options?.limit || messages.length;

    return messages.slice(offset, offset + limit);
  }

  /**
   * Get session by ID (checks memory cache then database)
   */
  getSession(sessionId: string): DialogSession | null {
    return this.sessions.get(sessionId) || null;
  }

  /**
   * Get or load session by ID
   */
  async getSessionAsync(sessionId: string): Promise<DialogSession | null> {
    const cached = this.sessions.get(sessionId);
    if (cached) return cached;
    return this.loadSession(sessionId);
  }

  /**
   * Get all sessions for a participant
   */
  getSessionsForParticipant(participantId: string): DialogSession[] {
    return Array.from(this.sessions.values()).filter(
      session =>
        session.participants.some(p => p.id === participantId) && session.status === 'active'
    );
  }

  /**
   * Archive session
   */
  async archiveSession(sessionId: string): Promise<void> {
    const session = await this.getSessionAsync(sessionId);
    if (!session) {
      logger.warn('Session not found for archive', { sessionId });
      return;
    }
    session.status = 'archived';
    session.updatedAt = new Date();
    await this.persistSession(session);
    logger.info('Dialog session archived', { sessionId });
  }

  /**
   * Update session context
   */
  async updateSessionContext(
    sessionId: string,
    updates: Partial<DialogContext>
  ): Promise<DialogSession> {
    const session = await this.getSessionAsync(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    session.context = {
      ...session.context,
      ...updates,
    };
    session.updatedAt = new Date();

    await this.persistSession(session);

    return session;
  }

  /**
   * Build dialog prompt (exposed for streaming endpoint)
   * @param structuredMemoryText  Pre-fetched structured memory block (from AgentMemory table)
   */
  buildDialogPrompt(
    session: DialogSession,
    sender: DialogParticipant,
    request: GenerateDialogRequest,
    structuredMemoryText?: string
  ): string {
    // Build message history
    const historyText = session.messages
      .slice(-10)
      .map(m => `[${m.senderName}]: ${m.content}`)
      .join('\n');

    // Base prompt based on dialog type
    let prompt = '';

    if (session.type === 'agent_to_agent') {
      prompt = this.buildAgentToAgentPrompt(session, sender, request.content, historyText);
    } else if (session.type === 'agent_to_user') {
      prompt = this.buildAgentToUserPrompt(session, sender, request.content, historyText);
    } else if (session.type === 'negotiation') {
      prompt = this.buildNegotiationPrompt(session, sender, request.content, historyText);
    } else if (session.type === 'matching') {
      prompt = this.buildMatchingPrompt(session, sender, request.content, historyText);
    }

    // Inject structured long-term memory block before the user message
    if (structuredMemoryText) {
      prompt += `\n\n长期记忆（从历史交互中学习的关键信息）：\n${structuredMemoryText}`;
    }

    return prompt;
  }

  /**
   * Build agent-to-agent prompt
   */
  private buildAgentToAgentPrompt(
    session: DialogSession,
    sender: DialogParticipant,
    userContent: string,
    historyText: string
  ): string {
    const otherParticipants = session.participants.filter(p => p.id !== sender.id);
    const otherAgent = otherParticipants.find(p => p.type === 'agent');
    const persona = sender.persona;

    return `你是一个智能Agent，正在与另一个Agent进行交流。

你的角色信息：
- 名称：${sender.name}
- 类型：${sender.agentType || 'general'}
${
  persona
    ? `- 角色：${persona.role}
- 个性：${persona.personality.join('、')}
- 沟通风格：${persona.communicationStyle}`
    : ''
}

你的目标：
${session.context.goals.map((g, _idx) => `${_idx + 1}. ${g}`).join('\n')}

约束条件：
${session.context.constraints.map((c, _idx) => `- ${c}`).join('\n')}

${
  otherAgent
    ? `对方Agent信息：
- 名称：${otherAgent.name}
- 类型：${otherAgent.agentType || 'general'}
${otherAgent.persona ? `- 角色：${otherAgent.persona.role}` : ''}`
    : ''
}

对话场景：${session.scene || 'general'}

最近对话历史：
${historyText || '（无历史记录）'}

你的消息：${userContent}

请生成一个自然的回复。要求：
1. 符合你的角色和个性
2. 简洁明了，控制在150字以内
3. 如果涉及重要决策，说明你的理由
4. 用中文回复`;
  }

  /**
   * Build agent-to-user prompt
   */
  private buildAgentToUserPrompt(
    session: DialogSession,
    agent: DialogParticipant,
    userContent: string,
    historyText: string
  ): string {
    const persona = agent.persona;

    return `你是一个智能助手Agent，正在与用户进行对话。

你的信息：
- 名称：${agent.name}
- 类型：${agent.agentType || 'assistant'}
${
  persona
    ? `- 角色：${persona.role}
- 个性：${persona.personality.join('、')}
- 沟通风格：${persona.communicationStyle}
- 专长：${persona.specializations?.join('、') || '通用'}`
    : ''
}

你的服务目标：
${session.context.goals.map((g, i) => `${i + 1}. ${g}`).join('\n')}

用户偏好：
${
  Object.entries(session.context.userPreferences || {})
    .map(([k, v]) => `- ${k}: ${v}`)
    .join('\n') || '（未设置）'
}

场景：${session.scene || 'general'}

对话历史：
${historyText || '（无历史记录）'}

用户说：${userContent}

请以友好的方式回复用户。要求：
1. 简洁、专业、有帮助
2. 适当个性化，符合用户偏好
3. 控制在100字以内
4. 用中文回复`;
  }

  /**
   * Build negotiation prompt
   */
  private buildNegotiationPrompt(
    session: DialogSession,
    sender: DialogParticipant,
    userContent: string,
    historyText: string
  ): string {
    const otherParticipants = session.participants.filter(p => p.id !== sender.id);
    const negotiationState = session.context.negotiationState;

    return `你是一个专业的谈判Agent，正在参与一场商业谈判。

谈判信息：
- 当前轮次：${negotiationState?.currentRound || 1}
- 已达成共识：${negotiationState?.agreedTerms?.join('、') || '暂无'}
- 待解决问题：${negotiationState?.pendingIssues?.join('、') || '暂无'}

你的目标：
${session.context.goals.map((g, _idx) => `${_idx + 1}. ${g}`).join('\n')}

约束：
${session.context.constraints.map((c, _idx) => `- ${c}`).join('\n')}

${
  otherParticipants.length > 0
    ? `对方：
${otherParticipants.map(p => `- ${p.name} (${p.agentType})`).join('\n')}`
    : ''
}

对话历史：
${historyText || '（无历史记录）'}

当前发言：${userContent}

请生成专业的谈判回复。要求：
1. 数据驱动，有理有据
2. 寻求双赢方案
3. 维护自身利益的同时尊重对方
4. 控制在200字以内
5. 用中文回复`;
  }

  /**
   * Build matching prompt
   */
  private buildMatchingPrompt(
    session: DialogSession,
    sender: DialogParticipant,
    userContent: string,
    historyText: string
  ): string {
    const matchingCriteria = session.context.matchingCriteria;

    return `你是一个智能匹配Agent，正在帮助用户进行匹配决策。

匹配标准：
- 要求：${matchingCriteria?.requirements?.join('、') || '暂无'}
- 偏好：${matchingCriteria?.preferences?.join('、') || '暂无'}
- 底线：${matchingCriteria?.dealBreakers?.join('、') || '暂无'}

你的目标：
${session.context.goals.map((g, i) => `${i + 1}. ${g}`).join('\n')}

场景：${session.scene || 'matching'}

对话历史：
${historyText || '（无历史记录）'}

输入：${userContent}

请生成匹配分析或建议。要求：
1. 基于明确的标准进行评估
2. 给出具体的匹配理由
3. 保持客观中立
4. 控制在150字以内
5. 用中文回复`;
  }

  /**
   * Build agent persona from agent data
   */
  private buildPersona(agent: {
    name: string;
    type: string;
    config?: Record<string, unknown>;
  }): AgentPersona {
    const cfg = agent.config || {};
    return {
      name: agent.name,
      role: agent.type || 'general',
      personality: (cfg.personality as string[]) || ['helpful', 'professional', 'efficient'],
      goals: (cfg.goals as string[]) || ['assist users', 'provide value'],
      communicationStyle:
        (cfg.communicationStyle as AgentPersona['communicationStyle']) || 'professional',
      specializations: (cfg.specializations as string[]) || [],
    };
  }

  /**
   * Fetch and format structured long-term memories for the given agent.
   * Returns a human-readable block grouped by memory type for injection
   * into the system prompt.
   */
  private async buildStructuredMemoryBlock(agentId: string): Promise<{
    memories: AgentMemoryRecord[];
    textBlock: string;
  }> {
    try {
      const memories = await getMemoriesForAgent(agentId, { limit: 10 });
      if (memories.length === 0) {
        return { memories: [], textBlock: '' };
      }

      const typeOrder: AgentMemoryType[] = [
        'SUCCESS_TRAIT',
        'OWNER_PREFERENCE',
        'FAILURE_REASON',
        'INTERACTION_OUTCOME',
      ];
      const typeLabels: Record<AgentMemoryType, string> = {
        SUCCESS_TRAIT: '成功特征',
        OWNER_PREFERENCE: '主人偏好',
        FAILURE_REASON: '失败原因',
        INTERACTION_OUTCOME: '交互结果',
      };

      const grouped = new Map<AgentMemoryType, AgentMemoryRecord[]>();
      for (const mem of memories) {
        const list = grouped.get(mem.memoryType) || [];
        list.push(mem);
        grouped.set(mem.memoryType, list);
      }

      const lines: string[] = [];
      for (const t of typeOrder) {
        const group = grouped.get(t);
        if (!group || group.length === 0) continue;
        lines.push(`【${typeLabels[t]}】`);
        for (const mem of group) {
          const desc =
            typeof mem.structuredFields?.description === 'string'
              ? mem.structuredFields.description
              : JSON.stringify(mem.structuredFields);
          lines.push(`  - ${desc}`);
        }
      }

      return { memories, textBlock: lines.join('\n') };
    } catch (err) {
      logger.warn('Failed to build structured memory block', {
        agentId,
        error: (err as Error)?.message,
      });
      return { memories: [], textBlock: '' };
    }
  }

  /**
   * Prune message history to prevent memory bloat
   * Generates LLM summary of pruned messages for long-term context
   * Also enriches session metadata with structured memories from AgentMemory
   */
  private async pruneHistory(session: DialogSession): Promise<void> {
    if (session.messages.length > this.defaultMaxHistory) {
      const pruneCount = session.messages.length - this.defaultMaxHistory;
      const prunedMessages = session.messages.slice(0, pruneCount);

      // Generate summary of pruned messages using LLM
      const summary = await this.summarizeMessages(prunedMessages, session.context.relevantHistory);

      // Fetch structured memories for all agent participants
      const agentIds = session.participants.filter(p => p.type === 'agent').map(p => p.id);
      const structuredMemories: Record<string, unknown[]> = {};
      await Promise.all(
        agentIds.map(async agentId => {
          const { memories } = await this.buildStructuredMemoryBlock(agentId);
          if (memories.length > 0) {
            structuredMemories[agentId] = memories.map(m => ({
              type: m.memoryType,
              fields: m.structuredFields,
              source: m.sourceEventType,
              createdAt: m.createdAt,
            }));
          }
        })
      );

      if (summary) {
        session.context.relevantHistory = [];
        session.metadata = {
          ...session.metadata,
          conversationSummary: summary,
          ...(Object.keys(structuredMemories).length > 0 ? { structuredMemories } : {}),
        };
      } else {
        session.context.relevantHistory = prunedMessages;
      }

      session.messages = session.messages.slice(pruneCount);
    }
  }

  /**
   * Summarize messages using LLM for long-term memory
   */
  private async summarizeMessages(
    messages: DialogMessage[],
    existingHistory: DialogMessage[]
  ): Promise<string | null> {
    try {
      const { llmService } = await this.getLLMService();
      const messageTexts = messages.map(m => `[${m.senderName}]: ${m.content}`).join('\n');
      const existingSummary =
        existingHistory.length > 0
          ? `\nPrevious summary: ${JSON.stringify(existingHistory.map(m => ({ from: m.senderName, content: m.content })))}`
          : '';

      const prompt = `请用2-3句话总结以下对话的关键信息，包括重要决策、达成的共识和未解决的问题：\n\n${messageTexts}${existingSummary}`;

      const result = await llmService.generateText(prompt, {
        temperature: 0.3,
        maxTokens: 200,
      });
      return result.text.trim();
    } catch (err) {
      logger.warn('Failed to summarize messages', { error: (err as Error)?.message });
      return null;
    }
  }

  /**
   * Recognize intent from user message
   */
  private async recognizeIntent(content: string, session: DialogSession): Promise<string> {
    try {
      const { llmService } = await this.getLLMService();
      const prompt = `根据以下对话内容和场景，识别用户意图。只返回一个意图标签（如：greeting, inquiry, negotiation, complaint, feedback, request_info, make_offer, accept, reject, closing）。\n\n场景：${session.scene || 'general'}\n消息：${content}\n\n意图：`;

      const result = await llmService.generateText(prompt, {
        temperature: 0.1,
        maxTokens: 20,
      });
      return result.text.trim().toLowerCase();
    } catch (err) {
      logger.warn('Intent recognition failed', { error: (err as Error)?.message });
      return 'unknown';
    }
  }

  /**
   * Update dialog phase based on conversation progress.
   * Also tracks negotiation state machine for negotiation-type sessions.
   */
  private updateDialogPhase(session: DialogSession, message: DialogMessage): void {
    const messageCount = session.messages.length;
    const previousPhase = session.dialogPhase;

    // Simple state machine based on message count and type
    if (messageCount <= 2) {
      session.dialogPhase = 'intro';
    } else if (session.type === 'negotiation') {
      // Negotiation: intro -> exploring -> negotiating -> closing
      if (
        session.context.negotiationState?.pendingIssues &&
        session.context.negotiationState.pendingIssues.length > 0
      ) {
        session.dialogPhase =
          session.context.negotiationState.agreedTerms.length > 0 ? 'closing' : 'negotiating';
      } else if (messageCount > 6) {
        session.dialogPhase = 'negotiating';
      } else {
        session.dialogPhase = 'exploring';
      }
    } else {
      // General: intro -> exploring -> closing
      if (messageCount > 8) {
        session.dialogPhase = 'closing';
      } else {
        session.dialogPhase = 'exploring';
      }
    }

    // --- Negotiation state machine (parallel layer) ---
    if (session.type === 'negotiation') {
      this.updateNegotiationState(session, message);
    }

    if (previousPhase !== session.dialogPhase) {
      logger.info('Dialog phase updated', {
        sessionId: session.id,
        from: previousPhase,
        to: session.dialogPhase,
      });
    }
  }

  /**
   * Evaluate and update the NegotiationState enum based on message content.
   * Runs as a parallel layer alongside the existing phase-based logic.
   */
  private updateNegotiationState(session: DialogSession, message: DialogMessage): void {
    // Ensure negotiationState exists
    if (!session.context.negotiationState) {
      session.context.negotiationState = {
        currentRound: 0,
        agreedTerms: [],
        pendingIssues: [],
        state: NegotiationState.PROPOSED,
      };
    }
    const ns = session.context.negotiationState;

    // Initialize state if not set
    if (!ns.state) {
      ns.state = NegotiationState.PROPOSED;
    }

    // Once terminal, do not regress
    if (ns.state === NegotiationState.ACCEPTED || ns.state === NegotiationState.REJECTED) {
      return;
    }

    const previousState = ns.state;
    const contentLower = message.content.toLowerCase();

    // Increment round on each message
    ns.currentRound = (ns.currentRound || 0) + 1;

    // Check for stalemate (too many rounds without resolution)
    if (ns.currentRound >= STALEMATE_ROUND_THRESHOLD) {
      ns.state = NegotiationState.STALEMATE;
    } else if (ACCEPTANCE_KEYWORDS.some(kw => contentLower.includes(kw))) {
      ns.state = NegotiationState.ACCEPTED;
    } else if (REJECTION_KEYWORDS.some(kw => contentLower.includes(kw))) {
      ns.state = NegotiationState.REJECTED;
    } else if (ns.currentRound > 1) {
      // If we're past the first proposal and no terminal signal, it's a counter-proposal exchange
      ns.state = NegotiationState.COUNTER;
    }

    // Check bottom line when a proposal appears in the message
    const bottomLine = ns.bottomLine;
    if (
      bottomLine &&
      ns.state !== NegotiationState.ACCEPTED &&
      ns.state !== NegotiationState.REJECTED
    ) {
      const proposal = this.extractNumericProposal(message.content, Object.keys(bottomLine));
      if (proposal && Object.keys(proposal).length > 0) {
        const result = this.checkBottomLine(session, proposal);
        if (!result.withinLine) {
          // Signal auto counter-proposal in metadata
          session.metadata = {
            ...session.metadata,
            bottomLineViolation: true,
            violatedFields: result.violatedFields,
            autoCounterProposal: true,
          };
          logger.info('Negotiation bottom line violated — auto counter-proposal triggered', {
            sessionId: session.id,
            violatedFields: result.violatedFields,
            proposal,
            bottomLine,
          });
        }
      }
    }

    if (previousState !== ns.state) {
      logger.info('Negotiation state updated', {
        sessionId: session.id,
        from: previousState,
        to: ns.state,
        round: ns.currentRound,
      });

      // Handle terminal states
      if (ns.state === NegotiationState.ACCEPTED) {
        session.status = 'completed';
        logger.info('Negotiation completed — agreement reached', { sessionId: session.id });
      } else if (ns.state === NegotiationState.REJECTED) {
        session.status = 'completed';
        logger.info('Negotiation completed — rejected', { sessionId: session.id });
      } else if (ns.state === NegotiationState.STALEMATE) {
        logger.warn('Negotiation stalemate detected — exceeded round threshold', {
          sessionId: session.id,
          rounds: ns.currentRound,
          threshold: STALEMATE_ROUND_THRESHOLD,
        });
      }
    }
  }

  /**
   * Check whether a proposed numeric offer violates the session's bottom-line limits.
   * Returns which fields are violated so the caller can generate an automatic counter-proposal.
   */
  checkBottomLine(
    session: DialogSession,
    proposal: Record<string, number>
  ): { withinLine: boolean; violatedFields: string[] } {
    const bottomLine = session.context.negotiationState?.bottomLine;
    if (!bottomLine) {
      return { withinLine: true, violatedFields: [] };
    }

    const violatedFields: string[] = [];
    for (const [field, proposedValue] of Object.entries(proposal)) {
      const limit = bottomLine[field];
      if (limit !== undefined && proposedValue < limit) {
        violatedFields.push(field);
      }
    }

    return {
      withinLine: violatedFields.length === 0,
      violatedFields,
    };
  }

  /**
   * Extract numeric proposal values from message text for known fields.
   * Simple regex-based extraction: looks for patterns like "薪资 25000" or "salary: 20000".
   */
  private extractNumericProposal(content: string, fields: string[]): Record<string, number> | null {
    const result: Record<string, number> = {};
    const fieldPatterns: Record<string, RegExp> = {
      salary: /(?:薪资|salary|月薪|月薪)\s*[:：]?\s*(\d+)/i,
      // Extend with more field patterns as needed
    };

    for (const field of fields) {
      const pattern = fieldPatterns[field];
      if (pattern) {
        const match = content.match(pattern);
        if (match && match[1]) {
          result[field] = parseInt(match[1], 10);
        }
      }
    }

    return Object.keys(result).length > 0 ? result : null;
  }

  /**
   * Persist session to database
   */
  async persistSession(session: DialogSession): Promise<void> {
    try {
      const { prisma } = await import('../../db/client').catch(() => ({ prisma: null }));
      if (!prisma) return;

      const data = {
        type: session.type,
        participants: session.participants as any,
        scene: session.scene,
        context: session.context as any,
        messages: session.messages as any,
        status: session.status,
        dialogPhase: session.dialogPhase,
        summary: session.metadata?.conversationSummary || null,
        metadata: (session.metadata as any) || null,
        updatedAt: new Date(),
      };

      await prisma.dialogSessionRecord.upsert({
        where: { id: session.id },
        update: data,
        create: { id: session.id, ...data },
      });
    } catch (err) {
      logger.warn('Failed to persist dialog session', {
        sessionId: session.id,
        error: (err as Error)?.message,
      });
    }
  }

  /**
   * Append a single message to the dialog_messages append-only table.
   *
   * This is an additional source of truth alongside the JSON `messages`
   * column on DialogSessionRecord. It is best-effort: failures are
   * logged but do not break the main flow. The unique constraint on
   * (sessionId, sequenceNumber) prevents duplicate appends.
   */
  async appendMessageToDb(
    sessionId: string,
    message: DialogMessage,
    sequenceNumber: number
  ): Promise<void> {
    try {
      const { prisma } = await import('../../db/client').catch(() => ({ prisma: null }));
      if (!prisma) return;
      await (prisma as any).dialogMessage.create({
        data: {
          id: message.id,
          sessionId,
          senderId: message.senderId,
          senderType: message.senderType,
          content: message.content,
          sequenceNumber,
          metadata: (message.metadata as any) || null,
          createdAt: message.timestamp || new Date(),
        },
      });
    } catch (err) {
      logger.warn('Failed to append dialog message to dialog_messages table', {
        sessionId,
        messageId: message.id,
        sequenceNumber,
        error: (err as Error)?.message,
      });
    }
  }

  /**
   * Load ordered messages for a session from the append-only
   * dialog_messages table. Returns [] if the table is unavailable or
   * the session has no rows.
   */
  async loadMessagesFromDb(sessionId: string): Promise<DialogMessage[]> {
    try {
      const { prisma } = await import('../../db/client').catch(() => ({ prisma: null }));
      if (!prisma) return [];
      const rows = await (prisma as any).dialogMessage.findMany({
        where: { sessionId },
        orderBy: { sequenceNumber: 'asc' },
      });
      return (rows || []).map(
        (r: any): DialogMessage => ({
          id: r.id,
          sessionId: r.sessionId,
          senderId: r.senderId,
          senderType: r.senderType as MessageSender,
          senderName: (r.metadata && r.metadata.senderName) || '',
          content: r.content,
          timestamp: r.createdAt,
          metadata: (r.metadata as any) || undefined,
        })
      );
    } catch (err) {
      logger.warn('Failed to load dialog messages from dialog_messages table', {
        sessionId,
        error: (err as Error)?.message,
      });
      return [];
    }
  }

  /**
   * Backfill the append-only dialog_messages table from a session's
   * in-memory `messages` JSON. Idempotent: skips messages whose
   * (sessionId, sequenceNumber) already exists.
   */
  async migrateSessionToAppendOnly(sessionId: string): Promise<void> {
    try {
      const session = this.sessions.get(sessionId) || (await this.loadSession(sessionId));
      if (!session) return;
      const { prisma } = await import('../../db/client').catch(() => ({ prisma: null }));
      if (!prisma) return;

      const existing = await (prisma as any).dialogMessage.findMany({
        where: { sessionId },
        select: { sequenceNumber: true },
      });
      const existingSeq = new Set<number>((existing || []).map((r: any) => r.sequenceNumber));

      for (let i = 0; i < session.messages.length; i++) {
        if (existingSeq.has(i)) continue;
        const m = session.messages[i];
        try {
          await (prisma as any).dialogMessage.create({
            data: {
              id: m.id,
              sessionId,
              senderId: m.senderId,
              senderType: m.senderType,
              content: m.content,
              sequenceNumber: i,
              metadata: (m.metadata as any) || null,
              createdAt: m.timestamp || new Date(),
            },
          });
        } catch (innerErr) {
          // Likely a unique-constraint race; safe to ignore.
          logger.warn('Skipped append during migration', {
            sessionId,
            sequenceNumber: i,
            error: (innerErr as Error)?.message,
          });
        }
      }
    } catch (err) {
      logger.warn('Failed to migrate session to append-only log', {
        sessionId,
        error: (err as Error)?.message,
      });
    }
  }

  /**
   * Load session from database into memory
   */
  async loadSession(sessionId: string): Promise<DialogSession | null> {
    // Check memory cache first
    const cached = this.sessions.get(sessionId);
    if (cached) return cached;

    try {
      const { prisma } = await import('../../db/client').catch(() => ({ prisma: null }));
      if (!prisma) return null;

      const record = await prisma.dialogSessionRecord.findUnique({
        where: { id: sessionId },
      });
      if (!record) return null;

      const session: DialogSession = {
        id: record.id,
        type: record.type as DialogType,
        participants: record.participants as DialogParticipant[],
        scene: record.scene || undefined,
        context: record.context as DialogContext,
        messages: (record.messages as DialogMessage[]) || [],
        status: record.status as DialogSession['status'],
        dialogPhase: (record.dialogPhase as DialogSession['dialogPhase']) || 'intro',
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
        metadata: (record.metadata as Record<string, any>) || undefined,
      };

      this.sessions.set(sessionId, session);
      return session;
    } catch (err) {
      logger.warn('Failed to load dialog session', {
        sessionId,
        error: (err as Error)?.message,
      });
      return null;
    }
  }

  /**
   * Get sessions for a participant from database (long-term memory)
   */
  async getParticipantHistory(
    participantId: string,
    options?: { limit?: number; offset?: number }
  ): Promise<DialogSession[]> {
    // Combine in-memory and database sessions
    const memSessions = this.getSessionsForParticipant(participantId);

    try {
      const { prisma } = await import('../../db/client').catch(() => ({ prisma: null }));
      if (!prisma) return memSessions;

      const dbRecords = await prisma.dialogSessionRecord.findMany({
        orderBy: { updatedAt: 'desc' },
        take: options?.limit || 50,
        skip: options?.offset || 0,
      });

      const dbSessions: DialogSession[] = dbRecords
        .filter(r => {
          const participants = r.participants as DialogParticipant[];
          return participants.some(p => p.id === participantId);
        })
        .map(r => ({
          id: r.id,
          type: r.type as DialogType,
          participants: r.participants as DialogParticipant[],
          scene: r.scene || undefined,
          context: r.context as DialogContext,
          messages: (r.messages as DialogMessage[]) || [],
          status: r.status as DialogSession['status'],
          dialogPhase: (r.dialogPhase as DialogSession['dialogPhase']) || 'intro',
          createdAt: r.createdAt,
          updatedAt: r.updatedAt,
          metadata: (r.metadata as Record<string, any>) || undefined,
        }));

      // Merge, deduplicating by id
      const seen = new Set(memSessions.map(s => s.id));
      const allSessions = [...memSessions];
      for (const s of dbSessions) {
        if (!seen.has(s.id)) {
          allSessions.push(s);
          seen.add(s.id);
        }
      }
      return allSessions;
    } catch {
      return memSessions;
    }
  }

  /**
   * Find existing session between two participants
   */
  private findExistingSession(participantA: string, participantB: string): DialogSession | null {
    for (const session of this.sessions.values()) {
      if (session.status !== 'active') continue;

      const hasA = session.participants.some(p => p.id === participantA);
      const hasB = session.participants.some(p => p.id === participantB);

      if (hasA && hasB && session.participants.length === 2) {
        return session;
      }
    }
    return null;
  }

  /**
   * Get agent by ID - delegates to real agentService
   */
  private async getAgentById(
    agentId: string
  ): Promise<{ id: string; name: string; type: string; config: Record<string, unknown> } | null> {
    const { getAgentById } = await import('../../services/agentService').catch(() => {
      return { getAgentById: null as any };
    });

    if (!getAgentById) {
      throw new Error('agentService not available - cannot resolve agent identity');
    }

    const agent = await getAgentById(agentId);
    if (!agent) return null;

    return {
      id: agent.id,
      name: agent.name,
      type: agent.type,
      config: agent.config || {},
    };
  }

  /**
   * Get LLM service (lazy load to avoid circular dependencies)
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async getLLMService(): Promise<{ llmService: any }> {
    // Dynamic import to avoid circular dependency
    const { llmService } = await import('./llmService').catch(() => ({ llmService: null }));

    if (!llmService) {
      throw new Error('LLM service not available');
    }

    return { llmService };
  }

  /**
   * Get service version
   */
  getVersion(): string {
    return this.version;
  }

  /**
   * Get session count
   */
  getSessionCount(): number {
    return this.sessions.size;
  }
}

// Export singleton instance
export const agentDialogService = new AgentDialogService();

export default agentDialogService;
