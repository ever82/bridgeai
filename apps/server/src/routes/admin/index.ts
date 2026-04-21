/**
 * Admin Routes - Security Dashboard
 *
 * Provides endpoints for security monitoring and management:
 * - Blocked IP management
 * - Security event viewing
 * - Security statistics
 * - IP whitelist/blacklist management
 */
import { Router, Request, Response } from 'express';
import { z } from 'zod';

import { authenticate, requireRole } from '../../middleware/auth';
import { validate } from '../../middleware/validation';
import {
  getBlockedIPs,
  unblockIP,
  blockIP,
  getSecurityStats,
  getSecurityEvents,
  resolveSecurityEvent,
  bulkBlockIPs,
  bulkUnblockIPs,
} from '../../services/firewall';
import {
  getWhitelistedIPs,
  addToWhitelist,
  removeFromWhitelist,
  addWhitelistRange,
  removeWhitelistRange,
  getConfig as getIPFilterConfig,
  updateConfig as updateIPFilterConfig,
} from '../../middleware/ipFilter';
import { getDDoSStats } from '../../middleware/ddosProtection';
import { getRealTimeStats, exportSecurityData } from '../../services/securityMonitor';

const router: Router = Router();

// All admin routes require authentication and admin role
router.use(authenticate);
router.use(requireRole('admin'));

// Validation schemas
const blockIPSchema = z.object({
  ip: z.string().ip(),
  reason: z.string().min(1).max(500),
  durationMinutes: z.number().int().min(1).max(10080).default(60), // Max 1 week
});

const bulkBlockSchema = z.object({
  ips: z.array(z.string().ip()).min(1).max(100),
  reason: z.string().min(1).max(500),
  durationMinutes: z.number().int().min(1).max(10080).default(60),
});

const dateRangeSchema = z.object({
  since: z.string().datetime().optional(),
  until: z.string().datetime().optional(),
  limit: z.number().int().min(1).max(1000).default(100),
  type: z.string().optional(),
  severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
});

const whitelistSchema = z.object({
  ip: z.string().ip(),
  description: z.string().max(500).optional(),
});

const cidrSchema = z.object({
  range: z.string().regex(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\/\d{1,2}$/),
  description: z.string().max(500).optional(),
});

// Get security overview stats
router.get('/security/stats', (_req: Request, res: Response) => {
  const stats = getSecurityStats();
  res.json({
    success: true,
    data: stats,
  });
});

// Get real-time monitoring stats
router.get('/security/realtime', (_req: Request, res: Response) => {
  const stats = getRealTimeStats();
  res.json({
    success: true,
    data: stats,
  });
});

// Get DDoS protection stats
router.get('/security/ddos', (_req: Request, res: Response) => {
  const stats = getDDoSStats();
  res.json({
    success: true,
    data: stats,
  });
});

// Get blocked IPs list
router.get('/security/blocked-ips', (_req: Request, res: Response) => {
  const blocked = getBlockedIPs();
  res.json({
    success: true,
    data: blocked,
  });
});

// Block an IP
router.post(
  '/security/blocked-ips',
  validate({ body: blockIPSchema }),
  (req: Request, res: Response) => {
    const { ip, reason, durationMinutes } = req.body;
    const adminId = req.user?.id;

    const result = blockIP(ip, reason, durationMinutes, adminId);

    if (result.success) {
      res.status(201).json({
        success: true,
        message: result.message,
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.message,
      });
    }
  }
);

// Bulk block IPs
router.post(
  '/security/blocked-ips/bulk',
  validate({ body: bulkBlockSchema }),
  (req: Request, res: Response) => {
    const { ips, reason, durationMinutes } = req.body;
    const adminId = req.user?.id;

    const result = bulkBlockIPs(ips, reason, durationMinutes, adminId);

    res.status(201).json({
      success: true,
      data: result,
    });
  }
);

// Unblock an IP
router.delete('/security/blocked-ips/:ip', (req: Request, res: Response) => {
  const { ip } = req.params;
  const adminId = req.user?.id;

  const result = unblockIP(ip, adminId);

  if (result.success) {
    res.json({
      success: true,
      message: result.message,
    });
  } else {
    res.status(400).json({
      success: false,
      error: result.message,
    });
  }
});

