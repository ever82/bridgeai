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

// Types for DDoS protection
interface TrafficRecord {
  count: number;
  firstRequest: number;
  lastRequest: number;
  burstCount: number;
  slowRequestCount: number;
}

interface BlockedIP {
  ip: string;
  blockedAt: number;
  expiresAt: number;
  reason: string;
  attackType: string;
}

// Configuration
const DDOS_CONFIG = {
  // Time window for traffic analysis (1 minute)
  windowMs: 60 * 1000,
  // Maximum requests per window before flagging
  maxRequestsPerWindow: 1000,
  // Burst detection threshold (requests within 1 second)
  burstThreshold: 50,
  // Block duration (1 hour default)
  blockDurationMs: 60 * 60 * 1000,
  // Slow attack detection (requests taking longer than threshold)
  slowAttackThresholdMs: 5000,
  // Maximum concurrent slow requests before blocking
  maxSlowRequests: 10,
  // Whitelist IPs (never block)
  whitelist: process.env.DDOS_WHITELIST?.split(',') || ['127.0.0.1', '::1'],
  // Auto-block enabled
  autoBlock: process.env.DDOS_AUTO_BLOCK !== 'false',
};

// In-memory traffic store
const trafficStore = new Map<string, TrafficRecord>();
const blockedIPs = new Map<string, BlockedIP>();
const requestStartTimes = new Map<string, number>();

// Generate unique request key
function getRequestKey(req: Request): string {
  const ip = getClientIP(req);
  return `${ip}:${Date.now()}`;
}

// Get client IP
function getClientIP(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || req.socket.remoteAddress || 'unknown';
}

// Check if IP is whitelisted
function isWhitelisted(ip: string): boolean {
  return DDOS_CONFIG.whitelist.includes(ip);
}

// Check if IP is blocked
function isBlocked(ip: string): { blocked: boolean; info?: BlockedIP } {
  const blockInfo = blockedIPs.get(ip);
  if (!blockInfo) return { blocked: false };

  // Check if block has expired
  if (Date.now() > blockInfo.expiresAt) {
    blockedIPs.delete(ip);
    return { blocked: false };
  }

  return { blocked: true, info: blockInfo };
}

// Block an IP
function blockIP(ip: string, reason: string, attackType: string): void {
  if (isWhitelisted(ip)) return;

  const now = Date.now();
  blockedIPs.set(ip, {
    ip,
    blockedAt: now,
    expiresAt: now + DDOS_CONFIG.blockDurationMs,
    reason,
    attackType,
  });

  // Log the block event
  console.warn(`[DDoS Protection] IP blocked: ${ip}`, {
    reason,
    attackType,
    blockedAt: new Date(now).toISOString(),
    expiresAt: new Date(now + DDOS_CONFIG.blockDurationMs).toISOString(),
  });
}

// Update traffic record for IP
function updateTrafficRecord(ip: string): TrafficRecord {
  const now = Date.now();
  let record = trafficStore.get(ip);

  if (!record || now - record.firstRequest > DDOS_CONFIG.windowMs) {
    // Start new window
    record = {
      count: 1,
      firstRequest: now,
      lastRequest: now,
      burstCount: 1,
      slowRequestCount: 0,
    };
  } else {
    // Update existing record
    record.count++;

    // Check for burst (requests within 1 second)
    if (now - record.lastRequest < 1000) {
      record.burstCount++;
    } else {
      record.burstCount = 1;
    }

    record.lastRequest = now;
  }

  trafficStore.set(ip, record);
  return record;
}

// Detect anomaly in traffic pattern
function detectAnomaly(record: TrafficRecord): {
  isAnomaly: boolean;
  type: string;
  severity: 'low' | 'medium' | 'high';
} {
  // Check for request flooding
  if (record.count > DDOS_CONFIG.maxRequestsPerWindow) {
    return { isAnomaly: true, type: 'REQUEST_FLOOD', severity: 'high' };
  }

  // Check for burst attack
  if (record.burstCount > DDOS_CONFIG.burstThreshold) {
    return { isAnomaly: true, type: 'BURST_ATTACK', severity: 'high' };
  }

  // Check for slow attack indicators
  if (record.slowRequestCount > DDOS_CONFIG.maxSlowRequests) {
    return { isAnomaly: true, type: 'SLOW_ATTACK', severity: 'medium' };
  }

  return { isAnomaly: false, type: '', severity: 'low' };
}

// Clean up expired records
function cleanupExpiredRecords(): void {
  const now = Date.now();

  // Clean traffic store
  for (const [ip, record] of trafficStore.entries()) {
    if (now - record.firstRequest > DDOS_CONFIG.windowMs) {
      trafficStore.delete(ip);
    }
  }

  // Clean expired blocks
  for (const [ip, blockInfo] of blockedIPs.entries()) {
    if (now > blockInfo.expiresAt) {
      blockedIPs.delete(ip);
      console.log(`[DDoS Protection] Block expired for IP: ${ip}`);
    }
  }
}

// Run cleanup every minute
setInterval(cleanupExpiredRecords, 60 * 1000);

/**
 * DDoS Protection Middleware
 * Main middleware for DDoS detection and protection
 */
