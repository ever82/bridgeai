"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const response_1 = require("../response");
describe('ApiResponse', () => {
    describe('success', () => {
        it('should create a successful response with data', () => {
            const data = { id: 1, name: 'Test' };
            const response = response_1.ApiResponse.success(data);
            expect(response.success).toBe(true);
            expect(response.data).toEqual(data);
            expect(response.message).toBeUndefined();
            expect(response.errorCode).toBeUndefined();
        });
        it('should create a successful response with data and message', () => {
            const data = { id: 1, name: 'Test' };
            const message = 'Operation completed successfully';
            const response = response_1.ApiResponse.success(data, message);
            expect(response.success).toBe(true);
            expect(response.data).toEqual(data);
            expect(response.message).toBe(message);
        });
        it('should create a successful response with metadata', () => {
            const data = { id: 1 };
            const message = 'Success';
            const meta = { requestId: '123' };
            const response = response_1.ApiResponse.success(data, message, meta);
            expect(response.success).toBe(true);
            expect(response.meta).toEqual(meta);
        });
        it('should handle null data', () => {
            const response = response_1.ApiResponse.success(null);
            expect(response.success).toBe(true);
            expect(response.data).toBeNull();
        });
        it('should handle array data', () => {
            const data = [{ id: 1 }, { id: 2 }];
            const response = response_1.ApiResponse.success(data);
            expect(response.success).toBe(true);
            expect(response.data).toEqual(data);
            expect(Array.isArray(response.data)).toBe(true);
        });
    });
    describe('error', () => {
        it('should create an error response with default code', () => {
            const message = 'Something went wrong';
            const response = response_1.ApiResponse.error(message);
            expect(response.success).toBe(false);
            expect(response.message).toBe(message);
            expect(response.errorCode).toBe('INTERNAL_ERROR');
            expect(response.data).toBeUndefined();
        });
        it('should create an error response with custom code', () => {
            const message = 'Resource not found';
            const errorCode = 'NOT_FOUND';
            const response = response_1.ApiResponse.error(message, errorCode);
            expect(response.success).toBe(false);
            expect(response.message).toBe(message);
            expect(response.errorCode).toBe(errorCode);
        });
        it('should create an error response with status code', () => {
            const message = 'Bad request';
            const errorCode = 'VALIDATION_ERROR';
            const statusCode = 400;
            const response = response_1.ApiResponse.error(message, errorCode, statusCode);
            expect(response.success).toBe(false);
            expect(response.meta?.statusCode).toBe(statusCode);
        });
        it('should create an error response with details', () => {
            const message = 'Validation failed';
            const errorCode = 'VALIDATION_ERROR';
            const statusCode = 422;
            const details = { field: 'email', error: 'Invalid format' };
            const response = response_1.ApiResponse.error(message, errorCode, statusCode, details);
            expect(response.success).toBe(false);
            expect(response.meta?.field).toBe('email');
            expect(response.meta?.error).toBe('Invalid format');
        });
    });
    describe('paginated', () => {
        it('should create a paginated response', () => {
            const data = [{ id: 1 }, { id: 2 }];
            const pagination = {
                page: 1,
                limit: 10,
                total: 25,
                totalPages: 3,
            };
            const response = response_1.ApiResponse.paginated(data, pagination);
            expect(response.success).toBe(true);
            expect(response.data).toEqual(data);
            expect(response.meta?.pagination).toEqual(pagination);
        });
        it('should handle empty paginated data', () => {
            const data = [];
            const pagination = {
                page: 1,
                limit: 10,
                total: 0,
                totalPages: 0,
            };
            const response = response_1.ApiResponse.paginated(data, pagination);
            expect(response.success).toBe(true);
            expect(response.data).toEqual([]);
            expect(response.meta?.pagination?.total).toBe(0);
        });
        it('should handle last page', () => {
            const data = [{ id: 21 }];
            const pagination = {
                page: 3,
                limit: 10,
                total: 21,
                totalPages: 3,
            };
            const response = response_1.ApiResponse.paginated(data, pagination);
            expect(response.success).toBe(true);
            expect(response.meta?.pagination?.page).toBe(3);
            expect(response.meta?.pagination?.totalPages).toBe(3);
        });
    });
    describe('HttpStatus', () => {
        it('should have correct status codes', () => {
            expect(response_1.HttpStatus.OK).toBe(200);
            expect(response_1.HttpStatus.CREATED).toBe(201);
            expect(response_1.HttpStatus.BAD_REQUEST).toBe(400);
            expect(response_1.HttpStatus.UNAUTHORIZED).toBe(401);
            expect(response_1.HttpStatus.FORBIDDEN).toBe(403);
            expect(response_1.HttpStatus.NOT_FOUND).toBe(404);
            expect(response_1.HttpStatus.INTERNAL_SERVER_ERROR).toBe(500);
        });
        it('should be a constant object', () => {
            // HttpStatus is a const assertion, so values shouldn't change
            expect(response_1.HttpStatus.OK).toBe(200);
            expect(response_1.HttpStatus.BAD_REQUEST).toBe(400);
        });
    });
    describe('ErrorCode', () => {
        it('should have common error codes', () => {
            expect(response_1.ErrorCode.INTERNAL_ERROR).toBe('INTERNAL_ERROR');
            expect(response_1.ErrorCode.NOT_FOUND).toBe('NOT_FOUND');
            expect(response_1.ErrorCode.VALIDATION_ERROR).toBe('VALIDATION_ERROR');
            expect(response_1.ErrorCode.UNAUTHORIZED).toBe('UNAUTHORIZED');
        });
        it('should have auth-specific error codes', () => {
            expect(response_1.ErrorCode.INVALID_CREDENTIALS).toBe('INVALID_CREDENTIALS');
            expect(response_1.ErrorCode.TOKEN_EXPIRED).toBe('TOKEN_EXPIRED');
            expect(response_1.ErrorCode.TOKEN_INVALID).toBe('TOKEN_INVALID');
        });
        it('should have resource error codes', () => {
            expect(response_1.ErrorCode.RESOURCE_NOT_FOUND).toBe('RESOURCE_NOT_FOUND');
            expect(response_1.ErrorCode.RESOURCE_CONFLICT).toBe('RESOURCE_CONFLICT');
        });
    });
});
//# sourceMappingURL=response.test.js.map