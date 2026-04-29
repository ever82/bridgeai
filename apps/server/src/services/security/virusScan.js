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
/**
 * EICAR Standard Antivirus Test File signature
 * https://www.eicar.org/download-anti-malware-testfile/
 */
const EICAR_SIGNATURE = 'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*';
/**
 * Magic bytes for common executable formats.
 * These are used to detect executables disguised as other file types (e.g. images).
 */
const EXECUTABLE_SIGNATURES = [
    {
        name: 'PE/COFF Executable (Windows)',
        header: Buffer.from([0x4d, 0x5a]), // "MZ"
        category: 'executable_signature',
        description: 'Windows PE executable embedded in file',
    },
    {
        name: 'ELF Executable (Linux)',
        header: Buffer.from([0x7f, 0x45, 0x4c, 0x46]), // "\x7fELF"
        category: 'executable_signature',
        description: 'Linux ELF executable embedded in file',
    },
    {
        name: 'Mach-O Executable (macOS)',
        header: Buffer.from([0xfe, 0xed, 0xfa, 0xce]), // 32-bit Mach-O
        category: 'executable_signature',
        description: 'macOS Mach-O executable embedded in file',
    },
    {
        name: 'Mach-O 64-bit Executable (macOS)',
        header: Buffer.from([0xfe, 0xed, 0xfa, 0xcf]), // 64-bit Mach-O
        category: 'executable_signature',
        description: 'macOS 64-bit Mach-O executable embedded in file',
    },
];
/**
 * Suspicious script patterns that may indicate embedded malware.
 * These are simple string patterns matched against the raw file content.
 */
