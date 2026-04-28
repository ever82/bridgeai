/**
 * IP Filter Middleware
 *
 * Provides IP-based access control with whitelist/blacklist support,
 * CIDR range matching, and geographic restrictions.
 */
import { Request, Response, NextFunction } from 'express';
import { IPListConfig, IPEntry, CIDRRange, IPReputation } from '../config/ipList';
export declare function ipFilter(req: Request, res: Response, next: NextFunction): void;
/**
 * Update IP filter configuration
 */
export declare function updateConfig(newConfig: Partial<IPListConfig>): void;
/**
 * Add IP to whitelist
 */
export declare function addToWhitelist(entry: Omit<IPEntry, 'addedAt'>): boolean;
/**
 * Remove IP from whitelist
 */
export declare function removeFromWhitelist(ip: string): boolean;
/**
 * Add IP to blacklist
 */
export declare function addToBlacklist(entry: Omit<IPEntry, 'addedAt'>): boolean;
/**
 * Remove IP from blacklist
 */
export declare function removeFromBlacklist(ip: string): boolean;
/**
 * Add CIDR range to whitelist
 */
export declare function addWhitelistRange(range: Omit<CIDRRange, 'addedAt'>): boolean;
/**
 * Remove CIDR range from whitelist
 */
export declare function removeWhitelistRange(range: string): boolean;
/**
 * Add CIDR range to blacklist
 */
export declare function addBlacklistRange(range: Omit<CIDRRange, 'addedAt'>): boolean;
/**
 * Remove CIDR range from blacklist
 */
export declare function removeBlacklistRange(range: string): boolean;
/**
 * Update IP reputation
 */
export declare function updateIPReputation(reputation: IPReputation): void;
/**
 * Get IP filter statistics
 */
export declare function getStats(): {
    mode: string;
    whitelistCount: number;
    blacklistCount: number;
    whitelistRangeCount: number;
    blacklistRangeCount: number;
    reputationDBSize: number;
};
/**
 * Get current configuration (without sensitive data)
 */
export declare function getConfig(): IPListConfig;
/**
 * Get all blocked IPs (blacklist + expired entries filtered)
 */
export declare function getBlockedIPs(): string[];
/**
 * Get all whitelisted IPs
 */
export declare function getWhitelistedIPs(): string[];
export { isValidIP, isValidCIDR, isIPInCIDR } from '../config/ipList';
//# sourceMappingURL=ipFilter.d.ts.map