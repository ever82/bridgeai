import { checkEncryptionHealth, clearEncryptionCache, getCacheSize } from '../utils/encryption';
import { checkKeyHealth, getKeyAuditLog } from '../services/keyManagement';
import { secureLogger } from '../middleware/logging';

export interface HealthStatus {
  service: string;
  healthy: boolean;
  message: string;
  latencyMs: number;
  timestamp: Date;
}

export interface MonitoringMetrics {
  encryptionOperations: number;
  decryptionOperations: number;
  cacheHits: number;
  cacheMisses: number;
  keyRotations: number;
  failedOperations: number;
  averageLatencyMs: number;
}

class MonitoringService {
  private metrics: MonitoringMetrics = {
    encryptionOperations: 0,
    decryptionOperations: 0,
    cacheHits: 0,
    cacheMisses: 0,
    keyRotations: 0,
    failedOperations: 0,
    averageLatencyMs: 0,
  };

  private latencies: number[] = [];
  private alerts: Array<{ type: string; message: string; timestamp: Date }> = [];
  private maxLatencies = 100;

  // Record encryption operation
  recordEncryption(durationMs: number, success: boolean = true): void {
    this.metrics.encryptionOperations++;
    this.recordLatency(durationMs);

    if (!success) {
      this.metrics.failedOperations++;
      this.triggerAlert('encryption_failure', 'Encryption operation failed');
    }
  }

  // Record decryption operation
  recordDecryption(durationMs: number, success: boolean = true): void {
    this.metrics.decryptionOperations++;
    this.recordLatency(durationMs);

    if (!success) {
      this.metrics.failedOperations++;
      this.triggerAlert('decryption_failure', 'Decryption operation failed');
    }
  }

  // Record cache hit
  recordCacheHit(): void {
    this.metrics.cacheHits++;
  }

  // Record cache miss
  recordCacheMiss(): void {
    this.metrics.cacheMisses++;
  }

  // Record key rotation
  recordKeyRotation(): void {
    this.metrics.keyRotations++;
    secureLogger.audit('key_rotation', { timestamp: new Date().toISOString() });
  }

  private recordLatency(durationMs: number): void {
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

  private triggerAlert(type: string, message: string): void {
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

  async getEncryptionHealth(): Promise<HealthStatus> {
    const result = await checkEncryptionHealth();
    return {
      service: 'encryption',
      healthy: result.healthy,
      message: result.message,
      latencyMs: result.latencyMs,
      timestamp: new Date(),
    };
  }

  async getKeyHealth(): Promise<HealthStatus> {
    const result = await checkKeyHealth();
    return {
      service: 'key_management',
      healthy: result.healthy,
      message: result.message,
      latencyMs: 0,
      timestamp: new Date(),
    };
  }

  async getFullHealthCheck(): Promise<HealthStatus[]> {
    const [encryptionHealth, keyHealth] = await Promise.all([
      this.getEncryptionHealth(),
      this.getKeyHealth(),
    ]);

    return [encryptionHealth, keyHealth];
  }

  getMetrics(): MonitoringMetrics {
    return { ...this.metrics };
  }

  getCacheMetrics(): {
    size: number;
    hitRate: number;
    hits: number;
    misses: number;
  } {
    const total = this.metrics.cacheHits + this.metrics.cacheMisses;
    const hitRate = total > 0 ? Math.round((this.metrics.cacheHits / total) * 100) : 0;

    return {
      size: getCacheSize(),
      hitRate,
      hits: this.metrics.cacheHits,
      misses: this.metrics.cacheMisses,
    };
  }

  getAlerts(): Array<{ type: string; message: string; timestamp: Date }> {
    return [...this.alerts];
  }

  getKeyAudit(): Array<{ action: string; timestamp: Date; details: string }> {
    return getKeyAuditLog();
  }

  resetMetrics(): void {
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

  clearCache(): void {
    clearEncryptionCache();
    secureLogger.info('Encryption cache cleared');
  }
}

export const monitoringService = new MonitoringService();

// Health check endpoint handler
export async function healthCheckHandler(): Promise<{
  status: 'healthy' | 'degraded' | 'unhealthy';
  checks: HealthStatus[];
  timestamp: string;
}> {
  const checks = await monitoringService.getFullHealthCheck();
  const allHealthy = checks.every(c => c.healthy);
  const anyUnhealthy = checks.some(c => !c.healthy);

  let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
  if (anyUnhealthy) status = 'unhealthy';
  else if (!allHealthy) status = 'degraded';

  return {
    status,
    checks,
    timestamp: new Date().toISOString(),
  };
}
