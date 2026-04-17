import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import dotenv from 'dotenv';

import { errorHandler } from './middleware/errorHandler';
import { requestId } from './middleware/requestId';
import { timeout } from './middleware/timeout';
import { performanceMonitor } from './middleware/performance';
import { enhancedIpLimiter, strictAuthLimiter } from './middleware/rateLimiter';
import { ddosProtection, slowAttackProtection } from './middleware/ddosProtection';
import { ipFilter } from './middleware/ipFilter';
import { securityProtection } from './middleware/security';
import { corsConfig, securityHeaders } from './config/cors';
import routes from './routes';
import adminRoutes from './routes/admin';
import { ApiResponse } from './utils/response';
import { initSentry, Sentry } from './utils/sentry';
import { initializeSecurityMonitoring } from './services/securityMonitor';

dotenv.config();

// Initialize Sentry before creating the app
initSentry();

// Initialize security monitoring
initializeSecurityMonitoring();

const app: Application = express();

// Sentry request handler (must be first)
app.use(Sentry.Handlers.requestHandler());

// Sentry tracing handler
app.use(Sentry.Handlers.tracingHandler());

// Security middleware - Helmet with enhanced configuration
app.use(helmet(securityHeaders));

// CORS configuration with whitelist
app.use(cors(corsConfig));

// Request size limits with security
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 415 Unsupported Media Type - detect mismatched Content-Type on API routes
app.use('/api', (req: Request, res: Response, next: NextFunction) => {
  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    const contentType = req.get('Content-Type') || '';
    const expectsJson =
      contentType.includes('application/json') ||
      contentType.includes('application/x-www-form-urlencoded') ||
      contentType.includes('multipart/form-data');
    // If Content-Type is non-empty and not a parseable type, return 415
    if (contentType && !expectsJson) {
      res
        .status(415)
        .json(
          ApiResponse.error(`Unsupported Media Type: ${contentType}`, 'UNSUPPORTED_MEDIA_TYPE', 415)
        );
      return;
    }
  }
  next();
});

// Compression middleware
app.use(compression());

// Request ID middleware
app.use(requestId);

// IP Filter middleware (whitelist/blacklist)
app.use(ipFilter);

// DDoS Protection middleware
app.use(ddosProtection);

// Rate limiting middleware
app.use(enhancedIpLimiter);

// Slow attack protection (timeout middleware)
app.use(slowAttackProtection(parseInt(process.env.SLOW_ATTACK_TIMEOUT || '30000', 10)));

// Timeout middleware (30 seconds default)
app.use(timeout(parseInt(process.env.REQUEST_TIMEOUT_MS || '30000', 10)));

// Security protection middleware (XSS, SQL injection, etc.)
app.use(securityProtection());

// Performance monitoring middleware
app.use(performanceMonitor);

// Logging middleware
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(process.env.NODE_ENV === 'development' ? 'dev' : 'combined'));
}

// Health check endpoint (before API routes)
app.get('/health', (req: Request, res: Response) => {
  res.json(
    ApiResponse.success({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'bridgeai-server',
      version: process.env.npm_package_version || '0.1.0',
    })
  );
});

app.get('/ready', (req: Request, res: Response) => {
  // TODO: Add database connection check
  res.json(
    ApiResponse.success({
      status: 'ready',
      timestamp: new Date().toISOString(),
      checks: {
        database: 'ok', // Placeholder
      },
    })
  );
});

// API routes
app.use('/api', routes);

// Admin routes with stricter rate limiting
app.use('/admin', strictAuthLimiter, adminRoutes);

// Root endpoint
app.get('/', (req: Request, res: Response) => {
  res.json(
    ApiResponse.success({
      name: 'BridgeAI API',
      version: 'v1',
      documentation: '/api/docs',
    })
  );
});

// 405 Method Not Allowed handler
// Must come after all routes so it can detect registered paths with wrong methods
app.use((req: Request, res: Response, next: NextFunction) => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const router = (app as any)._router;
    if (router) {
      const methods: string[] = [];
      for (const layer of router.stack) {
        if (layer.route && layer.route.path === req.path) {
          methods.push(...Object.keys(layer.route.methods).map((m: string) => m.toUpperCase()));
        }
      }
      if (methods.length > 0 && !methods.includes(req.method.toUpperCase())) {
        res.setHeader('Allow', methods.join(', '));
        res
          .status(405)
          .json(
            ApiResponse.error(
              `Method ${req.method} not allowed for ${req.path}`,
              'METHOD_NOT_ALLOWED',
              405
            )
          );
        return;
      }
    }
  } catch {
    // Fall through to 404 if router introspection fails
  }
  next();
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json(ApiResponse.error('Resource not found', 'NOT_FOUND', 404));
});

// Sentry error handler (before custom error handler)
app.use(Sentry.Handlers.errorHandler());

// Global error handler
app.use(errorHandler);

export default app;
