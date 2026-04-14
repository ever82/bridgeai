/**
 * IP List Configuration
 *
 * Configuration for IP whitelisting and blacklisting.
 * Supports single IPs, CIDR ranges, and geographic restrictions.
 */

// IP List modes
export type IPListMode = 'whitelist' | 'blacklist' | 'disabled';

// IP entry type
export interface IPEntry {
  ip: string;
  description?: string;
  addedAt: Date;
  expiresAt?: Date;
  addedBy?: string;
}

// CIDR range entry
export interface CIDRRange {
  range: string;
  description?: string;
  addedAt: Date;
  addedBy?: string;
}

// Geographic restriction
export interface GeoRestriction {
  type: 'country' | 'region';
  code: string; // ISO country code or region code
  name: string;
  allowed: boolean; // true = whitelist, false = blacklist
}

// IP reputation score
export interface IPReputation {
  ip: string;
  score: number; // 0-100, higher = more suspicious
  categories: string[];
  lastReported: Date;
  source: string;
}

// Configuration interface
export interface IPListConfig {
  // Mode: whitelist (only allow listed), blacklist (block listed), or disabled
  mode: IPListMode;
  // Whitelist entries
  whitelist: IPEntry[];
  // Blacklist entries
  blacklist: IPEntry[];
  // CIDR ranges for whitelist
  whitelistRanges: CIDRRange[];
  // CIDR ranges for blacklist
  blacklistRanges: CIDRRange[];
  // Geographic restrictions
  geoRestrictions: GeoRestriction[];
  // IP reputation check enabled
  reputationCheck: boolean;
  // Minimum reputation score to block (0-100)
  reputationThreshold: number;
  // Action when IP is blocked: 'block' | 'challenge' | 'log'
  blockedAction: 'block' | 'challenge' | 'log';
  // Default allow/deny for unknown IPs in whitelist mode
  defaultDenyInWhitelistMode: boolean;
  // Automatically sync with threat intelligence feeds
  autoSyncThreatIntel: boolean;
  // Threat intel sync interval in minutes
  threatIntelSyncInterval: number;
}

// Default configuration
export const defaultIPListConfig: IPListConfig = {
  mode: (process.env.IP_FILTER_MODE as IPListMode) || 'disabled',
  whitelist: [],
  blacklist: [],
  whitelistRanges: [],
  blacklistRanges: [],
  geoRestrictions: [],
  reputationCheck: process.env.IP_REPUTATION_CHECK === 'true',
  reputationThreshold: parseInt(process.env.IP_REPUTATION_THRESHOLD || '80', 10),
  blockedAction: (process.env.IP_BLOCKED_ACTION as 'block' | 'challenge' | 'log') || 'block',
  defaultDenyInWhitelistMode: true,
  autoSyncThreatIntel: process.env.IP_THREAT_INTEL_AUTO_SYNC === 'true',
  threatIntelSyncInterval: 60,
};

// Parse environment-based whitelist
export function parseEnvironmentWhitelist(): IPEntry[] {
  const whitelistStr = process.env.IP_WHITELIST;
  if (!whitelistStr) return [];

  return whitelistStr.split(',').map((ip, index) => ({
    ip: ip.trim(),
    description: 'Environment whitelist',
    addedAt: new Date(),
    addedBy: 'system',
  }));
}

// Parse environment-based blacklist
export function parseEnvironmentBlacklist(): IPEntry[] {
  const blacklistStr = process.env.IP_BLACKLIST;
  if (!blacklistStr) return [];

  return blacklistStr.split(',').map((ip, index) => ({
    ip: ip.trim(),
    description: 'Environment blacklist',
    addedAt: new Date(),
    addedBy: 'system',
  }));
}

// Parse environment-based CIDR ranges
export function parseEnvironmentCIDRWhitelist(): CIDRRange[] {
  const rangesStr = process.env.IP_WHITELIST_RANGES;
  if (!rangesStr) return [];

  return rangesStr.split(',').map(range => ({
    range: range.trim(),
    description: 'Environment CIDR whitelist',
    addedAt: new Date(),
    addedBy: 'system',
  }));
}

export function parseEnvironmentCIDRBlacklist(): CIDRRange[] {
  const rangesStr = process.env.IP_BLACKLIST_RANGES;
  if (!rangesStr) return [];

  return rangesStr.split(',').map(range => ({
    range: range.trim(),
    description: 'Environment CIDR blacklist',
    addedAt: new Date(),
    addedBy: 'system',
  }));
}

// Known malicious IP patterns (Tor exit nodes, known bad actors, etc.)
export const knownMaliciousPatterns: string[] = [
  // These would be populated from threat intelligence feeds
  // Example patterns (should be replaced with actual threat intel)
  '192.0.2.', // TEST-NET-1 (example)
];

// Check if an IP is in a CIDR range
export function isIPInCIDR(ip: string, cidr: string): boolean {
  const [range, bits = '32'] = cidr.split('/');
  const mask = parseInt(bits, 10);

  const ipParts = ip.split('.').map(Number);
  const rangeParts = range.split('.').map(Number);

  if (ipParts.length !== 4 || rangeParts.length !== 4) {
    // Handle IPv6
    return false;
  }

  const ipInt = (ipParts[0] << 24) | (ipParts[1] << 16) | (ipParts[2] << 8) | ipParts[3];
  const rangeInt = (rangeParts[0] << 24) | (rangeParts[1] << 16) | (rangeParts[2] << 8) | rangeParts[3];

  const maskInt = mask === 0 ? 0 : (~0 << (32 - mask));

  return (ipInt & maskInt) === (rangeInt & maskInt);
}

// Validate IP address format
export function isValidIP(ip: string): boolean {
  // IPv4 validation
  const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  if (ipv4Regex.test(ip)) return true;

  // IPv6 validation (simplified)
  const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
  if (ipv6Regex.test(ip)) return true;

  return false;
}

// Validate CIDR format
export function isValidCIDR(cidr: string): boolean {
  const [ip, bits] = cidr.split('/');
  if (!bits) return false;

  const mask = parseInt(bits, 10);
  if (isNaN(mask) || mask < 0 || mask > 32) return false;

  return isValidIP(ip);
}
