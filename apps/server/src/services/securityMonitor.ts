/**
 * Security Monitor Service
 *
 * Provides comprehensive security monitoring, alerting, and reporting:
 * - Real-time attack detection
 * - Security event aggregation
 * - Alert notifications
 * - Security reports and analytics
 */
import {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  logSecurityEvent,
  getSecurityEvents,
  getSecurityStats,
  SecurityEventType,
  SecurityEvent,
} from './firewall';

// Alert severity levels
export type AlertSeverity = 'info' | 'warning' | 'critical';

// Alert configuration
export interface AlertConfig {
  enabled: boolean;
  channels: AlertChannel[];
  throttleMinutes: number;
  minSeverity: AlertSeverity;
}

// Alert channel types
export type AlertChannelType = 'webhook' | 'email' | 'slack' | 'console';

export interface AlertChannel {
  type: AlertChannelType;
  config: Record<string, string>;
  enabled: boolean;
}

// Security report
export interface SecurityReport {
  period: {
    start: Date;
    end: Date;
  };
  summary: {
    totalEvents: number;
    blockedIPs: number;
    attacksBlocked: number;
    uniqueAttackers: number;
  };
  eventsByType: Record<string, number>;
  topAttackers: Array<{ ip: string; count: number }>;
  attackTrend: Array<{ hour: string; count: number }>;
  recommendations: string[];
}

// Monitoring configuration
interface MonitorConfig {
  // Real-time monitoring enabled
  realTimeMonitoring: boolean;

  // Alert thresholds
  thresholds: {
    requestsPerMinute: number;
    failedLoginsPerMinute: number;
    suspiciousRequestsPerMinute: number;
    blockedIPsThreshold: number;
  };

  // Report generation
  reports: {
    enabled: boolean;
    hourlySummary: boolean;
    dailyReport: boolean;
    weeklyReport: boolean;
  };

  // Auto-response
  autoResponse: {
    enabled: boolean;
    blockThreshold: number;
    blockDurationMinutes: number;
  };
}

// Default configuration
const defaultConfig: MonitorConfig = {
  realTimeMonitoring: process.env.SECURITY_MONITOR_ENABLED !== 'false',
  thresholds: {
    requestsPerMinute: parseInt(process.env.MONITOR_REQ_THRESHOLD || '1000', 10),
    failedLoginsPerMinute: parseInt(process.env.MONITOR_LOGIN_THRESHOLD || '10', 10),
    suspiciousRequestsPerMinute: parseInt(process.env.MONITOR_SUSPICIOUS_THRESHOLD || '50', 10),
    blockedIPsThreshold: parseInt(process.env.MONITOR_BLOCKED_IPS_THRESHOLD || '100', 10),
  },
  reports: {
    enabled: true,
    hourlySummary: process.env.MONITOR_HOURLY_SUMMARY === 'true',
    dailyReport: process.env.MONITOR_DAILY_REPORT !== 'false',
    weeklyReport: process.env.MONITOR_WEEKLY_REPORT === 'true',
  },
  autoResponse: {
    enabled: process.env.SECURITY_AUTO_RESPONSE === 'true',
    blockThreshold: parseInt(process.env.AUTO_BLOCK_THRESHOLD || '10', 10),
    blockDurationMinutes: parseInt(process.env.AUTO_BLOCK_DURATION || '60', 10),
  },
};

// Current configuration
let config: MonitorConfig = { ...defaultConfig };

// Alert history for throttling
const alertHistory = new Map<string, number>();

// Event aggregations for real-time monitoring
interface EventAggregation {
  count: number;
  firstSeen: Date;
  lastSeen: Date;
  ips: Set<string>;
  paths: Map<string, number>;
}

const eventAggregations = new Map<SecurityEventType, EventAggregation>();

// Generate alert ID for throttling
function getAlertId(type: SecurityEventType, ip?: string): string {
  return ip ? `${type}:${ip}` : type;
}

// Check if alert should be throttled
function shouldThrottle(alertId: string): boolean {
  const lastAlert = alertHistory.get(alertId);
  if (!lastAlert) return false;

  const throttleMs = config.thresholds.requestsPerMinute * 60 * 1000;
  return Date.now() - lastAlert < throttleMs;
}

