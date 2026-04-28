"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const security_1 = require("../security");
// Mock request context
jest.mock('../requestContext', () => ({
    getRequestContext: () => ({
        logWarning: jest.fn(),
    }),
}));
describe('Security Middleware', () => {
    let mockReq;
    let mockRes;
    let mockNext;
    beforeEach(() => {
        mockReq = {
            body: {},
            query: {},
            params: {},
            path: '/test',
            method: 'POST',
            ip: '127.0.0.1',
        };
        mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
        };
        mockNext = jest.fn();
    });
    describe('xssProtection', () => {
        it('should allow safe content', () => {
            mockReq.body = { name: 'John Doe', message: 'Hello World' };
            (0, security_1.xssProtection)(mockReq, mockRes, mockNext);
            expect(mockNext).toHaveBeenCalled();
            expect(mockRes.status).not.toHaveBeenCalled();
        });
        it('should block script tags in body', () => {
            mockReq.body = { content: '<script>alert(1)</script>' };
            (0, security_1.xssProtection)(mockReq, mockRes, mockNext);
            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
                success: false,
                error: expect.objectContaining({
                    code: 'XSS_DETECTED',
                }),
            }));
        });
        it('should block javascript: protocol', () => {
            mockReq.body = { url: 'javascript:alert(1)' };
            (0, security_1.xssProtection)(mockReq, mockRes, mockNext);
            expect(mockRes.status).toHaveBeenCalledWith(400);
        });
        it('should block event handlers', () => {
            mockReq.body = { content: '<img onerror=alert(1) src=x>' };
            (0, security_1.xssProtection)(mockReq, mockRes, mockNext);
            expect(mockRes.status).toHaveBeenCalledWith(400);
        });
        it('should block iframes', () => {
            mockReq.body = { content: '<iframe src="evil.com"></iframe>' };
            (0, security_1.xssProtection)(mockReq, mockRes, mockNext);
            expect(mockRes.status).toHaveBeenCalledWith(400);
        });
        it('should check query parameters', () => {
            mockReq.query = { search: '<script>alert(1)</script>' };
            (0, security_1.xssProtection)(mockReq, mockRes, mockNext);
            expect(mockRes.status).toHaveBeenCalledWith(400);
        });
        it('should check nested objects', () => {
            mockReq.body = {
                user: {
                    bio: '<script>alert(1)</script>',
                },
            };
            (0, security_1.xssProtection)(mockReq, mockRes, mockNext);
            expect(mockRes.status).toHaveBeenCalledWith(400);
        });
        it('should handle arrays', () => {
            mockReq.body = {
                items: ['<script>alert(1)</script>'],
            };
            (0, security_1.xssProtection)(mockReq, mockRes, mockNext);
            expect(mockRes.status).toHaveBeenCalledWith(400);
        });
        it('should call next() for safe requests', () => {
            mockReq.body = { safe: 'content' };
            (0, security_1.xssProtection)(mockReq, mockRes, mockNext);
            expect(mockNext).toHaveBeenCalled();
            expect(mockRes.status).not.toHaveBeenCalled();
        });
    });
    describe('sqlInjectionProtection', () => {
        it('should allow safe content', () => {
            mockReq.body = { name: "John O'Brien", search: 'test query' };
            (0, security_1.sqlInjectionProtection)(mockReq, mockRes, mockNext);
            expect(mockNext).toHaveBeenCalled();
        });
        it('should block SQL UNION attack', () => {
            mockReq.body = { id: "1' UNION SELECT * FROM users--" };
            (0, security_1.sqlInjectionProtection)(mockReq, mockRes, mockNext);
            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
                success: false,
                error: expect.objectContaining({
                    code: 'SQL_INJECTION_DETECTED',
                }),
            }));
        });
        it('should block SQL comment attack', () => {
            mockReq.body = { id: '1; DROP TABLE users--' };
            (0, security_1.sqlInjectionProtection)(mockReq, mockRes, mockNext);
            expect(mockRes.status).toHaveBeenCalledWith(400);
        });
        it('should check query parameters', () => {
            mockReq.query = { filter: "name=' OR '1'='1" };
            (0, security_1.sqlInjectionProtection)(mockReq, mockRes, mockNext);
            expect(mockRes.status).toHaveBeenCalledWith(400);
        });
    });
    describe('nosqlInjectionProtection', () => {
        it('should allow safe content', () => {
            mockReq.body = { name: 'John', age: 30 };
            (0, security_1.nosqlInjectionProtection)(mockReq, mockRes, mockNext);
            expect(mockNext).toHaveBeenCalled();
        });
        it('should block MongoDB operator in key', () => {
            mockReq.body = { $where: 'this.password.length > 0' };
            (0, security_1.nosqlInjectionProtection)(mockReq, mockRes, mockNext);
            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
                success: false,
                error: expect.objectContaining({
                    code: 'NOSQL_INJECTION_DETECTED',
                }),
            }));
        });
        it('should block nested MongoDB operators', () => {
            mockReq.body = {
                user: {
                    $ne: null,
                },
            };
            (0, security_1.nosqlInjectionProtection)(mockReq, mockRes, mockNext);
            expect(mockRes.status).toHaveBeenCalledWith(400);
        });
        it('should check query parameters', () => {
            mockReq.query = { $gt: '' };
            (0, security_1.nosqlInjectionProtection)(mockReq, mockRes, mockNext);
            expect(mockRes.status).toHaveBeenCalledWith(400);
        });
    });
    describe('escapeHtml', () => {
        it('should escape < character', () => {
            expect((0, security_1.escapeHtml)('<script>')).toBe('&lt;script&gt;');
        });
        it('should escape > character', () => {
            expect((0, security_1.escapeHtml)('text>')).toBe('text&gt;');
        });
        it('should escape & character', () => {
            expect((0, security_1.escapeHtml)('AT&T')).toBe('AT&amp;T');
        });
        it('should escape " character', () => {
            expect((0, security_1.escapeHtml)('say "hello"')).toBe('say &quot;hello&quot;');
        });
        it('should escape \' character', () => {
            expect((0, security_1.escapeHtml)("it's")).toBe('it&#x27;s');
        });
        it('should handle empty string', () => {
            expect((0, security_1.escapeHtml)('')).toBe('');
        });
    });
});
//# sourceMappingURL=security.test.js.map