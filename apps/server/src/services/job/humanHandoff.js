/**
 * Human Handoff Service
 * 人机切换服务
 */
import { MessageSender } from '../../models/NegotiationRoom';
export var HandoffTrigger;
(function (HandoffTrigger) {
    HandoffTrigger["MAX_ROUNDS_REACHED"] = "MAX_ROUNDS_REACHED";
    HandoffTrigger["NEGOTIATION_STALE"] = "NEGOTIATION_STALE";
    HandoffTrigger["NEGOTIATION_FAILED"] = "NEGOTIATION_FAILED";
    HandoffTrigger["STALEMATE_DETECTED"] = "STALEMATE_DETECTED";
    HandoffTrigger["COMPLEX_NEGOTIATION"] = "COMPLEX_NEGOTIATION";
    HandoffTrigger["USER_REQUESTED"] = "USER_REQUESTED";
    HandoffTrigger["AI_ERROR"] = "AI_ERROR";
    HandoffTrigger["INTERVIEW_SCHEDULING_CONFLICT"] = "INTERVIEW_SCHEDULING_CONFLICT";
})(HandoffTrigger || (HandoffTrigger = {}));
export var HandoffType;
(function (HandoffType) {
    HandoffType["NEGOTIATION"] = "negotiation";
    HandoffType["INTERVIEW"] = "interview";
    HandoffType["GENERAL"] = "general";
})(HandoffType || (HandoffType = {}));
// TODO(NP-1279): In-memory storage - data is lost on server restart and does not scale horizontally.
// Replace with database persistence (e.g., Prisma) to store handoffSessions, handoffEvents,
// humanAgents, and handoffQueue with proper schema, indexes, and relations to users/rooms.
const handoffSessions = new Map();
const handoffEvents = new Map();
const humanAgents = new Map();
const handoffQueue = [];
function generateId() {
    return `handoff_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
function generateEventId() {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
export class HumanHandoffService {
    constructor() {
        // Initialize dummy agents only in non-production environments
        if (process.env.NODE_ENV !== 'production') {
            this.initializeDummyAgents();
        }
    }
    initializeDummyAgents() {
        const agents = [
            {
                id: 'agent_hr_1',
                name: 'Sarah Chen',
                role: 'HR Specialist',
                expertise: ['salary_negotiation', 'benefits', 'onboarding'],
                availability: 'available',
                currentSessions: [],
            },
            {
                id: 'agent_hr_2',
                name: 'Mike Johnson',
                role: 'Senior Recruiter',
                expertise: ['interview_scheduling', 'candidate_screening'],
                availability: 'available',
                currentSessions: [],
            },
            {
                id: 'agent_hr_3',
                name: 'Lisa Wang',
                role: 'Talent Acquisition Manager',
                expertise: ['complex_negotiations', 'executive_hiring'],
                availability: 'available',
                currentSessions: [],
            },
        ];
        agents.forEach(agent => humanAgents.set(agent.id, agent));
    }
    /**
     * Request handoff to human
     */
    async requestHandoff(request) {
        // Check if there's already a pending session for this entity
        const existingSession = this.findSessionByEntity(request.type, request.entityId);
        if (existingSession && existingSession.status === 'pending') {
            return existingSession;
        }
        // Create handoff session
        const session = {
            id: generateId(),
            type: request.type,
            entityId: request.entityId,
            status: 'pending',
            requestedAt: new Date(),
            trigger: request.trigger,
            reason: request.reason,
            priority: request.priority,
            context: request.context,
            history: [],
        };
        // Create initial event
        const event = {
            id: generateEventId(),
            sessionId: session.id,
            type: 'request',
            timestamp: new Date(),
            actor: 'system',
            actorId: 'system',
            data: { trigger: request.trigger, reason: request.reason, metadata: request.metadata },
        };
        session.history.push(event);
        handoffSessions.set(session.id, session);
        handoffEvents.set(session.id, [event]);
        handoffQueue.push(session.id);
        // Update entity status
        if (request.type === HandoffType.NEGOTIATION) {
            await negotiationRoomService.handoffToHuman(request.entityId, request.reason);
        }
        // Try to auto-assign if high priority
        if (request.priority === 'high' || request.priority === 'urgent') {
            await this.tryAutoAssign(session.id);
        }
        return session;
    }
    /**
     * Check if handoff is needed
     */
    async checkHandoffNeeded(type, entityId) {
        if (type === HandoffType.NEGOTIATION) {
            const result = await negotiationRoomService.checkHandoff(entityId);
            if (result.should) {
                return {
                    needed: true,
                    reason: result.reason,
                    trigger: result.reason,
                };
            }
        }
        return { needed: false };
    }
    /**
     * Automatically trigger handoff if conditions are met
     */
    async autoHandoffIfNeeded(type, entityId, context) {
        const check = await this.checkHandoffNeeded(type, entityId);
        if (check.needed && check.trigger) {
            return this.requestHandoff({
                type,
                entityId,
                trigger: check.trigger,
                reason: check.reason || 'Automatic handoff triggered',
                context,
                priority: this.determinePriority(check.trigger),
            });
        }
        return null;
    }
    /**
     * Get available human agents
     */
    async getAvailableAgents(expertise) {
        const agents = Array.from(humanAgents.values());
        if (expertise && expertise.length > 0) {
            return agents.filter(agent => agent.availability === 'available' && expertise.some(exp => agent.expertise.includes(exp)));
        }
        return agents.filter(agent => agent.availability === 'available');
    }
    /**
     * Assign session to human agent
     */
    async assignSession(sessionId, agentId) {
        const session = handoffSessions.get(sessionId);
        const agent = humanAgents.get(agentId);
        if (!session || !agent)
            return null;
        if (agent.availability !== 'available') {
            throw new Error('Agent is not available');
        }
        // Update session
        session.status = 'assigned';
        session.assignedTo = agentId;
        session.assignedAt = new Date();
        // Update agent
        agent.availability = 'busy';
        agent.currentSessions.push(sessionId);
        // Add event
        const event = {
            id: generateEventId(),
            sessionId,
            type: 'assign',
            timestamp: new Date(),
            actor: 'system',
            actorId: 'system',
            data: { agentId, agentName: agent.name },
        };
        session.history.push(event);
        this.addEvent(sessionId, event);
        // Remove from queue
        const queueIndex = handoffQueue.indexOf(sessionId);
        if (queueIndex > -1) {
            handoffQueue.splice(queueIndex, 1);
        }
        handoffSessions.set(sessionId, session);
        humanAgents.set(agentId, agent);
        return session;
    }
    /**
     * Human agent joins session
     */
    async joinSession(sessionId, agentId) {
        const session = handoffSessions.get(sessionId);
        if (!session || session.assignedTo !== agentId)
            return null;
        session.status = 'active';
        // Add event
        const event = {
            id: generateEventId(),
            sessionId,
            type: 'action',
            timestamp: new Date(),
            actor: 'human',
            actorId: agentId,
            data: { action: 'join_session' },
        };
        session.history.push(event);
        this.addEvent(sessionId, event);
        handoffSessions.set(sessionId, session);
        // Add system message to negotiation room if applicable
        if (session.type === HandoffType.NEGOTIATION) {
            await negotiationRoomService.sendMessage({
                roomId: session.entityId,
                sender: MessageSender.SYSTEM,
                senderId: 'system',
                content: 'A human agent has joined the conversation to assist with the negotiation.',
                metadata: { type: 'human_joined', sessionId, agentId },
            });
        }
        return session;
    }
    /**
     * Human agent sends message
     */
    async sendHumanMessage(sessionId, agentId, content) {
        const session = handoffSessions.get(sessionId);
        if (!session || session.assignedTo !== agentId) {
            throw new Error('Session not found or not assigned to this agent');
        }
        // Add event
        const event = {
            id: generateEventId(),
            sessionId,
            type: 'message',
            timestamp: new Date(),
            actor: 'human',
            actorId: agentId,
            data: { content },
        };
        session.history.push(event);
        this.addEvent(sessionId, event);
        // Send message to negotiation room if applicable
        if (session.type === HandoffType.NEGOTIATION) {
            await negotiationRoomService.sendMessage({
                roomId: session.entityId,
                sender: MessageSender.HUMAN,
                senderId: agentId,
                content,
                metadata: { sessionId },
            });
        }
    }
    /**
     * Resolve handoff session
     */
    async resolveSession(sessionId, agentId, resolution) {
        const session = handoffSessions.get(sessionId);
        const agent = humanAgents.get(agentId);
        if (!session || !agent || session.assignedTo !== agentId)
            return null;
        session.status = 'resolved';
        session.resolvedAt = new Date();
        // Update agent
        agent.availability = 'available';
        const sessionIndex = agent.currentSessions.indexOf(sessionId);
        if (sessionIndex > -1) {
            agent.currentSessions.splice(sessionIndex, 1);
        }
        // Add event
        const event = {
            id: generateEventId(),
            sessionId,
            type: 'resolve',
            timestamp: new Date(),
            actor: 'human',
            actorId: agentId,
            data: { resolution },
        };
        session.history.push(event);
        this.addEvent(sessionId, event);
        handoffSessions.set(sessionId, session);
        humanAgents.set(agentId, agent);
        return session;
    }
    /**
     * Close handoff session
     */
    async closeSession(sessionId) {
        const session = handoffSessions.get(sessionId);
        if (!session)
            return null;
        session.status = 'closed';
        // Add event
        const event = {
            id: generateEventId(),
            sessionId,
            type: 'close',
            timestamp: new Date(),
            actor: 'system',
            actorId: 'system',
            data: {},
        };
        session.history.push(event);
        this.addEvent(sessionId, event);
        handoffSessions.set(sessionId, session);
        return session;
    }
    /**
     * Get session by ID
     */
    async getSession(sessionId) {
        return handoffSessions.get(sessionId) || null;
    }
    /**
     * Get sessions by entity
     */
    async getSessionsByEntity(type, entityId) {
        return Array.from(handoffSessions.values()).filter(s => s.type === type && s.entityId === entityId);
    }
    /**
     * Get pending sessions in queue
     */
    async getPendingSessions() {
        return handoffQueue.map(id => handoffSessions.get(id)).filter(Boolean);
    }
    /**
     * Get sessions for agent
     */
    async getAgentSessions(agentId) {
        const agent = humanAgents.get(agentId);
        if (!agent)
            return [];
        return agent.currentSessions
            .map(id => handoffSessions.get(id))
            .filter(Boolean);
    }
    /**
     * Get session history/events
     */
    async getSessionHistory(sessionId) {
        return handoffEvents.get(sessionId) || [];
    }
    /**
     * Check if entity is currently in handoff
     */
    async isInHandoff(type, entityId) {
        const sessions = await this.getSessionsByEntity(type, entityId);
        return sessions.some(s => s.status === 'pending' || s.status === 'assigned' || s.status === 'active');
    }
    findSessionByEntity(type, entityId) {
        return (Array.from(handoffSessions.values()).find(s => s.type === type && s.entityId === entityId) ||
            null);
    }
    async tryAutoAssign(sessionId) {
        const session = handoffSessions.get(sessionId);
        if (!session)
            return;
        // Determine required expertise based on type
        const expertise = [];
        if (session.type === HandoffType.NEGOTIATION) {
            expertise.push('salary_negotiation');
        }
        else if (session.type === HandoffType.INTERVIEW) {
            expertise.push('interview_scheduling');
        }
        const availableAgents = await this.getAvailableAgents(expertise);
        if (availableAgents.length > 0) {
            await this.assignSession(sessionId, availableAgents[0].id);
        }
    }
    determinePriority(trigger) {
        switch (trigger) {
            case HandoffTrigger.MAX_ROUNDS_REACHED:
                return 'medium';
            case HandoffTrigger.NEGOTIATION_STALE:
                return 'high';
            case HandoffTrigger.NEGOTIATION_FAILED:
                return 'high';
            case HandoffTrigger.STALEMATE_DETECTED:
                return 'medium';
            case HandoffTrigger.COMPLEX_NEGOTIATION:
                return 'high';
            case HandoffTrigger.USER_REQUESTED:
                return 'medium';
            case HandoffTrigger.AI_ERROR:
                return 'urgent';
            case HandoffTrigger.INTERVIEW_SCHEDULING_CONFLICT:
                return 'high';
            default:
                return 'medium';
        }
    }
    addEvent(sessionId, event) {
        const events = handoffEvents.get(sessionId) || [];
        events.push(event);
        handoffEvents.set(sessionId, events);
    }
}
// Export singleton instance
export const humanHandoffService = new HumanHandoffService();
//# sourceMappingURL=humanHandoff.js.map