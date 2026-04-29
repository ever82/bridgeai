/**
 * Moderation Queue Routes
 * 审核队列路由
 *
 * GET  /api/v1/moderation/queue                - List queue items (admin only)
 * GET  /api/v1/moderation/queue/stats          - Queue statistics (admin only)
 * GET  /api/v1/moderation/queue/:id            - Get single item (admin only)
 * POST /api/v1/moderation/queue/:id/assign     - Assign to moderator (admin only)
 * POST /api/v1/moderation/queue/:id/resolve    - Resolve with action (admin only)
 * POST /api/v1/moderation/queue/:id/escalate   - Escalate item (admin only)
 * POST /api/v1/moderation/queue/claim          - Claim next priority item (admin only)
 * POST /api/v1/moderation/queue/:id/reopen     - Reopen resolved item (admin only)
 * POST /api/v1/moderation/queue/batch-resolve  - Batch resolve items (admin only)
 */
import { Router } from 'express';
declare const router: Router;
export default router;
//# sourceMappingURL=moderation.d.ts.map