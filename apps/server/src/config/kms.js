import { securityConfig } from './security';
export const kmsConfig = {
    provider: 'local',
    keyId: securityConfig.AWS_KMS_KEY_ID,
    region: securityConfig.AWS_REGION,
};
/**
 * KMSClient - Key Management Service client.
 *
 * Currently supports only local encryption (AES-256-GCM via the encryption utility).
 * Cloud KMS providers (AWS, Azure, GCP) are not yet integrated. To add a provider:
 * 1. Implement the encrypt/decrypt methods for that provider below.
 * 2. Add the provider value to the KMSConfig `provider` union type.
 * 3. Update securityConfig.KMS_PROVIDER validation accordingly.
 */
export class KMSClient {
    config;
    constructor(config = kmsConfig) {
        this.config = config;
    }
    async encrypt(plaintext) {
        const { encrypt } = await import('../utils/encryption');
        const result = await encrypt(plaintext);
        return JSON.stringify(result);
    }
    async decrypt(ciphertext) {
        const { decrypt } = await import('../utils/encryption');
        const encryptedData = JSON.parse(ciphertext);
        return decrypt(encryptedData);
    }
}
export const kmsClient = new KMSClient();
//# sourceMappingURL=kms.js.map