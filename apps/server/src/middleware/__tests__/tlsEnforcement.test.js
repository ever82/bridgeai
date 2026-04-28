"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const tlsEnforcement_1 = require("../tlsEnforcement");
(0, globals_1.describe)('TLS Enforcement Middleware', () => {
    const originalNodeEnv = process.env.NODE_ENV;
    let mockReq;
    let mockRes;
    let mockNext;
    let redirectUrl;
    let responseStatus;
    let responseBody;
    let headers;
    (0, globals_1.beforeEach)(() => {
        redirectUrl = null;
        responseStatus = null;
        responseBody = null;
        headers = {};
        mockReq = {
            headers: {},
            originalUrl: '/api/test',
        };
        mockRes = {
            redirect(status, url) {
                responseStatus = status;
                redirectUrl = url;
                return mockRes;
            },
            status(code) {
                responseStatus = code;
                return {
                    json(body) {
                        responseBody = body;
                    },
                };
            },
            setHeader(key, value) {
                headers[key] = value;
            },
            json(body) {
                responseBody = body;
            },
        };
        mockNext = jest.fn();
    });
    (0, globals_1.afterEach)(() => {
        process.env.NODE_ENV = originalNodeEnv;
    });
    (0, globals_1.it)('should skip enforcement in non-production environment', () => {
        process.env.NODE_ENV = 'development';
        const middleware = (0, tlsEnforcement_1.tlsEnforcement)();
        middleware(mockReq, mockRes, mockNext);
        (0, globals_1.expect)(mockNext).toHaveBeenCalled();
        (0, globals_1.expect)(redirectUrl).toBeNull();
    });
    (0, globals_1.it)('should redirect HTTP to HTTPS in production', () => {
        process.env.NODE_ENV = 'production';
        mockReq.headers = { host: 'example.com' };
        mockReq.headers['x-forwarded-proto'] = 'http';
        const middleware = (0, tlsEnforcement_1.tlsEnforcement)();
        middleware(mockReq, mockRes, mockNext);
        (0, globals_1.expect)(redirectUrl).toBe('https://example.com/api/test');
    });
    (0, globals_1.it)('should set HSTS header for HTTPS requests in production', () => {
        process.env.NODE_ENV = 'production';
        mockReq.headers['x-forwarded-proto'] = 'https';
        mockReq.headers['host'] = 'example.com';
        const middleware = (0, tlsEnforcement_1.tlsEnforcement)();
        middleware(mockReq, mockRes, mockNext);
        (0, globals_1.expect)(headers['Strict-Transport-Security']).toBe('max-age=31536000; includeSubDomains; preload');
        (0, globals_1.expect)(mockNext).toHaveBeenCalled();
    });
    (0, globals_1.it)('should reject request without host in production', () => {
        process.env.NODE_ENV = 'production';
        mockReq.headers['x-forwarded-proto'] = 'http';
        delete mockReq.headers['host'];
        const middleware = (0, tlsEnforcement_1.tlsEnforcement)();
        middleware(mockReq, mockRes, mockNext);
        (0, globals_1.expect)(responseStatus).toBe(400);
        (0, globals_1.expect)(responseBody.error).toBe('HTTPS_REQUIRED');
    });
});
//# sourceMappingURL=tlsEnforcement.test.js.map