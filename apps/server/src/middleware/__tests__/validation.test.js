"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const zod_1 = require("zod");
const validation_1 = require("../validation");
const errors_1 = require("../../errors");
// Mock request context
jest.mock('../requestContext', () => ({
    getRequestContext: () => ({
        logDebug: jest.fn(),
    }),
}));
describe('Validation Middleware', () => {
    let mockReq;
    let mockRes;
    let mockNext;
    beforeEach(() => {
        mockReq = {
            body: {},
            params: {},
            query: {},
            headers: {},
        };
        mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
        };
        mockNext = jest.fn();
    });
    describe('validate', () => {
        const bodySchema = zod_1.z.object({
            name: zod_1.z.string().min(1),
            email: zod_1.z.string().email(),
        });
        const paramsSchema = zod_1.z.object({
            id: zod_1.z.string().uuid(),
        });
        const querySchema = zod_1.z.object({
            page: zod_1.z.coerce.number().min(1).default(1),
        });
        it('should pass validation with valid data', () => {
            mockReq.body = { name: 'John', email: 'john@example.com' };
            mockReq.params = { id: '550e8400-e29b-41d4-a716-446655440000' };
            mockReq.query = { page: '1' };
            const middleware = (0, validation_1.validate)({
                body: bodySchema,
                params: paramsSchema,
                query: querySchema,
            });
            middleware(mockReq, mockRes, mockNext);
            expect(mockNext).toHaveBeenCalled();
            expect(mockNext).not.toHaveBeenCalledWith(expect.any(Error));
            expect(mockReq.body).toEqual({ name: 'John', email: 'john@example.com' });
            expect(mockReq.params).toEqual({ id: '550e8400-e29b-41d4-a716-446655440000' });
            expect(mockReq.query).toEqual({ page: 1 });
        });
        it('should fail validation with invalid body', () => {
            mockReq.body = { name: '', email: 'invalid-email' };
            const middleware = (0, validation_1.validate)({ body: bodySchema });
            middleware(mockReq, mockRes, mockNext);
            expect(mockNext).toHaveBeenCalledWith(expect.any(errors_1.ValidationError));
            const error = mockNext.mock.calls[0][0];
            expect(error.code).toBe('VALIDATION_ERROR');
            expect(error.details?.target).toBe('body');
        });
        it('should fail validation with invalid params', () => {
            mockReq.params = { id: 'invalid-uuid' };
            const middleware = (0, validation_1.validate)({ params: paramsSchema });
            middleware(mockReq, mockRes, mockNext);
            expect(mockNext).toHaveBeenCalledWith(expect.any(errors_1.ValidationError));
            const error = mockNext.mock.calls[0][0];
            expect(error.details?.target).toBe('params');
        });
        it('should fail validation with invalid query', () => {
            mockReq.query = { page: '-1' };
            const middleware = (0, validation_1.validate)({ query: querySchema });
            middleware(mockReq, mockRes, mockNext);
            expect(mockNext).toHaveBeenCalledWith(expect.any(errors_1.ValidationError));
            const error = mockNext.mock.calls[0][0];
            expect(error.details?.target).toBe('query');
        });
        it('should use default values from schema', () => {
            mockReq.query = {};
            const middleware = (0, validation_1.validate)({ query: querySchema });
            middleware(mockReq, mockRes, mockNext);
            expect(mockNext).toHaveBeenCalled();
            expect(mockReq.query).toEqual({ page: 1 });
        });
        it('should coerce types correctly', () => {
            mockReq.query = { page: '5' };
            const middleware = (0, validation_1.validate)({ query: querySchema });
            middleware(mockReq, mockRes, mockNext);
            expect(mockNext).toHaveBeenCalled();
            expect(mockReq.query).toEqual({ page: 5 });
            expect(typeof mockReq.query.page).toBe('number');
        });
    });
    describe('validateBody', () => {
        const schema = zod_1.z.object({
            title: zod_1.z.string().min(1),
        });
        it('should validate body only', () => {
            mockReq.body = { title: 'Test' };
            const middleware = (0, validation_1.validateBody)(schema);
            middleware(mockReq, mockRes, mockNext);
            expect(mockNext).toHaveBeenCalled();
            expect(mockNext).not.toHaveBeenCalledWith(expect.any(Error));
        });
        it('should fail with invalid body', () => {
            mockReq.body = { title: '' };
            const middleware = (0, validation_1.validateBody)(schema);
            middleware(mockReq, mockRes, mockNext);
            expect(mockNext).toHaveBeenCalledWith(expect.any(errors_1.ValidationError));
        });
    });
    describe('validateParams', () => {
        const schema = zod_1.z.object({
            id: zod_1.z.string().uuid(),
        });
        it('should validate params only', () => {
            mockReq.params = { id: '550e8400-e29b-41d4-a716-446655440000' };
            const middleware = (0, validation_1.validateParams)(schema);
            middleware(mockReq, mockRes, mockNext);
            expect(mockNext).toHaveBeenCalled();
            expect(mockNext).not.toHaveBeenCalledWith(expect.any(Error));
        });
        it('should fail with invalid params', () => {
            mockReq.params = { id: 'invalid' };
            const middleware = (0, validation_1.validateParams)(schema);
            middleware(mockReq, mockRes, mockNext);
            expect(mockNext).toHaveBeenCalledWith(expect.any(errors_1.ValidationError));
        });
    });
    describe('validateQuery', () => {
        const schema = zod_1.z.object({
            search: zod_1.z.string().optional(),
        });
        it('should validate query only', () => {
            mockReq.query = { search: 'test' };
            const middleware = (0, validation_1.validateQuery)(schema);
            middleware(mockReq, mockRes, mockNext);
            expect(mockNext).toHaveBeenCalled();
            expect(mockNext).not.toHaveBeenCalledWith(expect.any(Error));
        });
    });
    describe('sanitizeString', () => {
        it('should remove HTML tags', () => {
            expect((0, validation_1.sanitizeString)('<script>alert(1)</script>')).toBe('alert(1)');
        });
        it('should remove javascript: protocol', () => {
            expect((0, validation_1.sanitizeString)('javascript:alert(1)')).toBe('alert(1)');
        });
        it('should trim whitespace', () => {
            expect((0, validation_1.sanitizeString)('  hello  ')).toBe('hello');
        });
    });
    describe('sanitizeObject', () => {
        it('should sanitize string fields in object', () => {
            const input = {
                name: '<script>alert(1)</script>',
                email: '  test@example.com  ',
                age: 25,
            };
            const result = (0, validation_1.sanitizeObject)(input);
            expect(result.name).toBe('alert(1)');
            expect(result.email).toBe('test@example.com');
            expect(result.age).toBe(25);
        });
        it('should handle nested objects', () => {
            const input = {
                user: {
                    name: '<script>test</script>',
                },
            };
            const result = (0, validation_1.sanitizeObject)(input);
            expect(result.user.name).toBe('test');
        });
    });
    describe('Validators', () => {
        describe('chinesePhone', () => {
            it('should validate correct Chinese mobile numbers', () => {
                expect(validation_1.Validators.chinesePhone('13812345678')).toBe(true);
                expect(validation_1.Validators.chinesePhone('15912345678')).toBe(true);
                expect(validation_1.Validators.chinesePhone('18612345678')).toBe(true);
            });
            it('should reject invalid Chinese mobile numbers', () => {
                expect(typeof validation_1.Validators.chinesePhone('12345')).toBe('string');
                expect(typeof validation_1.Validators.chinesePhone('abcdefghijk')).toBe('string');
                expect(typeof validation_1.Validators.chinesePhone('12345678901')).toBe('string'); // wrong prefix
            });
        });
        describe('url', () => {
            it('should validate correct URLs', () => {
                expect(validation_1.Validators.url('https://example.com')).toBe(true);
                expect(validation_1.Validators.url('http://localhost:3000')).toBe(true);
            });
            it('should reject invalid URLs', () => {
                expect(typeof validation_1.Validators.url('not-a-url')).toBe('string');
                expect(typeof validation_1.Validators.url('')).toBe('string');
            });
        });
        describe('strongPassword', () => {
            it('should validate strong passwords', () => {
                expect(validation_1.Validators.strongPassword('Password1')).toBe(true);
                expect(validation_1.Validators.strongPassword('MyP@ssw0rd')).toBe(true);
            });
            it('should reject weak passwords', () => {
                expect(typeof validation_1.Validators.strongPassword('short')).toBe('string');
                expect(typeof validation_1.Validators.strongPassword('nouppercase1')).toBe('string');
                expect(typeof validation_1.Validators.strongPassword('NOLOWERCASE1')).toBe('string');
                expect(typeof validation_1.Validators.strongPassword('NoNumbersHere')).toBe('string');
            });
        });
        describe('uuid', () => {
            it('should validate correct UUIDs', () => {
                expect(validation_1.Validators.uuid('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
                expect(validation_1.Validators.uuid('f47ac10b-58cc-4372-a567-0e02b2c3d479')).toBe(true);
            });
            it('should reject invalid UUIDs', () => {
                expect(typeof validation_1.Validators.uuid('not-a-uuid')).toBe('string');
                expect(typeof validation_1.Validators.uuid('550e8400-e29b-41d4-a716')).toBe('string');
            });
        });
        describe('dateRange', () => {
            const min = new Date('2024-01-01');
            const max = new Date('2024-12-31');
            const validator = validation_1.Validators.dateRange(min, max);
            it('should validate dates within range', () => {
                expect(validator('2024-06-15')).toBe(true);
            });
            it('should reject dates outside range', () => {
                expect(typeof validator('2023-12-31')).toBe('string');
                expect(typeof validator('2025-01-01')).toBe('string');
            });
        });
        describe('fileExtension', () => {
            const validator = validation_1.Validators.fileExtension(['jpg', 'png', 'gif']);
            it('should validate allowed extensions', () => {
                expect(validator('photo.jpg')).toBe(true);
                expect(validator('image.PNG')).toBe(true);
            });
            it('should reject disallowed extensions', () => {
                expect(typeof validator('document.pdf')).toBe('string');
                expect(typeof validator('script.exe')).toBe('string');
            });
        });
        describe('arrayLength', () => {
            const validator = validation_1.Validators.arrayLength(1, 5);
            it('should validate arrays within length', () => {
                expect(validator(['a'])).toBe(true);
                expect(validator(['a', 'b', 'c'])).toBe(true);
            });
            it('should reject arrays outside length', () => {
                expect(typeof validator([])).toBe('string');
                expect(typeof validator(['a', 'b', 'c', 'd', 'e', 'f'])).toBe('string');
            });
        });
    });
    describe('createRefinement', () => {
        it('should create custom validation schema', () => {
            const schema = (0, validation_1.createRefinement)(zod_1.z.string(), val => val.length > 0 || 'String cannot be empty', 'Custom error message');
            const result = schema.safeParse('');
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.errors[0].message).toBe('Custom error message');
            }
        });
    });
    describe('createValidatedSchema', () => {
        it('should apply validation rules to schema', () => {
            const rules = [
                {
                    name: 'positive',
                    validator: val => (typeof val === 'number' && val > 0) || 'Must be positive',
                    message: 'All numbers must be positive',
                },
            ];
            const schema = (0, validation_1.createValidatedSchema)(zod_1.z.object({ count: zod_1.z.number() }), rules);
            const result = schema.safeParse({ count: -1 });
            expect(result.success).toBe(false);
        });
    });
});
//# sourceMappingURL=validation.test.js.map