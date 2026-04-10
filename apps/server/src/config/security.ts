import { IsString, IsBoolean, IsInt, validateSync } from 'class-validator';
import { plainToClass } from 'class-transformer';

class SecurityConfig {
  @IsString()
  ENCRYPTION_MASTER_KEY = process.env.ENCRYPTION_MASTER_KEY || '';

  @IsString()
  TLS_VERSION = '1.3';

  @IsBoolean()
  ENFORCE_TLS = process.env.ENFORCE_TLS !== 'false';

  @IsInt()
  KEY_ROTATION_DAYS = parseInt(process.env.KEY_ROTATION_DAYS || '90', 10);

  @IsString()
  KMS_PROVIDER = process.env.KMS_PROVIDER || 'local';

  @IsString()
  AWS_KMS_KEY_ID = process.env.AWS_KMS_KEY_ID || '';

  @IsString()
  AWS_REGION = process.env.AWS_REGION || 'us-east-1';

  @IsString()
  SENSITIVE_FIELDS = process.env.SENSITIVE_FIELDS || 'phone,idCard,email,address';

  @IsBoolean()
  FIELD_ENCRYPTION_ENABLED = process.env.FIELD_ENCRYPTION_ENABLED === 'true';

  @IsInt()
  ENCRYPTION_CACHE_SIZE = parseInt(process.env.ENCRYPTION_CACHE_SIZE || '1000', 10);
}

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

export function isSensitiveField(fieldName: string): boolean {
  const sensitiveFields = securityConfig.SENSITIVE_FIELDS.split(',');
  return sensitiveFields.some(f => fieldName.toLowerCase().includes(f.toLowerCase()));
}

export function detectSensitiveData(value: string): { isSensitive: boolean; type?: string } {
  for (const pattern of SENSITIVE_FIELD_PATTERNS) {
    if (pattern.pattern.test(value)) {
      return { isSensitive: true, type: pattern.type };
    }
  }
  return { isSensitive: false };
}
