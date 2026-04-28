/**
 * Review Routes
 * 评价相关路由
 *
 * POST /api/v1/reviews - 提交评价
 * GET /api/v1/reviews/received - 获取收到的评价
 * GET /api/v1/reviews/given - 获取发出的评价
 * GET /api/v1/reviews/stats - 获取用户评价统计
 * GET /api/v1/reviews/:id - 获取评价详情
 * PUT /api/v1/reviews/:id - 更新评价
 * DELETE /api/v1/reviews/:id - 删除评价
 * PUT /api/v1/reviews/:id/reply - 回复评价
 * DELETE /api/v1/reviews/reply/:replyId - 删除评价回复
 * POST /api/v1/reviews/:id/report - 举报评价
 */
import { Router } from 'express';
declare const router: Router;
export default router;
//# sourceMappingURL=reviews.d.ts.map