// Bulk unblock IPs
router.post(
  '/security/blocked-ips/bulk-unblock',
  validate({ body: z.object({ ips: z.array(z.string().ip()).min(1).max(100) }) }),
  (req: Request, res: Response) => {
    const { ips } = req.body;
    const adminId = req.user?.id;

    const result = bulkUnblockIPs(ips, adminId);

    res.json({
      success: true,
      data: result,
    });
  }
);

// Get security events
router.get(
  '/security/events',
  validate({ query: dateRangeSchema }),
  (req: Request, res: Response) => {
    const { since, until, limit, type, severity } = req.query;

    const events = getSecurityEvents({
      since: since ? new Date(since as string) : undefined,
      until: until ? new Date(until as string) : undefined,
      limit: limit ? parseInt(limit as string, 10) : 100,
      type: type as any,
      severity: severity as any,
    });

    res.json({
      success: true,
      data: events,
    });
  }
);

// Resolve a security event
router.patch('/security/events/:id/resolve', (req: Request, res: Response) => {
  const { id } = req.params;
  const adminId = req.user?.id;

  const success = resolveSecurityEvent(id, adminId);

  if (success) {
    res.json({
      success: true,
      message: 'Event resolved successfully',
    });
  } else {
    res.status(404).json({
      success: false,
      error: 'Event not found',
    });
  }
});

// Get whitelisted IPs
router.get('/security/whitelist', (_req: Request, res: Response) => {
  const whitelist = getWhitelistedIPs();
  res.json({
    success: true,
    data: whitelist,
  });
});

// Add IP to whitelist
router.post(
  '/security/whitelist',
  validate({ body: whitelistSchema }),
  (req: Request, res: Response) => {
    const { ip, description } = req.body;

    const success = addToWhitelist({
      ip,
      description,
    });

    if (success) {
      res.status(201).json({
        success: true,
        message: 'IP added to whitelist',
      });
    } else {
      res.status(400).json({
        success: false,
        error: 'IP is invalid or already whitelisted',
      });
    }
  }
);

// Remove IP from whitelist
router.delete('/security/whitelist/:ip', (req: Request, res: Response) => {
  const { ip } = req.params;

  const success = removeFromWhitelist(ip);

  if (success) {
    res.json({
      success: true,
      message: 'IP removed from whitelist',
    });
  } else {
    res.status(404).json({
      success: false,
      error: 'IP not found in whitelist',
    });
  }
});

// Add CIDR range to whitelist
router.post(
  '/security/whitelist/ranges',
  validate({ body: cidrSchema }),
  (req: Request, res: Response) => {
    const { range, description } = req.body;

    const success = addWhitelistRange({
      range,
      description,
    });

    if (success) {
      res.status(201).json({
        success: true,
        message: 'CIDR range added to whitelist',
      });
    } else {
      res.status(400).json({
        success: false,
        error: 'Invalid CIDR range',
      });
    }
  }
);

// Remove CIDR range from whitelist
router.delete('/security/whitelist/ranges/:range', (req: Request, res: Response) => {
  const { range } = req.params;

  const success = removeWhitelistRange(range);

  if (success) {
    res.json({
      success: true,
      message: 'CIDR range removed from whitelist',
    });
  } else {
    res.status(404).json({
      success: false,
      error: 'CIDR range not found',
    });
  }
});

// Export security data
router.get('/security/export', (req: Request, res: Response) => {
  const { format = 'json', since } = req.query;

  const data = exportSecurityData(
    format as 'json' | 'csv',
    since ? new Date(since as string) : undefined
  );

  const contentType = format === 'csv' ? 'text/csv' : 'application/json';
  const filename = `security-export-${new Date().toISOString().split('T')[0]}.${format}`;

  res.setHeader('Content-Type', contentType);
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(data);
});

// Get IP filter configuration
router.get('/security/config', (_req: Request, res: Response) => {
  const config = getIPFilterConfig();
  res.json({
    success: true,
    data: config,
  });
});

// Update IP filter mode
router.patch(
  '/security/config/mode',
  validate({
    body: z.object({
      mode: z.enum(['whitelist', 'blacklist', 'disabled']),
    }),
  }),
  (req: Request, res: Response) => {
    const { mode } = req.body;

    updateIPFilterConfig({ mode });

    res.json({
      success: true,
      message: `IP filter mode updated to ${mode}`,
    });
  }
);

export default router;
