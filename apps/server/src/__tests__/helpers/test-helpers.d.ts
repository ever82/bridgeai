import type { Request, Response, NextFunction } from 'express';
/**
 * Test helper utilities
 */
interface MockResponse extends Response {
    statusCode: number;
    body: unknown;
    headers: Record<string, string | string[]>;
    cookies: Record<string, {
        value: string;
        options?: unknown;
    }>;
}
/**
 * Create a mock Express Request object
 */
export declare function createMockRequest(overrides?: Partial<Request>): Request;
/**
 * Create a mock Express Response object
 */
export declare function createMockResponse(): MockResponse;
/**
 * Create a mock NextFunction
 */
export declare function createMockNext(): NextFunction;
/**
 * Create mock request/response/next for middleware testing
 */
export declare function createMockMiddlewareArgs(reqOverrides?: Partial<Request>): {
    req: Request;
    res: MockResponse;
    next: NextFunction;
};
/**
 * Wait for a specified number of milliseconds
 */
export declare function sleep(ms: number): Promise<void>;
/**
 * Generate a valid UUID v4 for testing
 */
export declare function generateUUID(): string;
/**
 * Type guard for error objects
 */
export declare function isError(obj: unknown): obj is Error;
export {};
//# sourceMappingURL=test-helpers.d.ts.map