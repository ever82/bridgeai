import { checkEncryptionHealth, clearEncryptionCache, getCacheSize } from '../utils/encryption';
import { checkKeyHealth, getKeyAuditLog } from '../services/keyManagement';
import { secureLogger } from '../middleware/logging';
class MonitoringService {
    metrics = {
        encryptionOperations: 0,
        decryptionOperations: 0,
        cacheHits: 0,
        cacheMisses: 0,
        keyRotations: 0,
        failedOperations: 0,
        averageLatencyMs: 0,
    };
    latencies = [];
    alerts = [];
    maxLatencies = 100;
    // Record encryption operation
    recordEncryption(durationMs, success = true) {
        this.metrics.encryptionOperations++;
        this.recordLatency(durationMs);
        if (!success) {
            this.metrics.failedOperations++;
            this.triggerAlert('encryption_failure', 'Encryption operation failed');
        }
    }
    // Record decryption operation
    recordDecryption(durationMs, success = true) {
        this.metrics.decryptionOperations++;
        this.recordLatency(durationMs);
        if (!success) {
            this.metrics.failedOperations++;
            this.triggerAlert('decryption_failure', 'Decryption operation failed');
        }
    }
    // Record cache hit
    recordCacheHit() {
        this.metrics.cacheHits++;
    }
    // Record cache miss
    recordCacheMiss() {
        this.metrics.cacheMisses++;
    }
    // Record key rotation
    recordKeyRotation() {
        this.metrics.keyRotations++;
        secureLogger.audit('key_rotation', { timestamp: new Date().toISOString() });
    }
    recordLatency(durationMs) {
        this.latencies.push(durationMs);
        if (this.latencies.length > this.maxLatencies) {
            this.latencies.shift();
        }
        // Calculate average
        const sum = this.latencies.reduce((a, b) => a + b, 0);
        this.metrics.averageLatencyMs = Math.round(sum / this.latencies.length);
        // Alert if latency is too high
        if (durationMs > 1000) {
            this.triggerAlert('high_latency', `Encryption operation took ${durationMs}ms`);
        }
    }
    triggerAlert(type, message) {
        const alert = { type, message, timestamp: new Date() };
        this.alerts.push(alert);
        // Keep only last 100 alerts
        if (this.alerts.length > 100) {
            this.alerts.shift();
        }
        // Log the alert
        secureLogger.warn(`[ALERT] ${type}: ${message}`);
        // In production, this would send to monitoring system
        console.error(`[SECURITY_ALERT] ${type}: ${message}`);
    }
    async getEncryptionHealth() {
        const result = await checkEncryptionHealth();
        return {
            service: 'encryption',
            healthy: result.healthy,
            message: result.message,
            latencyMs: result.latencyMs,
            timestamp: new Date(),
        };
    }
    async getKeyHealth() {
        const result = await checkKeyHealth();
        return {
            service: 'key_management',
            healthy: result.healthy,
            message: result.message,
            latencyMs: 0,
            timestamp: new Date(),
        };
    }
    async getFullHealthCheck() {
        const [encryptionHealth, keyHealth] = await Promise.all([
            this.getEncryptionHealth(),
            this.getKeyHealth(),
        ]);
        return [encryptionHealth, keyHealth];
    }
    getMetrics() {
        return { ...this.metrics };
    }
    getCacheMetrics() {
        const total = this.metrics.cacheHits + this.metrics.cacheMisses;
        const hitRate = total > 0 ? Math.round((this.metrics.cacheHits / total) * 100) : 0;
        return {
            size: getCacheSize(),
            hitRate,
            hits: this.metrics.cacheHits,
            misses: this.metrics.cacheMisses,
        };
    }
    getAlerts() {
        return [...this.alerts];
    }
    getKeyAudit() {
        return getKeyAuditLog();
    }
    resetMetrics() {
        this.metrics = {
            encryptionOperations: 0,
            decryptionOperations: 0,
            cacheHits: 0,
            cacheMisses: 0,
            keyRotations: 0,
            failedOperations: 0,
            averageLatencyMs: 0,
        };
        this.latencies = [];
    }
    clearCache() {
        clearEncryptionCache();
        secureLogger.info('Encryption cache cleared');
    }
}
export const monitoringService = new MonitoringService();
// Health check endpoint handler
export async function healthCheckHandler() {
    const checks = await monitoringService.getFullHealthCheck();
    const allHealthy = checks.every(c => c.healthy);
    const anyUnhealthy = checks.some(c => !c.healthy);
    let status = 'healthy';
    if (anyUnhealthy)
        status = 'unhealthy';
    else if (!allHealthy)
        status = 'degraded';
    return {
        status,
        checks,
        timestamp: new Date().toISOString(),
    };
}
//# sourceMappingURL=monitoring.js.map