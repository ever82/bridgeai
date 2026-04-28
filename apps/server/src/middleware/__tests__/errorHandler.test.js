"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const errorHandler_1 = require("../errorHandler");
const AppError_1 = require("../../errors/AppError");
const helpers_1 = require("../../__tests__/helpers");
const logger_1 = require("../../utils/logger");
describe('errorHandler middleware', () => {
    let req;
    let res;
    let next;
    beforeEach(() => {
        req = (0, helpers_1.createMockRequest)({
            path: '/api/v1/test',
            method: 'GET',
        });
        res = (0, helpers_1.createMockResponse)();
        next = (0, helpers_1.createMockNext)();
        // Add requestId to mock request
        req.requestId = 'test-request-id';
    });
    describe('AppError handling', () => {
        it('should handle AppError with correct status code and response', () => {
            const error = new AppError_1.AppError('Custom error', 'CUSTOM_ERROR', 400);
            (0, errorHandler_1.errorHandler)(error, req, res, next);
            expect(res.statusCode).toBe(400);
            const responseBody = res.body;
            expect(responseBody.success).toBe(false);
            expect(responseBody.message).toBe('Custom error');
            expect(responseBody.errorCode).toBe('CUSTOM_ERROR');
        });
        it('should handle NotFoundError', () => {
            const error = new AppError_1.NotFoundError('User');
            (0, errorHandler_1.errorHandler)(error, req, res, next);
            expect(res.statusCode).toBe(404);
            const responseBody = res.body;
            expect(responseBody.message).toBe('User not found');
            expect(responseBody.errorCode).toBe('RESOURCE_NOT_FOUND');
        });
        it('should handle ValidationError', () => {
            const error = new AppError_1.ValidationError('Email is required');
            (0, errorHandler_1.errorHandler)(error, req, res, next);
            expect(res.statusCode).toBe(400);
            const responseBody = res.body;
            expect(responseBody.message).toBe('Email is required');
            expect(responseBody.errorCode).toBe('VALIDATION_ERROR');
        });
        it('should handle UnauthorizedError', () => {
            const error = new AppError_1.UnauthorizedError('Invalid token');
            (0, errorHandler_1.errorHandler)(error, req, res, next);
            expect(res.statusCode).toBe(401);
            const responseBody = res.body;
            expect(responseBody.message).toBe('Invalid token');
            expect(responseBody.errorCode).toBe('UNAUTHORIZED');
        });
        it('should include error details in response', () => {
            const details = { field: 'email', error: 'Invalid format' };
            const error = new AppError_1.ValidationError('Validation failed', details);
            (0, errorHandler_1.errorHandler)(error, req, res, next);
            const responseBody = res.body;
            expect(responseBody.meta.field).toBe('email');
            expect(responseBody.meta.error).toBe('Invalid format');
        });
    });
    describe('Generic Error handling', () => {
        it('should handle generic Error in development mode', () => {
            const originalEnv = process.env.NODE_ENV;
            process.env.NODE_ENV = 'development';
            const error = new Error('Database connection failed');
            (0, errorHandler_1.errorHandler)(error, req, res, next);
            expect(res.statusCode).toBe(500);
            const responseBody = res.body;
            expect(responseBody.message).toBe('Database connection failed');
            expect(responseBody.meta.stack).toBeDefined();
            process.env.NODE_ENV = originalEnv;
        });
        it('should hide error details in production mode', () => {
            const originalEnv = process.env.NODE_ENV;
            process.env.NODE_ENV = 'production';
            const error = new Error('Sensitive database error');
            (0, errorHandler_1.errorHandler)(error, req, res, next);
            expect(res.statusCode).toBe(500);
            const responseBody = res.body;
            expect(responseBody.message).toBe('Internal server error');
            expect(responseBody.meta?.stack).toBeUndefined();
            process.env.NODE_ENV = originalEnv;
        });
        it('should handle ValidationError by name', () => {
            const error = new Error('Field validation failed');
            error.name = 'ValidationError';
            (0, errorHandler_1.errorHandler)(error, req, res, next);
            expect(res.statusCode).toBe(400);
            const responseBody = res.body;
            expect(responseBody.errorCode).toBe('VALIDATION_ERROR');
        });
        it('should handle UnauthorizedError by name', () => {
            const error = new Error('Token expired');
            error.name = 'UnauthorizedError';
            (0, errorHandler_1.errorHandler)(error, req, res, next);
            expect(res.statusCode).toBe(401);
            const responseBody = res.body;
            expect(responseBody.message).toBe('Unauthorized');
            expect(responseBody.errorCode).toBe('UNAUTHORIZED');
        });
        it('should handle SyntaxError with body property', () => {
            const error = new SyntaxError('Unexpected token');
            // @ts-expect-error Adding body property for testing
            error.body = '{ invalid json';
            (0, errorHandler_1.errorHandler)(error, req, res, next);
            expect(res.statusCode).toBe(400);
            const responseBody = res.body;
            expect(responseBody.message).toBe('Invalid JSON payload');
            expect(responseBody.errorCode).toBe('INVALID_JSON');
        });
    });
    describe('Error logging', () => {
        it('should log error with request context', () => {
            const loggerSpy = jest.spyOn(logger_1.logger, 'error').mockImplementation(() => logger_1.logger);
            const error = new Error('Test error');
            (0, errorHandler_1.errorHandler)(error, req, res, next);
            // Error should be logged with context
            expect(loggerSpy).toHaveBeenCalled();
            loggerSpy.mockRestore();
        });
    });
});
//# sourceMappingURL=errorHandler.test.js.map