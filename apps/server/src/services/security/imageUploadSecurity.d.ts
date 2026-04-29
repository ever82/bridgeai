export interface UploadSecurityConfig {
    maxFileSize: number;
    maxDimensions: {
        width: number;
        height: number;
    };
    minDimensions: {
        width: number;
        height: number;
    };
    allowedFormats: string[];
    stripMetadata: boolean;
    scanForMalware: boolean;
    checkDecompressionBomb: boolean;
    maxPixelToByteRatio: number;
}
export interface UploadSecurityResult {
    passed: boolean;
    violations: string[];
    warnings: string[];
    sanitizedBuffer?: Buffer;
    metadata: {
        originalSize: number;
        sanitizedSize: number;
        width: number;
        height: number;
        format: string;
        hadExif: boolean;
        sha256: string;
    };
}
export interface VirusScanResult {
    clean: boolean;
    threats: string[];
    scanner: string;
}
export declare class ImageUploadSecurityService {
    private static instance;
    static getInstance(): ImageUploadSecurityService;
    /**
     * Full security pipeline for an uploaded image buffer.
     * Returns a sanitized buffer with EXIF stripped if config.stripMetadata is true.
     */
    secureImage(buffer: Buffer, declaredMime: string, filename: string, config?: Partial<UploadSecurityConfig>): Promise<UploadSecurityResult>;
    /**
     * Scan buffer for viruses. Delegates to VirusScanService for comprehensive
     * detection (EICAR, executable signatures, polyglots, script malware).
     */
    scanForViruses(buffer: Buffer, filename?: string): Promise<VirusScanResult>;
    private detectFormat;
    private getExpectedMime;
    private checkFilename;
    private checkSvgSafety;
    private toSharpFormat;
    private failResult;
}
declare const _default: ImageUploadSecurityService;
export default _default;
//# sourceMappingURL=imageUploadSecurity.d.ts.map