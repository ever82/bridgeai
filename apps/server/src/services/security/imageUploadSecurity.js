/**
 * Image Upload Security Service
 *
 * Comprehensive image upload security pipeline:
 * - File type validation (magic number + declared MIME consistency)
 * - File size limits
 * - EXIF/metadata stripping
 * - Malicious content detection (SVG scripts, polyglots, decompression bombs)
 * - Virus scanning integration point
 */
import { createHash } from 'crypto';
import sharp from 'sharp';
import { ImageSecurityService } from './imageSecurity';
import { VirusScanService } from './virusScan';
// ============================================================================
// Default Configuration
// ============================================================================
const DEFAULT_CONFIG = {
    maxFileSize: 10 * 1024 * 1024, // 10MB
    maxDimensions: { width: 10000, height: 10000 },
    minDimensions: { width: 100, height: 100 },
    allowedFormats: ['jpeg', 'png', 'webp', 'gif'],
    stripMetadata: true,
    scanForMalware: false,
    checkDecompressionBomb: true,
    maxPixelToByteRatio: 100, // max uncompressed/Compressed ratio
};
// ============================================================================
// Magic Number Signatures
// ============================================================================
const IMAGE_SIGNATURES = [
    { signature: Buffer.from([0xff, 0xd8, 0xff]), format: 'jpeg', mime: 'image/jpeg' },
    { signature: Buffer.from([0x89, 0x50, 0x4e, 0x47]), format: 'png', mime: 'image/png' },
    { signature: Buffer.from([0x47, 0x49, 0x46, 0x38]), format: 'gif', mime: 'image/gif' },
    {
        signature: Buffer.from([0x52, 0x49, 0x46, 0x46]),
        format: 'webp',
        mime: 'image/webp',
    },
];
// ============================================================================
// Service
// ============================================================================
export class ImageUploadSecurityService {
    static instance;
    static getInstance() {
        if (!ImageUploadSecurityService.instance) {
            ImageUploadSecurityService.instance = new ImageUploadSecurityService();
        }
        return ImageUploadSecurityService.instance;
    }
    /**
     * Full security pipeline for an uploaded image buffer.
     * Returns a sanitized buffer with EXIF stripped if config.stripMetadata is true.
     */
    async secureImage(buffer, declaredMime, filename, config = {}) {
        const cfg = { ...DEFAULT_CONFIG, ...config };
        const violations = [];
        const warnings = [];
        // Step 1: File size check
        if (buffer.length === 0) {
            violations.push('Empty file');
            return this.failResult(violations, buffer.length);
        }
        if (buffer.length > cfg.maxFileSize) {
            violations.push(`File size ${(buffer.length / 1024 / 1024).toFixed(1)}MB exceeds limit ${(cfg.maxFileSize / 1024 / 1024).toFixed(1)}MB`);
            return this.failResult(violations, buffer.length);
        }
        // Step 2: Filename safety check
        const filenameViolation = this.checkFilename(filename);
        if (filenameViolation)
            violations.push(filenameViolation);
        // Step 3: Magic number validation + MIME consistency
        let detectedFormat = this.detectFormat(buffer);
        // Fallback: detect text-based formats (SVG)
        if (!detectedFormat && declaredMime === 'image/svg+xml') {
            const header = buffer.toString('utf8', 0, Math.min(buffer.length, 200)).toLowerCase();
            if (header.includes('<?xml') || header.includes('<svg')) {
                detectedFormat = 'svg';
            }
        }
        if (!detectedFormat) {
            violations.push('File does not match any known image format signature');
            return this.failResult(violations, buffer.length);
        }
        const detectedMime = this.getExpectedMime(detectedFormat);
        if (declaredMime && detectedMime && declaredMime !== detectedMime) {
            violations.push(`MIME type mismatch: declared "${declaredMime}" but content is "${detectedMime}"`);
        }
        // Step 4: Sharp parse (validates actual image structure — skip for SVG)
        let sharpMeta;
        const isSvg = detectedFormat === 'svg';
        if (isSvg) {
            sharpMeta = { format: 'svg', width: undefined, height: undefined };
        }
        else {
            try {
                sharpMeta = await sharp(buffer).metadata();
            }
            catch {
                violations.push('Image data is corrupted or cannot be parsed');
                return this.failResult(violations, buffer.length);
            }
        }
        const format = sharpMeta.format || detectedFormat;
        if (!cfg.allowedFormats.includes(format.toLowerCase())) {
            violations.push(`Image format "${format}" is not allowed`);
        }
        // Step 5: Dimension checks (skip for SVG — no pixel dimensions)
        const width = sharpMeta.width || 0;
        const height = sharpMeta.height || 0;
        if (!isSvg) {
            if (width < cfg.minDimensions.width || height < cfg.minDimensions.height) {
                violations.push(`Image too small: ${width}x${height} (min ${cfg.minDimensions.width}x${cfg.minDimensions.height})`);
            }
            if (width > cfg.maxDimensions.width || height > cfg.maxDimensions.height) {
                violations.push(`Image too large: ${width}x${height} (max ${cfg.maxDimensions.width}x${cfg.maxDimensions.height})`);
            }
        }
        // Step 6: Decompression bomb check
        if (!isSvg && cfg.checkDecompressionBomb && width > 0 && height > 0) {
            const pixelCount = width * height;
            const ratio = (pixelCount * 4) / buffer.length; // RGBA byte estimate
            if (ratio > cfg.maxPixelToByteRatio * 1000) {
                violations.push('Potential decompression bomb: pixel-to-byte ratio too high');
            }
        }
        // Step 7: SVG script injection check (if SVG somehow gets through)
        if (isSvg || declaredMime === 'image/svg+xml') {
            const svgViolation = this.checkSvgSafety(buffer);
            if (svgViolation)
                violations.push(svgViolation);
        }
        // Step 8: Run existing ImageSecurityService checks (skip for SVG)
        if (!isSvg) {
            const securityService = ImageSecurityService.getInstance();
            const securityResult = await securityService.checkImage(buffer, {
                checkSensitiveContent: true,
                checkFaces: false,
                checkQuality: false,
                maxFileSize: cfg.maxFileSize,
                allowedFormats: cfg.allowedFormats,
            });
            for (const v of securityResult.violations) {
                if (!violations.includes(v))
                    violations.push(v);
            }
            for (const w of securityResult.warnings) {
                if (!warnings.includes(w))
                    warnings.push(w);
            }
        }
        // Step 9: Strip EXIF / metadata (not applicable to SVG)
        let sanitizedBuffer = buffer;
        let hadExif = false;
        if (cfg.stripMetadata && violations.length === 0 && !isSvg) {
            try {
                const hadExifData = sharpMeta.exif !== undefined &&
                    sharpMeta.exif !== null &&
                    (typeof sharpMeta.exif === 'object'
                        ? Object.keys(sharpMeta.exif).length > 0
                        : true);
                hadExif = hadExifData;
                // Re-encode without metadata; sharp strips EXIF by default when using toBuffer
                sanitizedBuffer = await sharp(buffer)[this.toSharpFormat(format)]({ quality: 90 })
                    .toBuffer();
                if (hadExif) {
                    warnings.push('EXIF metadata was stripped');
                }
            }
            catch {
                warnings.push('Could not strip metadata from image');
            }
        }
        // Step 10: Virus scan (if configured)
        if (cfg.scanForMalware && violations.length === 0) {
            const scanResult = await this.scanForViruses(sanitizedBuffer, filename);
            if (!scanResult.clean) {
                violations.push(`Malware detected: ${scanResult.threats.join(', ')}`);
            }
        }
        // Compute hash of final buffer
        const sha256 = createHash('sha256').update(sanitizedBuffer).digest('hex');
        return {
            passed: violations.length === 0,
            violations,
            warnings,
            sanitizedBuffer: violations.length === 0 ? sanitizedBuffer : undefined,
            metadata: {
                originalSize: buffer.length,
                sanitizedSize: sanitizedBuffer.length,
                width,
                height,
                format,
                hadExif,
                sha256,
            },
        };
    }
    /**
     * Scan buffer for viruses. Delegates to VirusScanService for comprehensive
     * detection (EICAR, executable signatures, polyglots, script malware).
     */
    async scanForViruses(buffer, filename) {
        const virusScanService = VirusScanService.getInstance();
        const result = virusScanService.scanFile(buffer, { filenameHint: filename });
        // Also check for embedded PDF/archive content (heuristic layer)
        const threats = result.threats.map(t => t.name);
        const bufferStr = buffer.toString('binary');
        if (bufferStr.startsWith('%PDF')) {
            threats.push('PDF content embedded');
        }
        if (buffer.length >= 4 &&
            buffer[0] === 0x50 &&
            buffer[1] === 0x4b &&
            buffer[2] === 0x03 &&
            buffer[3] === 0x04) {
            threats.push('Archive content embedded');
        }
        return {
            clean: threats.length === 0,
            threats,
            scanner: 'VirusScanService+heuristic',
        };
    }
    // ---------------------------------------------------------------------------
    // Private helpers
    // ---------------------------------------------------------------------------
    detectFormat(buffer) {
        for (const sig of IMAGE_SIGNATURES) {
            if (buffer.length >= sig.signature.length) {
                const header = buffer.subarray(0, sig.signature.length);
                if (header.equals(sig.signature)) {
                    // For WebP, also verify the RIFF+WEBP marker
                    if (sig.format === 'webp') {
                        if (buffer.length >= 12 &&
                            buffer[8] === 0x57 &&
                            buffer[9] === 0x45 &&
                            buffer[10] === 0x42 &&
                            buffer[11] === 0x50) {
                            return 'webp';
                        }
                        continue;
                    }
                    return sig.format;
                }
            }
        }
        return null;
    }
    getExpectedMime(format) {
        const sig = IMAGE_SIGNATURES.find(s => s.format === format);
        return sig?.mime ?? null;
    }
    checkFilename(filename) {
        // Null bytes
        if (filename.includes('\0')) {
            return 'Filename contains null bytes';
        }
        // Path traversal
        if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
            return 'Filename contains path traversal characters';
        }
        // Double extension (e.g. image.php.jpg)
        const segments = filename.split('.');
        if (segments.length > 2) {
            const dangerousMiddle = [
                'php',
                'jsp',
                'asp',
                'aspx',
                'exe',
                'sh',
                'py',
                'rb',
                'pl',
                'cgi',
                'js',
                'vbs',
                'bat',
                'cmd',
                'ps1',
            ];
            for (let i = 1; i < segments.length - 1; i++) {
                if (dangerousMiddle.includes(segments[i].toLowerCase())) {
                    return `Dangerous double extension detected: .${segments[i]}`;
                }
            }
        }
        return null;
    }
    checkSvgSafety(buffer) {
        const content = buffer.toString('utf8').toLowerCase();
        const dangerousPatterns = [
            '<script',
            'javascript:',
            'onload=',
            'onclick=',
            'onerror=',
            'onmouseover=',
            '<iframe',
            '<embed',
            '<object',
            'eval(',
            'document.',
            'window.',
        ];
        for (const pattern of dangerousPatterns) {
            if (content.includes(pattern)) {
                return `SVG contains potentially dangerous content: ${pattern}`;
            }
        }
        return null;
    }
    toSharpFormat(format) {
        switch (format.toLowerCase()) {
            case 'jpg':
                return 'jpeg';
            case 'gif':
                return 'gif';
            default:
                return (format.toLowerCase() || 'jpeg');
        }
    }
    failResult(violations, originalSize) {
        return {
            passed: false,
            violations,
            warnings: [],
            metadata: {
                originalSize,
                sanitizedSize: originalSize,
                width: 0,
                height: 0,
                format: '',
                hadExif: false,
                sha256: '',
            },
        };
    }
}
export default ImageUploadSecurityService.getInstance();
//# sourceMappingURL=imageUploadSecurity.js.map