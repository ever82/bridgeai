/**
 * Report Routes
 * 通用举报相关路由
 *
 * POST /api/v1/reports - 创建举报（认证用户）
 * GET /api/v1/reports - 列出举报（管理员，分页+状态筛选）
 * POST /api/v1/reports/:id/handle - 管理员处理举报（APPROVE/DISMISS/HIDE）
 * POST /api/v1/reports/:id/evidence - 上传举报证据图片
 */
import { Router } from 'express';
declare const router: Router;
export default router;
//# sourceMappingURL=reports.d.ts.map