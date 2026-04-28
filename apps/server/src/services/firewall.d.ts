/**
 * Firewall Service
 *
 * Centralized security management service for:
 * - IP blocking and unblocking
 * - Traffic analysis
 * - Security rule management
 * - Integration with DDoS protection
 */
import { getDDoSStats } from '../middleware/ddosProtection';
import { getStats as getIPFilterStats } from '../middleware/ipFilter';
export type SecurityEventType = 'IP_BLOCKED' | 'IP_UNBLOCKED' | 'RATE_LIMIT_EXCEEDED' | 'DDOS_DETECTED' | 'XSS_ATTEMPT' | 'SQL_INJECTION_ATTEMPT' | 'NOSQL_INJECTION_ATTEMPT' | 'SUSPICIOUS_ACTIVITY' | 'AUTH_FAILURE' | 'GEO_BLOCKED' | 'CORS_VIOLATION';
export interface SecurityEvent {
    id: string;
    type: SecurityEventType;
    severity: 'low' | 'medium' | 'high' | 'critical';
    ip?: string;
    userId?: string;
    path?: string;
    method?: string;
    timestamp: Date;
    details: Record<string, unknown>;
    resolved: boolean;
    resolvedAt?: Date;
}
export interface BlockedIPRecord {
    ip: string;
    blockedAt: Date;
    expiresAt?: Date;
    reason: string;
    source: 'ddos' | 'ip_filter' | 'manual';
    blockedBy?: string;
}
export interface SecurityRule {
    id: string;
    name: string;
    type: 'ip_block' | 'rate_limit' | 'geo_block' | 'pattern_match';
    enabled: boolean;
    config: Record<string, unknown>;
    createdAt: Date;
    updatedAt: Date;
}
/**
 * Log a security event
 */
export declare function logSecurityEvent(event: Omit<SecurityEvent, 'id' | 'timestamp' | 'resolved'>): SecurityEvent;
/**
 * Block an IP address
 */
export declare function blockIP(ip: string, reason: string, durationMinutes?: number, blockedBy?: string): {
    success: boolean;
    message: string;
};
/**
 * Unblock an IP address
 */
export declare function unblockIP(ip: string, unblockedBy?: string): {
    success: boolean;
    message: string;
};
/**
 * Get all blocked IPs
 */
export declare function getBlockedIPs(): BlockedIPRecord[];
/**
 * Check if an IP is blocked
 */
export declare function isIPBlocked(ip: string): {
    blocked: boolean;
    info?: BlockedIPRecord;
};
/**
 * Get security statistics
 */
export declare function getSecurityStats(): {
    blockedIPs: number;
    whitelistedIPs: number;
    recentEvents: number;
    eventsByType: Record<string, number>;
    eventsBySeverity: Record<string, number>;
    ddosStats: ReturnType<typeof getDDoSStats>;
    ipFilterStats: ReturnType<typeof getIPFilterStats>;
};
/**
 * Get security events with filtering
 */
export declare function getSecurityEvents(filters?: {
    type?: SecurityEventType;
    severity?: string;
    ip?: string;
    since?: Date;
    until?: Date;
    limit?: number;
    resolved?: boolean;
}): SecurityEvent[];
/**
 * Mark a security event as resolved
 */
export declare function resolveSecurityEvent(eventId: string, _resolvedBy?: string): boolean;
/**
 * Add a security rule
 */
export declare function addSecurityRule(rule: Omit<SecurityRule, 'id' | 'createdAt' | 'updatedAt'>): SecurityRule;
/**
 * Update a security rule
 */
export declare function updateSecurityRule(ruleId: string, updates: Partial<Omit<SecurityRule, 'id' | 'createdAt'>>): SecurityRule | null;
/**
 * Delete a security rule
 */
export declare function deleteSecurityRule(ruleId: string): boolean;
/**
 * Get all security rules
 */
export declare function getSecurityRules(enabledOnly?: boolean): SecurityRule[];
/**
 * Analyze traffic for suspicious patterns
 */
export declare function analyzeTraffic(ip: string, path: string, method: string): {
    isSuspicious: boolean;
    riskScore: number;
    reasons: string[];
};
/**
 * Bulk block IPs
 */
export declare function bulkBlockIPs(ips: string[], reason: string, durationMinutes: number, blockedBy?: string): {
    success: string[];
    failed: {
        ip: string;
        error: string;
    }[];
};
/**
 * Bulk unblock IPs
 */
export declare function bulkUnblockIPs(ips: string[], unblockedBy?: string): {
    success: string[];
    failed: {
        ip: string;
        error: string;
    }[];
};
//# sourceMappingURL=firewall.d.ts.map