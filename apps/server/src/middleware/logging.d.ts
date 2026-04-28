export declare class SecureLogger {
    private static instance;
    private auditEnabled;
    private constructor();
    static getInstance(): SecureLogger;
    private sanitizeMetadata;
    log(level: string, message: string, metadata?: Record<string, any>): void;
    info(message: string, metadata?: Record<string, any>): void;
    warn(message: string, metadata?: Record<string, any>): void;
    error(message: string, metadata?: Record<string, any>): void;
    debug(message: string, metadata?: Record<string, any>): void;
    audit(action: string, details: Record<string, any>): void;
}
export declare const secureLogger: SecureLogger;
//# sourceMappingURL=logging.d.ts.map