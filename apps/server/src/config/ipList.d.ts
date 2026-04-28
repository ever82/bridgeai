/**
 * IP List Configuration
 *
 * Configuration for IP whitelisting and blacklisting.
 * Supports single IPs, CIDR ranges, and geographic restrictions.
 */
export type IPListMode = 'whitelist' | 'blacklist' | 'disabled';
export interface IPEntry {
    ip: string;
    description?: string;
    addedAt: Date;
    expiresAt?: Date;
    addedBy?: string;
}
export interface CIDRRange {
    range: string;
    description?: string;
    addedAt: Date;
    addedBy?: string;
}
export interface GeoRestriction {
    type: 'country' | 'region';
    code: string;
    name: string;
    allowed: boolean;
}
export interface IPReputation {
    ip: string;
    score: number;
    categories: string[];
    lastReported: Date;
    source: string;
}
export interface IPListConfig {
    mode: IPListMode;
    whitelist: IPEntry[];
    blacklist: IPEntry[];
    whitelistRanges: CIDRRange[];
    blacklistRanges: CIDRRange[];
    geoRestrictions: GeoRestriction[];
    reputationCheck: boolean;
    reputationThreshold: number;
    blockedAction: 'block' | 'challenge' | 'log';
    defaultDenyInWhitelistMode: boolean;
    autoSyncThreatIntel: boolean;
    threatIntelSyncInterval: number;
}
export declare const defaultIPListConfig: IPListConfig;
export declare function parseEnvironmentWhitelist(): IPEntry[];
export declare function parseEnvironmentBlacklist(): IPEntry[];
export declare function parseEnvironmentCIDRWhitelist(): CIDRRange[];
export declare function parseEnvironmentCIDRBlacklist(): CIDRRange[];
export declare const knownMaliciousPatterns: string[];
export declare function isIPInCIDR(ip: string, cidr: string): boolean;
export declare function isValidIP(ip: string): boolean;
export declare function isValidCIDR(cidr: string): boolean;
//# sourceMappingURL=ipList.d.ts.map