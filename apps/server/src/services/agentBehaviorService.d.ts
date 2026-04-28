/**
 * Agent Behavior Service
 *
 * NP-277: This service is fully implemented (rate limiting, content moderation,
 * violation tracking) and is designed for future integration with the agent
 * messaging pipeline. It is exported as a singleton (`agentBehaviorService`) so
 * that downstream message handlers can call `checkBehavior(agentId, message)`
 * before dispatching messages. The service is intentionally not yet wired into
 * the dispatch path — that integration is tracked separately.
 */
import { AgentMessage, AgentProtocolError } from '@bridgeai/shared';
/**
 * Behavior check result
 */
interface BehaviorCheckResult {
    allowed: boolean;
    error?: AgentProtocolError;
}
/**
 * Violation record
 */
interface ViolationRecord {
    id: string;
    agentId: string;
    type: 'RATE_LIMIT' | 'CONTENT_VIOLATION' | 'BEHAVIOR_ANOMALY';
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    timestamp: string;
    messageId?: string;
    action: 'warn' | 'restrict' | 'suspend' | 'ban';
}
/**
 * Agent behavior service
 * Handles rate limiting, content moderation, and violation detection
 */
export declare class AgentBehaviorService {
    private rateLimitStore;
    private violationStore;
    private messageHistory;
    private restrictedAgents;
    private suspendedAgents;
    private readonly rules;
    /**
     * Check if agent is allowed to send message
     * @param agentId - Agent ID
     * @param message - Message to check
     * @returns Behavior check result
     */
    checkBehavior(agentId: string, message: AgentMessage): Promise<BehaviorCheckResult>;
    /**
     * Check rate limit for agent
     * @param agentId - Agent ID
     * @param messageType - Type of message
     * @returns Rate limit check result
     */
    private checkRateLimit;
    /**
     * Check message content for violations
     * @param message - Message to check
     * @returns Content check result
     */
    private checkContent;
    /**
     * Check for spam patterns
     * @param content - Message content
     * @returns Whether content is spam
     */
    private isSpam;
    /**
     * Check for anomalous behavior patterns
     * @param agentId - Agent ID
     * @param message - Message to check
     * @returns Anomaly check result
     */
    private checkAnomaly;
    /**
     * Calculate similarity between two strings
     * @param str1 - First string
     * @param str2 - Second string
     * @returns Similarity ratio (0-1)
     */
    private calculateSimilarity;
    /**
     * Calculate Levenshtein distance between two strings
     * @param str1 - First string
     * @param str2 - Second string
     * @returns Edit distance
     */
    private levenshteinDistance;
    /**
     * Record a violation for an agent
     * @param agentId - Agent ID
     * @param violation - Violation details
     */
    private recordViolation;
    /**
     * Get violations for an agent
     * @param agentId - Agent ID
     * @returns List of violations
     */
    getViolations(agentId: string): ViolationRecord[];
    /**
     * Get all violations
     * @returns All violation records
     */
    getAllViolations(): ViolationRecord[];
    /**
     * Check if agent is restricted
     * @param agentId - Agent ID
     * @returns Whether agent is restricted
     */
    isRestricted(agentId: string): boolean;
    /**
     * Check if agent is suspended
     * @param agentId - Agent ID
     * @returns Whether agent is suspended
     */
    isSuspended(agentId: string): boolean;
    /**
     * Lift restriction on agent
     * @param agentId - Agent ID
     */
    liftRestriction(agentId: string): void;
    /**
     * Lift suspension on agent
     * @param agentId - Agent ID
     */
    liftSuspension(agentId: string): void;
    /**
     * Clear violations for an agent
     * @param agentId - Agent ID
     */
    clearViolations(agentId: string): void;
    /**
     * Create protocol error
     * @param code - Error code
     * @param message - Error message
     * @returns Protocol error
     */
    private createError;
}
export declare const agentBehaviorService: AgentBehaviorService;
export default agentBehaviorService;
//# sourceMappingURL=agentBehaviorService.d.ts.map