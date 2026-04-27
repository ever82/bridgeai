import { VirusScanService } from '../virusScan';

describe('VirusScanService', () => {
  let service: VirusScanService;

  beforeEach(() => {
    service = VirusScanService.getInstance();
  });

  describe('scanFile', () => {
    it('should pass clean files', () => {
      const buffer = Buffer.from('Hello, this is a harmless text file.');
      const result = service.scanFile(buffer);

      expect(result.clean).toBe(true);
      expect(result.threats).toHaveLength(0);
    });

    it('should pass valid image files', () => {
      // PNG header + harmless data
      const pngHeader = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
      const imageData = Buffer.alloc(100, 0x42);
      const buffer = Buffer.concat([pngHeader, imageData]);

      const result = service.scanFile(buffer, { filenameHint: 'test.png' });

      expect(result.clean).toBe(true);
    });

    it('should pass JPEG files', () => {
      // JPEG header (SOI + APP0)
      const jpegHeader = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46]);
      const jpegData = Buffer.alloc(100, 0x43);
      const buffer = Buffer.concat([jpegHeader, jpegData]);

      const result = service.scanFile(buffer);

      expect(result.clean).toBe(true);
    });

    it('should include metadata in result', () => {
      const buffer = Buffer.from('test data');
      const result = service.scanFile(buffer);

      expect(result.metadata).toBeDefined();
      expect(result.metadata.size).toBe(buffer.length);
      expect(result.metadata.scannedAt).toBeDefined();
      expect(result.metadata.scanVersion).toBe('1.0.0');
    });
  });

  describe('EICAR test detection', () => {
    const EICAR_SIGNATURE = 'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*';

    it('should detect EICAR test file', () => {
      const buffer = Buffer.from(EICAR_SIGNATURE, 'utf8');
      const result = service.scanFile(buffer);

      expect(result.clean).toBe(false);
      expect(result.threats).toHaveLength(1);
      expect(result.threats[0].category).toBe('eicar_test');
      expect(result.threats[0].name).toBe('EICAR-Test-File');
      expect(result.threats[0].confidence).toBe(1.0);
    });

    it('should detect EICAR embedded in larger buffer', () => {
      const prefix = Buffer.alloc(100, 0x00);
      const eicar = Buffer.from(EICAR_SIGNATURE, 'utf8');
      const suffix = Buffer.alloc(50, 0xff);
      const buffer = Buffer.concat([prefix, eicar, suffix]);

      const result = service.scanFile(buffer);

      expect(result.clean).toBe(false);
      expect(result.threats.some(t => t.category === 'eicar_test')).toBe(true);
    });

    it('generateEicarTestFile should produce a detectable buffer', () => {
      const testFile = service.generateEicarTestFile();
      const result = service.scanFile(testFile);

      expect(result.clean).toBe(false);
      expect(result.threats[0].category).toBe('eicar_test');
    });

    it('getEicarTestSignature should return the correct signature', () => {
      expect(service.getEicarTestSignature()).toBe(EICAR_SIGNATURE);
    });
  });

  describe('PE executable detection', () => {
    it('should detect PE executable header (MZ)', () => {
      // MZ header
      const mzHeader = Buffer.from([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00]);
      const buffer = Buffer.concat([mzHeader, Buffer.alloc(100, 0x00)]);

      const result = service.scanFile(buffer);

      expect(result.clean).toBe(false);
      expect(result.threats.some(t => t.name === 'PE/COFF Executable (Windows)')).toBe(true);
    });

    it('should detect PE executable with valid PE signature', () => {
      // MZ header + PE signature
      const buffer = Buffer.alloc(256, 0x00);
      buffer[0] = 0x4d; // M
      buffer[1] = 0x5a; // Z
      buffer.writeUInt32LE(0x80, 0x3c); // PE offset at 0x80
      buffer[0x80] = 0x50; // P
      buffer[0x81] = 0x45; // E

      const result = service.scanFile(buffer);

      expect(result.clean).toBe(false);
      const peThreat = result.threats.find(t => t.name.includes('PE'));
      expect(peThreat).toBeDefined();
    });

    it('should detect PE executable hidden in image file (polyglot)', () => {
      // PNG header followed by MZ (polyglot)
      const pngHeader = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
      const mzHeader = Buffer.from([0x4d, 0x5a, 0x90, 0x00]);
      const buffer = Buffer.concat([pngHeader, mzHeader, Buffer.alloc(100, 0x00)]);

      const result = service.scanFile(buffer, { filenameHint: 'image.png' });

      expect(result.clean).toBe(false);
      expect(result.threats.length).toBeGreaterThan(0);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings.some(w => w.includes('Polyglot'))).toBe(true);
    });

    it('should detect MZ at non-zero offset', () => {
      // PNG header + padding + MZ
      const pngHeader = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
      const padding = Buffer.alloc(20, 0x00);
      const mzHeader = Buffer.from([0x4d, 0x5a, 0x90, 0x00]);
      const buffer = Buffer.concat([pngHeader, padding, mzHeader, Buffer.alloc(50, 0x00)]);

      const result = service.scanFile(buffer);

      expect(result.clean).toBe(false);
      expect(result.threats.some(t => t.category === 'polyglot_file')).toBe(true);
    });
  });

  describe('ELF executable detection', () => {
    it('should detect ELF executable header', () => {
      const elfHeader = Buffer.from([0x7f, 0x45, 0x4c, 0x46]); // "\x7fELF"
      const buffer = Buffer.concat([elfHeader, Buffer.alloc(100, 0x00)]);

      const result = service.scanFile(buffer);

      expect(result.clean).toBe(false);
      expect(result.threats.some(t => t.name === 'ELF Executable (Linux)')).toBe(true);
    });

    it('should not trigger on ELF magic not at start', () => {
      // Place ELF magic at offset 4
      const buffer = Buffer.alloc(100, 0x00);
      buffer[4] = 0x7f;
      buffer[5] = 0x45;
      buffer[6] = 0x4c;
      buffer[7] = 0x46;

      const result = service.scanFile(buffer);

      // Should not flag - ELF must be at offset 0 to be detected
      expect(result.clean).toBe(true);
    });
  });

  describe('Mach-O executable detection', () => {
    it('should detect 32-bit Mach-O header', () => {
      const machoHeader = Buffer.from([0xfe, 0xed, 0xfa, 0xce]);
      const buffer = Buffer.concat([machoHeader, Buffer.alloc(100, 0x00)]);

      const result = service.scanFile(buffer);

      expect(result.clean).toBe(false);
      expect(result.threats.some(t => t.name.includes('Mach-O'))).toBe(true);
    });

    it('should detect 64-bit Mach-O header', () => {
      const machoHeader = Buffer.from([0xfe, 0xed, 0xfa, 0xcf]);
      const buffer = Buffer.concat([machoHeader, Buffer.alloc(100, 0x00)]);

      const result = service.scanFile(buffer);

      expect(result.clean).toBe(false);
      expect(result.threats.some(t => t.name.includes('64-bit'))).toBe(true);
    });
  });

  describe('suspicious script pattern detection', () => {
    it('should detect PowerShell encoded command', () => {
      const script = Buffer.from('-enc VABhAHIAbwAgAEMAegBlAHQAZQByAGkAYQBsAA==');
      const result = service.scanFile(script);

      expect(result.clean).toBe(false);
      expect(result.threats.some(t => t.name === 'PowerShell Encoded Command')).toBe(true);
    });

    it('should detect VBScript Shell Execute', () => {
      const script = Buffer.from("Set objShell = CreateObject('wscript.shell')");
      const result = service.scanFile(script);

      expect(result.clean).toBe(false);
      expect(result.threats.some(t => t.name === 'VBScript with Shell Execute')).toBe(true);
    });

    it('should detect JavaScript eval with String.fromCharCode', () => {
      const script = Buffer.from('eval(String.fromCharCode(97,108,101,114,116))');
      const result = service.scanFile(script);

      expect(result.clean).toBe(false);
      expect(result.threats.some(t => t.name === 'JavaScript with Eval Obfuscation')).toBe(true);
    });

    it('should detect Python os.system', () => {
      const script = Buffer.from("import os\nos.system('ls -la')");
      const result = service.scanFile(script);

      expect(result.clean).toBe(false);
      expect(result.threats.some(t => t.name === 'Python os.system Call')).toBe(true);
    });

    it('should not flag normal JavaScript', () => {
      const script = Buffer.from('console.log("Hello, World!");');
      const result = service.scanFile(script);

      expect(result.clean).toBe(true);
    });

    it('should not flag normal Python', () => {
      const script = Buffer.from('print("Hello, World!")');
      const result = service.scanFile(script);

      expect(result.clean).toBe(true);
    });
  });

  describe('polyglot detection', () => {
    it('should warn about JPEG with PE executable', () => {
      // JPEG header + MZ header
      const jpegHeader = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
      const mzHeader = Buffer.from([0x4d, 0x5a, 0x90, 0x00]);
      const buffer = Buffer.concat([jpegHeader, mzHeader, Buffer.alloc(50, 0x00)]);

      const result = service.scanFile(buffer);

      expect(result.threats.length).toBeGreaterThan(0);
      // Should have a warning about polyglot
      expect(result.warnings.some(w => w.includes('Polyglot') || w.includes('JPEG'))).toBe(true);
    });

    it('should warn based on filename hint', () => {
      // Buffer that could be interpreted multiple ways, but filename says it's an image
      const buffer = Buffer.from([
        0x4d,
        0x5a,
        0x90,
        0x00, // MZ header
        ...Buffer.alloc(100, 0x42),
      ]);

      const result = service.scanFile(buffer, { filenameHint: 'photo.jpg' });

      expect(result.warnings.some(w => w.includes('photo.jpg'))).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle empty buffer', () => {
      const buffer = Buffer.alloc(0);
      const result = service.scanFile(buffer);

      expect(result.clean).toBe(true);
    });

    it('should handle very small buffer', () => {
      const buffer = Buffer.from([0x4d, 0x5a]); // Just MZ
      const result = service.scanFile(buffer);

      expect(result.clean).toBe(false);
      expect(result.threats.length).toBeGreaterThan(0);
    });

    it('should handle large buffer efficiently', () => {
      // Use null bytes to avoid triggering base64 pattern
      const buffer = Buffer.alloc(10 * 1024 * 1024, 0x00); // 10MB of nulls
      const result = service.scanFile(buffer);

      // Should complete without error
      expect(result).toBeDefined();
      expect(result.clean).toBe(true);
    });

    it('should handle binary data without triggering script detection', () => {
      const buffer = Buffer.alloc(1000, 0x00);
      // Add some bytes that could be misinterpreted
      buffer[0] = 0x7f; // Not ELF because it's at offset 0 (would be detected)
      buffer[1] = 0x45;
      buffer[2] = 0x4c;
      buffer[3] = 0x46;

      const result = service.scanFile(buffer);

      // ELF at offset 0 is detected as a threat - this is expected behavior
      expect(result.threats.some(t => t.name.includes('ELF'))).toBe(true);
    });
  });
});
