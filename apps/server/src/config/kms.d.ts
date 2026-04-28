export interface KMSConfig {
    provider: 'local' | 'aws' | 'azure' | 'gcp';
    keyId?: string;
    region?: string;
    endpoint?: string;
}
export declare const kmsConfig: KMSConfig;
export declare class KMSClient {
    private config;
    constructor(config?: KMSConfig);
    encrypt(plaintext: string): Promise<string>;
    decrypt(ciphertext: string): Promise<string>;
    private encryptLocal;
    private decryptLocal;
    private encryptAWS;
    private decryptAWS;
    private encryptAzure;
    private decryptAzure;
    private encryptGCP;
    private decryptGCP;
}
export declare const kmsClient: KMSClient;
//# sourceMappingURL=kms.d.ts.map