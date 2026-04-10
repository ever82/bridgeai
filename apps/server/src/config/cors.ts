/**
 * CORS Configuration
 *
 * Provides whitelist-based CORS configuration with security headers.
 */
import { CorsOptions } from 'cors';

// Allowed origins from environment
const getAllowedOrigins = (): string[] => {
  const originsFromEnv = process.env.CORS_ALLOWED_ORIGINS;
  if (originsFromEnv) {
    return originsFromEnv.split(',').map(o => o.trim());
  }

  // Default origins based on environment
  if (process.env.NODE_ENV === 'production') {
    return [
      'https://visionshare.app',
      'https://www.visionshare.app',
      'https://admin.visionshare.app',
    ];
  }

  if (process.env.NODE_ENV === 'staging') {
    return [
      'https://staging.visionshare.app',
      'https://admin-staging.visionshare.app',
    ];
  }

  // Development
  return [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:8081', // Expo
    'http://localhost:19006', // Expo web
  ];
};

// CORS configuration
export const corsConfig: CorsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = getAllowedOrigins();

    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) {
      callback(null, true);
      return;
    }

    // Check if origin is in whitelist
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

    // Check wildcard subdomains
    const isAllowed = allowedOrigins.some(allowed => {
      if (allowed.startsWith('*.')) {
        const domain = allowed.slice(2);
        return origin.endsWith(domain);
      }
      return false;
    });

    if (isAllowed) {
      callback(null, true);
      return;
    }

    // Origin not allowed
    callback(new Error(`Origin ${origin} not allowed by CORS`), false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Request-ID',
    'X-API-Key',
    'X-Client-Version',
    'Accept',
    'Origin',
  ],
  exposedHeaders: [
    'X-RateLimit-Limit',
    'X-RateLimit-Remaining',
    'X-RateLimit-Reset',
    'X-Request-ID',
    'X-DDOS-Protection',
    'X-IP-Filter',
  ],
  maxAge: 86400, // 24 hours
  preflightContinue: false,
  optionsSuccessStatus: 200,
};

// Security headers configuration (extends helmet)
export const securityHeaders = {
  // Content Security Policy
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https:'],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
      connectSrc: ["'self'", 'https:', 'wss:'],
      fontSrc: ["'self'", 'https:', 'data:'],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
      frameAncestors: ["'none'"],
      formAction: ["'self'"],
      baseUri: ["'self'"],
      upgradeInsecureRequests: [],
    },
  },

  // Cross-Origin policies
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  crossOriginOpenerPolicy: { policy: 'same-origin' },

  // DNS prefetch control
  dnsPrefetchControl: { allow: false },

  // Frame options
  frameguard: { action: 'deny' },

  // Hide Powered-By
  hidePoweredBy: true,

  // HTTP Strict Transport Security
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },

  // IE No Open
  ieNoOpen: true,

  // No Sniff
  noSniff: true,

  // Origin Agent Cluster
  originAgentCluster: true,

  // Permitted Cross-Domain Policies
  permittedCrossDomainPolicies: { permittedPolicies: 'none' },

  // Referrer Policy
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },

  // XSS Filter
  xssFilter: true,

  // Permissions Policy (formerly Feature Policy)
  permissionsPolicy: {
    features: {
      geolocation: ['self'],
      camera: ['self'],
      microphone: ['self'],
      payment: ['none'],
      usb: ['none'],
      magnetometer: ['none'],
      gyroscope: ['self'],
      accelerometer: ['self'],
    },
  },
};

// Additional security headers not covered by helmet
export const additionalSecurityHeaders = {
  // Prevent MIME type sniffing
  'X-Content-Type-Options': 'nosniff',

  // Prevent clickjacking
  'X-Frame-Options': 'DENY',

  // XSS Protection
  'X-XSS-Protection': '1; mode=block',

  // Cache control for sensitive endpoints
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0',

  // Expect-CT (Certificate Transparency)
  'Expect-CT': 'max-age=86400, enforce',

  // Remove potentially dangerous headers
  'X-Powered-By': undefined as string | undefined,
  'Server': undefined as string | undefined,
};

// Request validation config
export const requestValidation = {
  // Maximum body size
  maxBodySize: process.env.MAX_BODY_SIZE || '10mb',

  // Maximum JSON depth
  maxJSONDepth: 10,

  // Allowed content types
  allowedContentTypes: [
    'application/json',
    'application/x-www-form-urlencoded',
    'multipart/form-data',
    'text/plain',
    'application/octet-stream',
  ],

  // Blocked content types (potential security risks)
  blockedContentTypes: [
    'application/javascript',
    'text/javascript',
    'application/x-javascript',
    'text/html',
    'application/xhtml+xml',
    'application/xml',
  ],

  // Validate content type
  validateContentType: (contentType: string): boolean => {
    if (!contentType) return true; // No content type is OK

    const baseType = contentType.split(';')[0].trim().toLowerCase();

    // Check if explicitly blocked
    if (requestValidation.blockedContentTypes.includes(baseType)) {
      return false;
    }

    // Check if in allowed list (optional, can be disabled for flexibility)
    if (process.env.STRICT_CONTENT_TYPE === 'true') {
      return requestValidation.allowedContentTypes.includes(baseType);
    }

    return true;
  },
};
