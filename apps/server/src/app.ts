import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import dotenv from 'dotenv';

import { errorHandler } from './middleware/errorHandler';
import { requestId } from './middleware/requestId';
import { timeout } from './middleware/timeout';
import routes from './routes';
import { ApiResponse } from './utils/response';

dotenv.config();

const app: Application = express();

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression middleware
app.use(compression());

// Request ID middleware
app.use(requestId);

// Timeout middleware (30 seconds default)
app.use(timeout(parseInt(process.env.REQUEST_TIMEOUT_MS || '30000', 10)));

// Logging middleware
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(process.env.NODE_ENV === 'development' ? 'dev' : 'combined'));
}

// Health check endpoint (before API routes)
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'visionshare-server',
    version: process.env.npm_package_version || '0.1.0',
  });
});

app.get('/ready', (req: Request, res: Response) => {
  // TODO: Add database connection check
  res.json({
    status: 'ready',
    timestamp: new Date().toISOString(),
    checks: {
      database: 'ok', // Placeholder
    },
  });
});

// API routes
app.use('/api', routes);

// Root endpoint
app.get('/', (req: Request, res: Response) => {
  res.json(ApiResponse.success({
    name: 'VisionShare API',
    version: 'v1',
    documentation: '/api/docs',
  }));
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json(ApiResponse.error(
    'Resource not found',
    'NOT_FOUND',
    404
  ));
});

// Global error handler
app.use(errorHandler);

export default app;
