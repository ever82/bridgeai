export declare const CryptoDigestAlgorithm: {
    SHA1: string;
    SHA256: string;
    SHA384: string;
    SHA512: string;
};
export declare function digestStringAsync(_algorithm: string, data: string, _options?: {
    encoding?: string;
}): Promise<string>;
export declare function getRandomBytesAsync(length: number): Promise<Uint8Array>;
//# sourceMappingURL=expo-crypto.d.ts.map