/**
 * Probe tests for ISSUE-F003: Express后端基础框架
 *
 * Targeting: ApiResponse, errorHandler, requestId, timeout, 415/405/404 handlers, health/metrics endpoints
 */

import request from 'supertest';
import express, { Request, Response, NextFunction, Application } from 'express';

import { ApiResponse } from '../utils/response';
import { FileValidationError } from '../errors/AppError';
import { errorHandler } from '../middleware/errorHandler';

// Build a minimal app for testing without all the heavy middleware

function createTestApp(): Application {
  const app = express();
  app.use(express.json());

  // Replicate the 415 check from app.ts
  app.use('/api', (req: Request, res: Response, next: NextFunction) => {
    if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
      const contentType = req.get('Content-Type') || '';
      const expectsJson =
        contentType.includes('application/json') ||
        contentType.includes('application/x-www-form-urlencoded') ||
        contentType.includes('multipart/form-data');
      if (contentType && !expectsJson) {
        res
          .status(415)
          .json(
            ApiResponse.error(
              `Unsupported Media Type: ${contentType.replace(/</g, '&lt;').replace(/>/g, '&gt;')}`,
              'UNSUPPORTED_MEDIA_TYPE',
              415
            )
          );
        return;
      }
    }
    next();
  });

  // Health/metrics endpoints from app.ts
  app.get('/health', (_req: Request, res: Response) => {
    res.json(
      ApiResponse.success({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'bridgeai-server',
        version: process.env.npm_package_version || '0.1.0',
      })
    );
  });

  app.get('/ready', (_req: Request, res: Response) => {
    res.json(
      ApiResponse.success({
        status: 'ready',
        timestamp: new Date().toISOString(),
        checks: { database: 'ok' },
      })
    );
  });

  app.get('/metrics', (_req: Request, res: Response) => {
    const mem = process.memoryUsage();
    res.json(
      ApiResponse.success({
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: {
          rss: mem.rss,
          heapTotal: mem.heapTotal,
          heapUsed: mem.heapUsed,
          external: mem.external,
        },
        pid: process.pid,
      })
    );
  });

  // 405 handler
  app.use((req: Request, res: Response, next: NextFunction) => {
    try {
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
      /* fall through */
    }
    next();
  });

  // 404
  app.use((_req: Request, res: Response) => {
    res.status(404).json(ApiResponse.error('Resource not found', 'NOT_FOUND', 404));
  });

  // Error handler
  app.use(errorHandler);

  return app;
}

const app = createTestApp();

// ============================================================
// PROBE-PT-001: ApiResponse.error stores statusCode in meta, not top-level
// AC c4 says "HTTP 状态码映射" - verify the response structure
// ============================================================
describe('PROBE-PT-001: ApiResponse structure edge cases', () => {
  it('error response should contain statusCode but NOT at top level (no leak)', () => {
    const res = ApiResponse.error('test', 'TEST_ERROR', 400);
    // statusCode should be in meta, not top-level
    expect(res.meta?.statusCode).toBe(400);
    expect((res as any).statusCode).toBeUndefined();
    expect(res.success).toBe(false);
    expect(res.data).toBeUndefined();
  });

  it('success response with null data should serialize correctly', () => {
    const res = ApiResponse.success(null);
    expect(res.success).toBe(true);
    expect(res.data).toBeNull();
  });

  it('success response with undefined data', () => {
    const res = ApiResponse.success(undefined as any);
    expect(res.success).toBe(true);
    // undefined gets serialized to missing in JSON
    expect(res.data).toBeUndefined();
  });

  it('paginated with empty array and zero total', () => {
    const res = ApiResponse.paginated([], { page: 1, limit: 10, total: 0, totalPages: 0 });
    expect(res.success).toBe(true);
    expect(res.data).toEqual([]);
    expect(res.meta?.pagination).toEqual({ page: 1, limit: 10, total: 0, totalPages: 0 });
  });

  it('error response with extra details - no prototype pollution via spread', () => {
    const res = ApiResponse.error('test', 'ERR', 500, { __proto__: { polluted: true } });
    expect(res.meta?.statusCode).toBe(500);
    // Ensure __proto__ doesn't pollute the response object itself
    expect((res as any).polluted).toBeUndefined();
  });
});

