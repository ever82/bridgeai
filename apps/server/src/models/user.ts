import { maskPhone, maskEmail, maskIdCard } from '../utils/mask';

export enum PIIField {
  PHONE = 'phone',
  EMAIL = 'email',
  ID_CARD = 'idCard',
  REAL_NAME = 'realName',
  ADDRESS = 'address',
  BANK_CARD = 'bankCard',
  BIOMETRIC = 'biometric',
}

export enum PIIPermission {
  NONE = 0,
  READ_MASKED = 1,
  READ_FULL = 2,
  WRITE = 3,
  EXPORT = 4,
  DELETE = 5,
}

export interface PIIAccessRule {
  field: PIIField;
  role: string;
  permission: PIIPermission;
  requiresMFA?: boolean;
  auditRequired?: boolean;
}

const defaultAccessRules: PIIAccessRule[] = [
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
  private accessRules: PIIAccessRule[];

  constructor(rules: PIIAccessRule[] = defaultAccessRules) {
    this.accessRules = rules;
  }

  canAccess(field: PIIField, role: string, permission: PIIPermission): boolean {
    const rule = this.accessRules.find(
      r => r.field === field && r.role === role && r.permission >= permission
    );
    return !!rule;
  }

  requiresMFA(field: PIIField, role: string, permission: PIIPermission): boolean {
    const rule = this.accessRules.find(
      r => r.field === field && r.role === role && r.permission >= permission
    );
    return rule?.requiresMFA ?? false;
  }

  requiresAudit(field: PIIField, role: string, permission: PIIPermission): boolean {
    const rule = this.accessRules.find(
      r => r.field === field && r.role === role && r.permission >= permission
    );
    return rule?.auditRequired ?? false;
  }

  maskPII(field: PIIField, value: string): string {
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

  getPIIMetadata(field: PIIField): { category: string; sensitivity: 'high' | 'medium' | 'low' } {
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

  listPIIFields(): PIIField[] {
    return Object.values(PIIField);
  }
}

export const piiManager = new PIIManager();

export interface UserPII {
  phone?: string;
  email?: string;
  idCard?: string;
  realName?: string;
  address?: string;
  bankCard?: string;
}

export function maskUserPII(userData: UserPII, role: string = 'user'): UserPII {
  const masked: UserPII = {};

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
