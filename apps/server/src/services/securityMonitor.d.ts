/**
 * Security Monitor Service
 *
 * Provides comprehensive security monitoring, alerting, and reporting:
 * - Real-time attack detection
 * - Security event aggregation
 * - Alert notifications
 * - Security reports and analytics
 */
import { SecurityEventType, SecurityEvent } from './firewall';
export type AlertSeverity = 'info' | 'warning' | 'critical';
export interface AlertConfig {
    enabled: boolean;
    channels: AlertChannel[];
    throttleMinutes: number;
    minSeverity: AlertSeverity;
}
export type AlertChannelType = 'webhook' | 'email' | 'slack' | 'console';
export interface AlertChannel {
    type: AlertChannelType;
    config: Record<string, string>;
    enabled: boolean;
}
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
    topAttackers: Array<{
        ip: string;
        count: number;
    }>;
    attackTrend: Array<{
        hour: string;
        count: number;
    }>;
    recommendations: string[];
}
interface MonitorConfig {
    realTimeMonitoring: boolean;
    thresholds: {
        requestsPerMinute: number;
        failedLoginsPerMinute: number;
        suspiciousRequestsPerMinute: number;
        blockedIPsThreshold: number;
    };
    reports: {
        enabled: boolean;
        hourlySummary: boolean;
        dailyReport: boolean;
        weeklyReport: boolean;
    };
    autoResponse: {
        enabled: boolean;
        blockThreshold: number;
        blockDurationMinutes: number;
    };
}
/**
 * Initialize security monitoring
 */
export declare function initializeSecurityMonitoring(): void;
/**
 * Track and analyze a security event
 */
export declare function trackSecurityEvent(event: SecurityEvent): void;
/**
 * Get real-time monitoring stats
 */
export declare function getRealTimeStats(): {
    activeAlerts: number;
    recentEvents: number;
    eventAggregations: Array<{
        type: SecurityEventType;
        count: number;
        uniqueIPs: number;
    }>;
    lastUpdated: Date;
};
/**
 * Update monitor configuration
 */
export declare function updateConfig(newConfig: Partial<MonitorConfig>): void;
/**
 * Get current configuration
 */
export declare function getConfig(): MonitorConfig;
/**
 * Reset aggregations (useful for testing or periodic cleanup)
 */
export declare function resetAggregations(): void;
/**
 * Export security data for external analysis
 */
export declare function exportSecurityData(format: 'json' | 'csv', since?: Date): string;
export {};
//# sourceMappingURL=securityMonitor.d.ts.map