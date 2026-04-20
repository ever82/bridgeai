import { Router, Request, Response } from 'express';

import { ApiResponse } from '../../utils/response';
import { prisma } from '../../db/client';

const router: Router = Router();

/**
 * @route GET /api/v1/health
 * @desc Basic health check
 * @access Public
 */
router.get('/', (req: Request, res: Response) => {
  res.json(ApiResponse.success({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
  }));
});

/**
 * @route GET /api/v1/health/detailed
 * @desc Detailed health check with database status
 * @access Public
 */
router.get('/detailed', async (req: Request, res: Response) => {
  const checks = {
    database: false,
    timestamp: new Date().toISOString(),
  };

  try {
    // Test database connection
    await prisma.$queryRaw`SELECT 1`;
    checks.database = true;
  } catch (error) {
    checks.database = false;
  }

  const allHealthy = Object.values(checks).every(v => v === true || typeof v === 'string');

  res.status(allHealthy ? 200 : 503).json(ApiResponse.success({
    status: allHealthy ? 'healthy' : 'unhealthy',
    checks,
    uptime: process.uptime(),
  }));
});

export default router;
