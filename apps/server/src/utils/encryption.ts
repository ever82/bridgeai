import crypto from 'crypto';

import { getDataEncryptionKey } from '../services/keyManagement';

const AES_ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

export interface EncryptedData {
  encrypted: string;
  iv: string;
  tag: string;
  keyId: string;
}

// Cache for frequently accessed encrypted data
const encryptionCache = new Map<string, { decrypted: string; timestamp: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function generateKeyId(): string {
  return crypto.randomUUID();
}

export async function encrypt(text: string): Promise<EncryptedData> {
  if (!text) return { encrypted: '', iv: '', tag: '', keyId: '' };

  const dek = await getDataEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(AES_ALGORITHM, dek, iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag();

  const keyId = generateKeyId();

  return {
    encrypted,
    iv: iv.toString('hex'),
    tag: tag.toString('hex'),
    keyId,
  };
}

export async function decrypt(encryptedData: EncryptedData): Promise<string> {
  if (!encryptedData || !encryptedData.encrypted) return '';

  // Check cache
  const cacheKey = `${encryptedData.encrypted}:${encryptedData.iv}`;
  const cached = encryptionCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.decrypted;
  }

  const dek = await getDataEncryptionKey();
  const iv = Buffer.from(encryptedData.iv, 'hex');
  const tag = Buffer.from(encryptedData.tag, 'hex');

  const decipher = crypto.createDecipheriv(AES_ALGORITHM, dek, iv);
  decipher.setAuthTag(tag);

  let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  // Store in cache
  encryptionCache.set(cacheKey, { decrypted, timestamp: Date.now() });

  return decrypted;
}

export function clearEncryptionCache(): void {
  encryptionCache.clear();
}

export function getCacheSize(): number {
  return encryptionCache.size;
}

// Health check function
export async function checkEncryptionHealth(): Promise<{
  healthy: boolean;
  message: string;
  latencyMs: number;
}> {
  const start = Date.now();
  try {
    const testData = 'health-check-test';
    const encrypted = await encrypt(testData);
    const decrypted = await decrypt(encrypted);
    const latencyMs = Date.now() - start;

    if (decrypted === testData) {
      return {
        healthy: true,
        message: 'Encryption service is healthy',
        latencyMs,
      };
    }
    return {
      healthy: false,
      message: 'Encryption/decryption mismatch',
      latencyMs,
    };
  } catch (error) {
    return {
      healthy: false,
      message: `Encryption health check failed: ${error}`,
      latencyMs: Date.now() - start,
    };
  }
}
