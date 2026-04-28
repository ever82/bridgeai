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
declare class MonitoringService {
    private metrics;
    private latencies;
    private alerts;
    private maxLatencies;
    recordEncryption(durationMs: number, success?: boolean): void;
    recordDecryption(durationMs: number, success?: boolean): void;
    recordCacheHit(): void;
    recordCacheMiss(): void;
    recordKeyRotation(): void;
    private recordLatency;
    private triggerAlert;
    getEncryptionHealth(): Promise<HealthStatus>;
    getKeyHealth(): Promise<HealthStatus>;
    getFullHealthCheck(): Promise<HealthStatus[]>;
    getMetrics(): MonitoringMetrics;
    getCacheMetrics(): {
        size: number;
        hitRate: number;
        hits: number;
        misses: number;
    };
    getAlerts(): Array<{
        type: string;
        message: string;
        timestamp: Date;
    }>;
    getKeyAudit(): Array<{
        action: string;
        timestamp: Date;
        details: string;
    }>;
    resetMetrics(): void;
    clearCache(): void;
}
export declare const monitoringService: MonitoringService;
export declare function healthCheckHandler(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    checks: HealthStatus[];
    timestamp: string;
}>;
export {};
//# sourceMappingURL=monitoring.d.ts.map