/**
 * Request Context Middleware
 * 请求上下文中间件
 *
 * 使用 AsyncLocalStorage 实现请求上下文追踪
 * 支持 requestId、用户上下文、链路追踪
 */
import { AsyncLocalStorage } from 'async_hooks';
import { Request, Response, NextFunction } from 'express';
export interface IRequestContext {
    requestId: string;
    userId?: string;
    userRole?: string;
    sessionId?: string;
    traceId?: string;
    spanId: string;
    parentSpanId?: string;
    startTime: number;
    path: string;
    method: string;
    ip: string;
    userAgent?: string;
    logWarning: (message: string, data?: Record<string, unknown>) => void;
    logError: (message: string, data?: Record<string, unknown>) => void;
    [key: string]: unknown;
}
declare const asyncLocalStorage: AsyncLocalStorage<IRequestContext>;
/**
 * 获取当前请求上下文
 * @returns 当前请求上下文或 undefined
 */
export declare function getRequestContext(): IRequestContext | undefined;
/**
 * 获取当前请求ID
 * @returns 请求ID或 undefined
 */
export declare function getRequestId(): string | undefined;
/**
 * 获取当前用户ID
 * @returns 用户ID或 undefined
 */
export declare function getCurrentUserId(): string | undefined;
/**
 * 在请求上下文中运行函数
 * @param context 请求上下文
 * @param fn 要执行的函数
 * @returns 函数返回值
 */
export declare function runWithContext<T>(context: IRequestContext, fn: () => T): T;
/**
 * 生成请求ID
 * @returns 唯一请求ID
 */
export declare function generateRequestId(): string;
/**
 * 生成追踪ID
 * @returns 唯一追踪ID
 */
export declare function generateTraceId(): string;
/**
 * 生成 Span ID
 * @returns 唯一 Span ID
 */
export declare function generateSpanId(): string;
/**
 * 创建初始请求上下文
 * @param req Express 请求对象
 * @returns 请求上下文
 */
export declare function createRequestContext(req: Request): IRequestContext;
/**
 * 设置用户上下文
 * @param userId 用户ID
 * @param userRole 用户角色
 * @param sessionId 会话ID
 */
export declare function setUserContext(userId: string, userRole?: string, sessionId?: string): void;
/**
 * 获取请求持续时间
 * @returns 请求持续时间（毫秒）
 */
export declare function getRequestDuration(): number;
/**
 * 请求上下文中间件
 * 为每个请求创建上下文并注入到 AsyncLocalStorage
 */
export declare function requestContextMiddleware(req: Request, res: Response, next: NextFunction): void;
/**
 * 获取完整的上下文信息（用于日志）
 * @returns 上下文信息对象
 */
export declare function getContextForLog(): Record<string, unknown>;
/**
 * 添加上下文数据
 * @param key 键
 * @param value 值
 */
export declare function setContextData(key: string, value: unknown): void;
/**
 * 获取上下文数据
 * @param key 键
 * @returns 值
 */
export declare function getContextData(key: string): unknown;
export { asyncLocalStorage };
//# sourceMappingURL=requestContext.d.ts.map