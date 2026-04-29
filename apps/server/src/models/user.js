import { maskPhone, maskEmail, maskIdCard } from '../utils/mask';
export var PIIField;
(function (PIIField) {
    PIIField["PHONE"] = "phone";
    PIIField["EMAIL"] = "email";
    PIIField["ID_CARD"] = "idCard";
    PIIField["REAL_NAME"] = "realName";
    PIIField["ADDRESS"] = "address";
    PIIField["BANK_CARD"] = "bankCard";
    PIIField["BIOMETRIC"] = "biometric";
})(PIIField || (PIIField = {}));
export var PIIPermission;
(function (PIIPermission) {
    PIIPermission[PIIPermission["NONE"] = 0] = "NONE";
    PIIPermission[PIIPermission["READ_MASKED"] = 1] = "READ_MASKED";
    PIIPermission[PIIPermission["READ_FULL"] = 2] = "READ_FULL";
    PIIPermission[PIIPermission["WRITE"] = 3] = "WRITE";
    PIIPermission[PIIPermission["EXPORT"] = 4] = "EXPORT";
    PIIPermission[PIIPermission["DELETE"] = 5] = "DELETE";
})(PIIPermission || (PIIPermission = {}));
const defaultAccessRules = [
    { field: PIIField.PHONE, role: 'user', permission: PIIPermission.READ_FULL },
    { field: PIIField.PHONE, role: 'user', permission: PIIPermission.WRITE },
    { field: PIIField.PHONE, role: 'admin', permission: PIIPermission.READ_MASKED, auditRequired: true },
    { field: PIIField.PHONE, role: 'support', permission: PIIPermission.READ_MASKED, requiresMFA: true, auditRequired: true },
    { field: PIIField.EMAIL, role: 'user', permission: PIIPermission.READ_FULL },
    { field: PIIField.EMAIL, role: 'user', permission: PIIPermission.WRITE },
    { field: PIIField.EMAIL, role: 'admin', permission: PIIPermission.READ_MASKED },
    { field: PIIField.EMAIL, role: 'support', permission: PIIPermission.READ_MASKED, requiresMFA: true },
    { field: PIIField.ID_CARD, role: 'user', permission: PIIPermission.READ_MASKED },
    { field: PIIField.ID_CARD, role: 'user', permission: PIIPermission.WRITE },
    { field: PIIField.ID_CARD, role: 'admin', permission: PIIPermission.READ_MASKED, auditRequired: true },
    { field: PIIField.ID_CARD, role: 'compliance', permission: PIIPermission.READ_FULL, requiresMFA: true, auditRequired: true },
    { field: PIIField.REAL_NAME, role: 'user', permission: PIIPermission.READ_FULL },
    { field: PIIField.REAL_NAME, role: 'support', permission: PIIPermission.READ_FULL, requiresMFA: true, auditRequired: true },
    { field: PIIField.REAL_NAME, role: 'admin', permission: PIIPermission.READ_MASKED },
    { field: PIIField.ADDRESS, role: 'user', permission: PIIPermission.READ_FULL },
    { field: PIIField.ADDRESS, role: 'support', permission: PIIPermission.READ_MASKED, requiresMFA: true },
];
export class PIIManager {
    accessRules;
    constructor(rules = defaultAccessRules) {
        this.accessRules = rules;
    }
    canAccess(field, role, permission) {
        const rule = this.accessRules.find(r => r.field === field && r.role === role && r.permission >= permission);
        return !!rule;
    }
    requiresMFA(field, role, permission) {
        const rule = this.accessRules.find(r => r.field === field && r.role === role && r.permission >= permission);
        return rule?.requiresMFA ?? false;
    }
    requiresAudit(field, role, permission) {
        const rule = this.accessRules.find(r => r.field === field && r.role === role && r.permission >= permission);
        return rule?.auditRequired ?? false;
    }
    maskPII(field, value) {
        switch (field) {
            case PIIField.PHONE:
                return maskPhone(value);
            case PIIField.EMAIL:
                return maskEmail(value);
            case PIIField.ID_CARD:
                return maskIdCard(value);
            default:
                return value ? value.substring(0, 3) + '***' : value;
        }
    }
    getPIIMetadata(field) {
        switch (field) {
            case PIIField.ID_CARD:
            case PIIField.BIOMETRIC:
            case PIIField.BANK_CARD:
                return { category: 'identity', sensitivity: 'high' };
            case PIIField.PHONE:
            case PIIField.EMAIL:
            case PIIField.REAL_NAME:
            case PIIField.ADDRESS:
                return { category: 'contact', sensitivity: 'medium' };
            default:
                return { category: 'other', sensitivity: 'low' };
        }
    }
    listPIIFields() {
        return Object.values(PIIField);
    }
}
export const piiManager = new PIIManager();
export function maskUserPII(userData, role = 'user') {
    const masked = {};
    if (userData.phone) {
        masked.phone = piiManager.canAccess(PIIField.PHONE, role, PIIPermission.READ_FULL)
            ? userData.phone
            : piiManager.maskPII(PIIField.PHONE, userData.phone);
    }
    if (userData.email) {
        masked.email = piiManager.canAccess(PIIField.EMAIL, role, PIIPermission.READ_FULL)
            ? userData.email
            : piiManager.maskPII(PIIField.EMAIL, userData.email);
    }
    if (userData.idCard) {
        masked.idCard = piiManager.canAccess(PIIField.ID_CARD, role, PIIPermission.READ_FULL)
            ? userData.idCard
            : piiManager.maskPII(PIIField.ID_CARD, userData.idCard);
    }
    if (userData.realName) {
        masked.realName = piiManager.canAccess(PIIField.REAL_NAME, role, PIIPermission.READ_FULL)
            ? userData.realName
            : piiManager.maskPII(PIIField.REAL_NAME, userData.realName);
    }
    if (userData.address) {
        masked.address = piiManager.canAccess(PIIField.ADDRESS, role, PIIPermission.READ_FULL)
            ? userData.address
            : piiManager.maskPII(PIIField.ADDRESS, userData.address);
    }
    if (userData.bankCard) {
        masked.bankCard = piiManager.canAccess(PIIField.BANK_CARD, role, PIIPermission.READ_FULL)
            ? userData.bankCard
            : piiManager.maskPII(PIIField.BANK_CARD, userData.bankCard);
    }
    return masked;
}
//# sourceMappingURL=user.js.map