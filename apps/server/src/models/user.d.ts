export declare enum PIIField {
    PHONE = "phone",
    EMAIL = "email",
    ID_CARD = "idCard",
    REAL_NAME = "realName",
    ADDRESS = "address",
    BANK_CARD = "bankCard",
    BIOMETRIC = "biometric"
}
export declare enum PIIPermission {
    NONE = 0,
    READ_MASKED = 1,
    READ_FULL = 2,
    WRITE = 3,
    EXPORT = 4,
    DELETE = 5
}
export interface PIIAccessRule {
    field: PIIField;
    role: string;
    permission: PIIPermission;
    requiresMFA?: boolean;
    auditRequired?: boolean;
}
export declare class PIIManager {
    private accessRules;
    constructor(rules?: PIIAccessRule[]);
    canAccess(field: PIIField, role: string, permission: PIIPermission): boolean;
    requiresMFA(field: PIIField, role: string, permission: PIIPermission): boolean;
    requiresAudit(field: PIIField, role: string, permission: PIIPermission): boolean;
    maskPII(field: PIIField, value: string): string;
    getPIIMetadata(field: PIIField): {
        category: string;
        sensitivity: 'high' | 'medium' | 'low';
    };
    listPIIFields(): PIIField[];
}
export declare const piiManager: PIIManager;
export interface UserPII {
    phone?: string;
    email?: string;
    idCard?: string;
    realName?: string;
    address?: string;
    bankCard?: string;
}
export declare function maskUserPII(userData: UserPII, role?: string): UserPII;
//# sourceMappingURL=user.d.ts.map