"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const mask_1 = require("../utils/mask");
(0, globals_1.describe)('Data Masking Middleware', () => {
    (0, globals_1.describe)('maskObject for API responses', () => {
        (0, globals_1.it)('should mask user PII in response data', () => {
            const user = {
                id: '123',
                name: 'John',
                phone: '13812345678',
                email: 'test@example.com',
                idCard: '110101199001011234',
                bankCard: '6222021234567890123',
            };
            const masked = (0, mask_1.maskObject)(user);
            (0, globals_1.expect)(masked.id).toBe('123');
            (0, globals_1.expect)(masked.name).toBe('John');
            // phone matches mobile pattern → maskPhone → preserveStart=3, preserveEnd=4
            (0, globals_1.expect)(masked.phone).toContain('138');
            (0, globals_1.expect)(masked.phone).toContain('5678');
            (0, globals_1.expect)(masked.phone).toContain('*');
            (0, globals_1.expect)(masked.phone).not.toBe('13812345678');
            // email is sensitive field → masked
            (0, globals_1.expect)(masked.email).not.toBe('test@example.com');
            (0, globals_1.expect)(masked.email).toContain('@example.com');
            (0, globals_1.expect)(masked.email).toContain('*');
            // idCard matches pattern → masked
            (0, globals_1.expect)(masked.idCard).not.toBe('110101199001011234');
            (0, globals_1.expect)(masked.idCard).toContain('*');
            // bankCard matches pattern → masked
            (0, globals_1.expect)(masked.bankCard).not.toBe('6222021234567890123');
            (0, globals_1.expect)(masked.bankCard).toContain('*');
        });
        (0, globals_1.it)('should mask nested objects', () => {
            const response = {
                success: true,
                data: {
                    user: {
                        phone: '13812345678',
                        email: 'user@example.com',
                    },
                },
            };
            const masked = (0, mask_1.maskObject)(response);
            (0, globals_1.expect)(masked.success).toBe(true);
            (0, globals_1.expect)(masked.data.user.phone).not.toBe('13812345678');
            (0, globals_1.expect)(masked.data.user.phone).toContain('*');
            (0, globals_1.expect)(masked.data.user.email).not.toBe('user@example.com');
            (0, globals_1.expect)(masked.data.user.email).toContain('@example.com');
        });
        (0, globals_1.it)('should handle arrays', () => {
            const users = [
                { id: '1', phone: '13812345678' },
                { id: '2', phone: '15098765432' },
            ];
            const masked = (0, mask_1.maskObject)(users);
            (0, globals_1.expect)(masked[0].phone).not.toBe('13812345678');
            (0, globals_1.expect)(masked[0].phone).toContain('*');
            (0, globals_1.expect)(masked[1].phone).not.toBe('15098765432');
            (0, globals_1.expect)(masked[1].phone).toContain('*');
        });
        (0, globals_1.it)('should handle null and undefined values', () => {
            const obj = { phone: null, email: undefined, idCard: '110101199001011234' };
            const masked = (0, mask_1.maskObject)(obj);
            (0, globals_1.expect)(masked.phone).toBeNull();
            (0, globals_1.expect)(masked.email).toBeUndefined();
            (0, globals_1.expect)(masked.idCard).toContain('*');
        });
    });
    (0, globals_1.describe)('maskPhone', () => {
        (0, globals_1.it)('should mask Chinese mobile numbers', () => {
            const masked = (0, mask_1.maskPhone)('13812345678');
            (0, globals_1.expect)(masked).toContain('138');
            (0, globals_1.expect)(masked).toContain('5678');
            (0, globals_1.expect)(masked).toContain('*');
            (0, globals_1.expect)(masked).not.toBe('13812345678');
        });
        (0, globals_1.it)('should handle edge cases', () => {
            (0, globals_1.expect)((0, mask_1.maskPhone)('')).toBe('');
            (0, globals_1.expect)((0, mask_1.maskPhone)('123')).toBe('123');
        });
    });
    (0, globals_1.describe)('maskEmail', () => {
        (0, globals_1.it)('should mask email addresses preserving domain', () => {
            const masked = (0, mask_1.maskEmail)('test@example.com');
            (0, globals_1.expect)(masked).toContain('@example.com');
            (0, globals_1.expect)(masked).toContain('*');
            (0, globals_1.expect)(masked).not.toBe('test@example.com');
        });
        (0, globals_1.it)('should handle short local parts', () => {
            (0, globals_1.expect)((0, mask_1.maskEmail)('ab@example.com')).toBe('ab@example.com');
        });
    });
    (0, globals_1.describe)('maskLogMessage', () => {
        (0, globals_1.it)('should mask phone numbers in logs', () => {
            const msg = 'User phone: 13812345678 called';
            const masked = (0, mask_1.maskLogMessage)(msg);
            (0, globals_1.expect)(masked).not.toContain('13812345678');
            (0, globals_1.expect)(masked).toContain('138****5678');
        });
        (0, globals_1.it)('should mask multiple types in one message', () => {
            const msg = 'User phone: 13812345678, ID: 110101199001011234';
            const masked = (0, mask_1.maskLogMessage)(msg);
            (0, globals_1.expect)(masked).not.toContain('13812345678');
            (0, globals_1.expect)(masked).not.toContain('110101199001011234');
            (0, globals_1.expect)(masked).toContain('*');
        });
    });
});
//# sourceMappingURL=dataMasking.test.js.map