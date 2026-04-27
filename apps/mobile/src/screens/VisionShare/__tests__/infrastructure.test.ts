/**
 * VisionShare Infrastructure Tests
 * Verify the Epic infrastructure is properly set up
 */

// Resolve project root for cross-project paths
import fs from 'fs';
import path from 'path';

import { describe, it, expect } from '@jest/globals';
const rootDir = path.resolve(process.cwd(), '../..');

// Test shared types are importable
describe('Shared Types', () => {
  it('should have photo types defined', () => {
    const photoTypesPath = path.join(rootDir, 'apps/shared/types/photo.types.ts');
    expect(fs.existsSync(photoTypesPath)).toBe(true);
  });

  it('should have payment types defined', () => {
    const paymentTypesPath = path.join(rootDir, 'apps/shared/types/payment.types.ts');
    expect(fs.existsSync(paymentTypesPath)).toBe(true);
  });
});

// Test mobile infrastructure
describe('Mobile Infrastructure', () => {
  it('should have VisionShare screens directory', () => {
    const visionSharePath = path.join(rootDir, 'apps/mobile/src/screens/VisionShare');
    expect(fs.existsSync(visionSharePath)).toBe(true);
  });

  it('should have VisionShare types file', () => {
    const typesPath = path.join(rootDir, 'apps/mobile/src/screens/VisionShare/types.ts');
    expect(fs.existsSync(typesPath)).toBe(true);
  });

  it('should have VisionShare index file', () => {
    const indexPath = path.join(rootDir, 'apps/mobile/src/screens/VisionShare/index.ts');
    expect(fs.existsSync(indexPath)).toBe(true);
  });

  it('should have PhotoViewer components directory', () => {
    const photoViewerPath = path.join(rootDir, 'apps/mobile/src/components/PhotoViewer');
    expect(fs.existsSync(photoViewerPath)).toBe(true);
  });

  it('should have PhotoViewer types file', () => {
    const typesPath = path.join(rootDir, 'apps/mobile/src/components/PhotoViewer/types.ts');
    expect(fs.existsSync(typesPath)).toBe(true);
  });
});

// Test server infrastructure
describe('Server Infrastructure', () => {
  it('should have visionShare service directory', () => {
    const visionSharePath = path.join(rootDir, 'apps/server/src/services/visionShare');
    expect(fs.existsSync(visionSharePath)).toBe(true);
  });

  it('should have visionShare types file', () => {
    const typesPath = path.join(rootDir, 'apps/server/src/services/visionShare/types.ts');
    expect(fs.existsSync(typesPath)).toBe(true);
  });

  it('should have payment service directory', () => {
    const paymentPath = path.join(rootDir, 'apps/server/src/services/payment');
    expect(fs.existsSync(paymentPath)).toBe(true);
  });

  it('should have payment types file', () => {
    const typesPath = path.join(rootDir, 'apps/server/src/services/payment/types.ts');
    expect(fs.existsSync(typesPath)).toBe(true);
  });

  it('should have credit payment service', () => {
    const servicePath = path.join(
      rootDir,
      'apps/server/src/services/payment/creditPaymentService.ts'
    );
    expect(fs.existsSync(servicePath)).toBe(true);
  });

  it('should have VisionShare payment routes', () => {
    const routesPath = path.join(rootDir, 'apps/server/src/routes/visionShare/payment.ts');
    expect(fs.existsSync(routesPath)).toBe(true);
  });
});

// Test new payment screens
describe('Payment Screens Infrastructure', () => {
  it('should have PhotoPayment screen', () => {
    const screenPath = path.join(__dirname, '../PhotoPayment.tsx');
    expect(fs.existsSync(screenPath)).toBe(true);
  });

  it('should have TransactionHistory screen', () => {
    const screenPath = path.join(__dirname, '../TransactionHistory.tsx');
    expect(fs.existsSync(screenPath)).toBe(true);
  });

  it('should have HDDownload screen', () => {
    const screenPath = path.join(__dirname, '../HDDownload.tsx');
    expect(fs.existsSync(screenPath)).toBe(true);
  });
});
