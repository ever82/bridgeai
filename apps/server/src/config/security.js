var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { IsString, IsBoolean, IsInt, validateSync } from 'class-validator';
import { plainToClass } from 'class-transformer';
class SecurityConfig {
    ENCRYPTION_MASTER_KEY = process.env.ENCRYPTION_MASTER_KEY || '';
    TLS_VERSION = '1.3';
    ENFORCE_TLS = process.env.ENFORCE_TLS !== 'false';
    KEY_ROTATION_DAYS = parseInt(process.env.KEY_ROTATION_DAYS || '90', 10);
    KMS_PROVIDER = process.env.KMS_PROVIDER || 'local';
    AWS_KMS_KEY_ID = process.env.AWS_KMS_KEY_ID || '';
    AWS_REGION = process.env.AWS_REGION || 'us-east-1';
    SENSITIVE_FIELDS = process.env.SENSITIVE_FIELDS || 'phone,idCard,email,address';
    FIELD_ENCRYPTION_ENABLED = process.env.FIELD_ENCRYPTION_ENABLED === 'true';
    ENCRYPTION_CACHE_SIZE = parseInt(process.env.ENCRYPTION_CACHE_SIZE || '1000', 10);
}
__decorate([
    IsString()
], SecurityConfig.prototype, "ENCRYPTION_MASTER_KEY", void 0);
__decorate([
    IsString()
], SecurityConfig.prototype, "TLS_VERSION", void 0);
__decorate([
    IsBoolean()
], SecurityConfig.prototype, "ENFORCE_TLS", void 0);
__decorate([
    IsInt()
], SecurityConfig.prototype, "KEY_ROTATION_DAYS", void 0);
__decorate([
    IsString()
], SecurityConfig.prototype, "KMS_PROVIDER", void 0);
__decorate([
    IsString()
], SecurityConfig.prototype, "AWS_KMS_KEY_ID", void 0);
__decorate([
    IsString()
], SecurityConfig.prototype, "AWS_REGION", void 0);
__decorate([
    IsString()
], SecurityConfig.prototype, "SENSITIVE_FIELDS", void 0);
__decorate([
    IsBoolean()
], SecurityConfig.prototype, "FIELD_ENCRYPTION_ENABLED", void 0);
__decorate([
    IsInt()
], SecurityConfig.prototype, "ENCRYPTION_CACHE_SIZE", void 0);
const config = plainToClass(SecurityConfig, new SecurityConfig());
const errors = validateSync(config);
if (errors.length > 0) {
    console.error('Security config validation errors:', errors);
}
export const securityConfig = config;
export const SENSITIVE_FIELD_PATTERNS = [
    { field: 'phone', pattern: /^1[3-9]\d{9}$/, type: 'mobile' },
    { field: 'idCard', pattern: /^\d{17}[\dXx]$/, type: 'id_card' },
    { field: 'email', pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, type: 'email' },
    { field: 'bankCard', pattern: /^\d{16,19}$/, type: 'bank_card' },
    { field: 'passport', pattern: /^[A-Z]\d{8,9}$/, type: 'passport' },
];
export function isSensitiveField(fieldName) {
    const sensitiveFields = securityConfig.SENSITIVE_FIELDS.split(',');
    return sensitiveFields.some(f => fieldName.toLowerCase().includes(f.toLowerCase()));
}
export function detectSensitiveData(value) {
    for (const pattern of SENSITIVE_FIELD_PATTERNS) {
        if (pattern.pattern.test(value)) {
            return { isSensitive: true, type: pattern.type };
        }
    }
    return { isSensitive: false };
}
//# sourceMappingURL=security.js.map