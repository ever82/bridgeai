import request from 'supertest';
import app from '../../app';
/**
 * Base request class for API testing
 * Provides chainable methods for building requests
 */
export class RequestBuilder {
    httpMethod = 'GET';
    requestPath = '';
    bodyData = null;
    requestHeaders = {};
    queryParams = {};
    requestTimeout = 30000;
    /**
     * Set HTTP method
     */
    setMethod(method) {
        this.httpMethod = method;
        return this;
    }
    /**
     * Set request path
     */
    setPath(path) {
        this.requestPath = path;
        return this;
    }
    /**
     * Set request body
     */
    setBody(data) {
        this.bodyData = data;
        return this;
    }
    /**
     * Set request headers
     */
    setHeaders(headers) {
        this.requestHeaders = { ...this.requestHeaders, ...headers };
        return this;
    }
    /**
     * Set authorization header
     */
    setAuth(token) {
        this.requestHeaders.Authorization = `Bearer ${token}`;
        return this;
    }
    /**
     * Set query parameters
     */
    setQuery(params) {
        this.queryParams = Object.entries(params).reduce((acc, [key, value]) => {
            acc[key] = String(value);
            return acc;
        }, {});
        return this;
    }
    /**
     * Set request timeout
     */
    setTimeout(ms) {
        this.requestTimeout = ms;
        return this;
    }
    /**
     * Execute the request
     */
    async execute() {
        const methodLower = this.httpMethod.toLowerCase();
        let req = request(app)[methodLower](this.requestPath);
        // Set timeout
        req = req.timeout(this.requestTimeout);
        // Set headers
        Object.entries(this.requestHeaders).forEach(([key, value]) => {
            req = req.set(key, value);
        });
        // Set query parameters
        if (Object.keys(this.queryParams).length > 0) {
            req = req.query(this.queryParams);
        }
        // Set body for non-GET requests
        if (this.bodyData !== null && this.httpMethod !== 'GET') {
            req = req.send(this.bodyData);
        }
        const res = await req;
        return {
            status: res.status,
            body: res.body,
            headers: res.headers,
            text: res.text,
        };
    }
}
/**
 * Convenience methods for common request patterns
 */
export const Request = {
    /**
     * Create a new request builder
     */
    builder() {
        return new RequestBuilder();
    },
    /**
     * GET request
     */
    async get(path, options = {}) {
        const builder = new RequestBuilder().setMethod('GET').setPath(path);
        if (options.headers) {
            builder.setHeaders(options.headers);
        }
        if (options.query) {
            builder.setQuery(options.query);
        }
        if (options.timeout) {
            builder.setTimeout(options.timeout);
        }
        return builder.execute();
    },
    /**
     * POST request
     */
    async post(path, body, options = {}) {
        const builder = new RequestBuilder().setMethod('POST').setPath(path).setBody(body);
        if (options.headers) {
            builder.setHeaders(options.headers);
        }
        if (options.timeout) {
            builder.setTimeout(options.timeout);
        }
        return builder.execute();
    },
    /**
     * PUT request
     */
    async put(path, body, options = {}) {
        const builder = new RequestBuilder().setMethod('PUT').setPath(path).setBody(body);
        if (options.headers) {
            builder.setHeaders(options.headers);
        }
        if (options.timeout) {
            builder.setTimeout(options.timeout);
        }
        return builder.execute();
    },
    /**
     * PATCH request
     */
    async patch(path, body, options = {}) {
        const builder = new RequestBuilder().setMethod('PATCH').setPath(path).setBody(body);
        if (options.headers) {
            builder.setHeaders(options.headers);
        }
        if (options.timeout) {
            builder.setTimeout(options.timeout);
        }
        return builder.execute();
    },
    /**
     * DELETE request
     */
    async delete(path, options = {}) {
        const builder = new RequestBuilder().setMethod('DELETE').setPath(path);
        if (options.headers) {
            builder.setHeaders(options.headers);
        }
        if (options.timeout) {
            builder.setTimeout(options.timeout);
        }
        return builder.execute();
    },
};
/**
 * API base paths
 */
export const ApiPaths = {
    v1: (path) => `/api/v1${path}`,
    health: '/health',
    ready: '/ready',
    auth: {
        register: '/api/v1/auth/register',
        login: '/api/v1/auth/login',
        logout: '/api/v1/auth/logout',
        refresh: '/api/v1/auth/refresh',
        me: '/api/v1/auth/me',
        forgotPassword: '/api/v1/auth/forgot-password',
        resetPassword: '/api/v1/auth/reset-password',
    },
    users: {
        me: '/api/v1/users/me',
        privacy: '/api/v1/users/privacy',
        avatar: '/api/v1/users/avatar',
        password: '/api/v1/users/password',
        phone: '/api/v1/users/phone',
        email: '/api/v1/users/email',
        devices: '/api/v1/users/devices',
        block: '/api/v1/users/block',
    },
    agents: {
        list: '/api/v1/agents',
        detail: (id) => `/api/v1/agents/${id}`,
        create: '/api/v1/agents',
        update: (id) => `/api/v1/agents/${id}`,
        delete: (id) => `/api/v1/agents/${id}`,
    },
    points: {
        account: '/api/v1/points/account',
        balance: '/api/v1/points/balance',
        transactions: '/api/v1/points/transactions',
        transactionDetail: (id) => `/api/v1/points/transactions/${id}`,
        transactionsExport: '/api/v1/points/transactions/export',
        stats: '/api/v1/points/stats',
        freezes: '/api/v1/points/freezes',
        rules: '/api/v1/points/rules',
        earn: '/api/v1/points/earn',
        spend: '/api/v1/points/spend',
        checkin: '/api/v1/points/checkin',
        recharge: '/api/v1/points/recharge',
    },
};
/**
 * Default headers for JSON API requests
 */
export const defaultHeaders = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
};
/**
 * Error response helper
 * Extracts error details from response for assertions
 */
export function extractError(response) {
    if (!response.body || typeof response.body !== 'object') {
        return { message: response.text || 'Unknown error' };
    }
    const body = response.body;
    return {
        message: String(body.message || body.error || 'Unknown error'),
        code: body.errorCode,
        details: body.details,
    };
}
/**
 * Check if response is successful (2xx)
 */
export function isSuccess(status) {
    return status >= 200 && status < 300;
}
/**
 * Check if response is client error (4xx)
 */
export function isClientError(status) {
    return status >= 400 && status < 500;
}
/**
 * Check if response is server error (5xx)
 */
export function isServerError(status) {
    return status >= 500 && status < 600;
}
/**
 * Request error handler for common error scenarios
 */
export async function withErrorHandling(fn) {
    try {
        return await fn();
    }
    catch (error) {
        if (error instanceof Error && error.message.includes('timeout')) {
            return {
                status: 408,
                body: { error: 'Request timeout' },
                headers: {},
                text: 'Request timeout',
            };
        }
        if (error instanceof Error && error.message.includes('ECONNREFUSED')) {
            return {
                status: 503,
                body: { error: 'Service unavailable' },
                headers: {},
                text: 'Service unavailable',
            };
        }
        throw error;
    }
}
export default {
    RequestBuilder,
    Request,
    ApiPaths,
    defaultHeaders,
    extractError,
    isSuccess,
    isClientError,
    isServerError,
    withErrorHandling,
};
//# sourceMappingURL=request.js.map