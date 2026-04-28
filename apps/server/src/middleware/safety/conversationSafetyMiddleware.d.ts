/**
 * Conversation Safety Middleware
 * 对话安全中间件
 */
import { Request, Response, NextFunction } from 'express';
export declare function conversationSafetyCheck(req: Request, res: Response, next: NextFunction): Promise<void>;
declare const _default: {
    conversationSafetyCheck: typeof conversationSafetyCheck;
};
export default _default;
//# sourceMappingURL=conversationSafetyMiddleware.d.ts.map