// ============================================================
// PROBE-PT-002: errorHandler now uses instanceof checks (NP-185 fixed)
// String matching has been replaced with FileValidationError class.
// ============================================================
describe('PROBE-PT-002: errorHandler - regular errors NOT misclassified as file errors', () => {
  it('should treat a regular error with "Invalid file type" text as INTERNAL_ERROR 500', () => {
    const fakeReq = { path: '/test', method: 'GET', requestId: 'test-id' } as any;
    const fakeRes = {
      headersSent: false,
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    } as any;

    const err = new Error('Configuration invalid file type mapping is corrupted');
    errorHandler(err, fakeReq, fakeRes, jest.fn());

    // FIXED: No longer matches by string. Should be 500 INTERNAL_ERROR
    expect(fakeRes.status).toHaveBeenCalledWith(500);
    expect(fakeRes.json).toHaveBeenCalledWith(
      expect.objectContaining({ errorCode: 'INTERNAL_ERROR' })
    );
  });

  it('should treat "File type not allowed in policy" as INTERNAL_ERROR 500', () => {
    const fakeReq = { path: '/admin/settings', method: 'PUT', requestId: 'test-id' } as any;
    const fakeRes = {
      headersSent: false,
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    } as any;

    const err = new Error('File type not allowed in security policy configuration');
    errorHandler(err, fakeReq, fakeRes, jest.fn());

    // FIXED: Not caught by string match anymore
    expect(fakeRes.status).toHaveBeenCalledWith(500);
  });

  it('should correctly handle FileValidationError as 400 INVALID_FILE_TYPE', () => {
    const fakeReq = { path: '/upload', method: 'POST', requestId: 'test-id' } as any;
    const fakeRes = {
      headersSent: false,
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    } as any;

    const err = new FileValidationError('Only PNG and JPEG files are allowed');
    errorHandler(err, fakeReq, fakeRes, jest.fn());

    // FileValidationError should still be correctly handled
    expect(fakeRes.status).toHaveBeenCalledWith(400);
    expect(fakeRes.json).toHaveBeenCalledWith(
      expect.objectContaining({ errorCode: 'INVALID_FILE_TYPE' })
    );
  });
});

// ============================================================
// PROBE-PT-003: 415 middleware bypass via Content-Type tricks
// AC c4 mentions error handling - can we bypass the 415 check?
// ============================================================
describe('PROBE-PT-003: 415 Content-Type bypass attempts', () => {
  it('POST to /api with no Content-Type should pass through', async () => {
    const res = await request(app).post('/api/nonexistent').send('raw body');
    // Should get 404 (route not found), not 415
    expect(res.status).not.toBe(415);
  });

  it('POST to /api with text/plain should be rejected 415', async () => {
    const res = await request(app)
      .post('/api/test')
      .set('Content-Type', 'text/plain')
      .send('hello');
    expect(res.status).toBe(415);
    expect(res.body.errorCode).toBe('UNSUPPORTED_MEDIA_TYPE');
  });

  it('POST to /api with application/xml should be rejected 415', async () => {
    const res = await request(app)
      .post('/api/test')
      .set('Content-Type', 'application/xml')
      .send('<xml/>');
    expect(res.status).toBe(415);
  });

  it('POST to /api with text/xml should be rejected 415', async () => {
    const res = await request(app).post('/api/test').set('Content-Type', 'text/xml').send('<xml/>');
    expect(res.status).toBe(415);
  });

  it('Content-Type injection - XSS in Content-Type reflected in error', async () => {
    const xssPayload = 'text/html<script>alert(1)</script>';
    const res = await request(app).post('/api/test').set('Content-Type', xssPayload).send('test');
    expect(res.status).toBe(415);
    // The error message includes the Content-Type value - check if it's reflected raw
    const msg = res.body.message;
    if (msg && msg.includes('<script>')) {
      // BUG: XSS in error message reflection
      throw new Error(`PROBE FAIL: XSS payload reflected in error message: ${msg}`);
    }
  });
});

