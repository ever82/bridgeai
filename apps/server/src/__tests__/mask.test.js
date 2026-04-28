"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const mask_1 = require("../utils/mask");
(0, globals_1.describe)('Mask Utils', () => {
    (0, globals_1.describe)('maskPhone', () => {
        (0, globals_1.it)('should mask phone number correctly', () => {
            (0, globals_1.expect)((0, mask_1.maskPhone)('13812345678')).toBe('138****5678');
            (0, globals_1.expect)((0, mask_1.maskPhone)('15098765432')).toBe('150****5432');
        });
        (0, globals_1.it)('should return short strings unchanged', () => {
            (0, globals_1.expect)((0, mask_1.maskPhone)('123')).toBe('123');
            (0, globals_1.expect)((0, mask_1.maskPhone)('123456')).toBe('123456');
        });
        (0, globals_1.it)('should handle empty strings', () => {
            (0, globals_1.expect)((0, mask_1.maskPhone)('')).toBe('');
        });
    });
    (0, globals_1.describe)('maskEmail', () => {
        (0, globals_1.it)('should mask email correctly', () => {
            (0, globals_1.expect)((0, mask_1.maskEmail)('test@example.com')).toBe('te**@example.com');
            (0, globals_1.expect)((0, mask_1.maskEmail)('user123@gmail.com')).toBe('us**23@gmail.com');
        });
        (0, globals_1.it)('should return invalid emails unchanged', () => {
            (0, globals_1.expect)((0, mask_1.maskEmail)('not-an-email')).toBe('not-an-email');
            (0, globals_1.expect)((0, mask_1.maskEmail)('ab@example.com')).toBe('ab@example.com');
        });
    });
    (0, globals_1.describe)('maskIdCard', () => {
        (0, globals_1.it)('should mask ID card correctly', () => {
            (0, globals_1.expect)((0, mask_1.maskIdCard)('110101199001011234')).toBe('1101********1234');
            (0, globals_1.expect)((0, mask_1.maskIdCard)('31010119850515201X')).toBe('3101********201X');
        });
        (0, globals_1.it)('should return short strings unchanged', () => {
            (0, globals_1.expect)((0, mask_1.maskIdCard)('1234567')).toBe('1234567');
        });
    });
    (0, globals_1.describe)('maskBankCard', () => {
        (0, globals_1.it)('should mask bank card correctly', () => {
            (0, globals_1.expect)((0, mask_1.maskBankCard)('6222021234567890123')).toBe('6222*********0123');
            (0, globals_1.expect)((0, mask_1.maskBankCard)('6222021234567890')).toBe('6222********7890');
        });
        (0, globals_1.it)('should return short strings unchanged', () => {
            (0, globals_1.expect)((0, mask_1.maskBankCard)('1234567')).toBe('1234567');
        });
    });
    (0, globals_1.describe)('maskPassport', () => {
        (0, globals_1.it)('should mask passport correctly', () => {
            (0, globals_1.expect)((0, mask_1.maskPassport)('E12345678')).toBe('E1******78');
            (0, globals_1.expect)((0, mask_1.maskPassport)('G98765432')).toBe('G9******32');
        });
        (0, globals_1.it)('should return short strings unchanged', () => {
            (0, globals_1.expect)((0, mask_1.maskPassport)('ABC')).toBe('ABC');
        });
    });
    (0, globals_1.describe)('maskString', () => {
        (0, globals_1.it)('should mask with default options', () => {
            (0, globals_1.expect)((0, mask_1.maskString)('1234567890')).toBe('123****890');
        });
        (0, globals_1.it)('should mask with custom options', () => {
            (0, globals_1.expect)((0, mask_1.maskString)('1234567890', { preserveStart: 2, preserveEnd: 2, maskChar: '#' })).toBe('12######90');
        });
        (0, globals_1.it)('should handle short strings', () => {
            (0, globals_1.expect)((0, mask_1.maskString)('12345')).toBe('*****');
        });
    });
    (0, globals_1.describe)('maskObject', () => {
        (0, globals_1.it)('should mask sensitive fields in object', () => {
            const obj = {
                name: 'John',
                phone: '13812345678',
                email: 'john@example.com',
                idCard: '110101199001011234',
            };
            const masked = (0, mask_1.maskObject)(obj);
            (0, globals_1.expect)(masked.name).toBe('John');
            (0, globals_1.expect)(masked.phone).toBe('138****5678');
            (0, globals_1.expect)(masked.email).toBe('jo**@example.com');
            (0, globals_1.expect)(masked.idCard).toBe('1101********1234');
        });
        (0, globals_1.it)('should handle nested objects', () => {
            const obj = {
                user: {
                    name: 'John',
                    phone: '13812345678',
                },
            };
            const masked = (0, mask_1.maskObject)(obj);
            (0, globals_1.expect)(masked.user.name).toBe('John');
            (0, globals_1.expect)(masked.user.phone).toBe('138****5678');
        });
        (0, globals_1.it)('should handle null and undefined', () => {
            const obj = {
                name: 'John',
                phone: null,
                email: undefined,
            };
            const masked = (0, mask_1.maskObject)(obj);
            (0, globals_1.expect)(masked.name).toBe('John');
            (0, globals_1.expect)(masked.phone).toBeNull();
            (0, globals_1.expect)(masked.email).toBeUndefined();
        });
    });
    (0, globals_1.describe)('maskJson', () => {
        (0, globals_1.it)('should mask JSON string', () => {
            const json = JSON.stringify({
                name: 'John',
                phone: '13812345678',
            });
            const masked = (0, mask_1.maskJson)(json);
            const parsed = JSON.parse(masked);
            (0, globals_1.expect)(parsed.name).toBe('John');
            (0, globals_1.expect)(parsed.phone).toBe('138****5678');
        });
        (0, globals_1.it)('should return invalid JSON unchanged', () => {
            const invalid = 'not-json';
            (0, globals_1.expect)((0, mask_1.maskJson)(invalid)).toBe(invalid);
        });
    });
    (0, globals_1.describe)('maskLogMessage', () => {
        (0, globals_1.it)('should mask phone numbers in logs', () => {
            const message = 'User 13812345678 logged in';
            (0, globals_1.expect)((0, mask_1.maskLogMessage)(message)).toBe('User 138****5678 logged in');
        });
        (0, globals_1.it)('should mask ID cards in logs', () => {
            const message = 'ID: 110101199001011234';
            (0, globals_1.expect)((0, mask_1.maskLogMessage)(message)).toBe('ID: 1101********1234');
        });
        (0, globals_1.it)('should mask emails in logs', () => {
            const message = 'Email: test@example.com';
            (0, globals_1.expect)((0, mask_1.maskLogMessage)(message)).toBe('Email: te**@example.com');
        });
        (0, globals_1.it)('should mask multiple sensitive fields', () => {
            const message = 'User 13812345678 with ID 110101199001011234 and email test@example.com';
            const masked = (0, mask_1.maskLogMessage)(message);
            (0, globals_1.expect)(masked).toContain('138****5678');
            (0, globals_1.expect)(masked).toContain('1101********1234');
            (0, globals_1.expect)(masked).toContain('te**@example.com');
        });
    });
});
//# sourceMappingURL=mask.test.js.map