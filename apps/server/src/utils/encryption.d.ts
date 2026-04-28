export interface EncryptedData {
    encrypted: string;
    iv: string;
    tag: string;
    keyId: string;
}
export declare function encrypt(text: string): Promise<EncryptedData>;
export declare function decrypt(encryptedData: EncryptedData): Promise<string>;
export declare function clearEncryptionCache(): void;
export declare function getCacheSize(): number;
export declare function checkEncryptionHealth(): Promise<{
    healthy: boolean;
    message: string;
    latencyMs: number;
}>;
//# sourceMappingURL=encryption.d.ts.map