// Send alert through configured channels
async function sendAlert(
  severity: AlertSeverity,
  title: string,
  message: string,
  details: Record<string, unknown>
): Promise<void> {
  if (severity === 'info') {
    console.log(`[Security Alert] ${title}: ${message}`, details);
    return;
  }

  console.warn(`[Security Alert] ${title}: ${message}`, details);

  // TODO: Implement webhook/email/Slack notifications
  // This would integrate with external services
}

/**
 * Initialize security monitoring
 */
export function initializeSecurityMonitoring(): void {
  console.log('[Security Monitor] Initialized with config:', {
    realTimeMonitoring: config.realTimeMonitoring,
    thresholds: config.thresholds,
    autoResponse: config.autoResponse.enabled,
  });

  // Start periodic tasks
  if (config.reports.hourlySummary) {
    setInterval(generateHourlySummary, 60 * 60 * 1000);
  }

  if (config.reports.dailyReport) {
    // Schedule daily report at midnight
    const now = new Date();
    const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const msUntilMidnight = midnight.getTime() - now.getTime();

    setTimeout(() => {
      generateDailyReport();
      setInterval(generateDailyReport, 24 * 60 * 60 * 1000);
    }, msUntilMidnight);
  }
}

/**
 * Track and analyze a security event
 */
export function trackSecurityEvent(event: SecurityEvent): void {
  if (!config.realTimeMonitoring) return;

  // Aggregate event
  let aggregation = eventAggregations.get(event.type);
  if (!aggregation) {
    aggregation = {
      count: 0,
      firstSeen: event.timestamp,
      lastSeen: event.timestamp,
      ips: new Set(),
      paths: new Map(),
    };
    eventAggregations.set(event.type, aggregation);
  }

  aggregation.count++;
  aggregation.lastSeen = event.timestamp;
  if (event.ip) aggregation.ips.add(event.ip);
  if (event.path) {
    const pathCount = aggregation.paths.get(event.path) || 0;
    aggregation.paths.set(event.path, pathCount + 1);
  }

  // Check thresholds and trigger alerts
  checkThresholds(event.type, aggregation, event);
}

/**
 * Check if event thresholds are exceeded
 */
function checkThresholds(
  type: SecurityEventType,
  aggregation: EventAggregation,
  event: SecurityEvent
): void {
  const alertId = getAlertId(type, event.ip);

  if (shouldThrottle(alertId)) return;

  let shouldAlert = false;
  let severity: AlertSeverity = 'warning';
  let title = '';

  switch (type) {
    case 'RATE_LIMIT_EXCEEDED':
      if (aggregation.count > config.thresholds.requestsPerMinute) {
        shouldAlert = true;
        title = 'High Rate Limit Violations';
        severity = 'warning';
      }
      break;

    case 'DDOS_DETECTED':
      shouldAlert = true;
      title = 'DDoS Attack Detected';
      severity = 'critical';
      break;

    case 'XSS_ATTEMPT':
    case 'SQL_INJECTION_ATTEMPT':
    case 'NOSQL_INJECTION_ATTEMPT':
      if (aggregation.count > 5) {
        shouldAlert = true;
        title = `Multiple ${type} Attempts`;
        severity = 'critical';
      }
      break;

    case 'AUTH_FAILURE':
      if (aggregation.count > config.thresholds.failedLoginsPerMinute) {
        shouldAlert = true;
        title = 'Brute Force Attack Detected';
        severity = 'critical';
      }
      break;

    case 'SUSPICIOUS_ACTIVITY':
      if (aggregation.count > config.thresholds.suspiciousRequestsPerMinute) {
        shouldAlert = true;
        title = 'High Volume of Suspicious Requests';
        severity = 'warning';
      }
      break;
  }

  if (shouldAlert) {
    alertHistory.set(alertId, Date.now());

    sendAlert(severity, title, `Detected ${aggregation.count} events of type ${type}`, {
      eventType: type,
      count: aggregation.count,
      uniqueIPs: aggregation.ips.size,
      topPaths: Array.from(aggregation.paths.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5),
      timestamp: event.timestamp,
    });
  }
}

/**
 * Generate hourly summary report
 */
