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
import { AgentProtocolErrorCode, AgentMessageType, } from '@bridgeai/shared';
/**
 * Agent behavior service
 * Handles rate limiting, content moderation, and violation detection
 */
export class AgentBehaviorService {
    rateLimitStore = new Map();
    violationStore = new Map();
    messageHistory = new Map();
    restrictedAgents = new Set();
    suspendedAgents = new Set();
    rules = {
        rateLimits: {
            [AgentMessageType.DIRECT]: { maxRequests: 60, windowSeconds: 60 },
            [AgentMessageType.GROUP]: { maxRequests: 30, windowSeconds: 60 },
            [AgentMessageType.SYSTEM]: { maxRequests: 120, windowSeconds: 60 },
            [AgentMessageType.COMMAND]: { maxRequests: 20, windowSeconds: 60 },
            [AgentMessageType.RESPONSE]: { maxRequests: 120, windowSeconds: 60 },
            [AgentMessageType.STATUS]: { maxRequests: 10, windowSeconds: 60 },
            [AgentMessageType.ERROR]: { maxRequests: 60, windowSeconds: 60 },
        },
        prohibitedContent: [
            'spam',
            'scam',
            'phishing',
            'malware',
            'hate speech',
            'harassment',
            'illegal',
            'inappropriate',
            'buy now',
        ],
        anomalyThresholds: {
            maxMessagesPerMinute: 100,
            maxSimilarMessages: 5,
            similarMessageWindowSeconds: 300,
        },
        penalties: {
            warnThreshold: 1,
            restrictThreshold: 3,
            suspendThreshold: 5,
            banThreshold: 10,
        },
    };
    /**
     * Check if agent is allowed to send message
     * @param agentId - Agent ID
     * @param message - Message to check
     * @returns Behavior check result
     */
    async checkBehavior(agentId, message) {
        // Check if agent is suspended
        if (this.suspendedAgents.has(agentId)) {
            return {
                allowed: false,
                error: this.createError(AgentProtocolErrorCode.UNAUTHORIZED, 'Agent is suspended due to violations'),
            };
        }
        // Check if agent is restricted
        if (this.restrictedAgents.has(agentId)) {
            // Restricted agents can only send DIRECT messages
            if (message.type !== AgentMessageType.DIRECT) {
                return {
                    allowed: false,
                    error: this.createError(AgentProtocolErrorCode.UNAUTHORIZED, 'Restricted agents can only send direct messages'),
                };
            }
        }
        // Check rate limit
        const rateLimitResult = this.checkRateLimit(agentId, message.type);
        if (!rateLimitResult.allowed) {
            this.recordViolation(agentId, {
                type: 'RATE_LIMIT',
                severity: 'medium',
                description: 'Rate limit exceeded',
                messageId: message.id,
            });
            return rateLimitResult;
        }
        // Check content
        const contentResult = this.checkContent(message);
        if (!contentResult.allowed) {
            this.recordViolation(agentId, {
                type: 'CONTENT_VIOLATION',
                severity: 'high',
                description: 'Content violation detected',
                messageId: message.id,
            });
            return contentResult;
        }
        // Check for anomalous behavior
        const anomalyResult = this.checkAnomaly(agentId, message);
        if (!anomalyResult.allowed) {
            this.recordViolation(agentId, {
                type: 'BEHAVIOR_ANOMALY',
                severity: 'high',
                description: 'Suspicious behavior detected',
                messageId: message.id,
            });
            return anomalyResult;
        }
        return { allowed: true };
    }
    /**
     * Check rate limit for agent
     * @param agentId - Agent ID
     * @param messageType - Type of message
     * @returns Rate limit check result
     */
    checkRateLimit(agentId, messageType) {
        const config = this.rules.rateLimits[messageType];
        const key = `${agentId}:${messageType}`;
        const now = Date.now();
        const windowStart = now - config.windowSeconds * 1000;
        // Get existing requests
        let requests = this.rateLimitStore.get(key) || [];
        // Filter to current window
        requests = requests.filter((time) => time > windowStart);
        // Check limit
        if (requests.length >= config.maxRequests) {
            return {
                allowed: false,
                error: this.createError(AgentProtocolErrorCode.RATE_LIMITED, `Rate limit exceeded: ${config.maxRequests} requests per ${config.windowSeconds} seconds`),
            };
        }
        // Record request
        requests.push(now);
        this.rateLimitStore.set(key, requests);
        return { allowed: true };
    }
    /**
     * Check message content for violations
     * @param message - Message to check
     * @returns Content check result
     */
    checkContent(message) {
        const content = message.content.text || '';
        const lowerContent = content.toLowerCase();
        for (const keyword of this.rules.prohibitedContent) {
            if (lowerContent.includes(keyword.toLowerCase())) {
                return {
                    allowed: false,
                    error: this.createError(AgentProtocolErrorCode.CONTENT_VIOLATION, `Message contains prohibited content: ${keyword}`),
                };
            }
        }
        // Check for spam patterns
        if (this.isSpam(content)) {
            return {
                allowed: false,
                error: this.createError(AgentProtocolErrorCode.CONTENT_VIOLATION, 'Message detected as spam'),
            };
        }
        return { allowed: true };
    }
    /**
     * Check for spam patterns
     * @param content - Message content
     * @returns Whether content is spam
     */
    isSpam(content) {
        // Check for excessive repetition
        const repeatedChars = /(.)\1{10,}/;
        if (repeatedChars.test(content)) {
            return true;
        }
        // Check for repeated phrases (e.g. "BUY NOW!!! BUY NOW!!! BUY NOW!!!")
        const trimmed = content.trim();
        const phraseRepeated = /^(.+?)\s*\1\s*\1$/is.test(trimmed) || /^(.+?)\s+\1\s+\1/i.test(trimmed);
        if (phraseRepeated) {
            return true;
        }
        // Check for excessive caps
        const capsRatio = (content.match(/[A-Z]/g) || []).length / content.length;
        if (content.length > 20 && capsRatio > 0.5) {
            return true;
        }
        // Check for excessive URLs
        const urlCount = (content.match(/https?:\/\//g) || []).length;
        if (urlCount > 3) {
            return true;
        }
        return false;
    }
    /**
     * Check for anomalous behavior patterns
     * @param agentId - Agent ID
     * @param message - Message to check
     * @returns Anomaly check result
     */
    checkAnomaly(agentId, message) {
        const now = Date.now();
        const thresholds = this.rules.anomalyThresholds;
        // Check message rate
        const key = `${agentId}:all`;
        let history = this.messageHistory.get(key) || [];
        // Clean old history
        const oneMinuteAgo = now - 60000;
        history = history.filter((timestamp) => parseInt(timestamp) > oneMinuteAgo);
        // Check messages per minute
        if (history.length >= thresholds.maxMessagesPerMinute) {
            return {
                allowed: false,
                error: this.createError(AgentProtocolErrorCode.RATE_LIMITED, 'Suspicious messaging pattern detected'),
            };
        }
        // Check for repetitive messages
        const content = message.content.text || '';
        const windowStart = now - thresholds.similarMessageWindowSeconds * 1000;
        const recentMessages = history.filter((item) => parseInt(item.split(':')[0]) > windowStart);
        let similarCount = 0;
        for (const item of recentMessages) {
            const [, prevContent] = item.split(':', 2);
            if (this.calculateSimilarity(content, prevContent) > 0.8) {
                similarCount++;
            }
        }
        if (similarCount >= thresholds.maxSimilarMessages) {
            return {
                allowed: false,
                error: this.createError(AgentProtocolErrorCode.CONTENT_VIOLATION, 'Repetitive message pattern detected'),
            };
        }
        // Record message
        history.push(`${now}:${content.substring(0, 100)}`);
        this.messageHistory.set(key, history);
        return { allowed: true };
    }
    /**
     * Calculate similarity between two strings
     * @param str1 - First string
     * @param str2 - Second string
     * @returns Similarity ratio (0-1)
     */
    calculateSimilarity(str1, str2) {
        if (str1 === str2)
            return 1;
        if (!str1 || !str2)
            return 0;
        const longer = str1.length > str2.length ? str1 : str2;
        const shorter = str1.length > str2.length ? str2 : str1;
        if (longer.length === 0)
            return 1;
        const distance = this.levenshteinDistance(longer, shorter);
        return (longer.length - distance) / longer.length;
    }
    /**
     * Calculate Levenshtein distance between two strings
     * @param str1 - First string
     * @param str2 - Second string
     * @returns Edit distance
     */
    levenshteinDistance(str1, str2) {
        const matrix = [];
        for (let i = 0; i <= str2.length; i++) {
            matrix[i] = [i];
        }
        for (let j = 0; j <= str1.length; j++) {
            matrix[0][j] = j;
        }
        for (let i = 1; i <= str2.length; i++) {
            for (let j = 1; j <= str1.length; j++) {
                if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                }
                else {
                    matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1);
                }
            }
        }
        return matrix[str2.length][str1.length];
    }
    /**
     * Record a violation for an agent
     * @param agentId - Agent ID
     * @param violation - Violation details
     */
    recordViolation(agentId, violation) {
        const violations = this.violationStore.get(agentId) || [];
        const totalViolations = violations.length + 1;
        // Determine action based on total violations
        let action = 'warn';
        if (totalViolations >= this.rules.penalties.banThreshold) {
            action = 'ban';
            this.suspendedAgents.add(agentId);
        }
        else if (totalViolations >= this.rules.penalties.suspendThreshold) {
            action = 'suspend';
            this.suspendedAgents.add(agentId);
        }
        else if (totalViolations >= this.rules.penalties.restrictThreshold) {
            action = 'restrict';
            this.restrictedAgents.add(agentId);
        }
        else if (totalViolations >= this.rules.penalties.warnThreshold) {
            action = 'warn';
        }
        const record = {
            id: `vio_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            agentId,
            ...violation,
            timestamp: new Date().toISOString(),
            action,
        };
        violations.push(record);
        this.violationStore.set(agentId, violations);
        // Log the violation
        console.warn(`[AgentBehavior] Violation recorded for ${agentId}:`, {
            type: violation.type,
            severity: violation.severity,
            action,
            totalViolations,
        });
    }
    /**
     * Get violations for an agent
     * @param agentId - Agent ID
     * @returns List of violations
     */
    getViolations(agentId) {
        return this.violationStore.get(agentId) || [];
    }
    /**
     * Get all violations
     * @returns All violation records
     */
    getAllViolations() {
        const all = [];
        for (const violations of this.violationStore.values()) {
            all.push(...violations);
        }
        return all.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }
    /**
     * Check if agent is restricted
     * @param agentId - Agent ID
     * @returns Whether agent is restricted
     */
    isRestricted(agentId) {
        return this.restrictedAgents.has(agentId);
    }
    /**
     * Check if agent is suspended
     * @param agentId - Agent ID
     * @returns Whether agent is suspended
     */
    isSuspended(agentId) {
        return this.suspendedAgents.has(agentId);
    }
    /**
     * Lift restriction on agent
     * @param agentId - Agent ID
     */
    liftRestriction(agentId) {
        this.restrictedAgents.delete(agentId);
    }
    /**
     * Lift suspension on agent
     * @param agentId - Agent ID
     */
    liftSuspension(agentId) {
        this.suspendedAgents.delete(agentId);
    }
    /**
     * Clear violations for an agent
     * @param agentId - Agent ID
     */
    clearViolations(agentId) {
        this.violationStore.delete(agentId);
        this.liftRestriction(agentId);
        this.liftSuspension(agentId);
    }
    /**
     * Create protocol error
     * @param code - Error code
     * @param message - Error message
     * @returns Protocol error
     */
    createError(code, message) {
        return {
            code,
            message,
            timestamp: new Date().toISOString(),
        };
    }
}
// Export singleton instance
export const agentBehaviorService = new AgentBehaviorService();
export default agentBehaviorService;
//# sourceMappingURL=agentBehaviorService.js.map