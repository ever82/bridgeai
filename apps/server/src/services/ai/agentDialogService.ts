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

// Dialog message types
export type MessageSender = 'agent' | 'user' | 'system';
export type DialogType = 'agent_to_agent' | 'agent_to_user' | 'negotiation' | 'matching';

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
    const session = this.sessions.get(request.sessionId);
    if (!session) {
      throw new Error(`Session ${request.sessionId} not found`);
    }

    const sender = session.participants.find(p => p.id === request.senderId);
    if (!sender) {
      throw new Error(`Sender ${request.senderId} not found in session`);
    }

    const startTime = Date.now();

    // Build prompt based on dialog type and context
    const prompt = this.buildDialogPrompt(session, sender, request);

    // Generate response using LLM (with fallback to mock if not initialized)
    const { llmService } = await this.getLLMService();
    let response: { text: string; provider?: string; model?: string; isMock?: boolean };
    let isMockResponse = false;
    try {
      response = await llmService.generateText(prompt, {
        temperature: request.options?.temperature ?? this.defaultTemperature,
        maxTokens: request.options?.maxTokens ?? this.defaultMaxTokens,
      });
    } catch (err) {
      logger.warn('LLM generateText failed, falling back to mock response', {
        error: (err as Error)?.message,
      });
      isMockResponse = true;
      response = {
        text: '这是一个模拟回复。请确保LLM服务已正确配置。',
        provider: 'mock',
        model: 'mock-model',
        isMock: true,
      };
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
        confidence: isMockResponse ? 0 : 0.85,
        isMock: isMockResponse,
        intent: await this.recognizeIntent(request.content, session),
      },
    };

    // Update dialog phase based on conversation progress
    this.updateDialogPhase(session, message);

    // Add to session
    session.messages.push(message);
    session.updatedAt = new Date();

    // Prune old messages if needed
    this.pruneHistory(session);

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
  getSessionMessages(
    sessionId: string,
    options?: { limit?: number; offset?: number }
  ): DialogMessage[] {
    const session = this.sessions.get(sessionId);
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
    const session = this.sessions.get(sessionId);
    if (session) {
      session.status = 'archived';
      session.updatedAt = new Date();
      await this.persistSession(session);
      logger.info('Dialog session archived', { sessionId });
    }
  }

  /**
   * Update session context
   */
  updateSessionContext(sessionId: string, updates: Partial<DialogContext>): DialogSession {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    session.context = {
      ...session.context,
      ...updates,
    };
    session.updatedAt = new Date();

    return session;
  }

  /**
   * Build dialog prompt (exposed for streaming endpoint)
   */
  buildDialogPrompt(
    session: DialogSession,
    sender: DialogParticipant,
    request: GenerateDialogRequest
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
   * Prune message history to prevent memory bloat
   * Generates LLM summary of pruned messages for long-term context
   */
  private async pruneHistory(session: DialogSession): Promise<void> {
    if (session.messages.length > this.defaultMaxHistory) {
      const pruneCount = session.messages.length - this.defaultMaxHistory;
      const prunedMessages = session.messages.slice(0, pruneCount);

      // Generate summary of pruned messages using LLM
      const summary = await this.summarizeMessages(prunedMessages, session.context.relevantHistory);
      if (summary) {
        session.context.relevantHistory = [];
        session.metadata = {
          ...session.metadata,
          conversationSummary: summary,
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
   * Update dialog phase based on conversation progress
   */
  private updateDialogPhase(session: DialogSession, _message: DialogMessage): void {
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

    if (previousPhase !== session.dialogPhase) {
      logger.info('Dialog phase updated', {
        sessionId: session.id,
        from: previousPhase,
        to: session.dialogPhase,
      });
    }
  }

  /**
   * Persist session to database
   */
  private async persistSession(session: DialogSession): Promise<void> {
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
        where: {
          participants: { array_contains: participantId },
        },
        orderBy: { updatedAt: 'desc' },
        take: options?.limit || 50,
        skip: options?.offset || 0,
      });

      const dbSessions: DialogSession[] = dbRecords.map(r => ({
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
      return { getAgentById: null };
    });

    if (!getAgentById) {
      logger.warn('agentService not available, using mock agent');
      return {
        id: agentId,
        name: `Agent_${agentId.slice(0, 8)}`,
        type: 'general',
        config: {},
      };
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
