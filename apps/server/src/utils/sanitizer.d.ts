/**
 * Data Sanitizer
 * 数据脱敏工具
 *
 * 自动脱敏敏感信息：密码、Token、手机号、邮箱等
 */
export type SanitizeRule = {
    pattern: RegExp;
    replacement: string;
};
export declare const defaultSanitizeRules: SanitizeRule[];
/**
 * 脱敏字符串
 * @param str 输入字符串
 * @param rules 脱敏规则
 * @returns 脱敏后的字符串
 */
export declare function sanitizeString(str: string, rules?: SanitizeRule[]): string;
/**
 * 脱敏对象
 * @param obj 输入对象
 * @param sensitiveFields 敏感字段列表
 * @returns 脱敏后的对象
 */
export declare function sanitizeObject<T extends Record<string, unknown>>(obj: T, sensitiveFields?: string[]): T;
/**
 * 脱敏请求/响应体
 * @param body 请求或响应体
 * @returns 脱敏后的数据
 */
export declare function sanitizeBody(body: unknown): unknown;
/**
 * 脱敏 URL 查询参数
 * @param url URL 字符串
 * @returns 脱敏后的 URL
 */
export declare function sanitizeUrl(url: string): string;
/**
 * 脱敏 HTTP Header
 * @param headers HTTP 头对象
 * @returns 脱敏后的头对象
 */
export declare function sanitizeHeaders(headers: Record<string, string | string[] | undefined>): Record<string, string | string[] | undefined>;
/**
 * 创建脱敏中间件用的函数
 * @returns 脱敏函数
 */
export declare function createSanitizer(): {
    string: typeof sanitizeString;
    object: typeof sanitizeObject;
    body: typeof sanitizeBody;
    url: typeof sanitizeUrl;
    headers: typeof sanitizeHeaders;
};
//# sourceMappingURL=sanitizer.d.ts.map