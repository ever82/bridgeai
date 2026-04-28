/**
 * Virus Scanning Service
 *
 * Provides local malware detection for uploaded files, with a focus on:
 * - EICAR standard antivirus test signature
 * - Executable signatures embedded in non-executable file types (e.g. PE/ELF in images)
 * - Common malicious script patterns
 *
 * This service performs static analysis only. For production use, consider integrating
 * ClamAV or a cloud-based scanning API (e.g. VirusTotal, MetaDefender).
 */
export interface VirusScanResult {
    /** Whether the file passed all malware checks */
    clean: boolean;
    /** List of detected threats */
    threats: VirusThreat[];
    /** List of warnings that did not trigger a threat flag */
    warnings: string[];
    /** Metadata about the scanned file */
    metadata: {
        size: number;
        scannedAt: string;
        scanVersion: string;
    };
}
export interface VirusThreat {
    /** Short threat name */
    name: string;
    /** Full threat description */
    description: string;
    /** Threat category */
    category: VirusThreatCategory;
    /** Confidence level 0-1 */
    confidence: number;
    /** Location hint (e.g. "file header", "byte offset 0-68") */
    location: string;
}
export type VirusThreatCategory = 'eicar_test' | 'executable_signature' | 'script_malware' | 'polyglot_file' | 'suspicious_header';
export declare class VirusScanService {
    private static instance;
    static getInstance(): VirusScanService;
    /**
     * Scan a file buffer for malware indicators.
     *
     * Performs the following checks:
     * 1. EICAR test signature
     * 2. Executable magic bytes (PE, ELF, Mach-O) anywhere in the file
     * 3. Suspicious script patterns
     *
     * @param buffer - Raw file content as a Buffer
     * @param options.filenameHint - Optional filename hint to help with polyglot detection
     * @returns VirusScanResult with clean/threat status
     */
    scanFile(buffer: Buffer, options?: {
        filenameHint?: string;
    }): VirusScanResult;
    /**
     * Check if buffer contains the EICAR standard antivirus test signature.
     * This is a safe, non-malicious file used to verify antivirus functionality.
     */
    private detectEicar;
    /**
     * Scan the buffer for executable magic bytes.
     * Checks for PE (MZ), ELF, and Mach-O headers at multiple offsets
     * since malware may try to hide signatures with a few leading bytes.
     */
    private detectExecutableSignatures;
    /**
     * Scan for suspicious script patterns in the buffer.
     * Only scans text-like content (first 64KB) to avoid false positives.
     */
    private detectScriptPatterns;
    /**
     * Detect polyglot files: executables disguised with benign file headers.
     * E.g., a PNG file that contains a PE executable appended to the image data.
     */
    private detectPolyglot;
    /**
     * Verify EICAR test pattern correctness.
     * Useful for testing that your antivirus integration is working.
     */
    getEicarTestSignature(): string;
    /**
     * Generate a valid EICAR test file buffer.
     * Use this to test your antivirus integration without using a real virus.
     */
    generateEicarTestFile(): Buffer;
}
declare const _default: VirusScanService;
export default _default;
//# sourceMappingURL=virusScan.d.ts.map