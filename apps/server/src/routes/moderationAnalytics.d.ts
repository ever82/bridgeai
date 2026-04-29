/**
 * Moderation Analytics Routes
 * 审核数据统计分析路由
 *
 * GET /api/v1/moderation/analytics/overview      - Overview statistics (admin only)
 * GET /api/v1/moderation/analytics/trends         - Report volume trends (admin only)
 * GET /api/v1/moderation/analytics/violations     - Violation type breakdown (admin only)
 * GET /api/v1/moderation/analytics/content-types  - Content type breakdown (admin only)
 * GET /api/v1/moderation/analytics/efficiency     - Moderation efficiency metrics (admin only)
 * GET /api/v1/moderation/analytics/accuracy       - Report accuracy (admin only)
 * GET /api/v1/moderation/analytics/moderator/:id  - Moderator performance (admin only)
 */
import { Router } from 'express';
declare const router: Router;
export default router;
//# sourceMappingURL=moderationAnalytics.d.ts.map