const SUSPICIOUS_SCRIPT_PATTERNS = [
    {
        name: 'PowerShell Encoded Command',
        pattern: /(-enc|-encodedcommand)\s+[A-Za-z0-9+/=]+/i,
        description: 'PowerShell encoded command detected - common malware delivery technique',
    },
    {
        name: 'VBScript with Shell Execute',
        pattern: /\bCreateObject\s*\(\s*["']wscript\.shell["']\s*\)/i,
        description: 'VBScript attempting to execute system commands',
    },
    {
        name: 'JavaScript with Eval Obfuscation',
        pattern: /\beval\s*\(\s*(?:atob|unescape|String\.fromCharCode)/i,
        description: 'JavaScript eval with deobfuscation - often used in malicious scripts',
    },
    {
        name: 'Python os.system Call',
        pattern: /\bos\.system\s*\(\s*["'`]/i,
        description: 'Python os.system call - potential command injection',
    },
    {
        name: 'Base64 with Executable Pattern',
        pattern: /\b[A-Za-z0-9+/]{200,}={0,2}\b/,
        description: 'Long base64 string - may contain obfuscated executable code',
    },
];
/**
 * File extensions that should not contain executable code.
 * A file with one of these extensions but containing executable signatures
 * is flagged as a polyglot (malware disguised as a benign file).
 */
const IMAGE_EXTENSIONS = new Set([
    'jpg',
    'jpeg',
    'png',
    'gif',
    'bmp',
    'webp',
    'svg',
    'ico',
    'tiff',
    'tif',
]);
const _DOCUMENT_EXTENSIONS = new Set(['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx']);
const _AUDIO_EXTENSIONS = new Set(['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a']);
const _VIDEO_EXTENSIONS = new Set(['mp4', 'avi', 'mkv', 'mov', 'wmv', 'flv', 'webm']);
export class VirusScanService {
    static instance;
    static getInstance() {
        if (!VirusScanService.instance) {
            VirusScanService.instance = new VirusScanService();
        }
        return VirusScanService.instance;
    }
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
    scanFile(buffer, options = {}) {
        const threats = [];
        const warnings = [];
        // 1. EICAR test file detection
        const eicarResult = this.detectEicar(buffer);
        if (eicarResult) {
            threats.push(eicarResult);
        }
        // 2. Executable signature detection
        const execSignatures = this.detectExecutableSignatures(buffer);
        for (const sig of execSignatures) {
            threats.push(sig);
        }
        // 3. Suspicious script pattern detection
        const scriptThreats = this.detectScriptPatterns(buffer);
        for (const t of scriptThreats) {
            threats.push(t);
        }
        // 4. Polyglot file detection (executable in non-executable context)
        const polyglotWarning = this.detectPolyglot(buffer, options.filenameHint, threats);
        if (polyglotWarning) {
            warnings.push(polyglotWarning);
        }
        return {
            clean: threats.length === 0,
            threats,
            warnings,
            metadata: {
                size: buffer.length,
                scannedAt: new Date().toISOString(),
                scanVersion: '1.0.0',
            },
        };
    }
    /**
     * Check if buffer contains the EICAR standard antivirus test signature.
     * This is a safe, non-malicious file used to verify antivirus functionality.
     */
    detectEicar(buffer) {
        const content = buffer.toString('utf8', 0, Math.min(buffer.length, 1024));
        if (content.includes(EICAR_SIGNATURE)) {
            return {
                name: 'EICAR-Test-File',
                description: 'EICAR standard antivirus test file detected',
                category: 'eicar_test',
                confidence: 1.0,
                location: 'file content',
            };
        }
        return null;
    }
    /**
     * Scan the buffer for executable magic bytes.
     * Checks for PE (MZ), ELF, and Mach-O headers at multiple offsets
     * since malware may try to hide signatures with a few leading bytes.
     */
    detectExecutableSignatures(buffer) {
        const threats = [];
        for (const sig of EXECUTABLE_SIGNATURES) {
            const headerLen = sig.header.length;
            // Check at offset 0 (standard position)
            if (buffer[0] === sig.header[0] && buffer[1] === sig.header[1]) {
                let found = false;
                // For PE files, also check if it looks like a polyglot
                // (image file with MZ header appended)
                if (sig.header[0] === 0x4d && sig.header[1] === 0x5a) {
                    // PE signature should follow "MZ" within 0x3c bytes
                    // Must validate PE offset is within bounds before reading
                    if (buffer.length >= 0x3e) {
                        const peOffset = buffer.readUInt32LE(0x3c);
                        // Validate PE offset is within buffer bounds
                        if (peOffset + 1 < buffer.length &&
                            buffer[peOffset] === 0x50 &&
                            buffer[peOffset + 1] === 0x45) {
                            // Valid PE file - not necessarily a polyglot
                            threats.push({
                                name: sig.name,
                                description: sig.description,
                                category: sig.category,
                                confidence: 0.9,
                                location: `byte offset 0-${headerLen - 1} (MZ header, PE signature at offset ${peOffset})`,
                            });
                            found = true;
                        }
                    }
                }
                // ELF and Mach-O checks (no PE secondary signature)
                if (!found) {
                    // Check for leading junk bytes before signature (common in polyglot)
                    const hasLeadingBytes = sig.header[0] !== buffer[0] || sig.header[1] !== buffer[1];
                    if (!hasLeadingBytes && sig.name.includes('ELF')) {
                        threats.push({
                            name: sig.name,
                            description: sig.description,
                            category: sig.category,
                            confidence: 0.95,
                            location: `byte offset 0-${headerLen - 1}`,
                        });
                        found = true;
                    }
                }
                if (!found) {
                    threats.push({
                        name: sig.name,
                        description: sig.description,
                        category: sig.category,
                        confidence: 0.9,
                        location: `byte offset 0-${headerLen - 1}`,
                    });
                }
            }
            // Also scan for PE header with leading bytes (common polyglot technique)
            // Only do this scan if the file doesn't already start with MZ
            if (sig.header[0] === 0x4d && sig.header[1] === 0x5a && buffer[0] !== 0x4d) {
                // Check for MZ at various offsets (malware often appends to images)
                // Limit search to reasonable bounds to avoid performance issues
                const maxOffset = Math.min(buffer.length - 2, 256);
                for (let offset = 2; offset < maxOffset; offset++) {
                    if (buffer[offset] === 0x4d && buffer[offset + 1] === 0x5a) {
                        threats.push({
                            name: sig.name,
                            description: 'PE/COFF executable embedded within file data (polyglot detected)',
                            category: 'polyglot_file',
                            confidence: 0.85,
                            location: `byte offset ${offset}-${offset + headerLen - 1}`,
                        });
                        break; // Only flag the first occurrence
                    }
                }
            }
        }
        return threats;
    }
    /**
     * Scan for suspicious script patterns in the buffer.
     * Only scans text-like content (first 64KB) to avoid false positives.
     */
    detectScriptPatterns(buffer) {
        const threats = [];
        // Only scan the beginning of the file for script patterns
        const scanLength = Math.min(buffer.length, 65536);
        const content = buffer.toString('utf8', 0, scanLength);
        for (const { name, pattern, description } of SUSPICIOUS_SCRIPT_PATTERNS) {
            if (pattern.test(content)) {
                threats.push({
                    name,
                    description,
                    category: 'script_malware',
                    confidence: 0.7,
                    location: 'embedded script content',
                });
            }
        }
        return threats;
    }
    /**
     * Detect polyglot files: executables disguised with benign file headers.
     * E.g., a PNG file that contains a PE executable appended to the image data.
     */
    detectPolyglot(buffer, filenameHint, existingThreats) {
        // Check if any existing threats are executable signatures
        const hasExecutableSig = existingThreats.some(t => t.category === 'executable_signature' || t.category === 'polyglot_file');
        if (!hasExecutableSig) {
            return null;
        }
        // Check for benign file magic bytes at the start
        const imageMagicNumbers = [
            { ext: 'PNG', magic: Buffer.from([0x89, 0x50, 0x4e, 0x47]) },
            { ext: 'JPEG', magic: Buffer.from([0xff, 0xd8, 0xff]) },
            { ext: 'GIF87a', magic: Buffer.from('GIF87a', 'ascii') },
            { ext: 'GIF89a', magic: Buffer.from('GIF89a', 'ascii') },
            { ext: 'BMP', magic: Buffer.from([0x42, 0x4d]) },
            { ext: 'WebP', magic: Buffer.from([0x52, 0x49, 0x46, 0x46]) }, // RIFF....WEBP
        ];
        for (const { ext } of imageMagicNumbers) {
            if (buffer[0] === 0x89 ||
                buffer[0] === 0xff ||
                buffer.slice(0, 3).toString() === 'GIF' ||
                buffer.slice(0, 4).toString() === 'RIFF') {
                return `Polyglot file detected: benign ${ext} header with embedded executable data`;
            }
        }
        // Check filename hint for image extensions
        if (filenameHint) {
            const ext = filenameHint.split('.').pop()?.toLowerCase();
            if (ext && IMAGE_EXTENSIONS.has(ext)) {
                return `Polyglot detected: file "${filenameHint}" claims to be .${ext} but contains executable data`;
            }
        }
        return null;
    }
    /**
     * Verify EICAR test pattern correctness.
     * Useful for testing that your antivirus integration is working.
     */
    getEicarTestSignature() {
        return EICAR_SIGNATURE;
    }
    /**
     * Generate a valid EICAR test file buffer.
     * Use this to test your antivirus integration without using a real virus.
     */
    generateEicarTestFile() {
        return Buffer.from(EICAR_SIGNATURE, 'utf8');
    }
}
export default VirusScanService.getInstance();
//# sourceMappingURL=virusScan.js.map