export function ddosProtection(req: Request, res: Response, next: NextFunction): void {
  const ip = getClientIP(req);

  // Skip for whitelisted IPs
  if (isWhitelisted(ip)) {
    res.setHeader('X-DDOS-Protection', 'active');
    next();
    return;
  }

  // Check if IP is blocked
  const blockStatus = isBlocked(ip);
  if (blockStatus.blocked) {
    res.status(403).json({
      success: false,
      error: {
        code: 'IP_BLOCKED',
        message: 'Access denied due to suspicious activity.',
        blockedUntil: new Date(blockStatus.info!.expiresAt).toISOString(),
      },
    });
    return;
  }

  // Record request start time for slow attack detection
  const requestKey = getRequestKey(req);
  requestStartTimes.set(requestKey, Date.now());

  // Update traffic record
  const record = updateTrafficRecord(ip);

  // Detect anomalies
  const anomaly = detectAnomaly(record);

  if (anomaly.isAnomaly) {
    // Log the anomaly
    console.warn(`[DDoS Protection] Anomaly detected from ${ip}:`, {
      type: anomaly.type,
      severity: anomaly.severity,
      requestCount: record.count,
      burstCount: record.burstCount,
    });

    // Auto-block if enabled and severity is high
    if (DDOS_CONFIG.autoBlock && anomaly.severity === 'high') {
      blockIP(ip, `Detected ${anomaly.type}`, anomaly.type);

      res.status(403).json({
        success: false,
        error: {
          code: 'SUSPICIOUS_ACTIVITY',
          message: 'Access denied due to suspicious activity.',
        },
      });
      return;
    }

    // Add warning header for medium severity
    if (anomaly.severity === 'medium') {
      res.setHeader('X-DDOS-Warning', anomaly.type);
    }
  }

  // Track response time for slow attack detection
  res.on('finish', () => {
    const startTime = requestStartTimes.get(requestKey);
    if (startTime) {
      const duration = Date.now() - startTime;
      if (duration > DDOS_CONFIG.slowAttackThresholdMs) {
        const rec = trafficStore.get(ip);
        if (rec) {
          rec.slowRequestCount++;
        }
      }
      requestStartTimes.delete(requestKey);
    }
  });

  // Add DDoS protection headers
  res.setHeader('X-DDOS-Protection', 'active');
  res.setHeader('X-Request-Count', record.count.toString());

  next();
}

/**
 * Slow attack protection middleware
 * Adds timeout for slow requests
 */
export function slowAttackProtection(
  timeoutMs: number = 30000
): (req: Request, res: Response, next: NextFunction) => void {
  return (req: Request, res: Response, next: NextFunction): void => {
    const timer = setTimeout(() => {
      if (!res.headersSent) {
        const ip = getClientIP(req);
        console.warn(`[DDoS Protection] Slow request timeout from ${ip}`);

        res.status(408).json({
          success: false,
          error: {
            code: 'REQUEST_TIMEOUT',
            message: 'Request took too long to complete.',
          },
        });
      }
    }, timeoutMs);

    res.on('finish', () => {
      clearTimeout(timer);
    });

    res.on('close', () => {
      clearTimeout(timer);
    });

    next();
  };
}

/**
 * Traffic monitoring middleware
 * Collects traffic statistics without blocking
 */
export function trafficMonitor(req: Request, res: Response, next: NextFunction): void {
  const ip = getClientIP(req);
  const record = updateTrafficRecord(ip);

  // Add traffic info to response headers (for debugging)
  if (process.env.NODE_ENV === 'development') {
    res.setHeader('X-Traffic-Count', record.count.toString());
    res.setHeader('X-Traffic-Burst', record.burstCount.toString());
  }

  next();
}

/**
 * Get DDoS statistics
 */
export function getDDoSStats(): {
  activeBlocks: number;
  totalRequests: number;
  flaggedIPs: number;
  blockedIPs: string[];
} {
  const blocked = Array.from(blockedIPs.values())
    .filter(b => Date.now() < b.expiresAt)
    .map(b => b.ip);

  return {
    activeBlocks: blocked.length,
    totalRequests: Array.from(trafficStore.values()).reduce((sum, r) => sum + r.count, 0),
    flaggedIPs: trafficStore.size,
    blockedIPs: blocked,
  };
}

/**
 * Manually block an IP
 */
export function manuallyBlockIP(ip: string, durationMinutes: number, reason: string): boolean {
  if (isWhitelisted(ip)) {
    return false;
  }

  const now = Date.now();
  blockedIPs.set(ip, {
    ip,
    blockedAt: now,
    expiresAt: now + durationMinutes * 60 * 1000,
    reason,
    attackType: 'MANUAL_BLOCK',
  });

  return true;
}

/**
 * Unblock an IP
 */
export function unblockIP(ip: string): boolean {
  return blockedIPs.delete(ip);
}

/**
 * Get list of blocked IPs
 */
export function getBlockedIPs(): BlockedIP[] {
  const now = Date.now();
  return Array.from(blockedIPs.values())
    .filter(b => now < b.expiresAt)
    .sort((a, b) => b.blockedAt - a.blockedAt);
}

/**
 * Check if request is potentially malicious
 */
export function isMaliciousRequest(req: Request): {
  isMalicious: boolean;
  reasons: string[];
} {
  const reasons: string[] = [];
  const ip = getClientIP(req);
  const record = trafficStore.get(ip);

  if (record) {
    if (record.count > DDOS_CONFIG.maxRequestsPerWindow * 0.8) {
      reasons.push('High request rate');
    }
    if (record.burstCount > DDOS_CONFIG.burstThreshold * 0.8) {
      reasons.push('Burst detected');
    }
    if (record.slowRequestCount > DDOS_CONFIG.maxSlowRequests * 0.8) {
      reasons.push('Slow request pattern');
    }
  }

  // Check for suspicious headers
  const userAgent = req.headers['user-agent'] || '';
  if (!userAgent || userAgent.length < 10) {
    reasons.push('Suspicious User-Agent');
  }

  // Check for known bad user agents
  const badUserAgents = /(bot|crawler|spider|scraper|curl|wget)/i;
  if (badUserAgents.test(userAgent) && !req.path.startsWith('/api/')) {
    reasons.push('Automated tool detected');
  }

  return {
    isMalicious: reasons.length > 0,
    reasons,
  };
}
