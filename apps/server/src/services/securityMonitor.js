/**
 * Security Monitor Service
 *
 * Provides comprehensive security monitoring, alerting, and reporting:
 * - Real-time attack detection
 * - Security event aggregation
 * - Alert notifications
 * - Security reports and analytics
 */
import { getSecurityEvents, getSecurityStats, } from './firewall';
// Default configuration
const defaultConfig = {
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
let config = { ...defaultConfig };
// Alert history for throttling
const alertHistory = new Map();
const eventAggregations = new Map();
// Generate alert ID for throttling
function getAlertId(type, ip) {
    return ip ? `${type}:${ip}` : type;
}
// Check if alert should be throttled
function shouldThrottle(alertId) {
    const lastAlert = alertHistory.get(alertId);
    if (!lastAlert)
        return false;
    const throttleMs = config.thresholds.requestsPerMinute * 60 * 1000;
    return Date.now() - lastAlert < throttleMs;
}
// Send alert through configured channels
async function sendAlert(severity, title, message, details) {
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
export function initializeSecurityMonitoring() {
    console.log('[Security Monitor] Initialized with config:', {
        realTimeMonitoring: config.realTimeMonitoring,
        thresholds: config.thresholds,
        autoResponse: config.autoResponse.enabled,
    });
    // Start periodic tasks
    // Skip in test environment to avoid open handles
    const isTest = process.env.NODE_ENV === 'test';
    if (isTest)
        return;
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
export function trackSecurityEvent(event) {
    if (!config.realTimeMonitoring)
        return;
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
    if (event.ip)
        aggregation.ips.add(event.ip);
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
function checkThresholds(type, aggregation, event) {
    const alertId = getAlertId(type, event.ip);
    if (shouldThrottle(alertId))
        return;
    let shouldAlert = false;
    let severity = 'warning';
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
async function generateHourlySummary() {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const events = getSecurityEvents({ since: oneHourAgo });
    const summary = {
        period: 'last hour',
        totalEvents: events.length,
        byType: {},
        bySeverity: {},
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
async function generateDailyReport() {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const events = getSecurityEvents({ since: oneDayAgo });
    const eventsByType = {};
    const attackerCounts = new Map();
    const hourlyCounts = new Map();
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
    const recommendations = [];
    const stats = getSecurityStats();
    if (stats.blockedIPs > config.thresholds.blockedIPsThreshold) {
        recommendations.push('Consider reviewing and potentially unblocking some IPs to reduce false positives');
    }
    if (eventsByType['DDOS_DETECTED'] > 0) {
        recommendations.push('Review DDoS protection rules and consider rate limiting adjustments');
    }
    if (eventsByType['AUTH_FAILURE'] > 100) {
        recommendations.push('High volume of authentication failures detected - consider implementing CAPTCHA');
    }
    const report = {
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
export function getRealTimeStats() {
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
export function updateConfig(newConfig) {
    config = { ...config, ...newConfig };
}
/**
 * Get current configuration
 */
export function getConfig() {
    return { ...config };
}
/**
 * Reset aggregations (useful for testing or periodic cleanup)
 */
export function resetAggregations() {
    eventAggregations.clear();
    alertHistory.clear();
}
/**
 * Export security data for external analysis
 */
export function exportSecurityData(format, since) {
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
//# sourceMappingURL=securityMonitor.js.map