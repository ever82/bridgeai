declare class SecurityConfig {
    ENCRYPTION_MASTER_KEY: string;
    TLS_VERSION: string;
    ENFORCE_TLS: boolean;
    KEY_ROTATION_DAYS: number;
    KMS_PROVIDER: string;
    AWS_KMS_KEY_ID: string;
    AWS_REGION: string;
    SENSITIVE_FIELDS: string;
    FIELD_ENCRYPTION_ENABLED: boolean;
    ENCRYPTION_CACHE_SIZE: number;
}
export declare const securityConfig: SecurityConfig;
export declare const SENSITIVE_FIELD_PATTERNS: {
    field: string;
    pattern: RegExp;
    type: string;
}[];
export declare function isSensitiveField(fieldName: string): boolean;
export declare function detectSensitiveData(value: string): {
    isSensitive: boolean;
    type?: string;
};
export {};
//# sourceMappingURL=security.d.ts.map