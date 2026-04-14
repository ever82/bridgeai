/**
 * IP Filter Middleware
 *
 * Provides IP-based access control with whitelist/blacklist support,
 * CIDR range matching, and geographic restrictions.
 */
import { Request, Response, NextFunction } from 'express';

import {
  IPListConfig,
  IPEntry,
  CIDRRange,
  IPReputation,
  defaultIPListConfig,
  parseEnvironmentWhitelist,
  parseEnvironmentBlacklist,
  parseEnvironmentCIDRWhitelist,
  parseEnvironmentCIDRBlacklist,
  isIPInCIDR,
  isValidIP,
  isValidCIDR,
} from '../config/ipList';

// In-memory storage for dynamic IP lists
let config: IPListConfig = { ...defaultIPListConfig };
const reputationDB = new Map<string, IPReputation>();

// Initialize config from environment
function initializeConfig(): void {
  config.whitelist = parseEnvironmentWhitelist();
  config.blacklist = parseEnvironmentBlacklist();
  config.whitelistRanges = parseEnvironmentCIDRWhitelist();
  config.blacklistRanges = parseEnvironmentCIDRBlacklist();
}

// Initialize on module load
initializeConfig();

// Get client IP from request
function getClientIP(req: Request): string {
  // Check X-Forwarded-For header (for requests behind proxy)
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }

  // Check X-Real-IP header
  const realIP = req.headers['x-real-ip'];
  if (typeof realIP === 'string') {
    return realIP;
  }

  // Fallback to connection remote address
  return req.ip || req.socket.remoteAddress || 'unknown';
}

// Extract country from request (would integrate with GeoIP service)
function getCountryFromRequest(req: Request): string | null {
  // This would typically use a GeoIP database or service
  // For now, check CF-IPCountry header (Cloudflare)
  const country = req.headers['cf-ipcountry'];
  return typeof country === 'string' ? country : null;
}

// Check if IP matches a CIDR range
function matchesCIDR(ip: string, ranges: CIDRRange[]): boolean {
  return ranges.some(range => isIPInCIDR(ip, range.range));
}

// Check if IP is whitelisted
function isWhitelisted(ip: string, _req: Request): boolean {
  // Check explicit whitelist
  if (config.whitelist.some(entry => entry.ip === ip)) {
    return true;
  }

  // Check CIDR ranges
  if (matchesCIDR(ip, config.whitelistRanges)) {
    return true;
  }

  return false;
}

// Check if IP is blacklisted
function isBlacklisted(ip: string, _req: Request): boolean {
  // Check explicit blacklist
  if (config.blacklist.some(entry => entry.ip === ip)) {
    return true;
  }

  // Check CIDR ranges
  if (matchesCIDR(ip, config.blacklistRanges)) {
    return true;
  }

  // Check known malicious patterns
  // This would integrate with threat intelligence
  return false;
}

// Check geographic restrictions
function checkGeoRestrictions(req: Request): {
  allowed: boolean;
  reason?: string;
} {
  const country = getCountryFromRequest(req);
  if (!country) {
    return { allowed: true };
  }

  const restriction = config.geoRestrictions.find(r => r.code === country);
  if (!restriction) {
    // No restriction for this country
    return { allowed: true };
  }

  return {
    allowed: restriction.allowed,
    reason: restriction.allowed ? undefined : `Access blocked for region: ${restriction.name}`,
  };
}

// Check IP reputation
function checkIPReputation(ip: string): {
  hasReputation: boolean;
  reputation?: IPReputation;
  shouldBlock: boolean;
} {
  const reputation = reputationDB.get(ip);
  if (!reputation) {
    return { hasReputation: false, shouldBlock: false };
  }

  return {
    hasReputation: true,
    reputation,
    shouldBlock: reputation.score >= config.reputationThreshold,
  };
}

// Main IP filter middleware
export function ipFilter(req: Request, res: Response, next: NextFunction): void {
  // Skip if disabled
  if (config.mode === 'disabled') {
    next();
    return;
  }

  const ip = getClientIP(req);

  // Validate IP
  if (!isValidIP(ip) && ip !== 'unknown') {
    console.warn(`[IP Filter] Invalid IP format: ${ip}`);
    res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_IP',
        message: 'Invalid IP address format.',
      },
    });
    return;
  }

  // Check whitelist first (always takes precedence)
  if (isWhitelisted(ip, req)) {
    res.setHeader('X-IP-Filter', 'whitelisted');
    next();
    return;
  }

  // In whitelist mode, non-whitelisted IPs are blocked
  if (config.mode === 'whitelist') {
    if (config.defaultDenyInWhitelistMode) {
      res.status(403).json({
        success: false,
        error: {
          code: 'IP_NOT_WHITELISTED',
          message: 'Access denied. IP address is not in the whitelist.',
        },
      });
      return;
    }
  }

  // Check blacklist
  if (isBlacklisted(ip, req)) {
    handleBlocked(req, res, next, 'IP_BLACKLISTED', 'IP address is blacklisted');
    return;
  }

  // Check geographic restrictions
  const geoCheck = checkGeoRestrictions(req);
  if (!geoCheck.allowed) {
    handleBlocked(
      req,
      res,
      next,
      'GEO_BLOCKED',
      geoCheck.reason || 'Access blocked for your region'
    );
    return;
  }

  // Check IP reputation if enabled
  if (config.reputationCheck) {
    const repCheck = checkIPReputation(ip);
    if (repCheck.shouldBlock) {
      handleBlocked(
        req,
        res,
        next,
        'IP_REPUTATION',
        `IP reputation score (${repCheck.reputation!.score}) exceeds threshold`
      );
      return;
    }
  }

  // IP is allowed
  res.setHeader('X-IP-Filter', 'passed');
  next();
}

