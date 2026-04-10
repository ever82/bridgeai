/**
 * Security Integration Tests
 *
 * Integration tests for the security middleware stack.
 */
import request from 'supertest';
import express, { Application } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { enhancedIpLimiter } from '../middleware/rateLimiter';
import { ddosProtection } from '../middleware/ddosProtection';
import { ipFilter } from '../middleware/ipFilter';
import { securityProtection } from '../middleware/security';
import { corsConfig, securityHeaders } from '../config/cors';

describe('Security Middleware Integration', () => {
  let app: Application;

  beforeEach(() => {
    app = express();

    // Apply security middleware stack
    app.use(helmet(securityHeaders));
    app.use(cors(corsConfig));
    app.use(express.json({ limit: '10mb' }));
    app.use(ipFilter);
    app.use(ddosProtection);
    app.use(enhancedIpLimiter);
    app.use(securityProtection());

    // Test routes
    app.get('/api/test', (_req, res) => {
      res.json({ success: true, message: 'Test endpoint' });
    });

    app.post('/api/test', (req, res) => {
      res.json({ success: true, data: req.body });
    });
  });

  describe('Rate Limiting', () => {
    it('should return 429 when rate limit exceeded', async () => {
      // Make many requests quickly
      const requests = [];
      for (let i = 0; i < 110; i++) {
        requests.push(request(app).get('/api/test'));
      }

      const responses = await Promise.all(requests);
      const rateLimited = responses.filter(r => r.status === 429);

      expect(rateLimited.length).toBeGreaterThan(0);
    });

    it('should include rate limit headers', async () => {
      const response = await request(app).get('/api/test');

      expect(response.headers).toHaveProperty('x-ratelimit-limit');
      expect(response.headers).toHaveProperty('x-ratelimit-remaining');
    });
  });

  describe('DDoS Protection', () => {
    it('should add DDoS protection headers', async () => {
      const response = await request(app).get('/api/test');

      expect(response.headers).toHaveProperty('x-ddos-protection');
      expect(response.headers['x-ddos-protection']).toBe('active');
    });

    it('should detect and handle burst traffic', async () => {
      // Make burst of requests
      const burst = [];
      for (let i = 0; i < 60; i++) {
        burst.push(request(app).get('/api/test'));
      }

      const responses = await Promise.all(burst);

      // Some requests might be blocked or have warnings
      const hasWarnings = responses.some(r =>
        r.headers['x-ddos-warning'] !== undefined
      );

      expect(hasWarnings || responses.some(r => r.status === 403)).toBe(true);
    });
  });

  describe('IP Filtering', () => {
    it('should respect X-Forwarded-For header', async () => {
      const response = await request(app)
        .get('/api/test')
        .set('X-Forwarded-For', '203.0.113.1');

      // Should process the request (may be blocked if IP is blacklisted)
      expect([200, 403]).toContain(response.status);
    });
  });

  describe('Security Headers', () => {
    it('should set security headers via helmet', async () => {
      const response = await request(app).get('/api/test');

      expect(response.headers).toHaveProperty('x-content-type-options');
      expect(response.headers).toHaveProperty('x-frame-options');
      expect(response.headers).toHaveProperty('strict-transport-security');
    });

    it('should have CORS headers', async () => {
      const response = await request(app)
        .options('/api/test')
        .set('Origin', 'http://localhost:3000');

      expect(response.headers).toHaveProperty('access-control-allow-origin');
    });
  });

  describe('XSS Protection', () => {
    it('should block requests with script tags', async () => {
      const response = await request(app)
        .post('/api/test')
        .send({ content: '<script>alert(1)</script>' });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('XSS_DETECTED');
    });

    it('should block JavaScript protocol URLs', async () => {
      const response = await request(app)
        .post('/api/test')
        .send({ url: 'javascript:alert(1)' });

      expect(response.status).toBe(400);
    });
  });

  describe('SQL Injection Protection', () => {
    it('should block SQL injection attempts', async () => {
      const response = await request(app)
        .post('/api/test')
        .send({ id: "1' UNION SELECT * FROM users--" });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('SQL_INJECTION_DETECTED');
    });

    it('should block DROP TABLE attempts', async () => {
      const response = await request(app)
        .post('/api/test')
        .send({ query: '1; DROP TABLE users--' });

      expect(response.status).toBe(400);
    });
  });

  describe('NoSQL Injection Protection', () => {
    it('should block MongoDB operators in keys', async () => {
      const response = await request(app)
        .post('/api/test')
        .send({ $where: 'this.password.length > 0' });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('NOSQL_INJECTION_DETECTED');
    });

    it('should block nested operators', async () => {
      const response = await request(app)
        .post('/api/test')
        .send({ user: { $ne: null } });

      expect(response.status).toBe(400);
    });
  });

  describe('Request Size Limits', () => {
    it('should reject oversized JSON payloads', async () => {
      // Create a large payload (larger than 10MB)
      const largeData = 'x'.repeat(11 * 1024 * 1024);

      const response = await request(app)
        .post('/api/test')
        .send({ data: largeData })
        .set('Content-Type', 'application/json');

      // Should fail due to size limit
      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('Combined Security Stack', () => {
    it('should handle normal requests without interference', async () => {
      const response = await request(app)
        .post('/api/test')
        .send({ name: 'John Doe', age: 30 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should apply all protections in sequence', async () => {
      // Request with XSS payload
      const response = await request(app)
        .post('/api/test')
        .set('X-Forwarded-For', '203.0.113.50')
        .send({ content: '<script>stealCookies()</script>' });

      // Should be blocked by XSS protection before other checks
      expect(response.status).toBe(400);
    });
  });
});
