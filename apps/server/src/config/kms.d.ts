export interface KMSConfig {
    provider: 'local';
    keyId?: string;
    region?: string;
    endpoint?: string;
}
export declare const kmsConfig: KMSConfig;
/**
 * KMSClient - Key Management Service client.
 *
 * Currently supports only local encryption (AES-256-GCM via the encryption utility).
 * Cloud KMS providers (AWS, Azure, GCP) are not yet integrated. To add a provider:
 * 1. Implement the encrypt/decrypt methods for that provider below.
 * 2. Add the provider value to the KMSConfig `provider` union type.
 * 3. Update securityConfig.KMS_PROVIDER validation accordingly.
 */
export declare class KMSClient {
    private config;
    constructor(config?: KMSConfig);
    encrypt(plaintext: string): Promise<string>;
    decrypt(ciphertext: string): Promise<string>;
}
export declare const kmsClient: KMSClient;
//# sourceMappingURL=kms.d.ts.map