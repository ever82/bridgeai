/**
 * Appeal Routes
 * General appeal system for moderation, violations, and warnings.
 *
 * GET  /api/v1/appeals           - List appeals (admin only, with filters)
 * GET  /api/v1/appeals/:id       - Get single appeal (admin only)
 * POST /api/v1/appeals           - Submit appeal (auth required)
 * POST /api/v1/appeals/:id/review - Admin reviews (admin only)
 * POST /api/v1/appeals/:id/withdraw - Withdraw appeal (owner only)
 */
import { Router } from 'express';
declare const router: Router;
export default router;
//# sourceMappingURL=appeals.d.ts.map