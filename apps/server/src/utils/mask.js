import { isSensitiveField, detectSensitiveData } from '../config/security';
const defaultOptions = {
    preserveStart: 3,
    preserveEnd: 4,
    maskChar: '*',
    maskLength: 4,
};
export function maskPhone(phone, options = {}) {
    if (!phone || phone.length < 7)
        return phone;
    const opts = { ...defaultOptions, preserveStart: 3, preserveEnd: 4, ...options };
    return maskString(phone, opts);
}
export function maskEmail(email, options = {}) {
    if (!email || !email.includes('@'))
        return email;
    const [local, domain] = email.split('@');
    if (local.length <= 2)
        return email;
    const opts = { ...defaultOptions, preserveStart: 2, preserveEnd: 2, ...options };
    const maskedLocal = maskString(local, opts);
    return `${maskedLocal}@${domain}`;
}
export function maskIdCard(idCard, options = {}) {
    if (!idCard || idCard.length < 8)
        return idCard;
    const opts = { ...defaultOptions, preserveStart: 4, preserveEnd: 4, ...options };
    return maskString(idCard, opts);
}
export function maskBankCard(cardNo, options = {}) {
    if (!cardNo || cardNo.length < 8)
        return cardNo;
    const opts = { ...defaultOptions, preserveStart: 4, preserveEnd: 4, ...options };
    return maskString(cardNo, opts);
}
export function maskPassport(passport, options = {}) {
    if (!passport || passport.length < 4)
        return passport;
    const opts = { ...defaultOptions, preserveStart: 2, preserveEnd: 2, ...options };
    return maskString(passport, opts);
}
export function maskString(str, options = {}) {
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
export function maskObject(obj, sensitiveFields) {
    if (!obj || typeof obj !== 'object')
        return obj;
    const masked = {};
    const fieldsToMask = sensitiveFields || ['phone', 'email', 'idCard', 'idNumber', 'bankCard', 'passport', 'password'];
    for (const [key, value] of Object.entries(obj)) {
        if (value === null || value === undefined) {
            masked[key] = value;
        }
        else if (typeof value === 'string') {
            masked[key] = maskField(key, value, fieldsToMask);
        }
        else if (typeof value === 'object') {
            masked[key] = maskObject(value, fieldsToMask);
        }
        else {
            masked[key] = value;
        }
    }
    return masked;
}
function maskField(key, value, sensitiveFields) {
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
export function maskJson(jsonString, sensitiveFields) {
    try {
        const obj = JSON.parse(jsonString);
        const masked = maskObject(obj, sensitiveFields);
        return JSON.stringify(masked);
    }
    catch {
        return jsonString;
    }
}
export function maskLogMessage(message) {
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
//# sourceMappingURL=mask.js.map