// Handle blocked requests based on configured action
function handleBlocked(
  req: Request,
  res: Response,
  _next: NextFunction,
  code: string,
  message: string
): void {
  const ip = getClientIP(req);

  switch (config.blockedAction) {
    case 'block':
      console.warn(`[IP Filter] Blocked request from ${ip}: ${message}`);
      res.status(403).json({
        success: false,
        error: {
          code,
          message,
        },
      });
      break;

    case 'challenge':
      // Would integrate with CAPTCHA service
      res.status(403).json({
        success: false,
        error: {
          code: 'CHALLENGE_REQUIRED',
          message: 'Please complete the challenge to continue.',
        },
      });
      break;

    case 'log':
      // Log but allow
      console.warn(`[IP Filter] Suspicious request from ${ip}: ${message}`);
      res.setHeader('X-IP-Filter-Warning', code);
      _next();
      break;
  }
}

// Management functions

/**
 * Update IP filter configuration
 */
export function updateConfig(newConfig: Partial<IPListConfig>): void {
  config = {
    ...config,
    ...newConfig,
    // Deep-clone arrays to prevent shared reference mutations
    whitelist: [...(newConfig.whitelist ?? config.whitelist)],
    blacklist: [...(newConfig.blacklist ?? config.blacklist)],
    whitelistRanges: [...(newConfig.whitelistRanges ?? config.whitelistRanges)],
    blacklistRanges: [...(newConfig.blacklistRanges ?? config.blacklistRanges)],
    geoRestrictions: [...(newConfig.geoRestrictions ?? config.geoRestrictions)],
  };
}

/**
 * Add IP to whitelist
 */
export function addToWhitelist(entry: Omit<IPEntry, 'addedAt'>): boolean {
  if (!isValidIP(entry.ip)) {
    return false;
  }

  // Check if already exists
  if (config.whitelist.some(e => e.ip === entry.ip)) {
    return false;
  }

  config.whitelist.push({
    ...entry,
    addedAt: new Date(),
  });

  return true;
}

/**
 * Remove IP from whitelist
 */
export function removeFromWhitelist(ip: string): boolean {
  const index = config.whitelist.findIndex(e => e.ip === ip);
  if (index === -1) return false;

  config.whitelist.splice(index, 1);
  return true;
}

/**
 * Add IP to blacklist
 */
export function addToBlacklist(entry: Omit<IPEntry, 'addedAt'>): boolean {
  if (!isValidIP(entry.ip)) {
    return false;
  }

  // Check if already exists
  if (config.blacklist.some(e => e.ip === entry.ip)) {
    return false;
  }

  config.blacklist.push({
    ...entry,
    addedAt: new Date(),
  });

  return true;
}

/**
 * Remove IP from blacklist
 */
export function removeFromBlacklist(ip: string): boolean {
  const index = config.blacklist.findIndex(e => e.ip === ip);
  if (index === -1) return false;

  config.blacklist.splice(index, 1);
  return true;
}

/**
 * Add CIDR range to whitelist
 */
export function addWhitelistRange(range: Omit<CIDRRange, 'addedAt'>): boolean {
  if (!isValidCIDR(range.range)) {
    return false;
  }

  config.whitelistRanges.push({
    ...range,
    addedAt: new Date(),
  });

  return true;
}

/**
 * Remove CIDR range from whitelist
 */
export function removeWhitelistRange(range: string): boolean {
  const index = config.whitelistRanges.findIndex(r => r.range === range);
  if (index === -1) return false;

  config.whitelistRanges.splice(index, 1);
  return true;
}

/**
 * Add CIDR range to blacklist
 */
export function addBlacklistRange(range: Omit<CIDRRange, 'addedAt'>): boolean {
  if (!isValidCIDR(range.range)) {
    return false;
  }

  config.blacklistRanges.push({
    ...range,
    addedAt: new Date(),
  });

  return true;
}

/**
 * Remove CIDR range from blacklist
 */
export function removeBlacklistRange(range: string): boolean {
  const index = config.blacklistRanges.findIndex(r => r.range === range);
  if (index === -1) return false;

  config.blacklistRanges.splice(index, 1);
  return true;
}

/**
 * Update IP reputation
 */
export function updateIPReputation(reputation: IPReputation): void {
  reputationDB.set(reputation.ip, reputation);
}

/**
 * Get IP filter statistics
 */
export function getStats(): {
  mode: string;
  whitelistCount: number;
  blacklistCount: number;
  whitelistRangeCount: number;
  blacklistRangeCount: number;
  reputationDBSize: number;
} {
  return {
    mode: config.mode,
    whitelistCount: config.whitelist.length,
    blacklistCount: config.blacklist.length,
    whitelistRangeCount: config.whitelistRanges.length,
    blacklistRangeCount: config.blacklistRanges.length,
    reputationDBSize: reputationDB.size,
  };
}

/**
 * Get current configuration (without sensitive data)
 */
export function getConfig(): IPListConfig {
  return { ...config };
}

/**
 * Get all blocked IPs (blacklist + expired entries filtered)
 */
export function getBlockedIPs(): string[] {
  const now = new Date();
  return config.blacklist
    .filter(entry => !entry.expiresAt || entry.expiresAt > now)
    .map(entry => entry.ip);
}

/**
 * Get all whitelisted IPs
 */
export function getWhitelistedIPs(): string[] {
  const now = new Date();
  return config.whitelist
    .filter(entry => !entry.expiresAt || entry.expiresAt > now)
    .map(entry => entry.ip);
}

// Re-export utility functions for tests
export { isValidIP, isValidCIDR, isIPInCIDR } from '../config/ipList';
