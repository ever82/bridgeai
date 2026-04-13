/**
 * Firewall Service
 *
 * Centralized security management service for:
 * - IP blocking and unblocking
 * - Traffic analysis
 * - Security rule management
 * - Integration with DDoS protection
 */
import {
  blockIP as ddosBlockIP,
  unblockIP as ddosUnblockIP,
  getBlockedIPs as ddosGetBlockedIPs,
  isMaliciousRequest,
  getDDoSStats,
} from '../middleware/ddosProtection';
import {
  addToBlacklist,
  removeFromBlacklist,
  getBlockedIPs as ipFilterGetBlockedIPs,
  getWhitelistedIPs,
  getStats as getIPFilterStats,
} from '../middleware/ipFilter';

// Security event types
export type SecurityEventType =
  | 'IP_BLOCKED'
  | 'IP_UNBLOCKED'
  | 'RATE_LIMIT_EXCEEDED'
  | 'DDOS_DETECTED'
  | 'XSS_ATTEMPT'
  | 'SQL_INJECTION_ATTEMPT'
  | 'NOSQL_INJECTION_ATTEMPT'
  | 'SUSPICIOUS_ACTIVITY'
  | 'AUTH_FAILURE'
  | 'GEO_BLOCKED'
  | 'CORS_VIOLATION';

// Security event
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

// Blocked IP record
export interface BlockedIPRecord {
  ip: string;
  blockedAt: Date;
  expiresAt?: Date;
  reason: string;
  source: 'ddos' | 'ip_filter' | 'manual';
  blockedBy?: string;
}

