interface KeyMetadata {
    createdAt: Date;
    rotatedAt?: Date;
    version: number;
}
export declare const getDataEncryptionKey: () => Promise<Buffer<ArrayBufferLike>>;
export declare const rotateKeys: () => Promise<void>;
export declare const getKeyMetadata: () => KeyMetadata;
export declare const getKeyAuditLog: () => {
    action: string;
    timestamp: Date;
    details: string;
}[];
export declare const checkKeyHealth: () => Promise<{
    healthy: boolean;
    message: string;
    keyAge: number;
    shouldRotate: boolean;
}>;
export {};
//# sourceMappingURL=keyManagement.d.ts.map