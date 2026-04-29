/**
 * Sensitive Word Management Routes
 * 敏感词管理路由
 *
 * GET    /api/v1/sensitive-words         - List sensitive words (admin only)
 * POST   /api/v1/sensitive-words         - Add new word (admin only)
 * PUT    /api/v1/sensitive-words/:id     - Update word (admin only)
 * DELETE /api/v1/sensitive-words/:id     - Deactivate word (admin only)
 * POST   /api/v1/sensitive-words/reload  - Force reload word library (admin only)
 * POST   /api/v1/sensitive-words/check   - Check a text string (admin only, for testing)
 */
import { Router } from 'express';
declare const router: Router;
export default router;
//# sourceMappingURL=sensitiveWords.d.ts.map