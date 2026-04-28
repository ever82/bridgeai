"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const user_1 = require("../models/user");
(0, globals_1.describe)('PII Manager', () => {
    (0, globals_1.describe)('canAccess', () => {
        (0, globals_1.it)('should allow user to access their own phone', () => {
            (0, globals_1.expect)(user_1.piiManager.canAccess(user_1.PIIField.PHONE, 'user', user_1.PIIPermission.READ_FULL)).toBe(true);
        });
        (0, globals_1.it)('should allow admin to read masked phone', () => {
            (0, globals_1.expect)(user_1.piiManager.canAccess(user_1.PIIField.PHONE, 'admin', user_1.PIIPermission.READ_MASKED)).toBe(true);
        });
        (0, globals_1.it)('should not allow admin to read full phone without audit', () => {
            (0, globals_1.expect)(user_1.piiManager.canAccess(user_1.PIIField.PHONE, 'admin', user_1.PIIPermission.READ_FULL)).toBe(false);
        });
        (0, globals_1.it)('should deny access for invalid role', () => {
            (0, globals_1.expect)(user_1.piiManager.canAccess(user_1.PIIField.PHONE, 'invalid', user_1.PIIPermission.READ_FULL)).toBe(false);
        });
    });
    (0, globals_1.describe)('requiresMFA', () => {
        (0, globals_1.it)('should require MFA for support accessing phone', () => {
            (0, globals_1.expect)(user_1.piiManager.requiresMFA(user_1.PIIField.PHONE, 'support', user_1.PIIPermission.READ_MASKED)).toBe(true);
        });
        (0, globals_1.it)('should not require MFA for user accessing own phone', () => {
            (0, globals_1.expect)(user_1.piiManager.requiresMFA(user_1.PIIField.PHONE, 'user', user_1.PIIPermission.READ_FULL)).toBe(false);
        });
    });
    (0, globals_1.describe)('requiresAudit', () => {
        (0, globals_1.it)('should require audit for admin accessing phone', () => {
            (0, globals_1.expect)(user_1.piiManager.requiresAudit(user_1.PIIField.PHONE, 'admin', user_1.PIIPermission.READ_MASKED)).toBe(true);
        });
    });
    (0, globals_1.describe)('maskPII', () => {
        (0, globals_1.it)('should mask phone number', () => {
            (0, globals_1.expect)(user_1.piiManager.maskPII(user_1.PIIField.PHONE, '13812345678')).toBe('138****5678');
        });
        (0, globals_1.it)('should mask email', () => {
            (0, globals_1.expect)(user_1.piiManager.maskPII(user_1.PIIField.EMAIL, 'test@example.com')).toBe('te**@example.com');
        });
        (0, globals_1.it)('should mask ID card', () => {
            (0, globals_1.expect)(user_1.piiManager.maskPII(user_1.PIIField.ID_CARD, '110101199001011234')).toBe('1101********1234');
        });
    });
    (0, globals_1.describe)('getPIIMetadata', () => {
        (0, globals_1.it)('should return high sensitivity for ID card', () => {
            const metadata = user_1.piiManager.getPIIMetadata(user_1.PIIField.ID_CARD);
            (0, globals_1.expect)(metadata.sensitivity).toBe('high');
            (0, globals_1.expect)(metadata.category).toBe('identity');
        });
        (0, globals_1.it)('should return medium sensitivity for phone', () => {
            const metadata = user_1.piiManager.getPIIMetadata(user_1.PIIField.PHONE);
            (0, globals_1.expect)(metadata.sensitivity).toBe('medium');
            (0, globals_1.expect)(metadata.category).toBe('contact');
        });
    });
    (0, globals_1.describe)('listPIIFields', () => {
        (0, globals_1.it)('should return all PII fields', () => {
            const fields = user_1.piiManager.listPIIFields();
            (0, globals_1.expect)(fields).toContain(user_1.PIIField.PHONE);
            (0, globals_1.expect)(fields).toContain(user_1.PIIField.EMAIL);
            (0, globals_1.expect)(fields).toContain(user_1.PIIField.ID_CARD);
        });
    });
});
(0, globals_1.describe)('maskUserPII', () => {
    const userData = {
        phone: '13812345678',
        email: 'user@example.com',
        idCard: '110101199001011234',
        realName: '张三',
    };
    (0, globals_1.it)('should return full data for user role', () => {
        const masked = (0, user_1.maskUserPII)(userData, 'user');
        (0, globals_1.expect)(masked.phone).toBe('13812345678');
        (0, globals_1.expect)(masked.email).toBe('user@example.com');
    });
    (0, globals_1.it)('should mask data for admin role', () => {
        const masked = (0, user_1.maskUserPII)(userData, 'admin');
        (0, globals_1.expect)(masked.phone).toBe('138****5678');
        (0, globals_1.expect)(masked.email).toBe('us**@example.com');
        (0, globals_1.expect)(masked.idCard).toBe('1101********1234');
    });
    (0, globals_1.it)('should handle partial data', () => {
        const partialData = { phone: '13812345678' };
        const masked = (0, user_1.maskUserPII)(partialData, 'admin');
        (0, globals_1.expect)(masked.phone).toBe('138****5678');
        (0, globals_1.expect)(masked.email).toBeUndefined();
    });
});
//# sourceMappingURL=pii.test.js.map