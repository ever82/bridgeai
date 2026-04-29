/**
 * HTTP Request helpers for integration tests
 * Provides base classes and utilities for making HTTP requests
 */
/**
 * HTTP methods supported
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
/**
 * Request options interface
 */
export interface RequestOptions {
    headers?: Record<string, string>;
    query?: Record<string, string | number | boolean>;
    timeout?: number;
}
/**
 * Response wrapper with additional utilities
 */
export interface TestResponse<T = unknown> {
    status: number;
    body: T;
    headers: Record<string, string>;
    text: string;
}
/**
 * Base request class for API testing
 * Provides chainable methods for building requests
 */
export declare class RequestBuilder {
    private httpMethod;
    private requestPath;
    private bodyData;
    private requestHeaders;
    private queryParams;
    private requestTimeout;
    /**
     * Set HTTP method
     */
    setMethod(method: HttpMethod): this;
    /**
     * Set request path
     */
    setPath(path: string): this;
    /**
     * Set request body
     */
    setBody(data: unknown): this;
    /**
     * Set request headers
     */
    setHeaders(headers: Record<string, string>): this;
    /**
     * Set authorization header
     */
    setAuth(token: string): this;
    /**
     * Set query parameters
     */
    setQuery(params: Record<string, string | number | boolean>): this;
    /**
     * Set request timeout
     */
    setTimeout(ms: number): this;
    /**
     * Execute the request
     */
    execute<T = unknown>(): Promise<TestResponse<T>>;
}
/**
 * Convenience methods for common request patterns
 */
export declare const Request: {
    /**
     * Create a new request builder
     */
    builder(): RequestBuilder;
    /**
     * GET request
     */
    get<T = unknown>(path: string, options?: RequestOptions): Promise<TestResponse<T>>;
    /**
     * POST request
     */
    post<T = unknown>(path: string, body: unknown, options?: RequestOptions): Promise<TestResponse<T>>;
    /**
     * PUT request
     */
    put<T = unknown>(path: string, body: unknown, options?: RequestOptions): Promise<TestResponse<T>>;
    /**
     * PATCH request
     */
    patch<T = unknown>(path: string, body: unknown, options?: RequestOptions): Promise<TestResponse<T>>;
    /**
     * DELETE request
     */
    delete<T = unknown>(path: string, options?: RequestOptions): Promise<TestResponse<T>>;
};
/**
 * API base paths
 */
export declare const ApiPaths: {
    v1: (path: string) => string;
    health: string;
    ready: string;
    auth: {
        register: string;
        login: string;
        logout: string;
        refresh: string;
        me: string;
        forgotPassword: string;
        resetPassword: string;
    };
    users: {
        me: string;
        privacy: string;
        avatar: string;
        password: string;
        phone: string;
        email: string;
        devices: string;
        block: string;
    };
    agents: {
        list: string;
        detail: (id: string) => string;
        create: string;
        update: (id: string) => string;
        delete: (id: string) => string;
    };
    points: {
        account: string;
        balance: string;
        transactions: string;
        transactionDetail: (id: string) => string;
        transactionsExport: string;
        stats: string;
        freezes: string;
        rules: string;
        earn: string;
        spend: string;
        checkin: string;
        recharge: string;
    };
};
/**
 * Default headers for JSON API requests
 */
export declare const defaultHeaders: {
    'Content-Type': string;
    Accept: string;
};
/**
 * Error response helper
 * Extracts error details from response for assertions
 */
export declare function extractError(response: TestResponse): {
    message: string;
    code?: string;
    details?: unknown;
};
/**
 * Check if response is successful (2xx)
 */
export declare function isSuccess(status: number): boolean;
/**
 * Check if response is client error (4xx)
 */
export declare function isClientError(status: number): boolean;
/**
 * Check if response is server error (5xx)
 */
export declare function isServerError(status: number): boolean;
/**
 * Request error handler for common error scenarios
 */
export declare function withErrorHandling<T>(fn: () => Promise<TestResponse<T>>): Promise<TestResponse<T>>;
declare const _default: {
    RequestBuilder: typeof RequestBuilder;
    Request: {
        /**
         * Create a new request builder
         */
        builder(): RequestBuilder;
        /**
         * GET request
         */
        get<T = unknown>(path: string, options?: RequestOptions): Promise<TestResponse<T>>;
        /**
         * POST request
         */
        post<T = unknown>(path: string, body: unknown, options?: RequestOptions): Promise<TestResponse<T>>;
        /**
         * PUT request
         */
        put<T = unknown>(path: string, body: unknown, options?: RequestOptions): Promise<TestResponse<T>>;
        /**
         * PATCH request
         */
        patch<T = unknown>(path: string, body: unknown, options?: RequestOptions): Promise<TestResponse<T>>;
        /**
         * DELETE request
         */
        delete<T = unknown>(path: string, options?: RequestOptions): Promise<TestResponse<T>>;
    };
    ApiPaths: {
        v1: (path: string) => string;
        health: string;
        ready: string;
        auth: {
            register: string;
            login: string;
            logout: string;
            refresh: string;
            me: string;
            forgotPassword: string;
            resetPassword: string;
        };
        users: {
            me: string;
            privacy: string;
            avatar: string;
            password: string;
            phone: string;
            email: string;
            devices: string;
            block: string;
        };
        agents: {
            list: string;
            detail: (id: string) => string;
            create: string;
            update: (id: string) => string;
            delete: (id: string) => string;
        };
        points: {
            account: string;
            balance: string;
            transactions: string;
            transactionDetail: (id: string) => string;
            transactionsExport: string;
            stats: string;
            freezes: string;
            rules: string;
            earn: string;
            spend: string;
            checkin: string;
            recharge: string;
        };
    };
    defaultHeaders: {
        'Content-Type': string;
        Accept: string;
    };
    extractError: typeof extractError;
    isSuccess: typeof isSuccess;
    isClientError: typeof isClientError;
    isServerError: typeof isServerError;
    withErrorHandling: typeof withErrorHandling;
};
export default _default;
//# sourceMappingURL=request.d.ts.map