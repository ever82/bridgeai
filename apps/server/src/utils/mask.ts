import { isSensitiveField, detectSensitiveData } from '../config/security';

export interface MaskOptions {
  preserveStart?: number;
  preserveEnd?: number;
  maskChar?: string;
  maskLength?: number;
}

const defaultOptions: MaskOptions = {
  preserveStart: 3,
  preserveEnd: 4,
  maskChar: '*',
  maskLength: 4,
};

export function maskPhone(phone: string, options: MaskOptions = {}): string {
  if (!phone || phone.length < 7) return phone;
  const opts = { ...defaultOptions, preserveStart: 3, preserveEnd: 4, ...options };
  return maskString(phone, opts);
}

export function maskEmail(email: string, options: MaskOptions = {}): string {
  if (!email || !email.includes('@')) return email;
  const [local, domain] = email.split('@');
  if (local.length <= 2) return email;

  const opts = { ...defaultOptions, preserveStart: 2, preserveEnd: 2, ...options };
  const maskedLocal = maskString(local, opts);
  return `${maskedLocal}@${domain}`;
}

export function maskIdCard(idCard: string, options: MaskOptions = {}): string {
  if (!idCard || idCard.length < 8) return idCard;
  const opts = { ...defaultOptions, preserveStart: 4, preserveEnd: 4, ...options };
  return maskString(idCard, opts);
}

export function maskBankCard(cardNo: string, options: MaskOptions = {}): string {
  if (!cardNo || cardNo.length < 8) return cardNo;
  const opts = { ...defaultOptions, preserveStart: 4, preserveEnd: 4, ...options };
  return maskString(cardNo, opts);
}

export function maskPassport(passport: string, options: MaskOptions = {}): string {
  if (!passport || passport.length < 4) return passport;
  const opts = { ...defaultOptions, preserveStart: 2, preserveEnd: 2, ...options };
  return maskString(passport, opts);
}

export function maskString(str: string, options: MaskOptions = {}): string {
  const opts = { ...defaultOptions, ...options };
  const { preserveStart = 3, preserveEnd = 4, maskChar = '*' } = opts;

  if (str.length <= preserveStart + preserveEnd) {
    return maskChar.repeat(str.length);
  }

  const start = str.slice(0, preserveStart);
  const end = str.slice(-preserveEnd);
  const middleLength = str.length - preserveStart - preserveEnd;

  return `${start}${maskChar.repeat(middleLength)}${end}`;
}

export function maskObject<T extends Record<string, any>>(
  obj: T,
  sensitiveFields?: string[]
): T {
  if (!obj || typeof obj !== 'object') return obj;

  const masked: Record<string, any> = {};
  const fieldsToMask = sensitiveFields || ['phone', 'email', 'idCard', 'idNumber', 'bankCard', 'passport', 'password'];

  for (const [key, value] of Object.entries(obj)) {
    if (value === null || value === undefined) {
      masked[key] = value;
    } else if (typeof value === 'string') {
      masked[key] = maskField(key, value, fieldsToMask);
    } else if (typeof value === 'object') {
      masked[key] = maskObject(value, fieldsToMask);
    } else {
      masked[key] = value;
    }
  }

  return masked as T;
}

function maskField(key: string, value: string, sensitiveFields: string[]): string {
  if (isSensitiveField(key) || sensitiveFields.some(f => key.toLowerCase().includes(f.toLowerCase()))) {
    const detection = detectSensitiveData(value);

    if (detection.isSensitive) {
      switch (detection.type) {
        case 'mobile':
          return maskPhone(value);
        case 'email':
          return maskEmail(value);
        case 'id_card':
          return maskIdCard(value);
        case 'bank_card':
          return maskBankCard(value);
        case 'passport':
          return maskPassport(value);
        default:
          return maskString(value, { preserveStart: 3, preserveEnd: 3 });
      }
    }

    // Default masking for sensitive fields
    return maskString(value, { preserveStart: 3, preserveEnd: 3 });
  }

  return value;
}

export function maskJson(jsonString: string, sensitiveFields?: string[]): string {
  try {
    const obj = JSON.parse(jsonString);
    const masked = maskObject(obj, sensitiveFields);
    return JSON.stringify(masked);
  } catch {
    return jsonString;
  }
}

export function maskLogMessage(message: string): string {
  // Mask potential sensitive data in log messages
  let masked = message;

  // Mask phone numbers in format: 13812345678 or 138-1234-5678
  masked = masked.replace(/(\b1[3-9]\d{9}\b)/g, (match) => maskPhone(match));
  masked = masked.replace(/(\b1[3-9]\d-\d{4}-\d{4}\b)/g, (match) => maskPhone(match.replace(/-/g, '')));

  // Mask ID cards
  masked = masked.replace(/(\b\d{17}[\dXx]\b)/g, (match) => maskIdCard(match));

  // Mask emails
  masked = masked.replace(/(\b[^\s@]+@[^\s@]+\.[^\s@]+\b)/g, (match) => maskEmail(match));

  return masked;
}