async function generateHourlySummary(): Promise<void> {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const events = getSecurityEvents({ since: oneHourAgo });

  const summary = {
    period: 'last hour',
    totalEvents: events.length,
    byType: {} as Record<string, number>,
    bySeverity: {} as Record<string, number>,
  };

  for (const event of events) {
    summary.byType[event.type] = (summary.byType[event.type] || 0) + 1;
    summary.bySeverity[event.severity] = (summary.bySeverity[event.severity] || 0) + 1;
  }

  console.log('[Security Monitor] Hourly Summary:', summary);
}

/**
 * Generate daily report
 */
async function generateDailyReport(): Promise<SecurityReport> {
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const events = getSecurityEvents({ since: oneDayAgo });

  const eventsByType: Record<string, number> = {};
  const attackerCounts = new Map<string, number>();
  const hourlyCounts = new Map<string, number>();

  for (const event of events) {
    // Count by type
    eventsByType[event.type] = (eventsByType[event.type] || 0) + 1;

    // Count by attacker
    if (event.ip) {
      attackerCounts.set(event.ip, (attackerCounts.get(event.ip) || 0) + 1);
    }

    // Count by hour
    const hour = event.timestamp.toISOString().slice(0, 13) + ':00:00';
    hourlyCounts.set(hour, (hourlyCounts.get(hour) || 0) + 1);
  }

  // Generate recommendations
  const recommendations: string[] = [];
  const stats = getSecurityStats();

  if (stats.blockedIPs > config.thresholds.blockedIPsThreshold) {
    recommendations.push(
      'Consider reviewing and potentially unblocking some IPs to reduce false positives'
    );
  }

  if (eventsByType['DDOS_DETECTED'] > 0) {
    recommendations.push('Review DDoS protection rules and consider rate limiting adjustments');
  }

  if (eventsByType['AUTH_FAILURE'] > 100) {
    recommendations.push(
      'High volume of authentication failures detected - consider implementing CAPTCHA'
    );
  }

  const report: SecurityReport = {
    period: { start: oneDayAgo, end: now },
    summary: {
      totalEvents: events.length,
      blockedIPs: stats.blockedIPs,
      attacksBlocked: eventsByType['IP_BLOCKED'] || 0,
      uniqueAttackers: attackerCounts.size,
    },
    eventsByType,
    topAttackers: Array.from(attackerCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([ip, count]) => ({ ip, count })),
    attackTrend: Array.from(hourlyCounts.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([hour, count]) => ({ hour, count })),
    recommendations,
  };

  console.log('[Security Monitor] Daily Report Generated');
  return report;
}

/**
 * Get real-time monitoring stats
 */
export function getRealTimeStats(): {
  activeAlerts: number;
  recentEvents: number;
  eventAggregations: Array<{
    type: SecurityEventType;
    count: number;
    uniqueIPs: number;
  }>;
  lastUpdated: Date;
} {
  const aggregations = Array.from(eventAggregations.entries()).map(([type, agg]) => ({
    type,
    count: agg.count,
    uniqueIPs: agg.ips.size,
  }));

  return {
    activeAlerts: alertHistory.size,
    recentEvents: Array.from(eventAggregations.values()).reduce((sum, agg) => sum + agg.count, 0),
    eventAggregations: aggregations,
    lastUpdated: new Date(),
  };
}

/**
 * Update monitor configuration
 */
export function updateConfig(newConfig: Partial<MonitorConfig>): void {
  config = { ...config, ...newConfig };
}

/**
 * Get current configuration
 */
export function getConfig(): MonitorConfig {
  return { ...config };
}

/**
 * Reset aggregations (useful for testing or periodic cleanup)
 */
export function resetAggregations(): void {
  eventAggregations.clear();
  alertHistory.clear();
}

/**
 * Export security data for external analysis
 */
export function exportSecurityData(format: 'json' | 'csv', since?: Date): string {
  const events = getSecurityEvents({ since });

  if (format === 'json') {
    return JSON.stringify(events, null, 2);
  }

  // CSV format
  const headers = ['timestamp', 'type', 'severity', 'ip', 'userId', 'path', 'method', 'details'];
  const rows = events.map(e => [
    e.timestamp.toISOString(),
    e.type,
    e.severity,
    e.ip || '',
    e.userId || '',
    e.path || '',
    e.method || '',
    JSON.stringify(e.details),
  ]);

  return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
}
