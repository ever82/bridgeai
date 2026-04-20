/**
 * Security Middleware
 *
 * Provides XSS protection, SQL injection prevention, and other security measures.
 */
import type { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';

// ============================================================================
// XSS Protection
// ============================================================================

/**
 * Patterns for detecting XSS attempts
 */
const XSS_PATTERNS = [
  /<script[^>]*>.*?<\/script>/gi,
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /javascript:/gi,
  /on\w+\s*=/gi,
  /<iframe/gi,
  /<object/gi,
  /<embed/gi,
  /<form/gi,
  /<input[^>]*type\s*=\s*['"]hidden['"]/gi,
  /expression\s*\(/gi,
  /eval\s*\(/gi,
  /new\s+Function\s*\(/gi,
  /setTimeout\s*\(/gi,
  /setInterval\s*\(/gi,
];

/**
 * Detect if string contains potential XSS payload
 * Uses Symbol.match to avoid lastIndex state issues with /g-flagged patterns
 */
function containsXSS(input: string): boolean {
  return XSS_PATTERNS.some(pattern => {
    if (typeof input[Symbol.match] === 'function') {
      return input[Symbol.match](pattern) !== null;
    }
    // Fallback: clone pattern without global flag
    const safe = new RegExp(pattern.source, pattern.flags.replace('g', ''));
    return safe.test(input);
  });
}

/**
 * Recursively check object for XSS patterns
 */
function containsXSSInObject(obj: unknown): boolean {
  if (typeof obj === 'string') {
    return containsXSS(obj);
  }
  if (Array.isArray(obj)) {
    return obj.some(containsXSSInObject);
  }
  if (obj !== null && typeof obj === 'object') {
    return Object.values(obj).some(containsXSSInObject);
  }
  return false;
}

/**
 * Sanitize HTML special characters
 */
export function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * XSS Protection Middleware
 * Blocks requests containing potential XSS payloads
 */
export function xssProtection(req: Request, res: Response, next: NextFunction): void {
  try {
    // Check request body
    if (req.body && containsXSSInObject(req.body)) {
      console.warn('[SECURITY] XSS attempt detected in request body', {
        path: req.path,
        method: req.method,
        ip: req.ip,
      });

      res.status(400).json({
        success: false,
        error: {
          code: 'XSS_DETECTED',
          message: 'Potentially malicious content detected',
        },
      });
      return;
    }

    // Check query parameters
    if (containsXSSInObject(req.query)) {
      console.warn('[SECURITY] XSS attempt detected in query parameters', {
        path: req.path,
        method: req.method,
        ip: req.ip,
      });

      res.status(400).json({
        success: false,
        error: {
          code: 'XSS_DETECTED',
          message: 'Potentially malicious content detected in query parameters',
        },
      });
      return;
    }

    next();
  } catch (error) {
    next(error);
  }
}

// ============================================================================
// SQL Injection Protection
// ============================================================================

/**
 * Patterns for detecting SQL injection attempts
 */
const SQL_INJECTION_PATTERNS = [
  /((%27)|('))\s*(union|select|insert|update|delete|drop|alter|create|exec)/gi,
  /((%27)|('))\s*or\s+/gi,
  /((%27)|('))\s*and\s+/gi,
  /((%27)|('))\s*;\s*/gi,
  /exec\s*\(\s*@/gi,
  /UNION\s+SELECT/gi,
  /INSERT\s+INTO/gi,
  /DELETE\s+FROM/gi,
  /DROP\s+TABLE/gi,
  /ALTER\s+TABLE/gi,
  /;\s*shutdown/gi,
  /;\s*drop/gi,
  // Backtick-quoted injection
  /`[^`]*`(union|select|insert|update|delete|drop)/gi,
  // Double-dash comment terminators
  /--\s/g,
  /#\s/g,
  /\/\*[\s\S]*?\*\//g,
  // Subqueries
  /\(\s*(select|insert|update|delete)/gi,
  // Prisma ORM operators
  /\{\s*\$/g,
  /where\s*:\s*\{.*\$/gi,
  /select\s*:\s*\{/gi,
  /include\s*:\s*\{/gi,
  /orderBy\s*:/gi,
  /_skip\s*:/gi,
  /_take\s*:/gi,
];

/**
 * Detect if string contains potential SQL injection
 * Uses Symbol.match to avoid lastIndex state issues
 */
function containsSQLInjection(input: string): boolean {
  // Skip if input is too short
  if (input.length < 3) return false;
  return SQL_INJECTION_PATTERNS.some(pattern => {
    if (typeof input[Symbol.match] === 'function') {
      return input[Symbol.match](pattern) !== null;
    }
    const safe = new RegExp(pattern.source, pattern.flags.replace('g', ''));
    return safe.test(input);
  });
}

/**
 * Recursively check object for SQL injection patterns
 */
function containsSQLInjectionInObject(obj: unknown): boolean {
  if (typeof obj === 'string') {
    return containsSQLInjection(obj);
  }
  if (Array.isArray(obj)) {
    return obj.some(containsSQLInjectionInObject);
  }
  if (obj !== null && typeof obj === 'object') {
    return Object.values(obj).some(containsSQLInjectionInObject);
  }
  return false;
}

/**
 * SQL Injection Protection Middleware
 * Blocks requests containing potential SQL injection payloads
 */
export function sqlInjectionProtection(req: Request, res: Response, next: NextFunction): void {
  try {
    // Check request body
    if (req.body && containsSQLInjectionInObject(req.body)) {
      console.warn('[SECURITY] SQL injection attempt detected', {
        path: req.path,
        method: req.method,
        ip: req.ip,
      });

      res.status(400).json({
        success: false,
        error: {
          code: 'SQL_INJECTION_DETECTED',
          message: 'Invalid input detected',
        },
      });
      return;
    }

    // Check query parameters
    if (containsSQLInjectionInObject(req.query)) {
      console.warn('[SECURITY] SQL injection attempt in query detected', {
        path: req.path,
        method: req.method,
        ip: req.ip,
      });

      res.status(400).json({
        success: false,
        error: {
          code: 'SQL_INJECTION_DETECTED',
          message: 'Invalid query parameters',
        },
      });
      return;
    }

    next();
  } catch (error) {
    next(error);
  }
}

// ============================================================================
// NoSQL Injection Protection
// ============================================================================

/**
 * Patterns for detecting NoSQL injection attempts
 */
const NOSQL_INJECTION_PATTERNS = [
  /\$where/gi,
  /\$ne/gi,
  /\$gt/gi,
  /\$lt/gi,
  /\$gte/gi,
  /\$lte/gi,
  /\$regex/gi,
  /\$options/gi,
  /\$in/gi,
  /\$nin/gi,
  /\$exists/gi,
  /\$type/gi,
  /\$mod/gi,
  /\$size/gi,
  /\$all/gi,
  /\$elemMatch/gi,
  /\$slice/gi,
];

/**
 * Check if object contains NoSQL operators
 */
function containsNoSQLOperators(obj: unknown): boolean {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }

  for (const key of Object.keys(obj)) {
    // Check if key starts with $ (MongoDB operator)
    if (key.startsWith('$')) {
      return true;
    }

    const value = (obj as Record<string, unknown>)[key];

    // Recursively check nested objects
    if (typeof value === 'object' && value !== null) {
      if (containsNoSQLOperators(value)) {
        return true;
      }
    }

    // Check string values
    if (typeof value === 'string') {
      if (NOSQL_INJECTION_PATTERNS.some(pattern => new RegExp(pattern.source, pattern.flags.replace('g', '')).test(value))) {
        return true;
      }
    }
  }

  return false;
}

/**
 * NoSQL Injection Protection Middleware
 * Blocks requests containing potential NoSQL injection payloads
 */
export function nosqlInjectionProtection(req: Request, res: Response, next: NextFunction): void {
  try {
    // Check request body
    if (req.body && containsNoSQLOperators(req.body)) {
      console.warn('[SECURITY] NoSQL injection attempt detected', {
        path: req.path,
        method: req.method,
        ip: req.ip,
      });

      res.status(400).json({
        success: false,
        error: {
          code: 'NOSQL_INJECTION_DETECTED',
          message: 'Invalid input detected',
        },
      });
      return;
    }

    // Check query parameters
    if (containsNoSQLOperators(req.query)) {
      console.warn('[SECURITY] NoSQL injection attempt in query detected', {
        path: req.path,
        method: req.method,
        ip: req.ip,
      });

      res.status(400).json({
        success: false,
        error: {
          code: 'NOSQL_INJECTION_DETECTED',
          message: 'Invalid query parameters',
        },
      });
      return;
    }

    next();
  } catch (error) {
    next(error);
  }
}

// ============================================================================
// Helmet Configuration
// ============================================================================

/**
 * Helmet middleware configuration
 * Sets various HTTP headers for security
 */
export const helmetMiddleware = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  dnsPrefetchControl: { allow: false },
  frameguard: { action: 'deny' },
  hidePoweredBy: true,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  ieNoOpen: true,
  noSniff: true,
  originAgentCluster: true,
  permittedCrossDomainPolicies: { permittedPolicies: 'none' },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  xssFilter: true,
});

// ============================================================================
// Combined Security Middleware
// ============================================================================

/**
 * Apply all security protections
 * Usage: app.use(securityProtection())
 */
export function securityProtection() {
  return [helmetMiddleware, xssProtection, sqlInjectionProtection, nosqlInjectionProtection];
}

export default securityProtection;
