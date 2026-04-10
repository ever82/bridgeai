import { Prisma } from '@prisma/client';
import { encrypt, decrypt, EncryptedData } from '../utils/encryption';
import { isSensitiveField } from '../config/security';

const ENCRYPTED_FIELDS = ['phone', 'idCard', 'idNumber', 'chatContent', 'messageContent'];

export function encryptionMiddleware(): Prisma.Middleware {
  return async (params, next) => {
    // Encrypt before creating/updating
    if (params.action === 'create' || params.action === 'update' || params.action === 'upsert') {
      params.args.data = await encryptFields(params.args.data);
    }

    // Execute the query
    const result = await next(params);

    // Decrypt after reading
    if (params.action === 'findUnique' || params.action === 'findFirst' || params.action === 'findMany') {
      if (Array.isArray(result)) {
        return await Promise.all(result.map(decryptFields));
      }
      if (result) {
        return await decryptFields(result);
      }
    }

    return result;
  };
}

async function encryptFields(data: Record<string, any>): Promise<Record<string, any>> {
  const encrypted: Record<string, any> = { ...data };

  for (const [key, value] of Object.entries(data)) {
    if (value && isSensitiveField(key) && !isEncrypted(value)) {
      if (typeof value === 'string') {
        const encryptedValue = await encrypt(value);
        encrypted[key] = JSON.stringify(encryptedValue);
      }
    } else if (typeof value === 'object' && value !== null) {
      // Recursively encrypt nested objects
      encrypted[key] = await encryptFields(value);
    }
  }

  return encrypted;
}

async function decryptFields(data: Record<string, any>): Promise<Record<string, any>> {
  const decrypted: Record<string, any> = { ...data };

  for (const [key, value] of Object.entries(data)) {
    if (value && isSensitiveField(key) && isEncryptedValue(value)) {
      try {
        const encryptedData: EncryptedData = JSON.parse(value);
        decrypted[key] = await decrypt(encryptedData);
      } catch (e) {
        // If decryption fails, keep original value
        decrypted[key] = value;
      }
    } else if (typeof value === 'object' && value !== null) {
      // Recursively decrypt nested objects
      decrypted[key] = await decryptFields(value);
    }
  }

  return decrypted;
}

function isEncrypted(value: any): boolean {
  if (typeof value !== 'string') return false;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' && 'encrypted' in parsed && 'iv' in parsed;
  } catch {
    return false;
  }
}

function isEncryptedValue(value: any): boolean {
  if (typeof value !== 'string') return false;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' && 'encrypted' in parsed;
  } catch {
    return false;
  }
}