// Security rule
export interface SecurityRule {
  id: string;
  name: string;
  type: 'ip_block' | 'rate_limit' | 'geo_block' | 'pattern_match';
  enabled: boolean;
  config: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

// In-memory storage
const securityEvents: SecurityEvent[] = [];
const securityRules: SecurityRule[] = [];
const MAX_EVENTS = 10000; // Keep last 10000 events

// Generate unique ID
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Log a security event
 */
export function logSecurityEvent(event: Omit<SecurityEvent, 'id' | 'timestamp' | 'resolved'>): SecurityEvent {
  const fullEvent: SecurityEvent = {
    ...event,
    id: generateId(),
    timestamp: new Date(),
    resolved: false,
  };

  securityEvents.push(fullEvent);

  // Keep only last N events
  if (securityEvents.length > MAX_EVENTS) {
    securityEvents.shift();
  }

  // Log to console for monitoring
  if (event.severity === 'high' || event.severity === 'critical') {
    console.warn(`[SECURITY ALERT] ${event.type} from ${event.ip}:`, {
      severity: event.severity,
      path: event.path,
      details: event.details,
    });
  }

  return fullEvent;
}

/**
 * Block an IP address
 */
export function blockIP(
  ip: string,
  reason: string,
  durationMinutes: number = 60,
  blockedBy?: string
): { success: boolean; message: string } {
  try {
    // Block via DDoS protection
    ddosBlockIP(ip, durationMinutes, reason);

    // Also add to blacklist
    addToBlacklist({
      ip,
      description: reason,
      addedBy: blockedBy || 'firewall',
    });

    // Log the event
    logSecurityEvent({
      type: 'IP_BLOCKED',
      severity: 'medium',
      ip,
      details: {
        reason,
        durationMinutes,
        blockedBy,
      },
    });

    return {
      success: true,
      message: `IP ${ip} has been blocked for ${durationMinutes} minutes`,
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to block IP: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Unblock an IP address
 */
export function unblockIP(
  ip: string,
  unblockedBy?: string
): { success: boolean; message: string } {
  try {
    // Unblock via DDoS protection
    ddosUnblockIP(ip);

    // Remove from blacklist
    removeFromBlacklist(ip);

    // Log the event
    logSecurityEvent({
      type: 'IP_UNBLOCKED',
      severity: 'low',
      ip,
      details: {
        unblockedBy,
      },
    });

    return {
      success: true,
      message: `IP ${ip} has been unblocked`,
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to unblock IP: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Get all blocked IPs
 */
export function getBlockedIPs(): BlockedIPRecord[] {
  const ddosBlocked = ddosGetBlockedIPs();
  const ipFilterBlocked = ipFilterGetBlockedIPs();

  const records: BlockedIPRecord[] = [];

  // Combine blocked IPs from both sources
  const allBlocked = new Set([...ddosBlocked.map(b => b.ip), ...ipFilterBlocked]);

  for (const ip of allBlocked) {
    const ddosInfo = ddosBlocked.find(b => b.ip === ip);
    if (ddosInfo) {
      records.push({
        ip: ddosInfo.ip,
        blockedAt: new Date(ddosInfo.blockedAt),
        expiresAt: new Date(ddosInfo.expiresAt),
        reason: ddosInfo.reason,
        source: 'ddos',
      });
    } else {
      records.push({
        ip,
        blockedAt: new Date(),
        reason: 'IP Filter Blacklist',
        source: 'ip_filter',
      });
    }
  }

  return records;
}

/**
 * Check if an IP is blocked
 */
export function isIPBlocked(ip: string): {
  blocked: boolean;
  info?: BlockedIPRecord;
} {
  const blocked = getBlockedIPs().find(b => b.ip === ip);
  return {
    blocked: !!blocked,
    info: blocked,
  };
}

/**
 * Get security statistics
 */
export function getSecurityStats(): {
  blockedIPs: number;
  whitelistedIPs: number;
  recentEvents: number;
  eventsByType: Record<string, number>;
  eventsBySeverity: Record<string, number>;
  ddosStats: ReturnType<typeof getDDoSStats>;
  ipFilterStats: ReturnType<typeof getIPFilterStats>;
} {
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

  const recentEvents = securityEvents.filter(e => e.timestamp > oneHourAgo);

  const eventsByType: Record<string, number> = {};
  const eventsBySeverity: Record<string, number> = {};

  for (const event of recentEvents) {
    eventsByType[event.type] = (eventsByType[event.type] || 0) + 1;
    eventsBySeverity[event.severity] = (eventsBySeverity[event.severity] || 0) + 1;
  }

  return {
    blockedIPs: getBlockedIPs().length,
    whitelistedIPs: getWhitelistedIPs().length,
    recentEvents: recentEvents.length,
    eventsByType,
    eventsBySeverity,
    ddosStats: getDDoSStats(),
    ipFilterStats: getIPFilterStats(),
  };
}

/**
 * Get security events with filtering
 */
export function getSecurityEvents(filters?: {
  type?: SecurityEventType;
  severity?: string;
  ip?: string;
  since?: Date;
  until?: Date;
  limit?: number;
  resolved?: boolean;
}): SecurityEvent[] {
  let filtered = [...securityEvents];

  if (filters?.type) {
    filtered = filtered.filter(e => e.type === filters.type);
  }

  if (filters?.severity) {
    filtered = filtered.filter(e => e.severity === filters.severity);
  }

  if (filters?.ip) {
    filtered = filtered.filter(e => e.ip === filters.ip);
  }

  if (filters?.since) {
    filtered = filtered.filter(e => e.timestamp >= filters.since!);
  }

  if (filters?.until) {
    filtered = filtered.filter(e => e.timestamp <= filters.until!);
  }

  if (filters?.resolved !== undefined) {
    filtered = filtered.filter(e => e.resolved === filters.resolved);
  }

  // Sort by timestamp desc
  filtered.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  if (filters?.limit) {
    filtered = filtered.slice(0, filters.limit);
  }

  return filtered;
}

/**
 * Mark a security event as resolved
 */
export function resolveSecurityEvent(
  eventId: string,
  resolvedBy?: string
): boolean {
  const event = securityEvents.find(e => e.id === eventId);
  if (!event) return false;

  event.resolved = true;
  event.resolvedAt = new Date();

  return true;
}

/**
 * Add a security rule
 */
export function addSecurityRule(
  rule: Omit<SecurityRule, 'id' | 'createdAt' | 'updatedAt'>
): SecurityRule {
  const newRule: SecurityRule = {
    ...rule,
    id: generateId(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  securityRules.push(newRule);
  return newRule;
}

/**
 * Update a security rule
 */
export function updateSecurityRule(
  ruleId: string,
  updates: Partial<Omit<SecurityRule, 'id' | 'createdAt'>>
): SecurityRule | null {
  const rule = securityRules.find(r => r.id === ruleId);
  if (!rule) return null;

  Object.assign(rule, updates, { updatedAt: new Date() });
  return rule;
}

/**
 * Delete a security rule
 */
export function deleteSecurityRule(ruleId: string): boolean {
  const index = securityRules.findIndex(r => r.id === ruleId);
  if (index === -1) return false;

  securityRules.splice(index, 1);
  return true;
}

/**
 * Get all security rules
 */
export function getSecurityRules(enabledOnly?: boolean): SecurityRule[] {
  if (enabledOnly) {
    return securityRules.filter(r => r.enabled);
  }
  return [...securityRules];
}

/**
 * Analyze traffic for suspicious patterns
 */
export function analyzeTraffic(ip: string, path: string, method: string): {
  isSuspicious: boolean;
  riskScore: number;
  reasons: string[];
} {
  const reasons: string[] = [];
  let riskScore = 0;

  // Check if IP is already blocked
  const blockStatus = isIPBlocked(ip);
  if (blockStatus.blocked) {
    reasons.push('IP is already blocked');
    riskScore += 100;
  }

  // Check for known attack patterns in path
  const suspiciousPatterns = [
    /\.{2,}/, // Path traversal attempts
    /\/(etc|proc|sys|dev)\//, // System file access
    /\.(exe|dll|bat|sh|cmd)$/i, // Executable files
    /<script/i, // XSS attempts
    /union\s+select/i, // SQL injection
  ];

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(path)) {
      reasons.push(`Suspicious pattern in path: ${pattern.source}`);
      riskScore += 30;
    }
  }

  // Check for unusual methods on sensitive paths
  const sensitivePaths = ['/api/admin', '/api/users', '/api/config'];
  if (sensitivePaths.some(sp => path.startsWith(sp)) && method !== 'GET') {
    reasons.push(`Write operation on sensitive path: ${path}`);
    riskScore += 20;
  }

  return {
    isSuspicious: riskScore > 50 || reasons.length > 0,
    riskScore: Math.min(100, riskScore),
    reasons,
  };
}

/**
 * Bulk block IPs
 */
export function bulkBlockIPs(
  ips: string[],
  reason: string,
  durationMinutes: number,
  blockedBy?: string
): { success: string[]; failed: { ip: string; error: string }[] } {
  const success: string[] = [];
  const failed: { ip: string; error: string }[] = [];

  for (const ip of ips) {
    const result = blockIP(ip, reason, durationMinutes, blockedBy);
    if (result.success) {
      success.push(ip);
    } else {
      failed.push({ ip, error: result.message });
    }
  }

  return { success, failed };
}

/**
 * Bulk unblock IPs
 */
export function bulkUnblockIPs(
  ips: string[],
  unblockedBy?: string
): { success: string[]; failed: { ip: string; error: string }[] } {
  const success: string[] = [];
  const failed: { ip: string; error: string }[] = [];

  for (const ip of ips) {
    const result = unblockIP(ip, unblockedBy);
    if (result.success) {
      success.push(ip);
    } else {
      failed.push({ ip, error: result.message });
    }
  }

  return { success, failed };
}
