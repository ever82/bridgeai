/**
 * VisionShare Infrastructure Tests
 * Verify the Epic infrastructure is properly set up
 */

import { describe, it, expect } from '@jest/globals';

// Test shared types are importable
describe('Shared Types', () => {
  it('should have photo types defined', () => {
    // Types are compile-time constructs, this test verifies the file exists
    const fs = require('fs');
    const path = require('path');

    const photoTypesPath = path.join(__dirname, '../../../../shared/types/photo.types.ts');
    expect(fs.existsSync(photoTypesPath)).toBe(true);
  });

  it('should have payment types defined', () => {
    const fs = require('fs');
    const path = require('path');

    const paymentTypesPath = path.join(__dirname, '../../../../shared/types/payment.types.ts');
    expect(fs.existsSync(paymentTypesPath)).toBe(true);
  });
});

// Test mobile infrastructure
describe('Mobile Infrastructure', () => {
  it('should have VisionShare screens directory', () => {
    const fs = require('fs');
    const path = require('path');

    const visionSharePath = path.join(__dirname, '../../src/screens/VisionShare');
    expect(fs.existsSync(visionSharePath)).toBe(true);
  });

  it('should have VisionShare types file', () => {
    const fs = require('fs');
    const path = require('path');

    const typesPath = path.join(__dirname, '../../src/screens/VisionShare/types.ts');
    expect(fs.existsSync(typesPath)).toBe(true);
  });

  it('should have VisionShare index file', () => {
    const fs = require('fs');
    const path = require('path');

    const indexPath = path.join(__dirname, '../../src/screens/VisionShare/index.ts');
    expect(fs.existsSync(indexPath)).toBe(true);
  });

  it('should have PhotoViewer components directory', () => {
    const fs = require('fs');
    const path = require('path');

    const photoViewerPath = path.join(__dirname, '../../src/components/PhotoViewer');
    expect(fs.existsSync(photoViewerPath)).toBe(true);
  });

  it('should have PhotoViewer types file', () => {
    const fs = require('fs');
    const path = require('path');

    const typesPath = path.join(__dirname, '../../src/components/PhotoViewer/types.ts');
    expect(fs.existsSync(typesPath)).toBe(true);
  });
});

// Test server infrastructure
describe('Server Infrastructure', () => {
  it('should have visionShare service directory', () => {
    const fs = require('fs');
    const path = require('path');

    const visionSharePath = path.join(__dirname, '../../../server/src/services/visionShare');
    expect(fs.existsSync(visionSharePath)).toBe(true);
  });

  it('should have visionShare types file', () => {
    const fs = require('fs');
    const path = require('path');

    const typesPath = path.join(__dirname, '../../../server/src/services/visionShare/types.ts');
    expect(fs.existsSync(typesPath)).toBe(true);
  });

  it('should have payment service directory', () => {
    const fs = require('fs');
    const path = require('path');

    const paymentPath = path.join(__dirname, '../../../server/src/services/payment');
    expect(fs.existsSync(paymentPath)).toBe(true);
  });

  it('should have payment types file', () => {
    const fs = require('fs');
    const path = require('path');

    const typesPath = path.join(__dirname, '../../../server/src/services/payment/types.ts');
    expect(fs.existsSync(typesPath)).toBe(true);
  });
});
