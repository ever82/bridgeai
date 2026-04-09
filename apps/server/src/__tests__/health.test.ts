import request from 'supertest';
import app from '../app';
import { prisma } from '../db/client';

// Mock the prisma client
jest.mock('../db/client', () => ({
  prisma: {
    $queryRaw: jest.fn(),
  },
}));

describe('Health Check Endpoints', () => {
  describe('GET /health', () => {
    it('should return healthy status', async () => {
      const res = await request(app).get('/health');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('status', 'healthy');
      expect(res.body).toHaveProperty('timestamp');
      expect(res.body).toHaveProperty('service', 'visionshare-server');
    });
  });

  describe('GET /ready', () => {
    it('should return ready status', async () => {
      const res = await request(app).get('/ready');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('status', 'ready');
      expect(res.body).toHaveProperty('timestamp');
      expect(res.body).toHaveProperty('checks');
    });
  });

  describe('GET /api/v1/health', () => {
    it('should return API health status', async () => {
      const res = await request(app).get('/api/v1/health');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('status');
      expect(res.body.data).toHaveProperty('timestamp');
      expect(res.body.data).toHaveProperty('uptime');
    });
  });

  describe('GET /api/v1/health/detailed', () => {
    it('should return detailed health with checks when database is healthy', async () => {
      // Mock successful database connection
      (prisma.$queryRaw as jest.Mock).mockResolvedValueOnce([1]);

      const res = await request(app).get('/api/v1/health/detailed');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('status');
      expect(res.body.data).toHaveProperty('checks');
      expect(res.body.data.checks).toHaveProperty('database', true);
    });

    it('should return unhealthy status when database is down', async () => {
      // Mock failed database connection
      (prisma.$queryRaw as jest.Mock).mockRejectedValueOnce(new Error('DB connection failed'));

      const res = await request(app).get('/api/v1/health/detailed');

      expect(res.status).toBe(503);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('unhealthy');
      expect(res.body.data.checks).toHaveProperty('database', false);
    });
  });
});

describe('Root Endpoint', () => {
  it('should return API info', async () => {
    const res = await request(app).get('/');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('name', 'VisionShare API');
    expect(res.body.data).toHaveProperty('version', 'v1');
  });
});

describe('404 Handler', () => {
  it('should return 404 for unknown routes', async () => {
    const res = await request(app).get('/unknown-route');

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.errorCode).toBe('NOT_FOUND');
  });
});
