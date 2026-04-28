"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const dataMasking_1 = require("../dataMasking");
(0, globals_1.describe)('Data Masking Middleware', () => {
    let mockReq;
    let mockRes;
    let mockNext;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let jsonOutput;
    (0, globals_1.beforeEach)(() => {
        jsonOutput = null;
        mockReq = {};
        mockRes = {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            json(data) {
                jsonOutput = data;
                return mockRes;
            },
        };
        mockNext = jest.fn();
    });
    (0, globals_1.it)('should mask sensitive fields in response data envelope', () => {
        const middleware = (0, dataMasking_1.dataMaskingMiddleware)();
        middleware(mockReq, mockRes, mockNext);
        // Simulate sending a response
        mockRes.json({
            success: true,
            data: {
                id: '123',
                phone: '13812345678',
                email: 'test@example.com',
            },
        });
        (0, globals_1.expect)(jsonOutput.success).toBe(true);
        (0, globals_1.expect)(jsonOutput.data.phone).not.toBe('13812345678');
        (0, globals_1.expect)(jsonOutput.data.phone).toContain('*');
        (0, globals_1.expect)(jsonOutput.data.email).not.toBe('test@example.com');
        (0, globals_1.expect)(jsonOutput.data.email).toContain('@example.com');
    });
    (0, globals_1.it)('should mask sensitive fields in direct response', () => {
        const middleware = (0, dataMasking_1.dataMaskingMiddleware)();
        middleware(mockReq, mockRes, mockNext);
        mockRes.json({
            id: '123',
            phone: '13812345678',
        });
        (0, globals_1.expect)(jsonOutput.id).toBe('123');
        (0, globals_1.expect)(jsonOutput.phone).not.toBe('13812345678');
        (0, globals_1.expect)(jsonOutput.phone).toContain('*');
    });
    (0, globals_1.it)('should skip masking when skipDataMasking is set', () => {
        const middleware = (0, dataMasking_1.dataMaskingMiddleware)();
        mockReq.skipDataMasking = true;
        middleware(mockReq, mockRes, mockNext);
        mockRes.json({
            phone: '13812345678',
        });
        (0, globals_1.expect)(jsonOutput.phone).toBe('13812345678');
    });
    (0, globals_1.it)('should call next()', () => {
        const middleware = (0, dataMasking_1.dataMaskingMiddleware)();
        middleware(mockReq, mockRes, mockNext);
        (0, globals_1.expect)(mockNext).toHaveBeenCalled();
    });
});
//# sourceMappingURL=dataMasking.test.js.map