// ============================================================
// PROBE-PT-004: Health/Metrics/Ready endpoint method enforcement
// AC c6 says these are health check endpoints - should only be GET
// ============================================================
describe('PROBE-PT-004: Health endpoints method enforcement (AC c6)', () => {
  it('POST /health should get 405 or 404, not 200', async () => {
    const res = await request(app).post('/health');
    expect(res.status).not.toBe(200);
  });

  it('POST /metrics should get 405 or 404, not 200', async () => {
    const res = await request(app).post('/metrics');
    expect(res.status).not.toBe(200);
  });

  it('POST /ready should get 405 or 404, not 200', async () => {
    const res = await request(app).post('/ready');
    expect(res.status).not.toBe(200);
  });

  it('PUT /health should get 405 or 404', async () => {
    const res = await request(app).put('/health');
    expect(res.status).not.toBe(200);
  });

  it('DELETE /health should get 405 or 404', async () => {
    const res = await request(app).delete('/health');
    expect(res.status).not.toBe(200);
  });
});

// ============================================================
// PROBE-PT-005: Health response structure validation
// AC c6 requires "status, timestamp, checks" fields
// ============================================================
describe('PROBE-PT-005: Health response structure (AC c6)', () => {
  it('/health should have standard ApiResponse wrapper with success=true', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.status).toBe('healthy');
    expect(res.body.data.timestamp).toBeDefined();
    expect(res.body.data.service).toBe('bridgeai-server');
  });

  it('/ready should include checks object', async () => {
    const res = await request(app).get('/ready');
    expect(res.status).toBe(200);
    expect(res.body.data.checks).toBeDefined();
    expect(res.body.data.checks.database).toBeDefined();
  });

  it('/metrics should include memory info', async () => {
    const res = await request(app).get('/metrics');
    expect(res.status).toBe(200);
    expect(res.body.data.memory).toBeDefined();
    expect(res.body.data.memory.rss).toBeGreaterThan(0);
    expect(res.body.data.uptime).toBeGreaterThan(0);
    expect(res.body.data.pid).toBe(process.pid);
  });

  it('/ready database check is hardcoded "ok" - never reflects real DB status', async () => {
    const res = await request(app).get('/ready');
    // BUG: database check is a placeholder that always returns 'ok'
    // even if the database is down
    expect(res.body.data.checks.database).toBe('ok');
  });
});

// ============================================================
// PROBE-PT-006: 404 and 405 handler behavior
// AC c4 mentions error handling - verify framework-level error responses
// ============================================================
describe('PROBE-PT-006: 404/405 framework responses', () => {
  it('non-existent path returns 404 with standard format', async () => {
    const res = await request(app).get('/this-route-does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.errorCode).toBe('NOT_FOUND');
  });

  it('deep nested path returns 404', async () => {
    const res = await request(app).get('/a/b/c/d/e/f/g/h');
    expect(res.status).toBe(404);
  });

  it('path with special characters returns 404', async () => {
    const res = await request(app).get('/health%00');
    expect(res.status).toBe(404);
  });

  it('path traversal attempt returns 404', async () => {
    const res = await request(app).get('/../etc/passwd');
    expect(res.status).toBe(404);
  });
});

// ============================================================
// PROBE-PT-007: Error message information disclosure
// AC c4 + c3: error handling should not leak internals in production
// ============================================================
describe('PROBE-PT-007: Error information disclosure', () => {
  it('malformed JSON returns generic error without stack trace', async () => {
    const testApp = express();
    testApp.use(express.json());
    testApp.use((_req, _res, next) => {
      // Simulate a syntax error from malformed JSON
      const err = new SyntaxError('Unexpected token') as any;
      err.body = '{ invalid json }';
      next(err);
    });
    testApp.use(errorHandler);

    const res = await request(testApp).get('/');
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Invalid JSON payload');
    // Should not contain stack trace
    expect(JSON.stringify(res.body)).not.toContain('at ');
    expect(JSON.stringify(res.body)).not.toContain('SyntaxError');
  });

  it('unknown error in non-dev mode should not leak message', async () => {
    const origEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    const testApp = express();
    testApp.use(errorHandler);

    // Create a mock req/res/next
    const fakeReq = { path: '/secret', method: 'GET', requestId: 'r-1' } as any;
    const fakeRes = {
      headersSent: false,
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    } as any;

    const err = new Error('Secret internal error: db password is xyz');
    errorHandler(err, fakeReq, fakeRes, jest.fn());

    expect(fakeRes.status).toHaveBeenCalledWith(500);
    const response = fakeRes.json.mock.calls[0][0];
    expect(response.message).toBe('Internal server error');
    expect(response.message).not.toContain('Secret');
    expect(response.message).not.toContain('password');

    process.env.NODE_ENV = origEnv;
  });
});
