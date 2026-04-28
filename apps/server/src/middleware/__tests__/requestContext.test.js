"use strict";
/**
 * Request Context Middleware Tests
 */
Object.defineProperty(exports, "__esModule", { value: true });
const requestContext_1 = require("../requestContext");
describe('Request Context Middleware', () => {
    describe('generateRequestId', () => {
        it('should generate a unique request ID', () => {
            const id1 = (0, requestContext_1.generateRequestId)();
            const id2 = (0, requestContext_1.generateRequestId)();
            expect(id1).toMatch(/^req_[a-f0-9]{32}$/);
            expect(id2).toMatch(/^req_[a-f0-9]{32}$/);
            expect(id1).not.toBe(id2);
        });
    });
    describe('generateTraceId', () => {
        it('should generate a unique trace ID', () => {
            const id = (0, requestContext_1.generateTraceId)();
            expect(id).toMatch(/^trace_[a-f0-9]{32}$/);
        });
    });
    describe('generateSpanId', () => {
        it('should generate a unique span ID', () => {
            const id = (0, requestContext_1.generateSpanId)();
            expect(id).toMatch(/^span_[a-f0-9]{16}$/);
        });
    });
    describe('createRequestContext', () => {
        it('should create context from request', () => {
            const mockReq = {
                path: '/api/test',
                method: 'GET',
                ip: '127.0.0.1',
                socket: { remoteAddress: '127.0.0.1' },
                headers: {
                    'user-agent': 'test-agent',
                },
            };
            const context = (0, requestContext_1.createRequestContext)(mockReq);
            expect(context.path).toBe('/api/test');
            expect(context.method).toBe('GET');
            expect(context.ip).toBe('127.0.0.1');
            expect(context.userAgent).toBe('test-agent');
            expect(context.requestId).toMatch(/^req_/);
            expect(context.traceId).toMatch(/^trace_/);
            expect(context.spanId).toMatch(/^span_/);
            expect(context.startTime).toBeDefined();
        });
        it('should use provided request ID from header', () => {
            const mockReq = {
                path: '/api/test',
                method: 'GET',
                ip: '127.0.0.1',
                socket: { remoteAddress: '127.0.0.1' },
                headers: {
                    'x-request-id': 'custom-request-id',
                },
            };
            const context = (0, requestContext_1.createRequestContext)(mockReq);
            expect(context.requestId).toBe('custom-request-id');
        });
        it('should use provided trace ID from header', () => {
            const mockReq = {
                path: '/api/test',
                method: 'GET',
                ip: '127.0.0.1',
                socket: { remoteAddress: '127.0.0.1' },
                headers: {
                    'x-trace-id': 'custom-trace-id',
                },
            };
            const context = (0, requestContext_1.createRequestContext)(mockReq);
            expect(context.traceId).toBe('custom-trace-id');
        });
        it('should handle missing IP', () => {
            const mockReq = {
                path: '/api/test',
                method: 'GET',
                ip: undefined,
                socket: { remoteAddress: undefined },
                headers: {},
            };
            const context = (0, requestContext_1.createRequestContext)(mockReq);
            expect(context.ip).toBe('unknown');
        });
    });
    describe('runWithContext', () => {
        it('should run function with context', () => {
            const context = {
                requestId: 'test-req-id',
                traceId: 'test-trace-id',
                spanId: 'test-span-id',
                startTime: Date.now(),
                path: '/test',
                method: 'GET',
                ip: '127.0.0.1',
            };
            const result = (0, requestContext_1.runWithContext)(context, () => {
                const ctx = (0, requestContext_1.getRequestContext)();
                expect(ctx?.requestId).toBe('test-req-id');
                return 'success';
            });
            expect(result).toBe('success');
        });
        it('should return context value from inside context', () => {
            const context = {
                requestId: 'test-req-id',
                traceId: 'test-trace-id',
                spanId: 'test-span-id',
                startTime: Date.now(),
                path: '/test',
                method: 'GET',
                ip: '127.0.0.1',
            };
            const result = (0, requestContext_1.runWithContext)(context, () => {
                return (0, requestContext_1.getRequestId)();
            });
            expect(result).toBe('test-req-id');
        });
    });
    describe('setUserContext', () => {
        it('should set user context', () => {
            const context = {
                requestId: 'test-req-id',
                traceId: 'test-trace-id',
                spanId: 'test-span-id',
                startTime: Date.now(),
                path: '/test',
                method: 'GET',
                ip: '127.0.0.1',
            };
            (0, requestContext_1.runWithContext)(context, () => {
                (0, requestContext_1.setUserContext)('user123', 'admin', 'session456');
                expect((0, requestContext_1.getCurrentUserId)()).toBe('user123');
                expect((0, requestContext_1.getRequestContext)()?.userRole).toBe('admin');
                expect((0, requestContext_1.getRequestContext)()?.sessionId).toBe('session456');
            });
        });
        it('should not throw when no context', () => {
            expect(() => (0, requestContext_1.setUserContext)('user123')).not.toThrow();
        });
    });
    describe('getRequestDuration', () => {
        it('should calculate request duration', () => {
            const context = {
                requestId: 'test-req-id',
                traceId: 'test-trace-id',
                spanId: 'test-span-id',
                startTime: Date.now() - 1000,
                path: '/test',
                method: 'GET',
                ip: '127.0.0.1',
            };
            (0, requestContext_1.runWithContext)(context, () => {
                const duration = (0, requestContext_1.getRequestDuration)();
                expect(duration).toBeGreaterThanOrEqual(1000);
            });
        });
        it('should return 0 when no context', () => {
            expect((0, requestContext_1.getRequestDuration)()).toBe(0);
        });
    });
    describe('setContextData and getContextData', () => {
        it('should set and get context data', () => {
            const context = {
                requestId: 'test-req-id',
                traceId: 'test-trace-id',
                spanId: 'test-span-id',
                startTime: Date.now(),
                path: '/test',
                method: 'GET',
                ip: '127.0.0.1',
            };
            (0, requestContext_1.runWithContext)(context, () => {
                (0, requestContext_1.setContextData)('customKey', 'customValue');
                expect((0, requestContext_1.getContextData)('customKey')).toBe('customValue');
            });
        });
        it('should return undefined for non-existent key', () => {
            const context = {
                requestId: 'test-req-id',
                traceId: 'test-trace-id',
                spanId: 'test-span-id',
                startTime: Date.now(),
                path: '/test',
                method: 'GET',
                ip: '127.0.0.1',
            };
            (0, requestContext_1.runWithContext)(context, () => {
                expect((0, requestContext_1.getContextData)('nonExistent')).toBeUndefined();
            });
        });
    });
    describe('getContextForLog', () => {
        it('should return context for logging', () => {
            const context = {
                requestId: 'test-req-id',
                traceId: 'test-trace-id',
                spanId: 'test-span-id',
                parentSpanId: 'parent-span',
                startTime: Date.now() - 500,
                path: '/test',
                method: 'GET',
                ip: '127.0.0.1',
            };
            (0, requestContext_1.runWithContext)(context, () => {
                const logContext = (0, requestContext_1.getContextForLog)();
                expect(logContext.requestId).toBe('test-req-id');
                expect(logContext.traceId).toBe('test-trace-id');
                expect(logContext.spanId).toBe('test-span-id');
                expect(logContext.parentSpanId).toBe('parent-span');
                expect(logContext.duration).toBeGreaterThanOrEqual(500);
            });
        });
        it('should return empty object when no context', () => {
            expect((0, requestContext_1.getContextForLog)()).toEqual({});
        });
    });
    describe('requestContextMiddleware', () => {
        it('should set headers and call next', () => {
            const mockReq = {
                path: '/api/test',
                method: 'GET',
                ip: '127.0.0.1',
                socket: { remoteAddress: '127.0.0.1' },
                headers: {},
            };
            const mockRes = {
                setHeader: jest.fn(),
                on: jest.fn(),
            };
            const mockNext = jest.fn();
            (0, requestContext_1.requestContextMiddleware)(mockReq, mockRes, mockNext);
            expect(mockRes.setHeader).toHaveBeenCalledWith('X-Request-Id', expect.stringMatching(/^req_/));
            expect(mockRes.setHeader).toHaveBeenCalledWith('X-Trace-Id', expect.stringMatching(/^trace_/));
            expect(mockRes.setHeader).toHaveBeenCalledWith('X-Span-Id', expect.stringMatching(/^span_/));
            expect(mockNext).toHaveBeenCalled();
        });
        it('should handle response finish event', () => {
            const mockReq = {
                path: '/api/test',
                method: 'GET',
                ip: '127.0.0.1',
                socket: { remoteAddress: '127.0.0.1' },
                headers: {},
            };
            const eventHandlers = {};
            const mockRes = {
                setHeader: jest.fn(),
                on: jest.fn((event, handler) => {
                    if (!eventHandlers[event])
                        eventHandlers[event] = [];
                    eventHandlers[event].push(handler);
                }),
            };
            const mockNext = jest.fn();
            (0, requestContext_1.requestContextMiddleware)(mockReq, mockRes, mockNext);
            // 触发 finish 事件
            expect(eventHandlers['finish']).toBeDefined();
            expect(eventHandlers['finish'].length).toBeGreaterThan(0);
        });
    });
});
//# sourceMappingURL=requestContext.test.js.map