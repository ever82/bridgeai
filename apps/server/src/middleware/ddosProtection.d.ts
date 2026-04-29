/**
 * DDoS Protection Middleware
 *
 * Provides protection against various DDoS attack vectors:
 * - Traffic anomaly detection
 * - Automatic IP blocking
 * - Slowloris/slow attack protection
 * - Request flooding detection
 */
import { Request, Response, NextFunction } from 'express';
interface BlockedIP {
    ip: string;
    blockedAt: number;
    expiresAt: number;
    reason: string;
    attackType: string;
}
export declare function startDDoSCleanup(): void;
/**
 * DDoS Protection Middleware
 * Main middleware for DDoS detection and protection
 */
export declare function ddosProtection(req: Request, res: Response, next: NextFunction): void;
/**
 * Slow attack protection middleware
 * Adds timeout for slow requests
 */
export declare function slowAttackProtection(timeoutMs?: number): (req: Request, res: Response, next: NextFunction) => void;
/**
 * Traffic monitoring middleware
 * Collects traffic statistics without blocking
 */
export declare function trafficMonitor(req: Request, res: Response, next: NextFunction): void;
/**
 * Reset all DDoS protection state (for testing)
 */
export declare function resetState(): void;
/**
 * Get DDoS statistics
 */
export declare function getDDoSStats(): {
    activeBlocks: number;
    totalRequests: number;
    flaggedIPs: number;
    blockedIPs: string[];
};
/**
 * Manually block an IP
 */
export declare function manuallyBlockIP(ip: string, durationMinutes: number, reason: string): boolean;
/**
 * Unblock an IP
 */
export declare function unblockIP(ip: string): boolean;
/**
 * Get list of blocked IPs
 */
export declare function getBlockedIPs(): BlockedIP[];
/**
 * Check if request is potentially malicious
 */
export declare function isMaliciousRequest(req: Request): {
    isMalicious: boolean;
    reasons: string[];
};
export {};
//# sourceMappingURL=ddosProtection.d.ts.map