/**
 * Request Context Middleware
 * 请求上下文中间件
 *
 * 使用 AsyncLocalStorage 实现请求上下文追踪
 * 支持 requestId、用户上下文、链路追踪
 */

import { AsyncLocalStorage } from 'async_hooks';

import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

// 请求上下文接口
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
  [key: string]: unknown;
}

// 创建 AsyncLocalStorage 实例
const asyncLocalStorage = new AsyncLocalStorage<IRequestContext>();

/**
 * 获取当前请求上下文
 * @returns 当前请求上下文或 undefined
 */
export function getRequestContext(): IRequestContext | undefined {
  return asyncLocalStorage.getStore();
}

/**
 * 获取当前请求ID
 * @returns 请求ID或 undefined
 */
export function getRequestId(): string | undefined {
  return asyncLocalStorage.getStore()?.requestId;
}

/**
 * 获取当前用户ID
 * @returns 用户ID或 undefined
 */
export function getCurrentUserId(): string | undefined {
  return asyncLocalStorage.getStore()?.userId;
}

/**
 * 在请求上下文中运行函数
 * @param context 请求上下文
 * @param fn 要执行的函数
 * @returns 函数返回值
 */
export function runWithContext<T>(context: IRequestContext, fn: () => T): T {
  return asyncLocalStorage.run(context, fn);
}

/**
 * 生成请求ID
 * @returns 唯一请求ID
 */
export function generateRequestId(): string {
  return `req_${uuidv4().replace(/-/g, '')}`;
}

/**
 * 生成追踪ID
 * @returns 唯一追踪ID
 */
export function generateTraceId(): string {
  return `trace_${uuidv4().replace(/-/g, '')}`;
}

/**
 * 生成 Span ID
 * @returns 唯一 Span ID
 */
export function generateSpanId(): string {
  return `span_${uuidv4().replace(/-/g, '').substring(0, 16)}`;
}

/**
 * 创建初始请求上下文
 * @param req Express 请求对象
 * @returns 请求上下文
 */
export function createRequestContext(req: Request): IRequestContext {
  const requestId = (req.headers['x-request-id'] as string) || generateRequestId();
  const traceId = (req.headers['x-trace-id'] as string) || generateTraceId();
  const parentSpanId = req.headers['x-span-id'] as string | undefined;

  return {
    requestId,
    traceId,
    spanId: generateSpanId(),
    parentSpanId,
    startTime: Date.now(),
    path: req.path,
    method: req.method,
    ip: req.ip || req.socket.remoteAddress || 'unknown',
    userAgent: req.headers['user-agent'],
  };
}

/**
 * 设置用户上下文
 * @param userId 用户ID
 * @param userRole 用户角色
 * @param sessionId 会话ID
 */
export function setUserContext(
  userId: string,
  userRole?: string,
  sessionId?: string
): void {
  const context = asyncLocalStorage.getStore();
  if (context) {
    context.userId = userId;
    if (userRole) context.userRole = userRole;
    if (sessionId) context.sessionId = sessionId;
  }
}

/**
 * 获取请求持续时间
 * @returns 请求持续时间（毫秒）
 */
export function getRequestDuration(): number {
  const context = asyncLocalStorage.getStore();
  if (context) {
    return Date.now() - context.startTime;
  }
  return 0;
}

/**
 * 请求上下文中间件
 * 为每个请求创建上下文并注入到 AsyncLocalStorage
 */
export function requestContextMiddleware(req: Request, res: Response, next: NextFunction): void {
  const context = createRequestContext(req);

  // 设置响应头
  res.setHeader('X-Request-Id', context.requestId);
  if (context.traceId) {
    res.setHeader('X-Trace-Id', context.traceId);
  }
  res.setHeader('X-Span-Id', context.spanId);

  // 在上下文中运行
  runWithContext(context, () => {
    // 响应完成时记录
    res.on('finish', () => {
      const duration = Date.now() - context.startTime;
      // 可以在这里添加日志记录
    });

    next();
  });
}

/**
 * 获取完整的上下文信息（用于日志）
 * @returns 上下文信息对象
 */
export function getContextForLog(): Record<string, unknown> {
  const context = asyncLocalStorage.getStore();
  if (!context) {
    return {};
  }

  return {
    requestId: context.requestId,
    traceId: context.traceId,
    spanId: context.spanId,
    parentSpanId: context.parentSpanId,
    userId: context.userId,
    userRole: context.userRole,
    duration: Date.now() - context.startTime,
  };
}

/**
 * 添加上下文数据
 * @param key 键
 * @param value 值
 */
export function setContextData(key: string, value: unknown): void {
  const context = asyncLocalStorage.getStore();
  if (context) {
    context[key] = value;
  }
}

/**
 * 获取上下文数据
 * @param key 键
 * @returns 值
 */
export function getContextData(key: string): unknown {
  const context = asyncLocalStorage.getStore();
  return context?.[key];
}

// 导出 AsyncLocalStorage 实例（供高级使用）
export { asyncLocalStorage };
