/**
 * Human Handoff Service
 * 人机切换服务
 */
export declare enum HandoffTrigger {
    MAX_ROUNDS_REACHED = "MAX_ROUNDS_REACHED",
    NEGOTIATION_STALE = "NEGOTIATION_STALE",
    NEGOTIATION_FAILED = "NEGOTIATION_FAILED",
    STALEMATE_DETECTED = "STALEMATE_DETECTED",
    COMPLEX_NEGOTIATION = "COMPLEX_NEGOTIATION",
    USER_REQUESTED = "USER_REQUESTED",
    AI_ERROR = "AI_ERROR",
    INTERVIEW_SCHEDULING_CONFLICT = "INTERVIEW_SCHEDULING_CONFLICT"
}
export declare enum HandoffType {
    NEGOTIATION = "negotiation",
    INTERVIEW = "interview",
    GENERAL = "general"
}
export interface HandoffRequest {
    type: HandoffType;
    entityId: string;
    trigger: HandoffTrigger;
    reason: string;
    context: {
        jobSeekerId: string;
        employerId: string;
        jobApplicationId: string;
    };
    priority: 'low' | 'medium' | 'high' | 'urgent';
    metadata?: Record<string, unknown>;
}
export interface HandoffSession {
    id: string;
    type: HandoffType;
    entityId: string;
    status: 'pending' | 'assigned' | 'active' | 'resolved' | 'closed';
    requestedAt: Date;
    assignedTo?: string;
    assignedAt?: Date;
    resolvedAt?: Date;
    trigger: HandoffTrigger;
    reason: string;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    context: HandoffRequest['context'];
    history: HandoffEvent[];
}
export interface HandoffEvent {
    id: string;
    sessionId: string;
    type: 'request' | 'assign' | 'message' | 'action' | 'resolve' | 'close';
    timestamp: Date;
    actor: 'system' | 'agent' | 'human';
    actorId: string;
    data: Record<string, unknown>;
}
export interface HumanAgent {
    id: string;
    name: string;
    role: string;
    expertise: string[];
    availability: 'available' | 'busy' | 'offline';
    currentSessions: string[];
}
export declare class HumanHandoffService {
    constructor();
    private initializeDummyAgents;
    /**
     * Request handoff to human
     */
    requestHandoff(request: HandoffRequest): Promise<HandoffSession>;
    /**
     * Check if handoff is needed
     */
    checkHandoffNeeded(type: HandoffType, entityId: string): Promise<{
        needed: boolean;
        reason?: string;
        trigger?: HandoffTrigger;
    }>;
    /**
     * Automatically trigger handoff if conditions are met
     */
    autoHandoffIfNeeded(type: HandoffType, entityId: string, context: HandoffRequest['context']): Promise<HandoffSession | null>;
    /**
     * Get available human agents
     */
    getAvailableAgents(expertise?: string[]): Promise<HumanAgent[]>;
    /**
     * Assign session to human agent
     */
    assignSession(sessionId: string, agentId: string): Promise<HandoffSession | null>;
    /**
     * Human agent joins session
     */
    joinSession(sessionId: string, agentId: string): Promise<HandoffSession | null>;
    /**
     * Human agent sends message
     */
    sendHumanMessage(sessionId: string, agentId: string, content: string): Promise<void>;
    /**
     * Resolve handoff session
     */
    resolveSession(sessionId: string, agentId: string, resolution: string): Promise<HandoffSession | null>;
    /**
     * Close handoff session
     */
    closeSession(sessionId: string): Promise<HandoffSession | null>;
    /**
     * Get session by ID
     */
    getSession(sessionId: string): Promise<HandoffSession | null>;
    /**
     * Get sessions by entity
     */
    getSessionsByEntity(type: HandoffType, entityId: string): Promise<HandoffSession[]>;
    /**
     * Get pending sessions in queue
     */
    getPendingSessions(): Promise<HandoffSession[]>;
    /**
     * Get sessions for agent
     */
    getAgentSessions(agentId: string): Promise<HandoffSession[]>;
    /**
     * Get session history/events
     */
    getSessionHistory(sessionId: string): Promise<HandoffEvent[]>;
    /**
     * Check if entity is currently in handoff
     */
    isInHandoff(type: HandoffType, entityId: string): Promise<boolean>;
    private findSessionByEntity;
    private tryAutoAssign;
    private determinePriority;
    private addEvent;
}
export declare const humanHandoffService: HumanHandoffService;
//# sourceMappingURL=humanHandoff.d.ts.map