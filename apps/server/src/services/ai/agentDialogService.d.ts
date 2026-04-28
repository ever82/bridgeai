/**
 * Agent Dialog Service
 * Agent对话生成服务 - 为AI Agent提供智能对话能力
 *
 * 支持:
 * - Agent间的自主沟通、协商、匹配对话
 * - Agent与用户的交互对话
 * - 上下文记忆和个性化回复能力
 */
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
export declare class AgentDialogService {
    private version;
    private sessions;
    private defaultMaxHistory;
    private defaultTemperature;
    private defaultMaxTokens;
    /**
     * Create a new dialog session
     */
    createSession(type: DialogType, participants: DialogParticipant[], scene?: string, initialContext?: Partial<DialogContext>): Promise<DialogSession>;
    /**
     * Generate a dialog message (agent-to-agent or agent-to-user)
     */
    generateMessage(request: GenerateDialogRequest): Promise<DialogMessage>;
    /**
     * Agent-to-Agent communication
     */
    agentToAgentDialog(request: AgentDialogRequest): Promise<DialogMessage>;
    /**
     * User-to-Agent conversation
     */
    userToAgentDialog(request: UserDialogRequest): Promise<DialogMessage>;
    /**
     * Get session messages
     */
    getSessionMessages(sessionId: string, options?: {
        limit?: number;
        offset?: number;
    }): Promise<DialogMessage[]>;
    /**
     * Get session by ID (checks memory cache then database)
     */
    getSession(sessionId: string): DialogSession | null;
    /**
     * Get or load session by ID
     */
    getSessionAsync(sessionId: string): Promise<DialogSession | null>;
    /**
     * Get all sessions for a participant
     */
    getSessionsForParticipant(participantId: string): DialogSession[];
    /**
     * Archive session
     */
    archiveSession(sessionId: string): Promise<void>;
    /**
     * Update session context
     */
    updateSessionContext(sessionId: string, updates: Partial<DialogContext>): Promise<DialogSession>;
    /**
     * Build dialog prompt (exposed for streaming endpoint)
     */
    buildDialogPrompt(session: DialogSession, sender: DialogParticipant, request: GenerateDialogRequest): string;
    /**
     * Build agent-to-agent prompt
     */
    private buildAgentToAgentPrompt;
    /**
     * Build agent-to-user prompt
     */
    private buildAgentToUserPrompt;
    /**
     * Build negotiation prompt
     */
    private buildNegotiationPrompt;
    /**
     * Build matching prompt
     */
    private buildMatchingPrompt;
    /**
     * Build agent persona from agent data
     */
    private buildPersona;
    /**
     * Prune message history to prevent memory bloat
     * Generates LLM summary of pruned messages for long-term context
     */
    private pruneHistory;
    /**
     * Summarize messages using LLM for long-term memory
     */
    private summarizeMessages;
    /**
     * Recognize intent from user message
     */
    private recognizeIntent;
    /**
     * Update dialog phase based on conversation progress
     */
    private updateDialogPhase;
    /**
     * Persist session to database
     */
    persistSession(session: DialogSession): Promise<void>;
    /**
     * Load session from database into memory
     */
    loadSession(sessionId: string): Promise<DialogSession | null>;
    /**
     * Get sessions for a participant from database (long-term memory)
     */
    getParticipantHistory(participantId: string, options?: {
        limit?: number;
        offset?: number;
    }): Promise<DialogSession[]>;
    /**
     * Find existing session between two participants
     */
    private findExistingSession;
    /**
     * Get agent by ID - delegates to real agentService
     */
    private getAgentById;
    /**
     * Get LLM service (lazy load to avoid circular dependencies)
     */
    private getLLMService;
    /**
     * Get service version
     */
    getVersion(): string;
    /**
     * Get session count
     */
    getSessionCount(): number;
}
export declare const agentDialogService: AgentDialogService;
export default agentDialogService;
//# sourceMappingURL=agentDialogService.d.ts.map